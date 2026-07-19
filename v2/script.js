// Mohamed Elsayed — portfolio v2. Two things live here: the interference
// wave under the name, and the ctrl-k command palette. Nothing else.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Interference wave ----------
  var canvas = document.getElementById("wave");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var mouseX = null;
    var t = 0;

    function size() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return rect;
    }

    function draw() {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height, mid = h / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--accent") || "#1f3fbf";
      ctx.beginPath();

      var phaseShift = mouseX === null ? 0 : (mouseX / w) * Math.PI * 2;
      var idle = reduceMotion ? 0 : t * 0.02;

      for (var x = 0; x <= w; x += 2) {
        var p = (x / w) * Math.PI * 4;
        var wave1 = Math.sin(p + idle);
        var wave2 = Math.sin(p * 1.15 + idle * 1.3 + phaseShift);
        var y = mid + ((wave1 + wave2) / 2) * (h * 0.4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (reduceMotion) {
      size();
      draw();
      window.addEventListener("resize", function () { size(); draw(); });
    } else {
      size();
      draw();
      window.addEventListener("mousemove", function (e) {
        var rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
      });
      window.addEventListener("mouseleave", function () { mouseX = null; });
      (function loop() {
        t++;
        draw();
        requestAnimationFrame(loop);
      })();
      window.addEventListener("resize", size);
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
