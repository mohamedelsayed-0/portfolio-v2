// Phase-space (Wigner-style) view of a finite-energy GKP qubit. A coarse
// heatmap of W(q,p) over a square lattice comb; a `thermal noise` slider
// widens the peaks and strips the negative (odd,odd) lattice sites, so the
// checkerboard negativity that makes the state non-classical decays away.

(function () {
  "use strict";

  var mount = document.getElementById("demo-gkp-mount");
  if (!mount) return;

  // ---------- constants (phase-space units) ----------
  var S = Math.sqrt(Math.PI);   // lattice pitch s ≈ √π
  var DELTA = 0.3;              // finite-energy envelope width
  var SIG0 = 0.16 * S;          // peak width at zero noise
  var HALF = 3.5 * S;           // window half-extent (±3.5s)
  var GX = 140, GY = 100;       // coarse grid resolution

  // ---------- build DOM ----------
  var canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540; // 16:9
  canvas.setAttribute("aria-hidden", "true");
  mount.appendChild(canvas);

  var controls = document.createElement("div");
  controls.className = "demo-controls";

  var label = document.createElement("label");
  label.appendChild(document.createTextNode("thermal noise "));
  var gInput = document.createElement("input");
  gInput.type = "range";
  gInput.min = "0";
  gInput.max = "1";
  gInput.step = "0.01";
  gInput.value = "0.15";
  label.appendChild(gInput);
  controls.appendChild(label);

  var recoverBtn = document.createElement("button");
  recoverBtn.type = "button";
  recoverBtn.className = "demo-btn";
  recoverBtn.textContent = "apply recovery";
  controls.appendChild(recoverBtn);

  var readout = document.createElement("span");
  readout.className = "demo-readout";
  controls.appendChild(readout);
  mount.appendChild(controls);

  var ctx = canvas.getContext("2d");

  // offscreen coarse buffer, drawn once and scaled up each render
  var off = document.createElement("canvas");
  off.width = GX;
  off.height = GY;
  var octx = off.getContext("2d");
  var img = octx.createImageData(GX, GY);
  var field = new Float64Array(GX * GY);

  // ---------- theme colors (re-read every draw) ----------
  var accent = [31, 63, 191], NEG = [192, 80, 77];
  var colFg, colMuted, colMono;
  function toRGB(str, fb) {
    str = (str || "").trim();
    if (str.charAt(0) === "#") {
      var h = str.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      if (!isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var m = str.match(/\d+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
    return fb;
  }
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    accent = toRGB(cs.getPropertyValue("--accent"), [31, 63, 191]);
    colFg = cs.getPropertyValue("--fg").trim() || "#1a1a1a";
    colMuted = cs.getPropertyValue("--muted").trim() || "#6b6b66";
    colMono = cs.getPropertyValue("--font-mono").trim() || "monospace";
  }

  // ---------- sizing (devicePixelRatio-aware) ----------
  var w = 0, h = 0;
  function size() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    w = rect.width || 960;
    h = rect.height || 540;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- Wigner comb ----------
  // Fills `field` with W(q,p) over the grid; returns {wmax, raw} where raw is
  // the un-normalized negativity Σ|W<0| / Σ|W|. Only odd·odd lattice sites are
  // negative ((-1)^{m·n} < 0 iff both m and n are odd); their amplitude is
  // scaled by negScale (1 at γ=0) so they fade out under noise. `sigma` and
  // `negScale` are passed explicitly (not derived from γ inline) so the
  // recovery map can drive them independently of the slider. Envelope terms
  // below 1e-4 are skipped, but for m,n∈[-3,3] none are (worst case ≈ 0.039).
  function compute(sigma, negScale) {
    var s2 = 2 * sigma * sigma;
    var sumNeg = 0, sumAll = 0, wmax = 0;
    var dqx = (2 * HALF) / GX, dpy = (2 * HALF) / GY;
    // precompute per-site amplitude and center
    var amps = [], cx = [], cy = [];
    for (var m = -3; m <= 3; m++) {
      for (var n = -3; n <= 3; n++) {
        var env = Math.exp(-(m * m + n * n) * 2 * DELTA * DELTA);
        if (env < 1e-4) continue;
        var neg = (m & 1) && (n & 1);
        var a = neg ? -env * negScale : env;
        amps.push(a);
        cx.push(m * S);
        cy.push(n * S);
      }
    }
    var k = 0;
    for (var j = 0; j < GY; j++) {
      var p = HALF - (j + 0.5) * dpy;
      for (var i = 0; i < GX; i++, k++) {
        var q = -HALF + (i + 0.5) * dqx;
        var W = 0;
        for (var t = 0; t < amps.length; t++) {
          var dq = q - cx[t], dp = p - cy[t];
          W += amps[t] * Math.exp(-(dq * dq + dp * dp) / s2);
        }
        field[k] = W;
        var abs = W < 0 ? -W : W;
        sumAll += abs;
        if (W < 0) sumNeg += abs;
        if (abs > wmax) wmax = abs;
      }
    }
    return { wmax: wmax, raw: sumAll > 0 ? sumNeg / sumAll : 0 };
  }

  // baseline negativity at γ=0 (computed once) → display normalized to 1.00
  var baseline = compute(SIG0, 1).raw || 1;

  // ---------- recovery state ----------
  // sigmaEff/negScaleEff are the *effective* peak width / negative-amplitude
  // scale actually rendered. The slider sets a baseline for both; `apply
  // recovery` re-sharpens them toward the γ=0 ideal (sigmaEff → SIG0,
  // negScaleEff → 1) without touching the slider. recoveryStep counts
  // recoveries since the last slider move, for diminishing returns.
  var sigmaEff = 0, negScaleEff = 1, recoveryStep = 0, animToken = 0;

  function baselineFor(g) { return { sigma: SIG0 * (1 + 2 * g), neg: 1 - g }; }

  function resetRecovery() {
    animToken++; // cancels any in-flight animation
    var g = parseFloat(gInput.value);
    var b = baselineFor(g);
    sigmaEff = b.sigma;
    negScaleEff = b.neg;
    recoveryStep = 0;
    recoverBtn.disabled = g === 0;
  }

  // ---------- render ----------
  function toX(q) { return w * (0.5 + q / (2 * HALF)); }
  function toY(p) { return h * (0.5 - p / (2 * HALF)); }

  function draw() {
    readColors();
    var g = parseFloat(gInput.value);
    var res = compute(sigmaEff, negScaleEff);
    var wmax = res.wmax || 1;

    // paint coarse field into the offscreen buffer
    var d = img.data;
    for (var k = 0; k < field.length; k++) {
      var W = field[k];
      var a = Math.abs(W) / wmax;
      var o = k * 4;
      if (a < 0.02) { d[o + 3] = 0; continue; }
      var c = W < 0 ? NEG : accent;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
      d[o + 3] = Math.min(255, Math.round(a * 255));
    }
    octx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, h);

    // hairline axes through the origin
    ctx.strokeStyle = colMuted;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), h);
    ctx.moveTo(0, toY(0)); ctx.lineTo(w, toY(0));
    ctx.stroke();

    // small ticks at lattice multiples of s
    ctx.beginPath();
    for (var kk = -3; kk <= 3; kk++) {
      if (kk === 0) continue;
      var x = toX(kk * S), y = toY(kk * S);
      ctx.moveTo(x, toY(0) - 4); ctx.lineTo(x, toY(0) + 4);
      ctx.moveTo(toX(0) - 4, y); ctx.lineTo(toX(0) + 4, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // tiny mono axis labels
    ctx.fillStyle = colMuted;
    ctx.font = "10px " + colMono;
    ctx.textBaseline = "middle";
    ctx.fillText("q", w - 12, toY(0) - 8);
    ctx.fillText("p", toX(0) + 8, 10);

    var neg = res.raw / baseline;
    readout.textContent = "γ = " + g.toFixed(2) + " · negativity " + neg.toFixed(2);
  }

  // ---------- recovery animation ----------
  // Bounded ~600ms loop (20 fixed-interval eased steps) that drives
  // sigmaEff/negScaleEff from their pre-click values to the recovered
  // target, redrawing through the same draw() path each step. Cancellable:
  // a fresh call bumps animToken so any in-flight loop stops on its next
  // tick, and starts over from whatever sigmaEff/negScaleEff currently are.
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateRecovery(sig0, neg0, sig1, neg1, before, after) {
    var token = ++animToken;
    var STEPS = 20, STEP_MS = 30, step = 0;
    var g = parseFloat(gInput.value);
    function tick() {
      if (token !== animToken) return; // superseded by a newer click/slider move
      step++;
      var e = easeOutCubic(step / STEPS);
      sigmaEff = sig0 + (sig1 - sig0) * e;
      negScaleEff = neg0 + (neg1 - neg0) * e;
      draw();
      var cur = before + (after - before) * e;
      readout.textContent = "γ = " + g.toFixed(2) + " · negativity " +
        before.toFixed(2) + " → " + cur.toFixed(2);
      if (step < STEPS) {
        setTimeout(tick, STEP_MS);
      } else {
        sigmaEff = sig1;
        negScaleEff = neg1;
        draw();
        readout.textContent = "γ = " + g.toFixed(2) + " · negativity " +
          before.toFixed(2) + " → " + after.toFixed(2);
      }
    }
    tick();
  }

  function applyRecovery() {
    var g = parseFloat(gInput.value);
    if (g === 0) return; // already ideal — visual no-op
    var before = compute(sigmaEff, negScaleEff).raw / baseline;

    // diminishing returns: each successive recovery (sans slider move)
    // recovers only 60% of what the previous one could
    var fraction = 0.35 * Math.pow(0.6, recoveryStep);
    recoveryStep++;

    var sig0 = sigmaEff, neg0 = negScaleEff;
    var sig1 = Math.max(SIG0, sig0 - fraction * (sig0 - SIG0));
    var neg1 = Math.min(1, neg0 + fraction * (1 - neg0));
    var after = compute(sig1, neg1).raw / baseline;

    animateRecovery(sig0, neg0, sig1, neg1, before, after);
  }

  // ---------- events: static render on input / resize / theme only ----------
  gInput.addEventListener("input", function () { resetRecovery(); draw(); });
  recoverBtn.addEventListener("click", applyRecovery);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); draw(); }, 150);
  });

  resetRecovery();
  size();
  draw();
})();
