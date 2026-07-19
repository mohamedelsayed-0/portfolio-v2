// Beam bench — simply supported bridge, 3-axle train crossing.
// Superposed point-load deflection, live reactions, run/scrub controls.

(function () {
  "use strict";

  var mount = document.getElementById("demo-beam-mount");
  if (!mount) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  mount.innerHTML =
    '<canvas class="demo-canvas" width="960" height="480" aria-hidden="true"></canvas>' +
    '<div class="demo-controls">' +
    '<button type="button" class="demo-btn" id="beam-run">run train</button>' +
    '<label>Position <input type="range" id="beam-pos" min="-24" max="124" value="38" step="1"></label>' +
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
      accent: v("--accent", "#1f3fbf"),
      rule: v("--rule", "rgba(26,26,26,0.12)")
    };
  }

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  // ---- geometry / mechanics (L = 1, EI = 1) ----
  var N = 200;
  var VREF = 1 / 48; // deflection at load=1, single load at midspan — the reference unit
  var SPACING = 0.12;
  var TMIN = -0.24, TMAX = 1.24; // lead-axle travel: fully off-left to fully off-right

  function vAt(x, load, a) {
    var b = 1 - a;
    return x <= a
      ? (load * b * x / 6) * (1 - b * b - x * x)
      : (load * a * (1 - x) / 6) * (2 * x - a * a - x * x);
  }

  var tCur = 0.38, loadFrac = 0.62;
  var display = new Array(N + 1).fill(0);
  var envelope = new Array(N + 1).fill(0);
  var maxAbs = 0, curRa = 0, curRb = 0;
  var rafId = null, running = false, runStart = null;
  var DUR = 4000;

  // axle positions for a given lead-axle t: lead, then two trailing behind it
  function axle(t, k) { return t - k * SPACING; }

  function computeAt(t, load, accumEnvelope) {
    var m = 0;
    for (var i = 0; i <= N; i++) {
      var x = i / N, val = 0;
      for (var k = 0; k < 3; k++) {
        var a = axle(t, k);
        if (a > 0 && a < 1) val += vAt(x, load, a);
      }
      display[i] = val;
      if (val > m) m = val;
      if (accumEnvelope && val > envelope[i]) envelope[i] = val;
    }
    maxAbs = m;
    var ra = 0, rb = 0;
    for (var k2 = 0; k2 < 3; k2++) {
      var a2 = axle(t, k2);
      if (a2 > 0 && a2 < 1) { ra += load * (1 - a2); rb += load * a2; }
    }
    curRa = ra; curRb = rb;
  }

  function envMax() {
    var m = 0;
    for (var i = 0; i <= N; i++) if (envelope[i] > m) m = envelope[i];
    return m;
  }

  function updateReadout() {
    readout.textContent =
      "train at " + tCur.toFixed(2) + "L · δ = " + (maxAbs / VREF).toFixed(2) +
      " · envelope " + (envMax() / VREF).toFixed(2);
  }

  // reaction arrow: tip at the support, tail below, length proportional to R
  function drawReaction(x, yTip, R, label, c, gap, sc) {
    var yTail = yTip + gap + R * sc;
    ctx.strokeStyle = c.fg;
    ctx.fillStyle = c.fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, yTail);
    ctx.lineTo(x, yTip);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yTip);
    ctx.lineTo(x - 5, yTip + 9);
    ctx.lineTo(x + 5, yTip + 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.muted;
    ctx.fillText(label, x - 8, yTail + 11);
  }

  // axle arrow: tail above, triangular head at the tip (touching curve or ground)
  function drawAxle(x, yTip, len, c) {
    ctx.strokeStyle = c.fg;
    ctx.fillStyle = c.fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, yTip - len);
    ctx.lineTo(x, yTip);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yTip);
    ctx.lineTo(x - 6, yTip - 10);
    ctx.lineTo(x + 6, yTip - 10);
    ctx.closePath();
    ctx.fill();
    return yTip - len;
  }

  function cancelAnim() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  function setRunUI(isRunning) {
    running = isRunning;
    runBtn.disabled = isRunning;
    runBtn.textContent = isRunning ? "running…" : "run train";
  }

  function cancelRun(resetEnvelope) {
    cancelAnim();
    setRunUI(false);
    if (resetEnvelope) envelope = new Array(N + 1).fill(0);
  }

  function startRun() {
    if (reduceMotion) return;
    cancelAnim();
    envelope = new Array(N + 1).fill(0);
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

  // ---- canvas sizing (devicePixelRatio-aware) ----
  function size() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = rect.width || 960, h = rect.height || 360;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function bounds(rect) {
    var m = Math.min(50, rect.width * 0.06);
    return { x0: m, x1: rect.width - m, span: rect.width - 2 * m };
  }

  // map lead-axle-domain position t (TMIN..TMAX) to screen x across the full stage
  function xForT(t, b) { return b.x0 + ((t - TMIN) / (TMAX - TMIN)) * b.span; }

  function render() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var c = colors();
    var b = bounds(rect);
    var beamY = h * 0.34;
    var ampMax = h * 0.14;
    var scale = ampMax / VREF;
    var bx0 = xForT(0, b), bx1 = xForT(1, b);
    var bspan = bx1 - bx0;

    ctx.clearRect(0, 0, w, h);

    // approach / exit road — ground level, no deflection off-bridge
    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(b.x0, beamY);
    ctx.lineTo(bx0, beamY);
    ctx.moveTo(bx1, beamY);
    ctx.lineTo(b.x1, beamY);
    ctx.stroke();
    ctx.setLineDash([]);

    // envelope fill — high-water mark of deflection reached so far this run
    ctx.beginPath();
    ctx.moveTo(bx0, beamY);
    for (var i = 0; i <= N; i++) {
      ctx.lineTo(bx0 + (i / N) * bspan, beamY + envelope[i] * scale);
    }
    ctx.lineTo(bx1, beamY);
    ctx.closePath();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = c.accent;
    ctx.fill();
    ctx.globalAlpha = 1;

    // current deflection curve
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var j = 0; j <= N; j++) {
      var xp = bx0 + (j / N) * bspan;
      var yp = beamY + display[j] * scale;
      if (j === 0) ctx.moveTo(xp, yp); else ctx.lineTo(xp, yp);
    }
    ctx.stroke();

    // supports
    ctx.strokeStyle = c.fg;
    ctx.lineWidth = 1.5;
    var s = 10;
    ctx.beginPath();
    ctx.moveTo(bx0, beamY);
    ctx.lineTo(bx0 - s, beamY + s * 1.6);
    ctx.lineTo(bx0 + s, beamY + s * 1.6);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx0 - s * 1.6, beamY + s * 1.6);
    ctx.lineTo(bx0 + s * 1.6, beamY + s * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx1, beamY + s, s * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx1 - s * 1.6, beamY + s * 1.8);
    ctx.lineTo(bx1 + s * 1.6, beamY + s * 1.8);
    ctx.stroke();

    // reactions Ra (left support) / Rb (right support) — sum of active axle reactions
    ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
    drawReaction(bx0, beamY, curRa, "Ra", c, h * 0.05, h * 0.1);
    drawReaction(bx1, beamY, curRb, "Rb", c, h * 0.05, h * 0.1);

    // train axles — on the deflected curve while on-bridge, on the road otherwise
    var len = 14 + loadFrac * 20;
    var tops = [];
    for (var k = 0; k < 3; k++) {
      var a = axle(tCur, k);
      var ax = xForT(a, b);
      var onBridge = a > 0 && a < 1;
      var ay = onBridge ? beamY + display[clamp(Math.round(a * N), 0, N)] * scale : beamY;
      tops.push([ax, drawAxle(ax, ay, len, c)]);
    }
    ctx.strokeStyle = c.fg;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tops[2][0], tops[2][1]);
    ctx.lineTo(tops[1][0], tops[1][1]);
    ctx.lineTo(tops[0][0], tops[0][1]);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

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
