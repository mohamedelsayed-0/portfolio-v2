// Mohamed Elsayed — portfolio v2. Wigner-surface hero + palette/theme/clock.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Theme toggle (light <-> dark) ----------
  var THEME_COLORS = { light: "#fafaf7", dark: "#161614" };

  function effectiveTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }

  function syncThemeUI(theme) {
    var btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
  }

  function toggleTheme() {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncThemeUI(next);
    window.dispatchEvent(new Event("resize"));
  }

  syncThemeUI(effectiveTheme());
  var themeBtn = document.getElementById("theme-btn");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // ---------- Dual-timezone footer clock ----------
  var clockEl = document.getElementById("clock");
  if (clockEl) {
    var tzFmt = function (tz) {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz
      }).format(new Date());
    };
    var tickClock = function () {
      clockEl.textContent = "Toronto " + tzFmt("America/Toronto") + " · Cairo " + tzFmt("Africa/Cairo");
    };
    tickClock();
    setInterval(tickClock, 30000);
  }

  // ---------- Reading hairline: scroll-progress bar ----------
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  document.body.appendChild(progress);
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var frac = max > 0 ? window.scrollY / max : 0;
    progress.style.transform = "scaleX(" + Math.max(0, Math.min(1, frac)) + ")";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  // ---------- Hero: 3D Wigner surface of a finite-energy GKP qubit ----------
  var canvas = document.getElementById("wave");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var readout = document.getElementById("wave-readout");

    var S = Math.sqrt(Math.PI);
    var GX = 48, GY = 36;
    var HALF = 3.2 * S;
    var SIG = 0.22 * S, DELTA0 = 0.30;
    var SWFAC = 1.8;
    var ZAMP = 0.62;
    var PITCH = 0.5, YAWMAX = 1.22, CAM = 4.0;
    var NEG = [192, 80, 77];

    function cssRGB(name, fb) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v.charAt(0) === "#") {
        var hx = v.slice(1);
        if (hx.length === 3) hx = hx[0] + hx[0] + hx[1] + hx[1] + hx[2] + hx[2];
        var num = parseInt(hx, 16);
        if (!isNaN(num)) return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
      }
      var mm = v.match(/\d+/g);
      if (mm && mm.length >= 3) return [+mm[0], +mm[1], +mm[2]];
      return fb;
    }

    var siteR2 = [], siteSign = [];
    for (var m0 = -3; m0 <= 3; m0++)
      for (var n0 = -3; n0 <= 3; n0++) {
        siteR2.push(m0 * m0 + n0 * n0);
        siteSign.push(((m0 & 1) && (n0 & 1)) ? -1 : 1);
      }
    var NS = siteR2.length;

    var NV = GX * GY;
    var mx = new Float32Array(NV), my = new Float32Array(NV);
    var gauss = new Float32Array(NV * NS);
    var gaussW = new Float32Array(NV * NS);
    (function build() {
      var s2 = 2 * SIG * SIG, sw = SIG * SWFAC, s2w = 2 * sw * sw, k = 0;
      for (var j = 0; j < GY; j++) {
        var p = HALF - (2 * HALF) * j / (GY - 1);
        for (var i = 0; i < GX; i++, k++) {
          var q = -HALF + (2 * HALF) * i / (GX - 1);
          mx[k] = q / HALF; my[k] = p / HALF;
          var t = 0;
          for (var mm = -3; mm <= 3; mm++)
            for (var nn = -3; nn <= 3; nn++, t++) {
              var dq = q - mm * S, dp = p - nn * S, r2 = dq * dq + dp * dp;
              gauss[k * NS + t] = Math.exp(-r2 / s2);
              gaussW[k * NS + t] = Math.exp(-r2 / s2w);
            }
        }
      }
    })();

    var zc = new Float32Array(NV);
    var hn = new Float32Array(NV);
    var amp = new Float64Array(NS);
    var invWmax = 1;

    function envAmps(delta, ns) {
      var f = 2 * delta * delta; ns = ns == null ? 1 : ns;
      for (var t = 0; t < NS; t++) {
        var a = siteSign[t] * Math.exp(-siteR2[t] * f);
        amp[t] = siteSign[t] < 0 ? a * ns : a;
      }
    }

    function computeHeights(delta, sw, ns) {
      envAmps(delta, ns);
      for (var k = 0; k < NV; k++) {
        var W = 0, base = k * NS, t;
        if (sw > 0) for (t = 0; t < NS; t++) { var g = gauss[base + t]; W += amp[t] * (g + (gaussW[base + t] - g) * sw); }
        else for (t = 0; t < NS; t++) W += amp[t] * gauss[base + t];
        var v = W * invWmax; hn[k] = v; zc[k] = v * ZAMP;
      }
    }

    (function baseline() {
      envAmps(DELTA0);
      var wmax = 1e-6;
      for (var k = 0; k < NV; k++) {
        var W = 0, base = k * NS;
        for (var t = 0; t < NS; t++) W += amp[t] * gauss[base + t];
        var a = W < 0 ? -W : W;
        if (a > wmax) wmax = a;
      }
      invWmax = 1 / wmax;
    })();

    var sa = [], sb = [];
    for (var jj = 0; jj < GY; jj++)
      for (var ii = 0; ii < GX - 1; ii++) { sa.push(jj * GX + ii); sb.push(jj * GX + ii + 1); }
    for (var j2 = 0; j2 < GY - 1; j2++)
      for (var i2 = 0; i2 < GX; i2++) { sa.push(j2 * GX + i2); sb.push(j2 * GX + i2 + GX); }
    var segA = Int32Array.from(sa), segB = Int32Array.from(sb);
    var NSEG = segA.length;
    var order = new Int32Array(NSEG);
    for (var so = 0; so < NSEG; so++) order[so] = so;
    var segD = new Float32Array(NSEG);

    var px = new Float32Array(NV), py = new Float32Array(NV);
    var pf = new Float32Array(NV), dep = new Float32Array(NV);

    var w = 0, h = 0, scaleX = 1, scaleY = 1, ox = 0, oy = 0;
    function size() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      w = rect.width || 600; h = rect.height || 150;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scaleY = (h * 0.5 - 8) / 1.1;
      var fitX = (w * 0.5 - 8) / 2.3;
      scaleX = Math.min(fitX, scaleY * 1.7);
      ox = w * 0.5; oy = h * 0.5 + 6;
    }

    function project(yaw) {
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var cp = Math.cos(PITCH), sp = Math.sin(PITCH);
      for (var k = 0; k < NV; k++) {
        var X = mx[k], Y = my[k], Z = zc[k];
        var x1 = X * cy - Y * sy;
        var y1 = X * sy + Y * cy;
        var y2 = y1 * cp - Z * sp;
        var z2 = y1 * sp + Z * cp;
        var persp = CAM / (CAM + y2);
        px[k] = ox + x1 * persp * scaleX;
        py[k] = oy - z2 * persp * scaleY;
        dep[k] = y2;
        pf[k] = persp;
      }
    }

    var ACC, MUT, delta = DELTA0;
    function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
    function colorStr(hh, fade) {
      var mag = hh < 0 ? -hh : hh, r, g, bl, f;
      if (hh >= 0) { f = Math.min(1, hh / 0.45); r = lerp(MUT[0], ACC[0], f); g = lerp(MUT[1], ACC[1], f); bl = lerp(MUT[2], ACC[2], f); }
      else { f = Math.min(1, mag / 0.30); r = lerp(MUT[0], NEG[0], f); g = lerp(MUT[1], NEG[1], f); bl = lerp(MUT[2], NEG[2], f); }
      var alpha = (0.20 + 0.75 * Math.min(1, mag / 0.45)) * fade;
      return "rgba(" + r + "," + g + "," + bl + "," + alpha.toFixed(3) + ")";
    }

    function drawFrame(yaw) {
      ACC = cssRGB("--accent", [31, 63, 191]);
      MUT = cssRGB("--muted", [107, 107, 102]);
      project(yaw);

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      var cp = Math.cos(PITCH), sp = Math.sin(PITCH), cyw = Math.cos(yaw), syw = Math.sin(yaw);
      ctx.strokeStyle = "rgba(" + MUT[0] + "," + MUT[1] + "," + MUT[2] + ",0.15)";
      ctx.beginPath();
      for (var d = 0; d < NV; d++) {
        if (hn[d] < 0.62) continue;
        var X = mx[d], Y = my[d];
        var x1 = X * cyw - Y * syw, y1 = X * syw + Y * cyw;
        var y2b = y1 * cp, pb = CAM / (CAM + y2b);
        ctx.moveTo(px[d], py[d]);
        ctx.lineTo(ox + x1 * pb * scaleX, oy - (y1 * sp) * pb * scaleY);
      }
      ctx.stroke();

      for (var s = 0; s < NSEG; s++) segD[s] = (dep[segA[s]] + dep[segB[s]]) * 0.5;
      Array.prototype.sort.call(order, function (a, b) { return segD[b] - segD[a]; });

      var cache = {};
      for (var oi = 0; oi < NSEG; oi++) {
        var si = order[oi], a = segA[si], b = segB[si];
        var hh = (hn[a] + hn[b]) * 0.5;
        var fade = ((pf[a] + pf[b]) * 0.5 - 0.72) / 0.9;
        if (fade < 0) fade = 0; else if (fade > 1) fade = 1;
        fade = 0.45 + 0.55 * fade;
        var key = Math.round(hh * 40) + "_" + Math.round(fade * 16);
        var col = cache[key] || (cache[key] = colorStr(hh, fade));
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(px[a], py[a]);
        ctx.lineTo(px[b], py[b]);
        ctx.stroke();
      }

      if (readout) readout.textContent = pulsing
        ? "thermal pulse · negativity " + negVal.toFixed(2)
        : "W(q,p) · GKP |0⟩ · Δ = " + delta.toFixed(2);
    }

    var yaw = reduceMotion ? 0.6 : 0;
    var autoDir = 1, lastDrag = -1e9, dragging = false, dragX0 = 0, yaw0 = 0;
    var TAPMS = 200, TAPPX = 6, downT = 0, downX = 0, downY = 0, downMax = 0;
    var DECOH = 400, HOLD = 600, REC = 1200, STEP = 0.9, DCAP = 1, NEGFLOOR = 0.05;
    var S_BACK = 1.3, NEG0 = 0.41;
    var pulsing = false, deg = 0, degMax = 0, degAtTap = 0, tapTime = 0, negVal = NEG0, rmTimer = 0, breathPhase = 0;
    function now() { return window.performance && performance.now ? performance.now() : Date.now(); }

    function pulseDeg(t) {
      var e = t - tapTime, f, u;
      if (e < DECOH) { f = e / DECOH; f = f * f * (3 - 2 * f); return degAtTap + (degMax - degAtTap) * f; }
      if ((e -= DECOH) < HOLD) return degMax;
      if ((e -= HOLD) < REC) { u = e / REC - 1; return degMax * -(u * u * ((S_BACK + 1) * u + S_BACK)); }
      pulsing = false; return 0;
    }

    function fireTap() {
      if (reduceMotion) {
        pulsing = true; deg = 1; negVal = 0;
        computeHeights(DELTA0, 1, NEGFLOOR); drawFrame(yaw);
        if (rmTimer) clearTimeout(rmTimer);
        rmTimer = setTimeout(function () { pulsing = false; deg = 0; computeHeights(DELTA0); drawFrame(yaw); }, 800);
        return;
      }
      degAtTap = deg;
      degMax = Math.min(DCAP, (pulsing ? degMax : 0) + STEP);
      tapTime = now(); pulsing = true;
    }

    function onDown(e) {
      dragging = true; dragX0 = e.clientX; yaw0 = yaw;
      downT = now(); downX = e.clientX; downY = e.clientY; downMax = 0;
      if (canvas.setPointerCapture && e.pointerId != null) { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} }
    }
    function onMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      var dx = e.clientX - downX, dy = e.clientY - downY, d = Math.sqrt(dx * dx + dy * dy);
      if (d > downMax) downMax = d;
      yaw = yaw0 + (e.clientX - dragX0) * 0.006;
      if (yaw > YAWMAX) yaw = YAWMAX; else if (yaw < -YAWMAX) yaw = -YAWMAX;
      if (reduceMotion) drawFrame(yaw);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false; lastDrag = now();
      if ((now() - downT) <= TAPMS && downMax < TAPPX) fireTap();
    }
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    if (reduceMotion) {
      size();
      computeHeights(DELTA0);
      drawFrame(yaw);
      window.addEventListener("resize", function () { size(); computeHeights(DELTA0); drawFrame(yaw); });
    } else {
      size();
      window.addEventListener("resize", size);
      computeHeights(DELTA0);
      var last = now();
      (function loop() {
        var t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
        if (!dragging && (t - lastDrag) > 3000) {
          yaw += autoDir * 0.18 * dt;
          if (yaw > 0.55) autoDir = -1; else if (yaw < -0.55) autoDir = 1;
        }
        if (pulsing) {
          deg = pulseDeg(t);
          negVal = NEG0 * (1 - deg); if (negVal < 0) negVal = 0;
          var swv = deg < 0 ? 0 : (deg > 1 ? 1 : deg);
          computeHeights(DELTA0, swv, 1 - deg * (1 - NEGFLOOR));
        } else {
          breathPhase += dt;
          delta = DELTA0 * (1 + 0.10 * Math.sin(breathPhase * (2 * Math.PI / 6)));
          computeHeights(delta);
        }
        drawFrame(yaw);
        requestAnimationFrame(loop);
      })();
    }
  }

  // ---------- Homepage side rail: scrollspy ----------
  var rail = document.querySelector("nav.side-rail");
  if (rail) {
    var railLinks = Array.prototype.slice.call(rail.querySelectorAll("a[href^='#']"));
    var targets = railLinks
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (targets.length && "IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          railLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href").slice(1) === en.target.id);
          });
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      targets.forEach(function (t) { spy.observe(t); });
    }
    railLinks.forEach(function (a) {
      a.addEventListener("click", function () {
        railLinks.forEach(function (x) { x.classList.remove("active"); });
        a.classList.add("active");
      });
    });
  }

  // ---------- Demos: card -> modal ----------
  var showCards = document.querySelectorAll(".show-card[data-modal]");
  if (showCards.length) {
    var modalOverlay = null, modalPanel = null, modalBody = null, modalLastFocus = null;
    var FOCUSABLE = "button, a[href], input, textarea, select, [tabindex]:not([tabindex='-1'])";

    function buildOverlay() {
      modalOverlay = document.createElement("div");
      modalOverlay.id = "show-modal-overlay";
      modalOverlay.className = "show-modal-overlay";
      modalOverlay.hidden = true;
      modalPanel = document.createElement("div");
      modalPanel.className = "show-modal";
      modalPanel.setAttribute("role", "dialog");
      modalPanel.setAttribute("aria-modal", "true");
      modalPanel.setAttribute("tabindex", "-1");
      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "show-modal-close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", closeModal);
      modalBody = document.createElement("div");
      modalBody.className = "show-modal-body";
      modalPanel.appendChild(closeBtn);
      modalPanel.appendChild(modalBody);
      modalOverlay.appendChild(modalPanel);
      modalOverlay.addEventListener("mousedown", function (e) {
        if (e.target === modalOverlay) closeModal();
      });
      document.body.appendChild(modalOverlay);
    }

    function openModal(tplId) {
      var tpl = document.getElementById(tplId);
      if (!tpl || !("content" in tpl)) return;
      if (!modalOverlay) buildOverlay();
      modalBody.innerHTML = "";
      modalBody.appendChild(tpl.content.cloneNode(true));
      modalLastFocus = document.activeElement;
      modalOverlay.hidden = false;
      document.body.classList.add("modal-open");
      var f = modalPanel.querySelector(FOCUSABLE);
      (f || modalPanel).focus();
    }

    function closeModal() {
      if (!modalOverlay || modalOverlay.hidden) return;
      modalOverlay.hidden = true;
      document.body.classList.remove("modal-open");
      if (modalLastFocus && modalLastFocus.focus) modalLastFocus.focus();
    }

    document.addEventListener("keydown", function (e) {
      if (!modalOverlay || modalOverlay.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
      if (e.key === "Tab") {
        var f = modalPanel.querySelectorAll(FOCUSABLE);
        if (!f.length) { e.preventDefault(); modalPanel.focus(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    Array.prototype.forEach.call(showCards, function (card) {
      card.addEventListener("click", function () { openModal(card.getAttribute("data-modal")); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          openModal(card.getAttribute("data-modal"));
        }
      });
    });
  }

  // ---------- Command palette (Mohamed's "search") ----------
  var destinations = [
    { label: "Home", hint: "index", url: "index.html" },
    { label: "Now", hint: "section", url: "index.html#now" },
    { label: "Timeline", hint: "section", url: "index.html#timeline" },
    { label: "Experience", hint: "section", url: "index.html#experience" },
    { label: "In My Lifetime", hint: "section", url: "index.html#lifetime" },
    { label: "Projects", hint: "page", url: "projects.html" },
    { label: "Demos", hint: "page", url: "demos.html" },
    { label: "Notes", hint: "page", url: "notes.html" },
    { label: "Blog", hint: "page", url: "blog.html" },
    { label: "Resume", hint: "pdf", url: "assets/resume.pdf" },
    { label: "Email", hint: "mailto", url: "mailto:mohamedessam.elsayed07@gmail.com" },
    { label: "GitHub", hint: "external", url: "https://github.com/mohamedelsayed-0" },
    { label: "LinkedIn", hint: "external", url: "https://www.linkedin.com/in/mohamed-elsayed-b4aa02362/" },
    { label: "Toggle theme", hint: "action", action: toggleTheme }
  ];

  var overlay = document.getElementById("palette-overlay");
  var input = document.getElementById("palette-input");
  var list = document.getElementById("palette-list");
  var opener = document.getElementById("palette-btn");
  if (!overlay || !input || !list) return;

  var active = 0;
  var filtered = destinations;

  function render() {
    list.innerHTML = "";
    if (!filtered.length) {
      var empty = document.createElement("li");
      empty.className = "palette-empty";
      empty.textContent = "No matches";
      list.appendChild(empty);
      return;
    }
    filtered.forEach(function (d, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      li.innerHTML = "<span>" + d.label + "</span><span class=\"hint\">" + d.hint + "</span>";
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        go(d);
      });
      list.appendChild(li);
    });
  }

  function filter() {
    var q = input.value.trim().toLowerCase();
    filtered = !q ? destinations : destinations.filter(function (d) {
      return d.label.toLowerCase().indexOf(q) !== -1;
    });
    active = 0;
    render();
  }

  function go(d) {
    close();
    if (typeof d.action === "function") { d.action(); return; }
    window.location.href = d.url;
  }

  var lastFocused = null;

  function open() {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    input.value = "";
    filter();
    input.focus();
  }

  function close() {
    overlay.hidden = true;
    if (lastFocused) lastFocused.focus();
  }

  if (opener) opener.addEventListener("click", open);

  document.addEventListener("keydown", function (e) {
    var isOpen = !overlay.hidden;
    if (!isOpen && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"))) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      open();
      return;
    }
    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length) { active = (active + 1) % filtered.length; render(); }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length) { active = (active - 1 + filtered.length) % filtered.length; render(); }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) go(filtered[active]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      input.focus();
    }
  });

  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) close();
  });

  input.addEventListener("input", filter);
})();
