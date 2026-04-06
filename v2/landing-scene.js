(function () {
    const TAU = Math.PI * 2;

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    function easeOutCubic(value) {
        return 1 - Math.pow(1 - value, 3);
    }

    function easeInOutCubic(value) {
        return value < 0.5
            ? 4 * value * value * value
            : 1 - Math.pow(-2 * value + 2, 3) / 2;
    }

    function easeOutBack(value) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
    }

    class PortfolioLandingSequence {
        constructor() {
            this.canvas = document.getElementById("landing-scene-canvas");
            this.cubeField = document.getElementById("ice-cube-field");

            if (!this.canvas || !this.cubeField) {
                return;
            }

            this.ctx = this.canvas.getContext("2d");

            if (!this.ctx) {
                return;
            }

            this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            this.isMobile = window.innerWidth < 900;
            this.lineCount = this.isMobile ? 34 : 54;
            this.trailLength = this.isMobile ? 10 : 14;
            this.trails = [];
            this.cubes = [];
            this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
            this.lastFrame = performance.now();
            this.startTime = this.lastFrame;
            this.introDuration = this.prefersReducedMotion ? 1900 : 5650;
            this.revealStart = this.prefersReducedMotion ? 260 : 3050;
            this.revealDuration = this.prefersReducedMotion ? 1850 : 5450;
            this.uiDelay = this.prefersReducedMotion ? 320 : 2050;
            this.center = { x: 0, y: 0 };
            this.scale = 0;
            document.body.classList.add("landing-sequenced");
            document.body.style.setProperty("--landing-ui-progress", "0");
            document.body.style.setProperty("--landing-reveal-progress", "0");
            document.body.classList.remove("landing-preload");

            this.resize();
            this.buildCubes();
            this.createTrails();
            this.prewarm();
            this.bindEvents();
            this.animate();
        }

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.dpr = Math.min(window.devicePixelRatio || 1, 1.2);
            this.canvas.width = Math.round(this.width * this.dpr);
            this.canvas.height = Math.round(this.height * this.dpr);
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.center.x = this.width * 0.5;
            this.center.y = this.height * 0.5;
            this.scale = Math.min(this.width, this.height) * (this.isMobile ? 0.23 : 0.27);
        }

        bindEvents() {
            window.addEventListener("resize", () => {
                this.isMobile = window.innerWidth < 900;
                this.resize();
            });

            window.addEventListener("mousemove", (event) => {
                this.pointer.targetX = (event.clientX / this.width - 0.5) * 2;
                this.pointer.targetY = (event.clientY / this.height - 0.5) * 2;
            }, { passive: true });

            window.addEventListener("touchmove", (event) => {
                const touch = event.touches[0];

                if (!touch) {
                    return;
                }

                this.pointer.targetX = (touch.clientX / this.width - 0.5) * 2;
                this.pointer.targetY = (touch.clientY / this.height - 0.5) * 2;
            }, { passive: true });
        }

        buildCubes() {
            const configs = [
                { size: 122, x: -1.65, y: -0.88, z: -140, rx: -18, ry: 24, rz: 12, delay: 0.04, drift: 0.22, sx: 1.0, sy: 1.0, sz: 1.0 },
                { size: 96, x: 1.68, y: -0.78, z: -80, rx: 14, ry: -26, rz: -8, delay: 0.12, drift: 0.28, sx: 0.86, sy: 1.22, sz: 0.86 },
                { size: 138, x: -1.44, y: 0.95, z: -220, rx: 32, ry: 18, rz: -22, delay: 0.18, drift: 0.18, sx: 1.18, sy: 0.62, sz: 1.18 },
                { size: 104, x: 1.78, y: 0.92, z: -110, rx: -26, ry: 28, rz: 16, delay: 0.27, drift: 0.24, sx: 0.92, sy: 0.92, sz: 0.92 },
                { size: 88, x: 0.24, y: -1.3, z: -40, rx: 18, ry: -14, rz: 34, delay: 0.22, drift: 0.2, sx: 0.78, sy: 1.1, sz: 0.78 }
            ];

            const faces = ["front", "back", "left", "right", "top", "bottom"];

            this.cubeField.innerHTML = "";
            this.cubes = configs.map((config, index) => {
                const cube = document.createElement("div");
                cube.className = `ice-cube ice-cube--${index + 1}`;
                cube.style.setProperty("--cube-size", `${config.size}px`);

                const inner = document.createElement("div");
                inner.className = "ice-cube__inner";

                faces.forEach((faceName) => {
                    const face = document.createElement("div");
                    face.className = `ice-cube__face ice-cube__face--${faceName}`;
                    inner.appendChild(face);
                });

                cube.appendChild(inner);
                this.cubeField.appendChild(cube);

                return {
                    element: cube,
                    inner,
                    config
                };
            });
        }

        randomPoint(revealProgress, phase) {
            const angle = phase ?? Math.random() * TAU;
            const radius = revealProgress < 0.35
                ? 0.6 + Math.random() * 1.2
                : 2.6 + Math.random() * 2.8;

            return {
                x: Math.cos(angle) * radius,
                y: (Math.random() - 0.5) * (revealProgress < 0.35 ? 1.6 : 3.2),
                z: Math.sin(angle) * radius * 0.82 + (Math.random() - 0.5) * 1.25
            };
        }

        createTrails() {
            const palette = [
                "255, 255, 255",
                "231, 231, 231",
                "203, 203, 203",
                "176, 176, 176",
                "148, 148, 148"
            ];

            this.trails = [];

            for (let index = 0; index < this.lineCount; index += 1) {
                const phase = Math.random() * TAU;
                const head = this.randomPoint(0, phase);
                const points = [];

                for (let pointIndex = 0; pointIndex < this.trailLength; pointIndex += 1) {
                    points.push({ x: head.x, y: head.y, z: head.z });
                }

                this.trails.push({
                    color: palette[index % palette.length],
                    points,
                    phase,
                    width: 0.8 + Math.random() * 0.9,
                    speed: 0.016 + Math.random() * 0.011,
                    opacity: 0.18 + Math.random() * 0.22
                });
            }
        }

        prewarm() {
            for (let step = 0; step < 56; step += 1) {
                this.updateTrails(1 / 60, step * 16.67, 0.2, 0);
            }
        }

        sampleField(point, time, revealProgress) {
            const x = point.x;
            const y = point.y;
            const z = point.z;

            let vx = Math.sin(y * 1.8 + time * 1.6) - Math.cos(z * 1.45 - time * 0.95);
            let vy = Math.sin(z * 1.3 + time * 1.1) + Math.cos(x * 1.55 + time * 0.72);
            let vz = Math.sin(x * 1.46 - time * 1.3) - Math.cos(y * 1.7 - time * 0.84);

            const orbitLength = Math.sqrt(x * x + z * z) + 0.001;
            vx += (-z / orbitLength) * (1.2 + revealProgress * 0.88);
            vz += (x / orbitLength) * (1.2 + revealProgress * 0.88);
            vy *= 0.56;

            if (revealProgress > 0) {
                const focusX = Math.max(0, 2.45 - Math.abs(x));
                const focusY = Math.max(0, 1.45 - Math.abs(y));
                const repulsion = (focusX / 2.45) * (focusY / 1.45) * revealProgress * 2.6;

                vx += Math.sign(x || 1) * repulsion;
                vz += Math.sign(z || 1) * repulsion * 0.55;
                vy += y * repulsion * 0.12;
            }

            const length = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;

            return {
                x: vx / length,
                y: vy / length,
                z: vz / length
            };
        }

        updateTrails(delta, elapsedMs, revealProgress, idleProgress = 0) {
            const deltaFactor = delta * 60;
            const time = elapsedMs * 0.00052;
            const speedScale = lerp(1, 0.62, idleProgress);

            this.trails.forEach((trail) => {
                const head = trail.points[0];
                const direction = this.sampleField(head, time + trail.phase, revealProgress);

                head.x += direction.x * trail.speed * deltaFactor * speedScale;
                head.y += direction.y * trail.speed * deltaFactor * speedScale;
                head.z += direction.z * trail.speed * deltaFactor * speedScale;

                const distance = Math.sqrt(head.x * head.x + head.y * head.y + head.z * head.z);

                if (!Number.isFinite(distance) || distance > 7.6) {
                    const reset = this.randomPoint(revealProgress, trail.phase + time);

                    trail.points.forEach((point) => {
                        point.x = reset.x;
                        point.y = reset.y;
                        point.z = reset.z;
                    });
                    return;
                }

                for (let pointIndex = this.trailLength - 1; pointIndex > 0; pointIndex -= 1) {
                    const current = trail.points[pointIndex];
                    const previous = trail.points[pointIndex - 1];

                    current.x = lerp(current.x, previous.x, 0.88);
                    current.y = lerp(current.y, previous.y, 0.88);
                    current.z = lerp(current.z, previous.z, 0.88);
                }
            });
        }

        project(point) {
            const depth = point.z + 7.8;
            const perspective = 1 / Math.max(0.26, depth * 0.18);
            const x = this.center.x + point.x * this.scale * perspective + this.pointer.x * 26;
            const y = this.center.y + point.y * this.scale * perspective + this.pointer.y * 14;

            return { x, y, perspective };
        }

        drawGlow(introProgress, revealProgress, idleProgress, elapsedMs) {
            const pulse = 0.92 + Math.sin(elapsedMs * 0.0022) * 0.08;
            const glowRadius = lerp(240, 500, introProgress) * pulse * (1 - revealProgress * 0.34) * lerp(1, 0.82, idleProgress);
            const gradient = this.ctx.createRadialGradient(
                this.center.x,
                this.center.y,
                0,
                this.center.x,
                this.center.y,
                glowRadius
            );

            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.16 * (1 - revealProgress * 0.3)})`);
            gradient.addColorStop(0.35, `rgba(214, 214, 214, ${0.08 * (1 - revealProgress * 0.18)})`);
            gradient.addColorStop(1, "rgba(214, 214, 214, 0)");

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, glowRadius, 0, TAU);
            this.ctx.fill();
        }

        drawTransitionWave(elapsedMs, revealProgress, idleProgress) {
            const waveProgress = easeOutCubic(clamp((elapsedMs - this.revealStart + 220) / 1960, 0, 1));

            if (waveProgress <= 0 || waveProgress >= 1) {
                return;
            }

            const maxRadius = Math.max(this.width, this.height) * 0.48;
            const radius = lerp(this.scale * 0.26, maxRadius, waveProgress);
            const alpha = (1 - waveProgress) * 0.18 * lerp(1, 0.7, idleProgress);

            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.lineWidth = lerp(1.8, 0.45, waveProgress);
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, radius, 0, TAU);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.55})`;
            this.ctx.lineWidth = lerp(1.2, 0.32, waveProgress);
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, radius * 0.78, 0, TAU);
            this.ctx.stroke();

            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.18})`;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, radius * 0.72, 0, TAU);
            this.ctx.fill();
            this.ctx.restore();
        }

        drawTrails(introProgress, revealProgress, idleProgress, elapsedMs) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.drawGlow(introProgress, revealProgress, idleProgress, elapsedMs);
            this.drawTransitionWave(elapsedMs, revealProgress, idleProgress);

            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";
            this.ctx.globalCompositeOperation = "lighter";

            this.trails.forEach((trail) => {
                const alpha = trail.opacity * (0.56 + introProgress * 0.44) * (1 - revealProgress * 0.34) * lerp(1, 0.74, idleProgress);

                this.ctx.strokeStyle = `rgba(${trail.color}, ${alpha})`;
                this.ctx.lineWidth = trail.width * (this.isMobile ? 0.9 : 1.1);
                this.ctx.beginPath();

                trail.points.forEach((point, index) => {
                    const projected = this.project(point);

                    if (index === 0) {
                        this.ctx.moveTo(projected.x, projected.y);
                    } else {
                        this.ctx.lineTo(projected.x, projected.y);
                    }
                });

                this.ctx.stroke();

                const head = this.project(trail.points[0]);
                this.ctx.fillStyle = `rgba(${trail.color}, ${alpha * 0.85})`;
                this.ctx.beginPath();
                this.ctx.arc(head.x, head.y, 1.3 + head.perspective * 1.1, 0, TAU);
                this.ctx.fill();
            });

            this.ctx.globalCompositeOperation = "source-over";
        }

        updateCubes(elapsedMs, revealProgress, idleProgress) {
            const time = elapsedMs * 0.001;
            const xSpan = this.isMobile ? this.width * 0.2 : this.width * 0.22;
            const ySpan = this.isMobile ? this.height * 0.15 : this.height * 0.18;

            this.pointer.x = lerp(this.pointer.x, this.pointer.targetX, 0.05);
            this.pointer.y = lerp(this.pointer.y, this.pointer.targetY, 0.05);

            this.cubes.forEach((cube) => {
                const config = cube.config;
                const localProgress = easeOutBack(clamp((revealProgress - config.delay) / 0.48, 0, 1));
                const settled = clamp((revealProgress - config.delay) / 0.86, 0, 1);

                const targetX = config.x * xSpan;
                const targetY = config.y * ySpan;
                const liveDrift = lerp(1, 0.72, idleProgress);
                const driftX = Math.sin(time * (0.55 + config.drift) + config.delay * 7) * 10 * settled * liveDrift;
                const driftY = Math.cos(time * (0.72 + config.drift) + config.delay * 9) * 12 * settled * liveDrift;
                const x = lerp(0, targetX, localProgress) + driftX + this.pointer.x * 18;
                const y = lerp(0, targetY, localProgress) + driftY + this.pointer.y * 12;
                const z = lerp(-260, config.z, localProgress);
                const opacity = 0.06 + localProgress * 0.94;
                const scale = lerp(0.2, 1, localProgress);
                const rotateX = config.rx + time * (8 + config.drift * 7) + this.pointer.y * 8;
                const rotateY = config.ry + time * (14 + config.drift * 8) + this.pointer.x * 16;
                const rotateZ = config.rz + Math.sin(time * 0.8 + config.delay * 12) * 10;

                cube.element.style.left = `${this.center.x + x}px`;
                cube.element.style.top = `${this.center.y + y}px`;
                cube.element.style.opacity = opacity.toFixed(3);
                cube.element.style.transform =
                    `translate3d(-50%, -50%, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale3d(${config.sx * scale}, ${config.sy * scale}, ${config.sz * scale})`;
            });
        }

        updateUi(uiProgress, revealProgress) {
            const eased = easeOutCubic(uiProgress);
            document.body.style.setProperty("--landing-ui-progress", eased.toFixed(4));
            document.body.style.setProperty("--landing-reveal-progress", easeInOutCubic(revealProgress).toFixed(4));
        }

        animate() {
            const now = performance.now();
            const delta = Math.min((now - this.lastFrame) / 1000, 0.032);
            const elapsedMs = now - this.startTime;
            this.lastFrame = now;

            const introProgress = easeOutCubic(clamp(elapsedMs / this.introDuration, 0, 1));
            const revealProgress = easeInOutCubic(
                clamp((elapsedMs - this.revealStart) / this.revealDuration, 0, 1)
            );
            const idleProgress = clamp((elapsedMs - (this.revealStart + this.revealDuration)) / 3600, 0, 1);
            const uiProgress = clamp((elapsedMs - (this.revealStart + this.uiDelay)) / 1420, 0, 1);

            this.updateTrails(delta, elapsedMs, revealProgress, idleProgress);
            this.drawTrails(introProgress, revealProgress, idleProgress, elapsedMs);
            this.updateCubes(elapsedMs, revealProgress, idleProgress);
            this.updateUi(uiProgress, revealProgress);

            requestAnimationFrame(() => this.animate());
        }
    }

    function initLandingSequence() {
        try {
            new PortfolioLandingSequence();
        } catch (error) {
            document.body.classList.remove("landing-preload");
            document.body.classList.remove("landing-sequenced");
            document.body.style.setProperty("--landing-ui-progress", "1");
            console.error("Landing sequence failed to initialize.", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initLandingSequence);
    } else {
        initLandingSequence();
    }
})();
