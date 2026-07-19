(function () {
  "use strict";
  var mount = document.getElementById("demo-pong-mount");
  if (!mount) return;

  var H = 9 / 16, PW = 0.014, PH = 0.11, INSET = 0.03;
  var PX = INSET, AX = 1 - INSET - PW, BR = 0.011, SAFE_STEP = 0.01;
  var BASE_SPEED = 0.55, MAX_SPEED = 1.05, SPEED_MUL = 1.06, MAX_ANGLE = 0.85;
  var AI_SPEED = 0.72, EASE_SPEED = 0.4, ERR_AMPL = 0.07;
  var WIN_SCORE = 5, PAUSE_MS = 650, DT_CAP = 0.033;

  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  mount.appendChild(canvas);
  var readout = document.createElement("div");
  readout.className = "demo-readout";
  readout.setAttribute("aria-live", "polite");
  mount.appendChild(readout);
  var ctx = canvas.getContext("2d");

  var state = "idle";
  var pSt = null, winner = null, toAI = false, bVis = false;
  var scores = { you: 0, machine: 0 };
  var player = { y: H / 2 }, ai = { y: H / 2 };
  var aiTarget = H / 2, pDir = 1;
  var ball = { x: 0.5, y: H / 2, vx: 0, vy: 0 };
  var pTO = null, rafId = null, lastTs = null, rTmr = null;
  var cw = 0, ch = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function foldY(y, lo, hi) {
    var range = hi - lo;
    if (range <= 0) return lo;
    var period = range * 2, m = (y - lo) % period;
    if (m < 0) m += period;
    return m <= range ? lo + m : lo + (period - m);
  }

  function colors() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fb) { return (s.getPropertyValue(name) || "").trim() || fb; }
    return {
      fg: v("--fg", "#1a1a1a"), muted: v("--muted", "#6b6b66"),
      accent: v("--accent", "#1f3fbf"), rule: v("--rule", "rgba(26,26,26,0.12)"),
      mono: v("--font-mono", "ui-monospace, Menlo, Consolas, monospace")
    };
  }

  function sizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    cw = rect.width || mount.clientWidth || 300;
    ch = cw * H;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function onResize() {
    if (rTmr) clearTimeout(rTmr);
    rTmr = setTimeout(function () { rTmr = null; sizeCanvas(); }, 150);
  }

  function aiPredict() {
    if (ball.vx <= 0) return;
    var t = (AX - ball.x) / ball.vx;
    if (t < 0) t = 0;
    var raw = ball.y + ball.vy * t;
    var folded = foldY(raw, BR, H - BR);
    aiTarget = clamp(folded + (Math.random() - 0.5) * ERR_AMPL, PH / 2, H - PH / 2);
  }

  function aiSeek(dt) {
    var target = toAI ? aiTarget : H / 2;
    var speed = toAI ? AI_SPEED : EASE_SPEED;
    var delta = clamp(target - ai.y, -speed * dt, speed * dt);
    ai.y = clamp(ai.y + delta, PH / 2, H - PH / 2);
  }

  function hitsPaddle(x0, x1, cy) {
    var y0 = cy - PH / 2, y1 = cy + PH / 2;
    var cx = clamp(ball.x, x0, x1), ccy = clamp(ball.y, y0, y1);
    var dx = ball.x - cx, dy = ball.y - ccy;
    return dx * dx + dy * dy <= BR * BR;
  }

  function bounceOff(newX, dirSign, paddleCenterY) {
    var offset = clamp((ball.y - paddleCenterY) / (PH / 2), -1, 1);
    var speed = Math.min(Math.hypot(ball.vx, ball.vy) * SPEED_MUL, MAX_SPEED);
    var ang = offset * MAX_ANGLE;
    ball.vx = Math.cos(ang) * speed * dirSign;
    ball.vy = Math.sin(ang) * speed;
    ball.x = newX;
    if (dirSign > 0) { toAI = true; aiPredict(); }
    else toAI = false;
  }

  function integrate(sub) {
    ball.x += ball.vx * sub;
    ball.y += ball.vy * sub;
    if (ball.y - BR < 0) { ball.y = BR + (BR - ball.y); ball.vy = -ball.vy; }
    else if (ball.y + BR > H) { ball.y = H - BR - ((ball.y + BR) - H); ball.vy = -ball.vy; }

    if (ball.vx < 0 && hitsPaddle(PX, PX + PW, player.y)) {
      bounceOff(PX + PW + BR + 0.001, 1, player.y);
    } else if (ball.vx > 0 && hitsPaddle(AX, AX + PW, ai.y)) {
      bounceOff(AX - BR - 0.001, -1, ai.y);
    }

    if (ball.x < -BR * 2) { score("machine"); return true; }
    if (ball.x > 1 + BR * 2) { score("you"); return true; }
    return false;
  }

  function moveBall(dt) {
    var speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= 0) return;
    var steps = Math.min(10, Math.max(1, Math.ceil((speed * dt) / SAFE_STEP)));
    var sub = dt / steps;
    for (var i = 0; i < steps; i++) if (integrate(sub)) return;
  }

  function serve(dir) {
    ball.x = 0.5;
    ball.y = H / 2;
    bVis = true;
    var ang = (Math.random() * 2 - 1) * 0.35;
    ball.vx = Math.cos(ang) * BASE_SPEED * dir;
    ball.vy = Math.sin(ang) * BASE_SPEED;
    if (dir > 0) { toAI = true; aiPredict(); }
    else toAI = false;
  }

  function resetMatch() {
    scores.you = 0;
    scores.machine = 0;
    winner = null;
    player.y = H / 2;
    ai.y = H / 2;
    aiTarget = H / 2;
  }

  function score(who) {
    scores[who]++;
    bVis = false;
    if (scores[who] >= WIN_SCORE) {
      winner = who;
      state = "over";
      readOut();
      return;
    }
    state = "point";
    pDir = who === "you" ? 1 : -1;
    readOut();
    pTO = setTimeout(function () {
      pTO = null;
      serve(pDir);
      state = "play";
      readOut();
      loopOn();
    }, PAUSE_MS);
  }

  function pauseGame() {
    if (state !== "play" && state !== "point") return;
    pSt = state;
    if (pTO) { clearTimeout(pTO); pTO = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    state = "paused";
    readOut();
    render();
  }

  function activate() {
    if (state === "idle" || state === "over") {
      resetMatch();
      state = "play";
      serve(Math.random() < 0.5 ? 1 : -1);
      readOut();
      loopOn();
    } else if (state === "paused") {
      if (pSt === "point") serve(pDir);
      state = "play";
      readOut();
      loopOn();
    }
  }

  function step(dt) {
    aiSeek(dt);
    moveBall(dt);
  }

  function loop(ts) {
    if (state !== "play") { rafId = null; return; }
    if (lastTs === null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > DT_CAP) dt = DT_CAP;
    step(dt);
    render();
    rafId = state === "play" ? requestAnimationFrame(loop) : null;
  }

  function loopOn() {
    lastTs = null;
    if (rafId === null) rafId = requestAnimationFrame(loop);
  }

  function readOut() {
    var base = "you " + scores.you + " · machine " + scores.machine + " — ";
    if (state === "over") base += (winner === "you" ? "you win" : "the machine wins") + " · click to restart";
    else if (state === "idle") base += "first to " + WIN_SCORE + " · click to play";
    else if (state === "paused") base += "first to " + WIN_SCORE + " · paused, click to resume";
    else base += "first to " + WIN_SCORE;
    readout.textContent = base;
  }

  function promptText() {
    if (state === "idle") return "click to play";
    if (state === "paused") return "click to resume";
    if (state === "over") return (winner === "you" ? "you win" : "the machine wins") + " — click to restart";
    return null;
  }

  function render() {
    if (!cw) return;
    var c = colors();
    ctx.clearRect(0, 0, cw, ch);

    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(cw / 2, 0);
    ctx.lineTo(cw / 2, ch);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = c.fg;
    ctx.fillRect(PX * cw, (player.y - PH / 2) * cw, PW * cw, PH * cw);
    ctx.fillStyle = c.muted;
    ctx.fillRect(AX * cw, (ai.y - PH / 2) * cw, PW * cw, PH * cw);

    if (bVis) {
      var speed = Math.hypot(ball.vx, ball.vy);
      ctx.fillStyle = speed >= MAX_SPEED * 0.95 ? c.accent : c.fg;
      ctx.beginPath();
      ctx.arc(ball.x * cw, ball.y * cw, BR * cw, 0, Math.PI * 2);
      ctx.fill();
    }

    var prompt = promptText();
    if (prompt) {
      ctx.fillStyle = c.muted;
      ctx.font = "14px " + c.mono;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(prompt, cw / 2, ch / 2);
    }
  }

  function setPlayerY(relY) {
    player.y = clamp(relY, PH / 2, H - PH / 2);
    if (state !== "play") render();
  }

  canvas.addEventListener("click", activate);

  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    setPlayerY((e.clientY - rect.top) / rect.width);
  });

  canvas.addEventListener("touchmove", function (e) {
    if (state === "play") e.preventDefault();
    var t = e.touches && e.touches[0];
    if (!t) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    setPlayerY((t.clientY - rect.top) / rect.width);
  }, { passive: false });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pauseGame();
  });
  window.addEventListener("blur", pauseGame);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) pauseGame();
    });
    io.observe(canvas);
  }

  window.addEventListener("resize", onResize);

  readOut();
  sizeCanvas();
})();
