// Beam bench — simply supported Euler-Bernoulli beam, point load, exaggerated
// deflection curve. Drag the arrow or use the sliders.

(function () {
  "use strict";

  var mount = document.getElementById("demo-beam-mount");
  if (!mount) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  mount.innerHTML =
    '<canvas class="demo-canvas" width="960" height="360" aria-hidden="true"></canvas>' +
    '<div class="demo-controls">' +
    '<label>Position <input type="range" id="beam-pos" min="2" max="98" value="38" step="1"></label>' +
    '<label>Load <input type="range" id="beam-load" min="0" max="100" value="62" step="1"></label>' +
    "</div>" +
    '<span class="demo-readout" id="beam-readout"></span>';

  var canvas = mount.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var posInput = mount.querySelector("#beam-pos");
  var loadInput = mount.querySelector("#beam-load");
  var readout = mount.querySelector("#beam-readout");

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
  var VREF = 1 / 48; // deflection at P=1, a=0.5 — the reference max
  function vAt(x, P, a) {
    var b = 1 - a;
    return x <= a
      ? (P * b * x / 6) * (1 - b * b - x * x)
      : (P * a * (1 - x) / 6) * (2 * x - a * a - x * x);
  }

  var posFrac = 0.38, loadFrac = 0.62;
  var dPos = posFrac, dLoad = loadFrac;
  var target = new Array(N + 1);
  var display = new Array(N + 1);
  var fromArr = new Array(N + 1);
  var fromPos = posFrac, fromLoad = loadFrac;
  var maxAbs = 0, maxLoc = 0;
  var rafId = null, animStart = null;
  var DUR = 200;

  function computeTarget() {
    var a = posFrac, P = loadFrac, m = 0, mi = 0;
    for (var i = 0; i <= N; i++) {
      var val = vAt(i / N, P, a);
      target[i] = val;
      var av = val < 0 ? -val : val;
      if (av > m) { m = av; mi = i; }
    }
    maxAbs = m;
    maxLoc = mi / N;
  }

  function updateReadout() {
    readout.textContent =
      "P = " + Math.round(loadFrac * 100) + "% · a = " + posFrac.toFixed(2) +
      "L · δmax = " + (maxAbs / VREF).toFixed(2) + " at x = " + maxLoc.toFixed(2) + "L";
  }

  function cancelAnim() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  function step(now) {
    if (!animStart) animStart = now;
    var t = Math.min(1, (now - animStart) / DUR);
    var e = 1 - Math.pow(1 - t, 3);
    for (var i = 0; i <= N; i++) display[i] = fromArr[i] + (target[i] - fromArr[i]) * e;
    dPos = fromPos + (posFrac - fromPos) * e;
    dLoad = fromLoad + (loadFrac - fromLoad) * e;
    render();
    if (t < 1) rafId = requestAnimationFrame(step);
    else rafId = null;
  }

  function applyInputs(instant) {
    posFrac = clamp((+posInput.value) / 100, 0.02, 0.98);
    loadFrac = clamp((+loadInput.value) / 100, 0, 1);
    computeTarget();
    updateReadout();
    if (instant || reduceMotion) {
      cancelAnim();
      display = target.slice();
      dPos = posFrac;
      dLoad = loadFrac;
      render();
    } else {
      fromArr = display.slice();
      fromPos = dPos;
      fromLoad = dLoad;
      animStart = null;
      cancelAnim();
      rafId = requestAnimationFrame(step);
    }
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

  function render() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var c = colors();
    var b = bounds(rect);
    var beamY = h * 0.42;
    var ampMax = h * 0.3;
    var scale = ampMax / VREF;

    ctx.clearRect(0, 0, w, h);

    // undeflected hairline
    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(b.x0, beamY);
    ctx.lineTo(b.x1, beamY);
    ctx.stroke();
    ctx.setLineDash([]);

    // deflected beam curve
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var i = 0; i <= N; i++) {
      var xp = b.x0 + (i / N) * b.span;
      var yp = beamY + display[i] * scale;
      if (i === 0) ctx.moveTo(xp, yp); else ctx.lineTo(xp, yp);
    }
    ctx.stroke();

    // supports
    ctx.strokeStyle = c.fg;
    ctx.lineWidth = 1.5;
    var s = 10;
    ctx.beginPath();
    ctx.moveTo(b.x0, beamY);
    ctx.lineTo(b.x0 - s, beamY + s * 1.6);
    ctx.lineTo(b.x0 + s, beamY + s * 1.6);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x0 - s * 1.6, beamY + s * 1.6);
    ctx.lineTo(b.x0 + s * 1.6, beamY + s * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x1, beamY + s, s * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x1 - s * 1.6, beamY + s * 1.8);
    ctx.lineTo(b.x1 + s * 1.6, beamY + s * 1.8);
    ctx.stroke();

    // load arrow (tip follows the current curve at its position)
    var idxA = clamp(Math.round(dPos * N), 0, N);
    var ax = b.x0 + dPos * b.span;
    var tipY = beamY + display[idxA] * scale;
    var len = 18 + dLoad * 46;
    ctx.strokeStyle = c.fg;
    ctx.fillStyle = c.fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, tipY - len);
    ctx.lineTo(ax, tipY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, tipY);
    ctx.lineTo(ax - 6, tipY - 10);
    ctx.lineTo(ax + 6, tipY - 10);
    ctx.closePath();
    ctx.fill();
  }

  // ---- drag interaction (canvas), mirrored by the position slider ----
  var dragging = false;

  function hitArrow(clientX) {
    var rect = canvas.getBoundingClientRect();
    var b = bounds(rect);
    var ax = b.x0 + dPos * b.span;
    return Math.abs(clientX - rect.left - ax) <= 28;
  }

  function dragTo(clientX) {
    var rect = canvas.getBoundingClientRect();
    var b = bounds(rect);
    var frac = clamp((clientX - rect.left - b.x0) / b.span, 0.02, 0.98);
    posInput.value = Math.round(frac * 100);
    applyInputs(true);
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (!hitArrow(e.clientX)) return;
    dragging = true;
    canvas.classList.add("is-dragging");
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    dragTo(e.clientX);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (dragging) dragTo(e.clientX);
  });
  function endDrag(e) {
    dragging = false;
    canvas.classList.remove("is-dragging");
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  posInput.addEventListener("input", function () { applyInputs(false); });
  loadInput.addEventListener("input", function () { applyInputs(false); });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); render(); }, 150);
  });

  // ---- init ----
  size();
  computeTarget();
  display = target.slice();
  updateReadout();
  render();
})();
