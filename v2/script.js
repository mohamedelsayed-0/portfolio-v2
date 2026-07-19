// Mohamed Elsayed — portfolio v2. Two things live here: the two-wave
// superposition instrument under the name, and the ctrl-k command palette.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Hero instrument: two waves + their sum ----------
  var canvas = document.getElementById("wave");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var readout = document.getElementById("wave-readout");
    var mouseX = null;      // cursor position over canvas (null = idle)
    var phase = Math.PI / 3; // Δφ of wave 2, radians
    var travel = 0;          // slow horizontal drift for life

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

    function wavePath(w, h, mid, amp, phaseOff, weightSum) {
      ctx.beginPath();
      for (var x = 0; x <= w; x += 2) {
        var p = (x / w) * Math.PI * 4 + travel;
        var val = weightSum
          ? (Math.sin(p) + Math.sin(p + phase)) / 2
          : Math.sin(p + phaseOff);
        var y = mid - val * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    function draw() {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height, mid = h / 2, amp = h * 0.2;
      ctx.clearRect(0, 0, w, h);

      var muted = cssVar("--muted", "#6b6b66");
      var accent = cssVar("--accent", "#1f3fbf");

      // wave 1 + wave 2: thin, muted
      ctx.strokeStyle = muted;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      wavePath(w, h, mid, amp, 0, false);
      wavePath(w, h, mid, amp, phase, false);

      // sum: accent, thicker
      ctx.globalAlpha = 1;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      wavePath(w, h, mid, amp, 0, true);
      ctx.globalAlpha = 1;

      if (readout) {
        var c = Math.abs(Math.cos(phase / 2));
        var label = c > 0.7 ? "constructive" : (c < 0.3 ? "destructive" : "partial");
        readout.textContent = "Δφ = " + (phase / Math.PI).toFixed(2) + "π · " + label;
      }
    }

    if (reduceMotion) {
      size();
      draw();
      window.addEventListener("resize", function () { size(); draw(); });
    } else {
      size();
      canvas.addEventListener("mousemove", function (e) {
        var rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
      });
      canvas.addEventListener("mouseleave", function () { mouseX = null; });
      window.addEventListener("resize", size);
      (function loop() {
        var w = canvas.getBoundingClientRect().width;
        if (mouseX !== null) {
          phase = Math.max(0, Math.min(1, mouseX / w)) * Math.PI * 2;
        } else {
          phase += 0.006;
          if (phase > Math.PI * 2) phase -= Math.PI * 2;
        }
        travel += 0.012;
        draw();
        requestAnimationFrame(loop);
      })();
    }
  }

  // ---------- Command palette ----------
  var destinations = [
    { label: "Home", hint: "index", url: "index.html" },
    { label: "Now", hint: "section", url: "index.html#now" },
    { label: "Experience", hint: "section", url: "index.html#experience" },
    { label: "Projects", hint: "section", url: "index.html#projects" },
    { label: "In My Lifetime", hint: "section", url: "index.html#lifetime" },
    { label: "Demos", hint: "page", url: "demos.html" },
    { label: "Notes", hint: "page", url: "notes.html" },
    { label: "Resume", hint: "pdf", url: "assets/resume.pdf" },
    { label: "Email", hint: "mailto", url: "mailto:mohamedessam.elsayed07@gmail.com" },
    { label: "GitHub", hint: "external", url: "https://github.com/mohamedelsayed-0" },
    { label: "LinkedIn", hint: "external", url: "https://www.linkedin.com/in/mohamed-elsayed-b4aa02362/" }
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
