// Beam bench — 3D box-girder bridge, orbitable, CIV102 matboard bridge under a moving train.
// Geometry from github.com/mohamedelsayed-0/CIV102: span 1200mm, 6-wheel 400N train
// (spacing 176/164mm), box girder 100mm top / 80mm bottom flange, 75mm deep, 1.27mm matboard.

(function () {
  "use strict";

  var mount = document.getElementById("demo-beam-mount");
  if (!mount) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  mount.innerHTML =
    '<canvas class="demo-canvas" width="960" height="480" aria-hidden="true"></canvas>' +
    '<div class="demo-controls">' +
    '<button type="button" class="demo-btn" id="beam-run">run train</button>' +
    '<label>Position <input type="range" id="beam-pos" min="-10" max="175" value="86" step="1"></label>' +
    '<label>Load <input type="range" id="beam-load" min="0" max="100" value="62" step="1"></label>' +
    "</div>" +
    '<span class="demo-readout" id="beam-readout"></span>';

  var canvas = mount.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var runBtn = mount.querySelector("#beam-run");
  var posInput = mount.querySelector("#beam-pos");
  var loadInput = mount.querySelector("#beam-load");
  var readout = mount.querySelector("#beam-readout");

  if (reduceMotion) runBtn.hidden = true;

  function colors() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) {
      var val = cs.getPropertyValue(name);
      return val && val.trim() ? val.trim() : fb;
    }
    return {
      fg: v("--fg", "#1a1a1a"),
      muted: v("--muted", "#6b6b66"),
      accent: v("--accent", "#1f3fbf")
    };
  }

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  // ---- mechanics (L = 1, EI = 1) — superposed simply-supported point loads (reused) ----
  var NSEG = 24;                 // extrusion segments along the span
  var VREF = 1 / 48;             // single unit load at midspan — deflection reference
  var OFF = [0, 176, 340, 516, 680, 856].map(function (m) { return m / 1200; }); // real wheels
  var TRAINLEN = OFF[5];
  var TMIN = -0.1, TMAX = 1.75;  // lead-wheel travel: off-left to off-right
  var DUR = 4000;

  function vAt(x, load, a) {
    var b = 1 - a;
    return x <= a
      ? (load * b * x / 6) * (1 - b * b - x * x)
      : (load * a * (1 - x) / 6) * (2 * x - a * a - x * x);
  }

  var tCur = 0.857, loadFrac = 0.62;
  var display = new Array(NSEG + 1).fill(0);
  var envelope = new Array(NSEG + 1).fill(0);
  var maxAbs = 0;
  var rafId = null, running = false, runStart = null;

  function computeAt(t, load, accEnv) {
    var m = 0;
    for (var i = 0; i <= NSEG; i++) {
      var x = i / NSEG, val = 0;
      for (var k = 0; k < 6; k++) {
        var a = t - OFF[k];
        if (a > 0 && a < 1) val += vAt(x, load, a);
      }
      display[i] = val;
      if (val > m) m = val;
      if (accEnv && val > envelope[i]) envelope[i] = val;
    }
    maxAbs = m;
  }

  function envMax() {
    var m = 0;
    for (var i = 0; i <= NSEG; i++) if (envelope[i] > m) m = envelope[i];
    return m;
  }

  // fixed max-pixel amplitude: normalize to the full-load centered-train max sag
  computeAt(0.5 + TRAINLEN / 2, 1, false);
  var WORLDAMP = 0.16, scaleW = WORLDAMP / (maxAbs || 1e-6);

  function sagAt(sx) {
    var g = clamp(sx, 0, 1) * NSEG, i0 = Math.floor(g), fr = g - i0;
    var d = display[i0] + (display[Math.min(i0 + 1, NSEG)] - display[i0]) * fr;
    return d * scaleW;
  }

  function updateReadout() {
    readout.textContent =
      "train at " + (tCur - TRAINLEN / 2).toFixed(2) + "L · δ = " +
      (maxAbs / VREF).toFixed(2) + " · envelope " + (envMax() / VREF).toFixed(2);
  }

  // ---- fixed perspective camera, slight downward pitch, drag = yaw orbit ----
  var YAW = 0, PITCH = 0.34, CAMD = 3.4, HZ = 0.16, HY = 0.12;

  function project(X, Y, Z, w, h, f) {
    var cy = Math.cos(YAW), sy = Math.sin(YAW);
    var xr = X * cy + Z * sy, zr = -X * sy + Z * cy;
    var cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    var yr = Y * cp - zr * sp;
    var zc = Y * sp + zr * cp + CAMD;
    return [w / 2 + f * xr / zc, h * 0.44 - f * yr / zc, zc];
  }

  function cancelAnim() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
  function setRunUI(on) { running = on; runBtn.disabled = on; runBtn.textContent = on ? "running…" : "run train"; }
  function cancelRun(reset) { cancelAnim(); setRunUI(false); if (reset) envelope = new Array(NSEG + 1).fill(0); }

  function startRun() {
    if (reduceMotion) return;
    cancelAnim();
    envelope = new Array(NSEG + 1).fill(0);
    setRunUI(true);
    runStart = null;
    rafId = requestAnimationFrame(runStep);
  }

  function runStep(now) {
    if (!runStart) runStart = now;
    var prog = Math.min(1, (now - runStart) / DUR);
    tCur = TMIN + prog * (TMAX - TMIN);
    posInput.value = Math.round(tCur * 100);
    computeAt(tCur, loadFrac, true);
    updateReadout();
    render();
    if (prog < 1) rafId = requestAnimationFrame(runStep);
    else { rafId = null; setRunUI(false); }
  }

  function applyPos() {
    if (running) cancelRun(true);
    tCur = clamp((+posInput.value) / 100, TMIN, TMAX);
    computeAt(tCur, loadFrac, false);
    updateReadout();
    render();
  }

  function applyLoad() {
    loadFrac = clamp((+loadInput.value) / 100, 0, 1);
    computeAt(tCur, loadFrac, running);
    updateReadout();
    render();
  }

  function size() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = rect.width || 960, h = rect.height || 480;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- scene assembly: depth-sorted quad faces (painter's algorithm) ----
  function render() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height, c = colors();
    var f = (w < h ? w : h) * 1.5;
    ctx.clearRect(0, 0, w, h);

    var Q = [];
    function q(p0, p1, p2, p3, a, col) { Q.push({ p: [p0, p1, p2, p3], a: a, c: col }); }
    function bx(cx, cy, cz, hx, hy, hz, a, col) {
      var x0 = cx - hx, x1 = cx + hx, y0 = cy - hy, y1 = cy + hy, z0 = cz - hz, z1 = cz + hz;
      q([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], a, col);
      q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], a * 0.6, col);
      q([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], a * 0.8, col);
      q([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], a * 0.8, col);
      q([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], a * 0.7, col);
      q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], a * 0.7, col);
    }

    // girder: extrude the box cross-section along the deflected centroid line
    var R = [];
    for (var i = 0; i <= NSEG; i++) {
      var X = 2 * (i / NSEG) - 1, yc = -sagAt(i / NSEG);
      R.push([[X, yc + HY, -HZ], [X, yc + HY, HZ], [X, yc - HY, HZ], [X, yc - HY, -HZ]]);
    }
    var FA = [0.22, 0.14, 0.1, 0.14]; // top / right / bottom / left face fill alpha
    for (i = 0; i < NSEG; i++) {
      for (var j = 0; j < 4; j++) {
        var k2 = (j + 1) % 4;
        q(R[i][j], R[i][k2], R[i + 1][k2], R[i + 1][j], FA[j], 0);
      }
    }
    q(R[0][0], R[0][1], R[0][2], R[0][3], 0.18, 0);
    q(R[NSEG][0], R[NSEG][1], R[NSEG][2], R[NSEG][3], 0.18, 0);

    // supports: simple prisms at both ends
    bx(-1, -HY - 0.13, 0, 0.05, 0.13, 0.13, 0.4, 1);
    bx(1, -HY - 0.13, 0, 0.05, 0.13, 0.13, 0.4, 1);

    // train: 3 darker box masses riding the deck at the wheel-pair positions
    for (var m = 0; m < 3; m++) {
      var cOff = (OFF[2 * m] + OFF[2 * m + 1]) / 2, pos = tCur - cOff;
      if (pos < 0 || pos > 1) continue;
      bx(2 * pos - 1, -sagAt(pos) + HY + 0.05, 0, 0.05, 0.05, 0.11, 0.55, 2);
    }

    // project, depth-sort (far first), paint
    for (i = 0; i < Q.length; i++) {
      var s = [], zsum = 0, fc = Q[i];
      for (j = 0; j < 4; j++) {
        var pr = project(fc.p[j][0], fc.p[j][1], fc.p[j][2], w, h, f);
        s.push(pr); zsum += pr[2];
      }
      fc.s = s; fc.z = zsum;
    }
    Q.sort(function (u, v) { return v.z - u.z; });

    for (i = 0; i < Q.length; i++) {
      var q2 = Q[i], sp = q2.s;
      ctx.beginPath();
      ctx.moveTo(sp[0][0], sp[0][1]);
      ctx.lineTo(sp[1][0], sp[1][1]);
      ctx.lineTo(sp[2][0], sp[2][1]);
      ctx.lineTo(sp[3][0], sp[3][1]);
      ctx.closePath();
      ctx.fillStyle = q2.c === 0 ? c.accent : q2.c === 1 ? c.muted : c.fg;
      ctx.globalAlpha = q2.a;
      ctx.fill();
      ctx.globalAlpha = q2.c === 0 ? 0.28 : 0.4;
      ctx.strokeStyle = c.fg;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---- orbit: pointer-drag horizontal = yaw, clamped ±60°, independent of scrub ----
  var dragging = false, dragX = 0, dragYaw = 0;
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; dragX = e.clientX; dragYaw = YAW;
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    e.preventDefault();
    YAW = clamp(dragYaw + (e.clientX - dragX) * 0.005, -1.047, 1.047);
    render();
  });
  function endDrag() { dragging = false; }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  runBtn.addEventListener("click", startRun);
  posInput.addEventListener("input", applyPos);
  loadInput.addEventListener("input", applyLoad);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); render(); }, 150);
  });

  // ---- init ----
  size();
  computeAt(tCur, loadFrac, false);
  updateReadout();
  render();
})();
