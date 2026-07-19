// Beam bench — 3D box-girder bridge, orbitable, CIV102 matboard bridge under a moving train.
// Geometry + physics from github.com/mohamedelsayed-0/CIV102 (Python/main.py, section.py):
// span 1200mm, 6-wheel 400N train. Seven live failure modes; FoS = min over modes of capacity/
// demand. Shear peaks near supports, moment/buckling near midspan; top-flange buckling between
// webs (3.69 MPa) is the weak link and the only mode reaching FoS<1.

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
    '<label>Weight <input type="range" id="beam-load" min="0" max="100" value="43" step="1"></label>' +
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

  // ---- geometry & spans (CIV102 repo, mm/N) ----
  var NSEG = 24;
  var VREF = 1 / 48;
  var SPAN_MM = 1200, TOTAL_LOAD = 400;
  var OFF = [0, 176, 340, 516, 680, 856].map(function (m) { return m / SPAN_MM; });
  var TRAINLEN = OFF[5];
  var TMIN = -0.1, TMAX = 1.75;
  var DUR = 4000;

  // ---- section properties (repo section.py, parallel-axis); precomputed once ----
  var E = 4000, MU = 0.2, sq = function (v) { return v * v; }; // matboard E (MPa) / Poisson
  var TFT = 1.27, TW = 1.27, WH = 75, TFW = 100, BFW = 80, SFW = 5; // flange/web/tab dims (mm)
  var wh = WH - TW; // clear web height (A=area, y=centroid from bottom below)
  var Ab = BFW * TW, yb0 = TW / 2;
  var Aw = 2 * wh * TW, yw = TW + wh / 2;
  var At = 2 * SFW * TW, yt = WH + TFT / 2;
  var Af = TFW * TW, yf = WH + TFT / 2;
  var YBAR = (Ab * yb0 + Aw * yw + At * yt + Af * yf) / (Ab + Aw + At + Af);
  var I_SEC = BFW * TW * sq(TW) / 12 + Ab * sq(yb0 - YBAR)
    + 2 * (TW * wh * sq(wh) / 12 + wh * TW * sq(yw - YBAR))
    + 2 * (SFW * TW * sq(TW) / 12 + SFW * TW * sq(yt - YBAR))
    + TFW * TW * sq(TW) / 12 + Af * sq(yf - YBAR); // I ~= 4.19e5 mm^4
  var YTOP = (WH + TW) - YBAR, YBOT = YBAR;
  var wAbove = (WH + TW) - YBAR - TW;
  var QC = (Af + At) * (yf - YBAR) + 2 * TW * wAbove * (wAbove / 2);
  var QG = TFW * TW * (yf - YBAR);
  var TSHEAR = 2 * TW, TGLUE = 2 * SFW;

  // ---- capacities (repo main.py), limiting stresses (MPa); plate buckling k*pi^2*E/(12(1-mu^2))*(t/b)^2
  var KB = Math.PI * Math.PI * E / (12 * (1 - MU * MU));
  var SIG_T = 30, SIG_C = 6, TAU_M = 4, TAU_G = 2;
  var SIG_FL = Math.min( // top-flange buckling = min(overhang, between-webs)
    0.425 * KB * sq(TFT / ((TFW - BFW) / 2)), //  overhang, k=0.425
    4.0 * KB * sq(TFT / (BFW - 2 * TW))); //  between webs, k=4.0 (governs)
  var SIG_WEB = 6.0 * KB * sq(TW / WH); // web compression buckling, k=6
  var TAU_BUCK = 5.0 * KB * (sq(TW / WH) + sq(TW / (SPAN_MM / 11))); // web shear buckling, k=5
  var MODE = ["flexural tension", "flexural compression", "top-flange buckling", "web buckling",
    "matboard shear", "glue shear", "web shear buckling"];

  // ---- load slider = train-weight multiplier (x the 400N design train) ----
  // slider 0 -> W=0.291 (FoS ~2.2, safe); 100 -> W=0.752 (FoS ~0.85, fails). FoS=1 at ~75% of
  // the slider so only the top ~25% can fail; default 43 -> FoS ~1.3.
  var WMIN = 0.291, WMAX = 0.752;

  var tCur = 0.857, loadFrac = WMIN;
  var display = new Array(NSEG + 1).fill(0);
  var maxAbs = 0, critIdx = 0, govMode = 0, fosMin = 99;
  var rafId = null, running = false, runStart = null;
  var failed = false, flashT = 0;

  function vAt(x, load, a) {
    var b = 1 - a;
    return x <= a
      ? (load * b * x / 6) * (1 - b * b - x * x)
      : (load * a * (1 - x) / 6) * (2 * x - a * a - x * x);
  }

  // Superpose wheel influence lines (deflection; moment M=Pw*L*infl; shear V per wheel);
  // demand sigma=M*y/I, tau=V*Q/(I*b); FoS = min over 7 modes per section.
  function computeAt(t, W, noCheck) {
    var m = 0, Pw = W * TOTAL_LOAD / 6, minF = Infinity, gMode = 0, gIdx = 0;
    for (var i = 0; i <= NSEG; i++) {
      var x = i / NSEG, val = 0, M = 0, V = 0;
      for (var k = 0; k < 6; k++) {
        var a = t - OFF[k];
        if (a > 0 && a < 1) {
          val += vAt(x, W, a);
          M += Pw * SPAN_MM * (x <= a ? (1 - a) * x : a * (1 - x));
          V += x < a ? Pw * (1 - a) : -Pw * a;
        }
      }
      display[i] = val;
      if (val > m) m = val;
      var aM = M < 0 ? -M : M, aV = V < 0 ? -V : V, e = 1e-9;
      var dTop = aM * YTOP / I_SEC, dBot = aM * YBOT / I_SEC;
      var dTau = aV * QC / (I_SEC * TSHEAR), dGlue = aV * QG / (I_SEC * TGLUE);
      var f = [SIG_T / (dBot + e), SIG_C / (dTop + e), SIG_FL / (dTop + e), SIG_WEB / (dTop + e),
        TAU_M / (dTau + e), TAU_G / (dGlue + e), TAU_BUCK / (dTau + e)];
      for (var md = 0; md < 7; md++) if (f[md] < minF) { minF = f[md]; gMode = md; gIdx = i; }
    }
    maxAbs = m; fosMin = minF; govMode = gMode; critIdx = gIdx;
    if (!noCheck && !failed && minF < 1) triggerFailure();
  }

  // pixel amplitude: normalize to full design-train centered max sag (calibration; no check)
  computeAt(0.5 + TRAINLEN / 2, 1, true);
  var WORLDAMP = 0.16, scaleW = WORLDAMP / (maxAbs || 1e-6);

  function sagAt(sx) {
    var g = clamp(sx, 0, 1) * NSEG, i0 = Math.floor(g), fr = g - i0;
    var d = display[i0] + (display[Math.min(i0 + 1, NSEG)] - display[i0]) * fr;
    return d * scaleW;
  }

  function updateReadout() {
    if (failed) {
      readout.textContent = "failed · " + MODE[govMode] + " @ " + (critIdx / NSEG).toFixed(2) + "L";
      return;
    }
    var fos = fosMin > 99 ? 99 : fosMin;
    readout.textContent =
      "train at " + (tCur - TRAINLEN / 2).toFixed(2) + "L · δ " +
      (maxAbs / VREF).toFixed(2) + " · FoS " + fos.toFixed(2) + " (" + MODE[govMode] + ")";
  }

  // ---- perspective camera (downward pitch), drag = yaw orbit ----
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
  function cancelRun() { cancelAnim(); setRunUI(false); }

  // one-time failure: kink at critical section, brief flash, stop + lock
  function triggerFailure() {
    failed = true;
    cancelAnim();
    running = false;
    runBtn.hidden = false; runBtn.disabled = false; runBtn.textContent = "reset";
    posInput.disabled = true;
    updateReadout();
    render();
    if (!reduceMotion) { flashT = performance.now(); rafId = requestAnimationFrame(flashStep); }
  }

  function flashStep(now) {
    render();
    if (now - flashT < 120) rafId = requestAnimationFrame(flashStep);
    else { flashT = 0; rafId = null; render(); }
  }

  function doReset() {
    failed = false; flashT = 0;
    cancelAnim();
    if (reduceMotion) runBtn.hidden = true; else { runBtn.disabled = false; runBtn.textContent = "run train"; }
    posInput.disabled = false;
    tCur = TMIN; posInput.value = Math.round(TMIN * 100);
    computeAt(tCur, loadFrac, false);
    updateReadout();
    render();
  }

  function startRun() {
    if (reduceMotion || failed) return;
    cancelAnim();
    setRunUI(true);
    runStart = null;
    rafId = requestAnimationFrame(runStep);
  }

  function runStep(now) {
    if (!runStart) runStart = now;
    var prog = Math.min(1, (now - runStart) / DUR);
    tCur = TMIN + prog * (TMAX - TMIN);
    posInput.value = Math.round(tCur * 100);
    computeAt(tCur, loadFrac, false);
    if (failed) return;
    updateReadout();
    render();
    if (prog < 1) rafId = requestAnimationFrame(runStep);
    else { rafId = null; setRunUI(false); }
  }

  function applyPos() {
    if (failed) return;
    if (running) cancelRun();
    tCur = clamp((+posInput.value) / 100, TMIN, TMAX);
    computeAt(tCur, loadFrac, false);
    updateReadout();
    render();
  }

  function applyLoad() {
    if (failed) return;
    loadFrac = WMIN + clamp((+loadInput.value) / 100, 0, 1) * (WMAX - WMIN);
    computeAt(tCur, loadFrac, false);
    updateReadout();
    render();
  }

  function size() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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

    // girder: extrude box section along deflected line
    var R = [];
    for (var i = 0; i <= NSEG; i++) {
      var X = 2 * (i / NSEG) - 1, yc = -sagAt(i / NSEG);
      if (failed) {
        var kd = Math.abs(i - critIdx);
        if (kd <= 2) yc -= WORLDAMP * 3 * (1 - kd / 2);
      }
      R.push([[X, yc + HY, -HZ], [X, yc + HY, HZ], [X, yc - HY, HZ], [X, yc - HY, -HZ]]);
    }
    var FA = [0.22, 0.14, 0.1, 0.14];
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

    // train: box masses at wheel-pair positions
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
    if (flashT) { ctx.fillStyle = "rgba(192,80,77,.22)"; ctx.fillRect(0, 0, w, h); }
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

  runBtn.addEventListener("click", function () { if (failed) doReset(); else startRun(); });
  posInput.addEventListener("input", applyPos);
  loadInput.addEventListener("input", applyLoad);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); render(); }, 150);
  });

  // ---- init ----
  size();
  loadFrac = WMIN + clamp((+loadInput.value) / 100, 0, 1) * (WMAX - WMIN);
  computeAt(tCur, loadFrac, false);
  updateReadout();
  render();
})();
