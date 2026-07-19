// Mohamed Elsayed — portfolio v2. Galton-board hero + palette/theme/clock.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Theme toggle (light <-> dark) ----------
  // The no-flash <head> script already applied any saved theme; wire the button.
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
    window.dispatchEvent(new Event("resize")); // sample canvases re-read vars
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

  // ---------- Hero: quantum Galton board ----------
  var canvas = document.getElementById("wave");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var readout = document.getElementById("wave-readout");
    var ROWS = 14, BINS = ROWS + 1, MID = ROWS / 2;

    function cssVar(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return (v && v.trim()) || fallback;
    }

    // Hadamard walk, symmetric coin state.
    function quantumDist() {
      var N = ROWS, size = 2 * N + 1, s2 = 1 / Math.sqrt(2);
      var Lr = new Float64Array(size), Li = new Float64Array(size);
      var Rr = new Float64Array(size), Ri = new Float64Array(size);
      Lr[N] = s2; Ri[N] = s2;
      for (var step = 0; step < N; step++) {
        var nLr = new Float64Array(size), nLi = new Float64Array(size);
        var nRr = new Float64Array(size), nRi = new Float64Array(size);
        for (var p = 0; p < size; p++) {
          var aLr = (Lr[p] + Rr[p]) * s2, aLi = (Li[p] + Ri[p]) * s2;
          var aRr = (Lr[p] - Rr[p]) * s2, aRi = (Li[p] - Ri[p]) * s2;
          if (p > 0) { nLr[p - 1] += aLr; nLi[p - 1] += aLi; }
          if (p < size - 1) { nRr[p + 1] += aRr; nRi[p + 1] += aRi; }
        }
        Lr = nLr; Li = nLi; Rr = nRr; Ri = nRi;
      }
      var d = [];
      for (var i = 0; i <= 2 * N; i += 2)
        d.push(Lr[i] * Lr[i] + Li[i] * Li[i] + Rr[i] * Rr[i] + Ri[i] * Ri[i]);
      return d;
    }

    function classicalDist() {
      var d = [], c = 1, N = ROWS;
      for (var k = 0; k <= N; k++) { d.push(c); c = c * (N - k) / (k + 1); }
      var tot = Math.pow(2, N);
      return d.map(function (x) { return x / tot; });
    }

    var QDIST = quantumDist(), CDIST = classicalDist();

    function sampleBin(dist) {
      var r = Math.random(), acc = 0;
      for (var i = 0; i < dist.length; i++) { acc += dist[i]; if (r <= acc) return i; }
      return dist.length - 1;
    }

    function makePath(bin) {
      var steps = [], i;
      for (i = 0; i < ROWS; i++) steps.push(i < bin ? 1 : -1);
      for (i = ROWS - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = steps[i]; steps[i] = steps[j]; steps[j] = tmp;
      }
      var path = [MID], pos = MID;
      for (i = 0; i < ROWS; i++) { pos += steps[i] * 0.5; path.push(pos); }
      return path;
    }

    var mode = "quantum";
    var counts = new Int32Array(BINS);
    var total = 0;
    var photons = [];
    var spawnAcc = 0;

    function activeDist() { return mode === "classical" ? CDIST : QDIST; }

    function setMode(m) {
      if (mode === m) return;
      mode = m;
      counts = new Int32Array(BINS);
      photons.length = 0;
    }

    function size() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(dt) {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height;
      var padX = 10, bw = (w - 2 * padX) / BINS;
      var topY = 6, histMaxH = h * 0.4, baseY = h - 4;
      var pegTop = 20, pegBot = baseY - histMaxH - 6;
      if (pegBot < pegTop + 10) pegBot = pegTop + 10;
      var rowSpan = pegBot - pegTop;
      function binX(bf) { return padX + bw * (bf + 0.5); }

      var perSec = mode === "classical" ? 12 : 3;
      spawnAcc += dt * perSec;
      while (spawnAcc >= 1 && photons.length < 15) {
        spawnAcc -= 1;
        var bin = sampleBin(activeDist());
        photons.push({ path: makePath(bin), bin: bin, rowf: 0 });
      }
      if (spawnAcc > 3) spawnAcc = 3;
      var fallRate = ROWS / 1.1;
      for (var pi = photons.length - 1; pi >= 0; pi--) {
        var ph = photons[pi];
        ph.rowf += dt * fallRate;
        if (ph.rowf >= ROWS) { counts[ph.bin]++; total++; photons.splice(pi, 1); }
      }

      var muted = cssVar("--muted", "#6b6b66");
      var accent = cssVar("--accent", "#1f3fbf");
      var fg = cssVar("--fg", "#1a1a1a");
      var barColor = mode === "classical" ? muted : accent;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = muted;
      ctx.globalAlpha = 0.4;
      for (var r = 0; r < ROWS; r++) {
        var py = pegTop + (ROWS > 1 ? rowSpan * r / (ROWS - 1) : 0);
        for (var c = 0; c <= r; c++) {
          ctx.beginPath();
          ctx.arc(binX(MID + (c - r / 2)), py, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      var maxCount = 1;
      for (var b = 0; b < BINS; b++) if (counts[b] > maxCount) maxCount = counts[b];
      ctx.fillStyle = barColor;
      ctx.globalAlpha = 0.85;
      for (b = 0; b < BINS; b++) {
        if (!counts[b]) continue;
        var bh = (counts[b] / maxCount) * histMaxH;
        ctx.fillRect(binX(b) - bw * 0.3, baseY - bh, bw * 0.6, bh);
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(binX(MID), topY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.9;
      for (pi = 0; pi < photons.length; pi++) {
        ph = photons[pi];
        var i0 = Math.floor(ph.rowf);
        if (i0 > ROWS) i0 = ROWS;
        var frac = ph.rowf - i0;
        var bfrom = ph.path[Math.min(i0, ROWS)], bto = ph.path[Math.min(i0 + 1, ROWS)];
        var bf = bfrom + (bto - bfrom) * frac;
        var y = topY + (pegBot - topY) * Math.min(1, ph.rowf / ROWS);
        ctx.beginPath();
        ctx.arc(binX(bf), y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (readout) {
        readout.textContent = total.toLocaleString("en-US") + " photons · " +
          (mode === "classical" ? "classical" : "quantum") + " walk";
      }
    }

    function staticDraw() {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height;
      var padX = 10, bw = (w - 2 * padX) / BINS;
      var baseY = h - 14, maxH = h * 0.5;
      var muted = cssVar("--muted", "#6b6b66");
      var accent = cssVar("--accent", "#1f3fbf");
      var mx = Math.max(Math.max.apply(null, QDIST), Math.max.apply(null, CDIST));
      ctx.clearRect(0, 0, w, h);
      function bars(dist, color) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.9;
        for (var b = 0; b < BINS; b++) {
          var bh = dist[b] / mx * maxH, x = padX + bw * (b + 0.5), bwid = bw * 0.5;
          ctx.strokeRect(x - bwid / 2, baseY - bh, bwid, bh);
        }
      }
      bars(CDIST, muted);
      bars(QDIST, accent);
      ctx.globalAlpha = 1;
      ctx.font = "10px " + cssVar("--font-mono", "ui-monospace, monospace");
      ctx.fillStyle = accent; ctx.fillText("quantum", padX, 12);
      ctx.fillStyle = muted; ctx.fillText("classical", padX + 56, 12);
      if (readout) readout.textContent = "quantum vs classical";
    }

    if (reduceMotion) {
      size(); staticDraw();
      window.addEventListener("resize", function () { size(); staticDraw(); });
    } else {
      size();
      window.addEventListener("resize", size);
      var toQ = function () { setMode("quantum"); };
      canvas.addEventListener("pointerdown", function () { setMode("classical"); });
      window.addEventListener("pointerup", toQ);
      window.addEventListener("pointercancel", toQ);
      var last = 0;
      (function loop(ts) {
        var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
        last = ts;
        frame(dt);
        requestAnimationFrame(loop);
      })(0);
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
      if (e.key === "Tab") { // focus trap
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
      // trap focus: the input is the only focusable control in the dialog.
      e.preventDefault();
      input.focus();
    }
  });

  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) close();
  });

  input.addEventListener("input", filter);
})();
