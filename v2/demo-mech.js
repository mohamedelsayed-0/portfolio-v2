// Cart-pole bench, RK4-integrated. Starts hanging (theta=pi); "swing up"
// energy-pumps to upright then hands off to a hardcoded LQR. Click shoves
// while balancing, nudges while hanging. Falling -> "lost"; "reset" re-hangs.

(function () {
  "use strict";

  var mount = document.getElementById("demo-mech-mount");
  if (!mount) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  mount.innerHTML =
    '<canvas class="demo-canvas" width="960" height="420" aria-hidden="true"></canvas>' +
    '<div class="demo-controls">' +
    '<button type="button" class="demo-btn" id="mech-swingup">swing up</button>' +
    '<button type="button" class="demo-btn" id="mech-reset" hidden>reset</button>' +
    "</div>" +
    '<span class="demo-readout" id="mech-readout" aria-live="polite"></span>';

  var canvas = mount.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var swingBtn = mount.querySelector("#mech-swingup");
  var resetBtn = mount.querySelector("#mech-reset");
  var readout = mount.querySelector("#mech-readout");

  function colors() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) { var val = cs.getPropertyValue(name); return val && val.trim() ? val.trim() : fb; }
    return { fg: v("--fg", "#1a1a1a"), muted: v("--muted", "#6b6b66"), accent: v("--accent", "#1f3fbf"), rule: v("--rule", "rgba(26,26,26,0.12)") };
  }

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  // plant: cart mass M, pole mass MP, half-length L. theta=0 upright
  // (unstable), +/-pi hanging (stable).
  var M = 1, MP = 0.2, L = 0.5, G = 9.81, TOTAL = M + MP;
  var U_MAX = 15, RAIL = 6, DT = 0.005; // N sat, m rail width, s RK4 substep
  var FALL_ANGLE = (60 * Math.PI) / 180;
  var IMPULSE_DTHETADOT = 3, JITTER_PERIOD = 1, JITTER_MAG = 0.06; // click kick, idle sway
  var SETTLE_ANGLE = (0.5 * Math.PI) / 180, SETTLE_RATE = 0.05;

  // Swing-up: u = k(E-Eupright)*sign(thetadot*cos(theta)) + small cart
  // recentering (KX, KXD) — bare energy law drifts the cart into a rail
  // wall in ~2 pumps (throwaway harness); recentering fixes it. Tuned:
  // k=5 catches from rest in ~2.7s sim, excursion ~1.8m, LQR then settles
  // |theta|<0.01deg.
  var K_SWING = 5, KX = 1.5, KXD = 0.8;
  var CATCH_ANGLE = (25 * Math.PI) / 180, CATCH_RATE = 2.0; // handed to LQR at catch
  var SWINGUP_TIMEOUT = 20; // s, failsafe

  // LQR gain K for u=-K.z, z=[x,xdot,theta,thetadot], theta=0 upright.
  // Offline: linearize about theta=0, discretize, iterate the discrete
  // Riccati equation to convergence for Q=diag(1,1,10,1), R=0.1. Verified:
  // from theta=25deg returns to |theta|<1deg in ~2s, cart within +/-3m.
  // theta is ALWAYS wrapped to [-pi,pi] before feeding the gain (wrapAngle)
  // — raw unwrapped angle after a swing-up would fire on theta~=2*pi, not 0.
  var K = [-3.061534435459863, -5.7948618936020795, -50.41352132866051, -12.87809236287752];

  var z = [0, 0, Math.PI, 0]; // x, xdot, theta, thetadot — starts hanging
  var mode = "hanging"; // hanging | swing-up | balance | lost
  var lastU = 0, lastTipX = 0, jitterAccum = 0, swingUpElapsed = 0;

  function deriv(zz, u) {
    var xd = zz[1], th = zz[2], thd = zz[3];
    var s = Math.sin(th), c = Math.cos(th);
    var thdd = (G * s + c * (-u - MP * L * thd * thd * s) / TOTAL) /
      (L * (4 / 3 - MP * c * c / TOTAL));
    var xdd = (u + MP * L * (thd * thd * s - thdd * c)) / TOTAL;
    return [xd, xdd, thd, thdd];
  }

  function rk4(zz, u, dt) {
    function comb(a, b, s) {
      return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s, a[3] + b[3] * s];
    }
    var k1 = deriv(zz, u);
    var k2 = deriv(comb(zz, k1, dt / 2), u);
    var k3 = deriv(comb(zz, k2, dt / 2), u);
    var k4 = deriv(comb(zz, k3, dt), u);
    return [
      zz[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      zz[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      zz[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      zz[3] + (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])
    ];
  }

  function wrapAngle(a) {
    a = a % (2 * Math.PI);
    if (a > Math.PI) a -= 2 * Math.PI;
    if (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  function fmtSigned(v, dec) {
    var r = v.toFixed(dec);
    if (parseFloat(r) === 0) return (0).toFixed(dec);
    return v < 0 ? "−" + Math.abs(v).toFixed(dec) : r;
  }

  function swingUpU() {
    var th = z[2], thd = z[3];
    var E = 0.5 * MP * L * L * thd * thd + MP * G * L * Math.cos(th);
    var Eu = MP * G * L;
    var raw = thd * Math.cos(th);
    var s = raw > 1e-6 ? 1 : raw < -1e-6 ? -1 : Math.sin(th) >= 0 ? 1 : -1; // kick-start, mirrored
    var u = K_SWING * (E - Eu) * s - KX * z[0] - KXD * z[1];
    return clamp(u, -U_MAX, U_MAX);
  }

  function lqrU() {
    var thw = wrapAngle(z[2]); // deviation from upright, NOT raw z[2]
    return clamp(-(K[0] * z[0] + K[1] * z[1] + K[2] * thw + K[3] * z[3]), -U_MAX, U_MAX);
  }

  function physicsStep() {
    jitterAccum += DT;
    if (jitterAccum >= JITTER_PERIOD) {
      z[3] += (Math.random() - 0.5) * 2 * JITTER_MAG;
      jitterAccum = 0;
    }
    var u = 0;
    if (mode === "swing-up") u = swingUpU();
    else if (mode === "balance") u = lqrU();
    z = rk4(z, u, DT);
    if (z[0] > RAIL / 2) { z[0] = RAIL / 2; z[1] = 0; }
    else if (z[0] < -RAIL / 2) { z[0] = -RAIL / 2; z[1] = 0; }
    if (mode === "swing-up") {
      swingUpElapsed += DT;
      var thw = wrapAngle(z[2]);
      if (Math.abs(thw) < CATCH_ANGLE && Math.abs(z[3]) < CATCH_RATE) mode = "balance";
      else if (swingUpElapsed > SWINGUP_TIMEOUT) mode = "hanging";
    } else if (mode === "balance") {
      if (Math.abs(wrapAngle(z[2])) > FALL_ANGLE) mode = "lost";
    }
    lastU = u;
  }

  // ---- canvas sizing (devicePixelRatio-aware) ----
  function size() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = rect.width || 960, h = rect.height || 420;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawArrow(ctx2, x0, y, x1, c) {
    ctx2.strokeStyle = c.muted; ctx2.fillStyle = c.muted; ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.moveTo(x0, y); ctx2.lineTo(x1, y); ctx2.stroke();
    if (Math.abs(x1 - x0) > 3) {
      var dir = x1 > x0 ? 1 : -1;
      ctx2.beginPath();
      ctx2.moveTo(x1, y);
      ctx2.lineTo(x1 - dir * 7, y - 4);
      ctx2.lineTo(x1 - dir * 7, y + 4);
      ctx2.closePath();
      ctx2.fill();
    }
  }

  function render() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var c = colors();
    ctx.clearRect(0, 0, w, h);
    var railY = h * 0.62;
    var margin = w * 0.08;
    var pxPerM = (w - margin * 2) / RAIL;
    var centerX = w / 2;
    var cartPxX = centerX + z[0] * pxPerM;
    ctx.strokeStyle = c.rule; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, railY); ctx.lineTo(w - margin, railY);
    ctx.moveTo(centerX, railY - 6); ctx.lineTo(centerX, railY + 6);
    ctx.stroke();
    var cartW = Math.max(26, w * 0.045), cartH = Math.max(14, h * 0.08);
    ctx.fillStyle = c.fg;
    ctx.fillRect(cartPxX - cartW / 2, railY - cartH / 2, cartW, cartH);
    var poleLen = h * 0.34;
    var pivotY = railY - cartH / 2;
    var tipX = cartPxX + poleLen * Math.sin(z[2]);
    var tipY = pivotY - poleLen * Math.cos(z[2]);
    var dim = mode === "lost";
    ctx.globalAlpha = dim ? 0.5 : 1;
    ctx.strokeStyle = dim ? c.muted : c.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cartPxX, pivotY); ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = dim ? c.muted : c.accent;
    ctx.beginPath();
    ctx.arc(tipX, tipY, Math.max(4, w * 0.011), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    var arrowScale = (w * 0.12) / U_MAX;
    drawArrow(ctx, cartPxX, railY + cartH / 2 + 14, cartPxX + lastU * arrowScale, c);
    lastTipX = tipX;
  }

  function updateReadout() {
    var thetaDeg = (wrapAngle(z[2]) * 180) / Math.PI;
    var text;
    if (mode === "hanging") text = "hanging";
    else if (mode === "swing-up") text = "swing-up · θ = " + fmtSigned(thetaDeg, 0) + "°";
    else if (mode === "balance") text = "balance · θ = " + fmtSigned(thetaDeg, 1) + "°";
    else text = "lost";
    readout.textContent = text;
    var idle = mode === "hanging" || mode === "lost";
    swingBtn.hidden = !idle;
    resetBtn.hidden = !idle;
  }

  // ---- loop ----
  var rafId = null, lastTs = null, transientActive = false, transientDeadline = null;

  function resume() {
    if (rafId !== null) return;
    if (reduceMotion && !transientActive) return;
    lastTs = null;
    rafId = requestAnimationFrame(step);
  }

  function stopLoop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function step(now) {
    if (lastTs === null) lastTs = now;
    var frameDt = (now - lastTs) / 1000;
    lastTs = now;
    if (frameDt > 0.1) frameDt = 0.1;
    var accum = frameDt, guard = 0;
    while (accum >= DT && guard < 40) { physicsStep(); accum -= DT; guard++; }
    render();
    updateReadout();
    if (reduceMotion) {
      var stop = false;
      if (mode === "lost") stop = true;
      else if (mode === "balance") {
        stop = Math.abs(wrapAngle(z[2])) < SETTLE_ANGLE && Math.abs(z[3]) < SETTLE_RATE;
      } else if (mode === "hanging" && transientDeadline !== null && now >= transientDeadline) {
        stop = true;
      }
      if (stop) { transientActive = false; transientDeadline = null; rafId = null; return; }
    }
    rafId = requestAnimationFrame(step);
  }

  canvas.addEventListener("click", function (e) {
    if (mode === "swing-up" || mode === "lost") return;
    var rect = canvas.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var sign = clickX < lastTipX ? 1 : -1;
    z[3] += sign * IMPULSE_DTHETADOT;
    if (reduceMotion) {
      transientActive = true;
      if (mode === "hanging") transientDeadline = performance.now() + 2500;
    }
    resume();
  });

  swingBtn.addEventListener("click", function () {
    if (mode !== "hanging" && mode !== "lost") return;
    mode = "swing-up";
    swingUpElapsed = 0;
    transientDeadline = null;
    if (reduceMotion) transientActive = true;
    resume();
  });

  resetBtn.addEventListener("click", function () {
    z = [0, 0, Math.PI, 0];
    mode = "hanging";
    lastU = 0;
    jitterAccum = 0;
    swingUpElapsed = 0;
    transientActive = false;
    transientDeadline = null;
    render(); updateReadout(); resume();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopLoop(); else resume();
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) stopLoop(); else resume();
    });
    io.observe(canvas);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); render(); }, 150);
  });

  // ---- init ----
  size();
  render();
  updateReadout();
  if (!reduceMotion) resume();
})();
