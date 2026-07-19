// Cart-pole bench — nonlinear dynamics, RK4-integrated, upright-balanced by
// a hardcoded LQR gain. Click/tap shoves the pole; it fights back and
// recovers unless the shove is too big, in which case it falls and waits
// for "stabilize".

(function () {
  "use strict";

  var mount = document.getElementById("demo-mech-mount");
  if (!mount) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  mount.innerHTML =
    '<canvas class="demo-canvas" width="960" height="420" aria-hidden="true"></canvas>' +
    '<div class="demo-controls">' +
    '<button type="button" class="demo-btn" id="mech-stabilize" hidden>stabilize</button>' +
    "</div>" +
    '<span class="demo-readout" id="mech-readout" aria-live="polite"></span>';

  var canvas = mount.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var stabilizeBtn = mount.querySelector("#mech-stabilize");
  var readout = mount.querySelector("#mech-readout");

  function colors() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) {
      var val = cs.getPropertyValue(name);
      return val && val.trim() ? val.trim() : fb;
    }
    return {
      fg: v("--fg", "#1a1a1a"),
      muted: v("--muted", "#6b6b66"),
      accent: v("--accent", "#1f3fbf"),
      rule: v("--rule", "rgba(26,26,26,0.12)")
    };
  }

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  // ---- plant (cart mass M, pole mass MP, pole half-length L) ----
  var M = 1, MP = 0.2, L = 0.5, G = 9.81;
  var TOTAL = M + MP;
  var U_MAX = 15;       // N, saturation
  var RAIL = 6;         // m, cart clamps at +/- RAIL/2
  var DT = 0.005;       // s, fixed RK4 substep
  var FALL_ANGLE = (60 * Math.PI) / 180;
  var IMPULSE_DTHETADOT = 3;   // rad/s kick from a click, swings ~20-30deg
  var JITTER_PERIOD = 1.0;     // s between idle disturbances
  var JITTER_MAG = 0.06;       // rad/s, tiny — keeps it "alive"
  var SETTLE_ANGLE = (0.5 * Math.PI) / 180;
  var SETTLE_RATE = 0.05;

  // LQR gain K for u = -K.z, z = [x, xdot, theta, thetadot], theta=0 upright.
  // Derived offline: linearize the plant about theta=0, discretize with a
  // small dt, then iterate the discrete Riccati difference equation
  //   P = Q + Ad'PAd - Ad'PBd (R + Bd'PBd)^-1 Bd'PAd
  // to convergence for Q = diag(1,1,10,1), R = 0.1. Converged gain (~4000
  // iterations): K = [-3.0615, -5.7949, -50.4135, -12.8781]. Verified in a
  // throwaway RK4 harness: from theta=25deg the closed loop returns to
  // |theta|<1deg in ~2.0s without the cart approaching +/-3m (rail=6m); from
  // theta=70deg with u=0 the free swing stays numerically bounded.
  var K = [-3.061534435459863, -5.7948618936020795, -50.41352132866051, -12.87809236287752];

  var z = [0, 0, 0, 0]; // x, xdot, theta, thetadot
  var fallen = false;
  var lastU = 0;
  var lastTipX = 0;
  var jitterAccum = 0;

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

  function physicsStep() {
    jitterAccum += DT;
    if (jitterAccum >= JITTER_PERIOD) {
      z[3] += (Math.random() - 0.5) * 2 * JITTER_MAG;
      jitterAccum = 0;
    }
    var u = 0;
    if (!fallen) {
      u = clamp(-(K[0] * z[0] + K[1] * z[1] + K[2] * z[2] + K[3] * z[3]), -U_MAX, U_MAX);
    }
    z = rk4(z, u, DT);
    if (z[0] > RAIL / 2) { z[0] = RAIL / 2; z[1] = 0; }
    else if (z[0] < -RAIL / 2) { z[0] = -RAIL / 2; z[1] = 0; }
    if (!fallen && Math.abs(z[2]) > FALL_ANGLE) fallen = true;
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
    ctx2.strokeStyle = c.muted;
    ctx2.fillStyle = c.muted;
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(x0, y);
    ctx2.lineTo(x1, y);
    ctx2.stroke();
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
    var trackPxW = w - margin * 2;
    var pxPerM = trackPxW / RAIL;
    var centerX = w / 2;
    var cartPxX = centerX + z[0] * pxPerM;

    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, railY);
    ctx.lineTo(w - margin, railY);
    ctx.moveTo(centerX, railY - 6);
    ctx.lineTo(centerX, railY + 6);
    ctx.stroke();

    var cartW = Math.max(26, w * 0.045), cartH = Math.max(14, h * 0.08);
    ctx.fillStyle = c.fg;
    ctx.fillRect(cartPxX - cartW / 2, railY - cartH / 2, cartW, cartH);

    var poleLen = h * 0.34;
    var pivotY = railY - cartH / 2;
    var tipX = cartPxX + poleLen * Math.sin(z[2]);
    var tipY = pivotY - poleLen * Math.cos(z[2]);
    ctx.globalAlpha = fallen ? 0.5 : 1;
    ctx.strokeStyle = fallen ? c.muted : c.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cartPxX, pivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = fallen ? c.muted : c.accent;
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
    var text = "θ = " + fmtSigned(thetaDeg, 1) + "° · u = " + fmtSigned(lastU, 1) + " N";
    if (fallen) text += " · controller lost it";
    readout.textContent = text;
    stabilizeBtn.hidden = !fallen;
  }

  // ---- loop ----
  var rafId = null, lastTs = null, transientActive = false;

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
      var settled = !fallen && Math.abs(wrapAngle(z[2])) < SETTLE_ANGLE && Math.abs(z[3]) < SETTLE_RATE;
      if (settled || fallen) { transientActive = false; rafId = null; return; }
    }
    rafId = requestAnimationFrame(step);
  }

  canvas.addEventListener("click", function (e) {
    if (fallen) return;
    var rect = canvas.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var sign = clickX < lastTipX ? 1 : -1;
    z[3] += sign * IMPULSE_DTHETADOT;
    if (reduceMotion) transientActive = true;
    resume();
  });

  stabilizeBtn.addEventListener("click", function () {
    z = [0, 0, 0, 0];
    fallen = false;
    lastU = 0;
    jitterAccum = 0;
    transientActive = false;
    render();
    updateReadout();
    resume();
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
