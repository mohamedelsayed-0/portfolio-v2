// The GKP error-correction loop as a game, over a Wigner heatmap of W(q,p).
// `thermal noise` γ widens peaks + strips negativity. `kick` = random
// displacement error (magnitude ~ γ); the comb slides by the accumulated vector
// (accent arrow). `correct` = syndrome recovery: snap each axis to the nearest
// lattice point round(disp/s) — drift < s/2 recenters clean; drift past s/2
// snaps to the wrong site = logical error (state recenters but the checkerboard
// parity flips and stays flipped; q→X, p→Z, both→Y). `apply recovery` re-sharpens
// σ but does NOT fix displacement (that's the physics); `reset` clears it all.

(function () {
  "use strict";

  var mount = document.getElementById("demo-gkp-mount");
  if (!mount) return;

  var S = Math.sqrt(Math.PI);   // lattice pitch s ≈ √π
  var DELTA = 0.3;              // finite-energy envelope width
  var SIG0 = 0.16 * S;          // peak width at zero noise
  var HALF = 3.5 * S;           // window half-extent (±3.5s)
  var GX = 140, GY = 100;       // coarse grid resolution

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
  gInput.min = "0"; gInput.max = "1"; gInput.step = "0.01"; gInput.value = "0.15";
  label.appendChild(gInput);
  controls.appendChild(label);

  function mkBtn(text) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "demo-btn";
    b.textContent = text;
    controls.appendChild(b);
    return b;
  }
  var kickBtn = mkBtn("kick"), correctBtn = mkBtn("correct"),
    recoverBtn = mkBtn("apply recovery"), resetBtn = mkBtn("reset");
  resetBtn.style.display = "none";

  var readout = document.createElement("span");
  readout.className = "demo-readout";
  controls.appendChild(readout);
  mount.appendChild(controls);

  var ctx = canvas.getContext("2d");

  var off = document.createElement("canvas"); // offscreen coarse buffer
  off.width = GX;
  off.height = GY;
  var octx = off.getContext("2d");
  var img = octx.createImageData(GX, GY);
  var field = new Float64Array(GX * GY);

  var accent = [31, 63, 191], NEG = [192, 80, 77]; // theme colors, re-read/draw
  var colMuted, colMono;
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
    colMuted = cs.getPropertyValue("--muted").trim() || "#6b6b66";
    colMono = cs.getPropertyValue("--font-mono").trim() || "monospace";
  }

  var w = 0, h = 0; // canvas size, devicePixelRatio-aware
  function size() {
    var rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    w = rect.width || 960;
    h = rect.height || 540;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Wigner comb → fills `field`, returns {wmax, raw negativity}. dispQ0/dispP0
  // slide the comb; parity (+1/-1) inverts the (odd·odd) checkerboard sign.
  function compute(sigma, negScale, dispQ0, dispP0, parity) {
    var s2 = 2 * sigma * sigma;
    var sumNeg = 0, sumAll = 0, wmax = 0;
    var dqx = (2 * HALF) / GX, dpy = (2 * HALF) / GY;
    var amps = [], cx = [], cy = []; // per-site amplitude + center
    for (var m = -3; m <= 3; m++) for (var n = -3; n <= 3; n++) {
      var env = Math.exp(-(m * m + n * n) * 2 * DELTA * DELTA);
      if (env < 1e-4) continue;
      var neg = ((m & 1) && (n & 1)) ? parity > 0 : parity < 0;
      amps.push(neg ? -env * negScale : env);
      cx.push(m * S + dispQ0); cy.push(n * S + dispP0);
    }
    var k = 0;
    for (var j = 0; j < GY; j++) {
      var p = HALF - (j + 0.5) * dpy;
      for (var i = 0; i < GX; i++, k++) {
        var q = -HALF + (i + 0.5) * dqx, W = 0;
        for (var t = 0; t < amps.length; t++) {
          var dq = q - cx[t], dp = p - cy[t];
          W += amps[t] * Math.exp(-(dq * dq + dp * dp) / s2);
        }
        field[k] = W;
        var abs = W < 0 ? -W : W;
        sumAll += abs; if (W < 0) sumNeg += abs; if (abs > wmax) wmax = abs;
      }
    }
    return { wmax: wmax, raw: sumAll > 0 ? sumNeg / sumAll : 0 };
  }

  var baseline = compute(SIG0, 1, 0, 0, 1).raw || 1; // γ=0 negativity → 1.00

  // recovery state: slider baselines sigmaEff/negScaleEff; recovery re-sharpens
  // toward the γ=0 ideal, recoveryStep → diminishing returns.
  var sigmaEff = 0, negScaleEff = 1, recoveryStep = 0, animToken = 0;
  var animating = false; // an animation owns the readout/field

  // game state (displacement channel)
  var dispQ = 0, dispP = 0, parity = 1, corrected = 0, logical = 0, lastEvent = "";

  function baselineFor(g) { return { sigma: SIG0 * (1 + 2 * g), neg: 1 - g }; }

  function resetRecovery() {
    animToken++; // cancel in-flight animation
    animating = false;
    var g = parseFloat(gInput.value);
    var b = baselineFor(g);
    sigmaEff = b.sigma;
    negScaleEff = b.neg;
    recoveryStep = 0;
    recoverBtn.disabled = g === 0;
  }

  function toX(q) { return w * (0.5 + q / (2 * HALF)); }
  function toY(p) { return h * (0.5 - p / (2 * HALF)); }

  function draw() {
    readColors();
    var g = parseFloat(gInput.value);
    var res = compute(sigmaEff, negScaleEff, dispQ, dispP, parity);
    var wmax = res.wmax || 1;

    var d = img.data; // paint coarse field → offscreen buffer → scaled up
    for (var k = 0; k < field.length; k++) {
      var W = field[k], a = Math.abs(W) / wmax, o = k * 4;
      if (a < 0.02) { d[o + 3] = 0; continue; }
      var c = W < 0 ? NEG : accent;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
      d[o + 3] = Math.min(255, Math.round(a * 255));
    }
    octx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, h);

    // hairline axes + lattice ticks
    ctx.strokeStyle = colMuted; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), h);
    ctx.moveTo(0, toY(0)); ctx.lineTo(w, toY(0));
    ctx.stroke();
    ctx.beginPath();
    for (var kk = -3; kk <= 3; kk++) {
      if (kk === 0) continue;
      var x = toX(kk * S), y = toY(kk * S);
      ctx.moveTo(x, toY(0) - 4); ctx.lineTo(x, toY(0) + 4);
      ctx.moveTo(toX(0) - 4, y); ctx.lineTo(toX(0) + 4, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = colMuted; ctx.font = "10px " + colMono; ctx.textBaseline = "middle";
    ctx.fillText("q", w - 12, toY(0) - 8);
    ctx.fillText("p", toX(0) + 8, 10);

    // correctable region: dashed ±s/2 box (tip inside → clean correction)
    ctx.save();
    ctx.strokeStyle = colMuted; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(toX(-S / 2), toY(S / 2),
      toX(S / 2) - toX(-S / 2), toY(-S / 2) - toY(S / 2));
    ctx.restore();

    // accumulated displacement arrow from origin
    if (dispQ * dispQ + dispP * dispP > 1e-4) {
      var ox = toX(0), oy = toY(0), axx = toX(dispQ), ayy = toY(dispP);
      ctx.strokeStyle = ctx.fillStyle =
        "rgb(" + accent[0] + "," + accent[1] + "," + accent[2] + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(axx, ayy); ctx.stroke();
      var ah = Math.atan2(ayy - oy, axx - ox), hl = 8;
      ctx.beginPath();
      ctx.moveTo(axx, ayy);
      ctx.lineTo(axx - hl * Math.cos(ah - 0.4), ayy - hl * Math.sin(ah - 0.4));
      ctx.lineTo(axx - hl * Math.cos(ah + 0.4), ayy - hl * Math.sin(ah + 0.4));
      ctx.closePath(); ctx.fill();
    }

    var neg = res.raw / baseline;
    readout.textContent = compose(g, neg.toFixed(2));
    return neg; // ratio actually rendered; reused by the recovery tween
  }

  // Bounded eased tween shared by recovery + displacement: set(e) draws the
  // frame, done() finalizes. A fresh call bumps animToken → in-flight loop bails.
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function tween(steps, ms, set, done) {
    var token = ++animToken, step = 0;
    animating = true;
    (function tick() {
      if (token !== animToken) return; // superseded
      set(easeOutCubic(++step / steps));
      if (step < steps) { setTimeout(tick, ms); return; }
      animating = false;
      if (done) done();
    })();
  }

  function applyRecovery() {
    var g = parseFloat(gInput.value);
    if (g === 0) return; // already ideal — visual no-op
    var before = compute(sigmaEff, negScaleEff, dispQ, dispP, parity).raw / baseline;

    // diminishing returns: each recovery (sans slider move) fixes 60% of the last
    var fraction = 0.35 * Math.pow(0.6, recoveryStep++);
    var sig0 = sigmaEff, neg0 = negScaleEff;
    var sig1 = Math.max(SIG0, sig0 - fraction * (sig0 - SIG0));
    var neg1 = Math.min(1, neg0 + fraction * (1 - neg0));

    // re-sharpens σ / restores negativity; does NOT touch displacement
    tween(20, 30, function (e) {
      sigmaEff = sig0 + (sig1 - sig0) * e;
      negScaleEff = neg0 + (neg1 - neg0) * e;
      var cur = draw();
      readout.textContent = compose(g, before.toFixed(2) + " → " + cur.toFixed(2));
    });
  }

  // displacement game
  // mono readout: γ · negativity · tally · outcome
  function compose(g, negStr) {
    var t = "γ = " + g.toFixed(2) + " · negativity " + negStr +
      " · corrected " + corrected + " · logical " + logical;
    return lastEvent ? t + " · " + lastEvent : t;
  }

  // Slide the comb (q0,p0)→(q1,p1) over ~350ms, then done() + settle redraw.
  function animateDisplace(q0, p0, q1, p1, done) {
    tween(16, 22, function (e) {
      dispQ = q0 + (q1 - q0) * e;
      dispP = p0 + (p1 - p0) * e;
      draw();
    }, function () {
      dispQ = q1; dispP = p1;
      if (done) done();
      draw();
    });
  }

  // Random displacement error, magnitude ~ γ, uniform direction; accumulates.
  function kick() {
    if (animating) return; // guard while animating
    var g = parseFloat(gInput.value);
    var mag = S * (0.12 + g * 0.75) * (0.55 + Math.random());
    var ang = Math.random() * 6.2831853, lim = 2.2 * S;
    var tq = Math.max(-lim, Math.min(lim, dispQ + mag * Math.cos(ang)));
    var tp = Math.max(-lim, Math.min(lim, dispP + mag * Math.sin(ang)));
    lastEvent = "";
    animateDisplace(dispQ, dispP, tq, tp, null);
  }

  // Syndrome correction: round(disp/s)===0 ⇒ correctable, else wrong site ⇒
  // logical error on that axis (q→X, p→Z, both→Y) + checkerboard flip.
  function correct() {
    if (animating) return;
    var errQ = Math.round(dispQ / S) !== 0, errP = Math.round(dispP / S) !== 0;
    animateDisplace(dispQ, dispP, 0, 0, function () {
      corrected++;
      if (errQ || errP) {
        logical++;
        parity = -parity;
        lastEvent = "logical " + (errQ && errP ? "Y" : errQ ? "X" : "Z") + " error";
        resetBtn.style.display = "";
      } else {
        lastEvent = "corrected ✓";
      }
    });
  }

  // silent errors are uncorrectable — only a fresh state clears them
  function resetState() {
    animToken++; // cancel any in-flight animation
    animating = false;
    dispQ = dispP = 0; parity = 1; corrected = logical = 0; lastEvent = "";
    resetBtn.style.display = "none";
    draw();
  }

  // coalesce rapid slider `input` into a leading + trailing (~40ms) redraw
  var drawTimer = null, drawPending = false;
  function safeDraw() { if (!animating) draw(); }
  function requestDraw() {
    if (drawTimer === null) {
      safeDraw();
      drawTimer = setTimeout(function () {
        drawTimer = null;
        if (drawPending) { drawPending = false; safeDraw(); }
      }, 40);
    } else {
      drawPending = true;
    }
  }

  gInput.addEventListener("input", function () { resetRecovery(); requestDraw(); });
  recoverBtn.addEventListener("click", applyRecovery);
  kickBtn.addEventListener("click", kick);
  correctBtn.addEventListener("click", correct);
  resetBtn.addEventListener("click", resetState);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); draw(); }, 150);
  });

  resetRecovery();
  size();
  draw();
})();
