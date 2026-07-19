// Mohamed Elsayed — portfolio v2. Two things live here: the thin-lens ray
// tracer under the name, and the ctrl-k command palette.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Theme toggle (light <-> dark) ----------
  // The no-flash inline <head> script already applied any saved theme; here we
  // wire the nav button, sync its glyph + <meta theme-color>, and nudge canvas
  // samples to redraw (they re-read CSS vars each frame).
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

  // ---------- Hero instrument: a thin-lens ray tracer ----------
  // A fan leaves a point source, refracts through the lens, and converges to
  // the image given by 1/s + 1/s' = 1/f; inside f the image goes virtual.
  var canvas = document.getElementById("wave");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var readout = document.getElementById("wave-readout");
    var mouse = null;   // {x, y} over canvas, null = idle
    var t = 0;          // idle drift clock
    var is404 = document.body.classList.contains("is-404");

    function cssVar(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return (v && v.trim()) || fallback;
    }

    function size() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Draw the segment of the line through (L, dir) that runs from L rightward
    // to the right edge (used for the outgoing physical ray).
    function rayToRight(L, dir, w) {
      // dir points to the right (dir.x > 0); scale to reach the right edge.
      var tEdge = (w - L.x) / dir.x;
      ctx.beginPath();
      ctx.moveTo(L.x, L.y);
      ctx.lineTo(L.x + dir.x * tEdge, L.y + dir.y * tEdge);
      ctx.stroke();
    }

    function draw(sx, sy, hovered) {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height, mid = h / 2;
      var cx = w / 2;                 // lens plane
      var f = Math.max(46, w / 6);    // focal length (px)
      var ap = h * 0.40;              // lens half-aperture

      ctx.clearRect(0, 0, w, h);

      var muted = cssVar("--muted", "#6b6b66");
      var accent = cssVar("--accent", "#1f3fbf");
      var fg = cssVar("--fg", "#1a1a1a");

      // --- optical axis ---
      ctx.strokeStyle = muted;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();

      // --- focal ticks + labels at +/- f ---
      ctx.globalAlpha = 0.6;
      ctx.font = "10px " + cssVar("--font-mono", "ui-monospace, monospace");
      ctx.fillStyle = muted;
      [-f, f].forEach(function (dx) {
        var fx = cx + dx;
        ctx.beginPath();
        ctx.moveTo(fx, mid - 4);
        ctx.lineTo(fx, mid + 4);
        ctx.stroke();
        ctx.fillText("f", fx + 3, mid - 6);
      });

      // --- lens glyph: two shallow arcs (a vesica) ---
      var top = mid - ap, bot = mid + ap, bulge = 7;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.quadraticCurveTo(cx - bulge, mid, cx, bot);
      ctx.quadraticCurveTo(cx + bulge, mid, cx, top);
      ctx.stroke();

      // --- optics ---
      var s = cx - sx;                       // object distance (px, >0)
      s = Math.max(6, s);

      // Hovering splits the outgoing fan into three colors at slightly
      // different focal lengths (dispersion); idle = one accent fan.
      var passes = hovered
        ? [[0.96, "#5b4bd6"], [1.0, accent], [1.04, "#c0504d"]]
        : [[1.0, accent]];

      // fan of rays across the aperture; three near the principals are stronger
      var N = 9;
      var strong = [0, (N - 1) / 2, N - 1]; // top-edge, chief, bottom-edge
      var ys = [];

      // incoming rays: source -> lens (straight, independent of focal length)
      for (var i = 0; i < N; i++) {
        var ly = top + (ap * 2) * (i / (N - 1));
        ys.push(ly);
        ctx.strokeStyle = muted;
        ctx.globalAlpha = strong.indexOf(i) !== -1 ? 0.5 : 0.22;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx, ly);
        ctx.stroke();
      }

      // outgoing fan + focus dot, once per chromatic pass
      var mainSp = 0, mainVirtual = false, mainM = 0;
      passes.forEach(function (p) {
        var f2 = f * p[0];
        var denom = s - f2;
        if (Math.abs(denom) < 1e-3) denom = denom < 0 ? -1e-3 : 1e-3;
        var sp = (s * f2) / denom;
        sp = Math.max(-40 * f, Math.min(40 * f, sp));
        var m = -sp / s;
        var virtual = sp < 0;
        var I = { x: cx + sp, y: mid + m * (sy - mid) };
        if (p[0] === 1.0) { mainSp = sp; mainVirtual = virtual; mainM = m; }

        ctx.strokeStyle = p[1];
        for (var j = 0; j < N; j++) {
          var isStrong = strong.indexOf(j) !== -1;
          var L = { x: cx, y: ys[j] };
          var toI = { x: I.x - L.x, y: I.y - L.y };
          var dir = toI.x >= 0 ? toI : { x: -toI.x, y: -toI.y };
          if (Math.abs(dir.x) < 1e-3) dir.x = 1e-3;
          ctx.globalAlpha = hovered ? (isStrong ? 0.45 : 0.3) : (isStrong ? 0.6 : 0.28);
          ctx.setLineDash([]);
          rayToRight(L, dir, w);
          if (virtual) {
            ctx.globalAlpha = hovered ? (isStrong ? 0.3 : 0.16) : (isStrong ? 0.4 : 0.18);
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(L.x, L.y);
            ctx.lineTo(I.x, I.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // focus dot for this pass: filled if real, hollow if virtual
        if (I.x > 2 && I.x < w - 2 && I.y > 2 && I.y < h - 2) {
          ctx.globalAlpha = hovered ? 0.85 : 1;
          ctx.strokeStyle = p[1];
          ctx.fillStyle = p[1];
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(I.x, I.y, 3.5, 0, Math.PI * 2);
          if (virtual) ctx.stroke(); else ctx.fill();
        }
      });

      // --- source dot ---
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();

      // --- readout (tracks the central, 1.0f pass) ---
      if (readout) {
        var mag = Math.abs(mainSp / s).toFixed(1);
        var kind = mainVirtual ? "virtual" : "real";
        var orient = mainM < 0 ? "inverted" : "upright";
        readout.textContent =
          "s = " + (s / f).toFixed(2) + "f · image " + kind + ", " + orient + ", " + mag + "×";
      }
    }

    // resolve the source position for the current frame
    function sourceForFrame() {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height, cx = w / 2, mid = h / 2;
      var f = Math.max(46, w / 6);
      if (mouse) {
        // clamp x to the left half; keep y inside the canvas
        var sx = Math.max(10, Math.min(cx - 8, mouse.x));
        var sy = Math.max(8, Math.min(h - 8, mouse.y));
        return { x: sx, y: sy };
      }
      // idle drift sweeps across f; 404 begins on the virtual branch (0.7f).
      var s = is404
        ? f * (0.7 + (1 - Math.cos(t)) * 0.85)
        : f * (1.5 + Math.cos(t) * 0.9);
      return { x: cx - s, y: mid + Math.sin(t * 0.7) * (h * 0.22) };
    }

    if (reduceMotion) {
      var staticFrame = function () {
        var rect = canvas.getBoundingClientRect();
        var w = rect.width, h = rect.height, cx = w / 2;
        var f = Math.max(46, w / 6);
        var sMul = is404 ? 0.7 : 1.5; // 404 sits on the virtual branch
        draw(cx - sMul * f, h / 2 - h * 0.22, false); // single fan, no hover
      };
      size();
      staticFrame();
      window.addEventListener("resize", function () { size(); staticFrame(); });
    } else {
      size();
      canvas.addEventListener("mousemove", function (e) {
        var rect = canvas.getBoundingClientRect();
        mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      });
      canvas.addEventListener("mouseleave", function () { mouse = null; });
      window.addEventListener("resize", size);
      (function loop() {
        if (!mouse) t += 0.012;
        var src = sourceForFrame();
        draw(src.x, src.y, !!mouse); // chromatic split only while hovered
        requestAnimationFrame(loop);
      })();
    }
  }

  // ---------- Command palette ----------
  var destinations = [
    { label: "Home", hint: "index", url: "index.html" },
    { label: "Now", hint: "section", url: "index.html#now" },
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
