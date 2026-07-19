// Interference lab: two draggable coherent point sources, expanding
// wavefronts, a faint static intensity field, and the cos^2 curve.
(function () {
  "use strict";
  var mount = document.getElementById("demo-slit-mount");
  if (!mount) return;
  var rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = document.createElement("canvas");
  cv.width = 960;
  cv.height = 420;
  cv.style.touchAction = "none";
  cv.setAttribute("aria-hidden", "true");
  mount.appendChild(cv);
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
  var dInput = slider("separation", 6, 140, 48);
  var lamInput = slider("Wavelength (λ)", 8, 60, 22);
  var readout = document.createElement("span");
  readout.className = "demo-readout";
  controls.appendChild(readout);
  mount.appendChild(controls);
  var ctx = cv.getContext("2d");
  var colors = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors.fg = cs.getPropertyValue("--fg").trim() || "#1a1a1a";
    colors.muted = cs.getPropertyValue("--muted").trim() || "#6b6b66";
    colors.accent = cs.getPropertyValue("--accent").trim() || "#1f3fbf";
    colors.rule = cs.getPropertyValue("--rule").trim() || "rgba(26,26,26,0.12)";
    colors.mono = cs.getPropertyValue("--font-mono").trim() || "monospace";
  }
  var w = 0, h = 0;
  function size() {
    var rect = cv.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    w = rect.width || cv.width;
    h = rect.height || cv.height;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  var s1 = { fx: 0.14, fy: 0.5 }, s2 = { fx: 0.14, fy: 0.5 };
  function initSrc() {
    var d0 = parseFloat(dInput.value);
    s1 = { fx: 0.14, fy: 0.5 - (d0 / 2) / h };
    s2 = { fx: 0.14, fy: 0.5 + (d0 / 2) / h };
  }
  var p1 = { x: 0, y: 0 }, p2 = { x: 0, y: 0 };
  var CELL = 8;
  var hc = document.createElement("canvas");
  var hctx = hc.getContext("2d");
  function sizeHeat() {
    hc.width = Math.max(1, Math.round(w / CELL));
    hc.height = Math.max(1, Math.round(h / CELL));
  }
  function accentRGB() {
    var n = parseInt(colors.accent.replace("#", ""), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function recompHeat() {
    readColors();
    var gw = hc.width, gh = hc.height;
    if (gw < 1 || gh < 1) return;
    var rgb = accentRGB();
    var lam = parseFloat(lamInput.value);
    var sx1 = s1.fx * w, sy1 = s1.fy * h, sx2 = s2.fx * w, sy2 = s2.fy * h;
    var img = hctx.createImageData(gw, gh);
    var data = img.data;
    var i = 0;
    for (var gy = 0; gy < gh; gy++) {
      var py = (gy + 0.5) * CELL;
      for (var gx = 0; gx < gw; gx++, i += 4) {
        var px = (gx + 0.5) * CELL;
        var r1 = Math.hypot(px - sx1, py - sy1);
        var r2 = Math.hypot(px - sx2, py - sy2);
        var inten = Math.pow(Math.cos((Math.PI * (r2 - r1)) / lam), 2);
        data[i] = rgb.r; data[i + 1] = rgb.g; data[i + 2] = rgb.b;
        data[i + 3] = Math.round(inten * 45);
      }
    }
    hctx.putImageData(img, 0, 0);
  }
  var heatTimer = null;
  function schedHeat(immediate) {
    if (immediate) {
      if (heatTimer) { clearTimeout(heatTimer); heatTimer = null; }
      recompHeat();
      return;
    }
    if (heatTimer) return;
    heatTimer = setTimeout(function () {
      heatTimer = null;
      recompHeat();
    }, 90);
  }
  function ringAlpha(r, maxR, lam) {
    if (r <= 0) return 0;
    var fadeIn = Math.min(1, r / (lam * 0.8));
    var frac = r / maxR;
    if (frac >= 1) return 0;
    return 0.34 * fadeIn * Math.pow(1 - frac, 1.5);
  }
  function fringeSpacing(pt1, pt2, sx, midY, h, lam) {
    var step = 0.5;
    var prev = -2, prevPrev = -2;
    for (var y = midY + step; y <= h; y += step) {
      var r1 = Math.hypot(sx - pt1.x, y - pt1.y);
      var r2 = Math.hypot(sx - pt2.x, y - pt2.y);
      var inten = Math.pow(Math.cos((Math.PI * (r2 - r1)) / lam), 2);
      if (prevPrev > -2 && prev > inten && prev > prevPrev) return (y - step) - midY;
      prevPrev = prev;
      prev = inten;
    }
    return null;
  }
  function hitTest(px, py) {
    var d1 = Math.hypot(px - p1.x, py - p1.y);
    var d2 = Math.hypot(px - p2.x, py - p2.y);
    if (d1 <= 16 && d1 <= d2) return 0;
    if (d2 <= 16) return 1;
    return -1;
  }
  var t = 0;
  var drag = -1, hover = -1;
  function draw() {
    readColors();
    var lam = parseFloat(lamInput.value);
    ctx.clearRect(0, 0, w, h);
    var sx = w * 0.92;
    var midY = h / 2;
    var maxR = Math.sqrt(w * w + h * h);
    p1.x = s1.fx * w; p1.y = s1.fy * h;
    p2.x = s2.fx * w; p2.y = s2.fy * h;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hc, 0, 0, hc.width, hc.height, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.strokeStyle = colors.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
    ctx.save();
    ctx.fillStyle = colors.muted;
    ctx.font = "10px " + colors.mono;
    ctx.textBaseline = "middle";
    ctx.translate(sx + 11, h - 10);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("screen", 0, 0);
    ctx.restore();
    var phase = rm ? 0 : t % lam;
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    [p1, p2].forEach(function (sp) {
      for (var k = 0, r = phase; r < maxR && k < 60; k++, r = phase + k * lam) {
        var a = ringAlpha(r, maxR, lam);
        if (a <= 0.003) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    var barMax = w * 0.22;
    var step = Math.max(1, Math.floor(h / 300));
    var grad = ctx.createLinearGradient(sx - barMax, 0, sx, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, colors.accent);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    for (var y = 0; y <= h; y += step) {
      var r1 = Math.hypot(sx - p1.x, y - p1.y);
      var r2 = Math.hypot(sx - p2.x, y - p2.y);
      var ph = (Math.PI * (r2 - r1)) / lam;
      ctx.lineTo(sx - Math.pow(Math.cos(ph), 2) * barMax, y);
    }
    ctx.lineTo(sx, h);
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 0.75;
    [p1, p2].forEach(function (sp, i) {
      if (i === hover || i === drag) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = 0.16;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent;
      ctx.fill();
      ctx.stroke();
    });
    var sep = Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y));
    var dy = fringeSpacing(p1, p2, sx, midY, h, lam);
    var dyText = dy === null ? "Δy → ∞" : "Δy ≈ " + Math.round(dy) + " px";
    readout.textContent = "d ≈ " + sep + " px · λ = " + lam + " px · " + dyText;
  }
  var rafId = null;
  function loop() {
    t += 0.6;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (rafId === null && !rm) rafId = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) startLoop();
      else stopLoop();
    }, { threshold: 0 });
    observer.observe(cv);
  } else if (!rm) {
    startLoop();
  }
  dInput.addEventListener("input", function () {
    var v = parseFloat(dInput.value);
    var meanFx = (s1.fx + s2.fx) / 2;
    s1.fx = meanFx; s2.fx = meanFx;
    s1.fy = 0.5 - (v / 2) / h;
    s2.fy = 0.5 + (v / 2) / h;
    schedHeat(true);
    draw();
  });
  lamInput.addEventListener("input", function () {
    schedHeat(true);
    draw();
  });
  cv.addEventListener("pointerdown", function (e) {
    var rect = cv.getBoundingClientRect();
    var idx = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (idx < 0) return;
    drag = idx;
    cv.setPointerCapture(e.pointerId);
    cv.style.cursor = "grabbing";
    e.preventDefault();
  });
  cv.addEventListener("pointermove", function (e) {
    var rect = cv.getBoundingClientRect();
    var px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (drag >= 0) {
      var cx = Math.max(6, Math.min(w * 0.4, px));
      var cy = Math.max(6, Math.min(h - 6, py));
      var s = drag === 0 ? s1 : s2;
      s.fx = cx / w; s.fy = cy / h;
      schedHeat(false);
      draw();
    } else {
      var next = hitTest(px, py);
      if (next !== hover) {
        hover = next;
        cv.style.cursor = hover >= 0 ? "grab" : "default";
        draw();
      }
    }
  });
  function endDrag() {
    if (drag < 0) return;
    drag = -1;
    cv.style.cursor = hover >= 0 ? "grab" : "default";
    schedHeat(true);
    draw();
  }
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);
  cv.addEventListener("pointerleave", function () {
    if (drag < 0 && hover >= 0) {
      hover = -1;
      cv.style.cursor = "default";
      draw();
    }
  });
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      size();
      sizeHeat();
      schedHeat(true);
      draw();
    }, 150);
  });
  size();
  initSrc();
  sizeHeat();
  schedHeat(true);
  draw();
})();