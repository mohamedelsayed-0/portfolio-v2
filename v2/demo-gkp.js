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
  // scaled by (1−γ) so they fade out under noise. Envelope terms below 1e-4
  // are skipped, but for m,n∈[-3,3] none are (worst case ≈ 0.039).
  function compute(g) {
    var sig = SIG0 * (1 + 2 * g);
    var s2 = 2 * sig * sig;
    var sumNeg = 0, sumAll = 0, wmax = 0;
    var dqx = (2 * HALF) / GX, dpy = (2 * HALF) / GY;
    // precompute per-site amplitude and center
    var amps = [], cx = [], cy = [];
    for (var m = -3; m <= 3; m++) {
      for (var n = -3; n <= 3; n++) {
        var env = Math.exp(-(m * m + n * n) * 2 * DELTA * DELTA);
        if (env < 1e-4) continue;
        var neg = (m & 1) && (n & 1);
        var a = neg ? -env * (1 - g) : env;
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
  var baseline = compute(0).raw || 1;

  // ---------- render ----------
  function toX(q) { return w * (0.5 + q / (2 * HALF)); }
  function toY(p) { return h * (0.5 - p / (2 * HALF)); }

  function draw() {
    readColors();
    var g = parseFloat(gInput.value);
    var res = compute(g);
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

  // ---------- events: static render on input / resize / theme only ----------
  gInput.addEventListener("input", draw);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); draw(); }, 150);
  });

  size();
  draw();
})();
