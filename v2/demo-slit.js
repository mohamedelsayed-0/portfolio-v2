// Interference lab — two coherent point sources, expanding wavefronts, and
// the resulting cos^2 intensity profile rendered as a filled curve.

(function () {
  "use strict";

  var mount = document.getElementById("demo-slit-mount");
  if (!mount) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- build DOM ----------
  var canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 420;
  canvas.setAttribute("aria-hidden", "true");
  mount.appendChild(canvas);

  var controls = document.createElement("div");
  controls.className = "demo-controls";

  function slider(text, min, max, value) {
    var label = document.createElement("label");
    label.appendChild(document.createTextNode(text + " "));
    var input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.step = "1";
    label.appendChild(input);
    controls.appendChild(label);
    return input;
  }

  var dInput = slider("Separation (d)", 6, 140, 48);
  var lambdaInput = slider("Wavelength (λ)", 8, 60, 22);

  var readout = document.createElement("span");
  readout.className = "demo-readout";
  controls.appendChild(readout);

  mount.appendChild(controls);

  var ctx = canvas.getContext("2d");

  // ---------- theme colors ----------
  var colors = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors.fg = cs.getPropertyValue("--fg").trim() || "#1a1a1a";
    colors.muted = cs.getPropertyValue("--muted").trim() || "#6b6b66";
    colors.accent = cs.getPropertyValue("--accent").trim() || "#1f3fbf";
    colors.rule = cs.getPropertyValue("--rule").trim() || "rgba(26,26,26,0.12)";
    colors.mono = cs.getPropertyValue("--font-mono").trim() || "monospace";
  }
  readColors();

  // ---------- sizing (devicePixelRatio-aware) ----------
  var w = 0, h = 0;
  function size() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    w = rect.width || canvas.width;
    h = rect.height || canvas.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- helpers ----------
  // Per-ring alpha: fades in near the source (r small) and fades out
  // smoothly toward maxRadius, so wavefronts never pop in or vanish.
  function ringAlpha(r, maxRadius, lambda) {
    if (r <= 0) return 0;
    var fadeIn = r / (lambda * 0.8);
    if (fadeIn > 1) fadeIn = 1;
    var frac = r / maxRadius;
    if (frac >= 1) return 0;
    var fadeOut = Math.pow(1 - frac, 1.5);
    return 0.34 * fadeIn * fadeOut;
  }

  // Measures the fringe spacing directly from the same intensity law used
  // to draw the curve: walk outward from the midline and find the first
  // local maximum (the m=1 fringe). Returns null if it falls off-screen
  // (e.g. d too small / λ too large — the fringes are wider than the view).
  function measureFringeSpacing(sourceX, screenX, y1, y2, lambda, midY, h) {
    var dx = screenX - sourceX;
    var step = 0.5;
    var prev = -2, prevPrev = -2;
    for (var y = midY + step; y <= h; y += step) {
      var r1 = Math.hypot(dx, y - y1);
      var r2 = Math.hypot(dx, y - y2);
      var inten = Math.pow(Math.cos((Math.PI * (r2 - r1)) / lambda), 2);
      if (prevPrev > -2 && prev > inten && prev > prevPrev) return (y - step) - midY;
      prevPrev = prev;
      prev = inten;
    }
    return null;
  }

  // ---------- physics + draw ----------
  var t = 0;

  function draw() {
    var d = parseFloat(dInput.value);
    var lambda = parseFloat(lambdaInput.value);

    ctx.clearRect(0, 0, w, h);

    var sourceX = w * 0.14;
    var screenX = w * 0.92;
    var midY = h / 2;
    var y1 = midY - d / 2;
    var y2 = midY + d / 2;
    var maxRadius = Math.sqrt(w * w + h * h);

    // screen plane
    ctx.strokeStyle = colors.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, h);
    ctx.stroke();

    // "screen" label, tiny mono caption beside the screen edge
    ctx.save();
    ctx.fillStyle = colors.muted;
    ctx.font = "10px " + colors.mono;
    ctx.textBaseline = "middle";
    ctx.translate(screenX + 11, h - 10);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("screen", 0, 0);
    ctx.restore();

    // expanding wavefronts: continuous phase, per-ring fade in/out (no pop)
    var phase = reduceMotion ? 0 : t % lambda;
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    [y1, y2].forEach(function (sy) {
      for (var k = 0, r = phase; r < maxRadius && k < 60; k++, r = phase + k * lambda) {
        var a = ringAlpha(r, maxRadius, lambda);
        if (a <= 0.003) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(sourceX, sy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // intensity profile: I(y) = cos^2(pi * pathDiff / lambda)
    var barMax = w * 0.22;
    var step = Math.max(1, Math.floor(h / 300));
    var grad = ctx.createLinearGradient(screenX - barMax, 0, screenX, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, colors.accent);
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    for (var y = 0; y <= h; y += step) {
      var r1 = Math.hypot(screenX - sourceX, y - y1);
      var r2 = Math.hypot(screenX - sourceX, y - y2);
      var diff = r2 - r1;
      var ph = (2 * Math.PI * diff) / lambda;
      var intensity = Math.pow(Math.cos(ph / 2), 2);
      ctx.lineTo(screenX - intensity * barMax, y);
    }
    ctx.lineTo(screenX, h);
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // sources: small accent points
    ctx.fillStyle = colors.accent;
    [y1, y2].forEach(function (sy) {
      ctx.beginPath();
      ctx.arc(sourceX, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 0.75;
    [y1, y2].forEach(function (sy) {
      ctx.beginPath();
      ctx.arc(sourceX, sy, 3, 0, Math.PI * 2);
      ctx.stroke();
    });

    var dy = measureFringeSpacing(sourceX, screenX, y1, y2, lambda, midY, h);
    var dyText = dy === null ? "Δy → ∞" : "Δy ≈ " + Math.round(dy) + " px";
    readout.textContent = "d = " + d + " px · λ = " + lambda + " px · " + dyText;
  }

  // ---------- animation loop, paused off-viewport ----------
  var rafId = null;
  function loop() {
    t += 0.6;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (rafId === null && !reduceMotion) rafId = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) startLoop();
      else stopLoop();
    }, { threshold: 0 });
    observer.observe(canvas);
  } else if (!reduceMotion) {
    startLoop();
  }

  // sliders always trigger at least a single redraw, loop or not
  dInput.addEventListener("input", draw);
  lambdaInput.addEventListener("input", draw);

  // debounced resize redraw
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      size();
      draw();
    }, 150);
  });

  size();
  draw();
})();
