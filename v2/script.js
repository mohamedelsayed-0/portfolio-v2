// Mohamed Elsayed — portfolio v2. Chladni-particle hero + palette/theme/clock.

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

  // ---------- Hero: Chladni resonance particles ----------
  // Sand on a vibrating plate. Particles descend grad|phi|^2 toward nodal lines of
  // phi(x,y) = cos(m*pi*u)cos(n*pi*v) - cos(n*pi*u)cos(m*pi*v), u=x/L v=y/W in [0,1].
  var canvas = document.getElementById("wave");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var readout = document.getElementById("wave-readout");
    var PI = Math.PI;

    // 3,000 particles; drop to 2,200 on very high-dpr screens (pattern stays dense).
    var N = (window.devicePixelRatio || 1) > 2 ? 2200 : 3000;
    var NLABEL = N.toLocaleString("en-US");
    // Tuning (settle test: mean|phi| drops ~98% in 500 steps — see verify report).
    var K = 0.0005, JIT = 0.0006, DAMP = 0.9, SPD = 0.02, SLOW2 = 0.0016 * 0.0016;
    var STRIKE = 22, SRAD = 300, TAU = 0.6;
    var RING_MS = 500, RING_R = 280, rings = [];   // strike shockwave rings (cap 4)

    function cssRGB(name, fb) {
      var s = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (s.charAt(0) === "#") {
        var hx = s.slice(1);
        if (hx.length === 3) hx = hx[0] + hx[0] + hx[1] + hx[1] + hx[2] + hx[2];
        var num = parseInt(hx, 16);
        if (!isNaN(num)) return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
      }
      var mm = s.match(/\d+/g);
      if (mm && mm.length >= 3) return [+mm[0], +mm[1], +mm[2]];
      return fb;
    }

    // Positions/velocities in NORMALIZED [0,1] coords so resize is proportional.
    var ux = new Float32Array(N), uy = new Float32Array(N);
    var vx = new Float32Array(N), vy = new Float32Array(N);
    function seed() {
      for (var i = 0; i < N; i++) { ux[i] = Math.random(); uy[i] = Math.random(); vx[i] = 0; vy[i] = 0; }
    }
    seed();

    // Fixed per-particle size in [0.9,1.6) — deterministic hash of index, not per frame.
    var psz = new Float32Array(N);
    for (var pz = 0; pz < N; pz++) {
      var hz = Math.sin(pz * 12.9898) * 43758.5453;
      psz[pz] = 0.9 + 0.7 * (hz - Math.floor(hz));
    }

    // Continuous modes m in [2,7], n in [1,6]; LERPed toward targets (never snap).
    var m = 3.2, n = 2.4, mT = m, nT = n;

    function step() {
      var mp = m * PI, np = n * PI, j = JIT;
      for (var i = 0; i < N; i++) {
        var a = ux[i], b = uy[i];
        var cmu = Math.cos(mp * a), cnv = Math.cos(np * b);
        var cnu = Math.cos(np * a), cmv = Math.cos(mp * b);
        var smu = Math.sin(mp * a), snv = Math.sin(np * b);
        var snu = Math.sin(np * a), smv = Math.sin(mp * b);
        var phi = cmu * cnv - cnu * cmv;
        var dpu = -mp * smu * cnv + np * snu * cmv;   // d phi / du (analytic)
        var dpv = -np * cmu * snv + mp * cnu * smv;   // d phi / dv (analytic)
        var f = 2 * phi;                               // grad|phi|^2 = 2*phi*grad phi
        var nvx = (vx[i] - f * dpu * K + (Math.random() - 0.5) * j) * DAMP;
        var nvy = (vy[i] - f * dpv * K + (Math.random() - 0.5) * j) * DAMP;
        var sp = nvx * nvx + nvy * nvy;
        if (sp > SPD * SPD) { var sc = SPD / Math.sqrt(sp); nvx *= sc; nvy *= sc; }
        vx[i] = nvx; vy[i] = nvy;
        var na = a + nvx, nb = b + nvy;               // reflect at plate edges
        if (na < 0) { na = -na; vx[i] = -vx[i]; } else if (na > 1) { na = 2 - na; vx[i] = -vx[i]; }
        if (nb < 0) { nb = -nb; vy[i] = -vy[i]; } else if (nb > 1) { nb = 2 - nb; vy[i] = -vy[i]; }
        ux[i] = na; uy[i] = nb;
      }
    }

    // Strike: radial impulse ~ (1 - dist/300px), clamped >= 0; impulses add.
    function strike(cx, cy) {
      var r = canvas.getBoundingClientRect(), W = r.width || 1, H = r.height || 1;
      var tx = cx - r.left, ty = cy - r.top;
      rings.push({ x: tx, y: ty, t0: now() });      // one expanding ring per strike
      if (rings.length > 4) rings.shift();
      for (var i = 0; i < N; i++) {
        var dx = ux[i] * W - tx, dy = uy[i] * H - ty;
        var d = Math.sqrt(dx * dx + dy * dy);
        var mag = STRIKE * (1 - d / SRAD);
        if (mag <= 0) continue;
        if (d < 0.01) { var t = Math.random() * 6.283; vx[i] += Math.cos(t) * mag / W; vy[i] += Math.sin(t) * mag / H; }
        else { vx[i] += (dx / d) * mag / W; vy[i] += (dy / d) * mag / H; }
      }
    }

    var w = 0, h = 0;
    function size() {
      var r = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      w = r.width || 600; h = r.height || 180;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Motion trails: wash the plate with the current --bg at 0.35 alpha each frame so
    // movers streak while settled dots (redrawn at 0.95) stay crisp. Two tones for
    // depth: settled/slow -> --accent (0.95), fast grains -> --muted (0.5, "sand in air").
    function draw() {
      var acc = cssRGB("--accent", [31, 63, 191]);
      var mut = cssRGB("--muted", [107, 107, 102]);
      var accS = acc[0] + "," + acc[1] + "," + acc[2];
      var mutS = mut[0] + "," + mut[1] + "," + mut[2];
      var i, sp, o;
      if (reduceMotion) {
        ctx.clearRect(0, 0, w, h);           // static path: full clear, no trails
      } else {
        var bg = cssRGB("--bg", [250, 250, 247]);
        ctx.fillStyle = "rgba(" + bg[0] + "," + bg[1] + "," + bg[2] + ",0.35)";
        ctx.fillRect(0, 0, w, h);            // trail wash in the live theme's bg
      }
      ctx.beginPath();
      for (i = 0; i < N; i++) {
        sp = vx[i] * vx[i] + vy[i] * vy[i];
        if (sp >= SLOW2) continue;
        o = psz[i] * 0.5;
        ctx.rect(ux[i] * w - o, uy[i] * h - o, psz[i], psz[i]);
      }
      ctx.fillStyle = "rgba(" + accS + ",0.95)";
      ctx.fill();
      ctx.beginPath();
      for (i = 0; i < N; i++) {
        sp = vx[i] * vx[i] + vy[i] * vy[i];
        if (sp < SLOW2) continue;
        o = psz[i] * 0.5;
        ctx.rect(ux[i] * w - o, uy[i] * h - o, psz[i], psz[i]);
      }
      ctx.fillStyle = "rgba(" + mutS + ",0.5)";
      ctx.fill();
      if (!reduceMotion && rings.length) {   // expanding hairline shockwave per strike
        var tn = now();
        ctx.lineWidth = 1;
        for (i = rings.length - 1; i >= 0; i--) {
          var age = (tn - rings[i].t0) / RING_MS;
          if (age >= 1) { rings.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.arc(rings[i].x, rings[i].y, age * RING_R, 0, 6.283185);
          ctx.strokeStyle = "rgba(" + accS + "," + (0.5 * (1 - age)) + ")";
          ctx.stroke();
        }
      }
    }

    var lastRO = "";
    function updateReadout() {
      if (!readout) return;
      var s = "mode " + m.toFixed(1) + " · " + n.toFixed(1) + " — " + NLABEL + " particles";
      if (s !== lastRO) { readout.textContent = s; lastRO = s; }
    }

    function now() { return window.performance && performance.now ? performance.now() : Date.now(); }

    // Cursor (or drag) maps to continuous m,n targets; falls back to idle wander.
    var lastTune = -1e9;
    function tune(cx, cy, force) {
      var r = canvas.getBoundingClientRect();
      var fx = (cx - r.left) / (r.width || 1), fy = (cy - r.top) / (r.height || 1);
      if (!force && (fx < 0 || fx > 1 || fy < 0 || fy > 1)) return;
      if (fx < 0) fx = 0; else if (fx > 1) fx = 1;
      if (fy < 0) fy = 0; else if (fy > 1) fy = 1;
      mT = 2 + 5 * fx; nT = 1 + 5 * fy; lastTune = now();
    }

    if (reduceMotion) {
      // Pre-settled static pattern; tap = instant re-render at a new random mode.
      size();
      function rmRender() {
        m = mT = 2 + Math.round(Math.random() * 5);
        n = nT = 1 + Math.round(Math.random() * 5);
        seed();
        for (var s = 0; s < 300; s++) step();
        draw(); updateReadout();
      }
      rmRender();
      window.addEventListener("resize", function () { size(); draw(); });
      canvas.addEventListener("pointerdown", function (e) {
        if (e.cancelable) e.preventDefault();
        rmRender();
      });
    } else {
      size();
      window.addEventListener("resize", size);

      // Pointer: down starts a possible strike/drag; move tunes; quick tap = strike.
      var down = false, downT = 0, dx0 = 0, dy0 = 0, moved = 0, ptype = "";
      canvas.addEventListener("pointerdown", function (e) {
        down = true; downT = now(); dx0 = e.clientX; dy0 = e.clientY; moved = 0; ptype = e.pointerType;
        if (canvas.setPointerCapture && e.pointerId != null) { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} }
      });
      window.addEventListener("pointermove", function (e) {
        if (down) {
          var ddx = e.clientX - dx0, ddy = e.clientY - dy0, d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d > moved) moved = d;
          tune(e.clientX, e.clientY, true);
          // Only hijack scroll during an ACTIVE canvas drag (touch that has moved).
          if (ptype === "touch" && moved > 6 && e.cancelable) e.preventDefault();
        } else {
          tune(e.clientX, e.clientY, false);
        }
      }, { passive: false });
      function endPointer(e) {
        if (!down) return;
        down = false;
        if ((now() - downT) <= 250 && moved < 6) strike(e.clientX, e.clientY);
      }
      window.addEventListener("pointerup", endPointer);
      window.addEventListener("pointercancel", function () { down = false; });

      var running = true, last = now();
      function loop() {
        if (!running) return;
        var t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
        if (t - lastTune > 2500) {           // idle: modes wander slowly, never freeze
          var tt = t / 1000;
          mT = 4.5 + 2.5 * Math.sin(tt * 0.11);
          nT = 3.5 + 2.5 * Math.sin(tt * 0.07 + 1.3);
        }
        var a = 1 - Math.exp(-dt / TAU);      // soft ~0.6s time constant, butter-smooth
        m += (mT - m) * a; n += (nT - n) * a;
        step();
        draw();
        updateReadout();
        requestAnimationFrame(loop);
      }

      if ("IntersectionObserver" in window) {   // pause when hero off-screen
        new IntersectionObserver(function (en) {
          var vis = en[0].isIntersecting;
          if (vis && !running) { running = true; last = now(); requestAnimationFrame(loop); }
          else running = vis;
        }).observe(canvas);
      }
      requestAnimationFrame(loop);
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
