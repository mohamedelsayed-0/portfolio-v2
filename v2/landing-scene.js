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

    function exponentialRamp(value, power = 4.5) {
        const t = clamp(value, 0, 1);

        if (t <= 0 || t >= 1) {
            return t;
        }

        return (Math.exp(power * t) - 1) / (Math.exp(power) - 1);
    }

    class PortfolioLandingSequence {
        constructor() {
            this.canvas = document.getElementById("landing-scene-canvas");
            this.cubeField = document.getElementById("ice-cube-field");
            this.landingCopy = document.getElementById("landing-copy");

            if (!this.canvas || !this.cubeField) {
                return;
            }

            this.ctx = this.canvas.getContext("2d");

            if (!this.ctx) {
                return;
            }

            this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            this.isMobile = window.innerWidth < 900;
            this.lineCount = this.isMobile ? 10 : 12;
            this.trailLength = this.isMobile ? 8 : 11;
            this.trails = [];
            this.cubes = [];
            this.bootNodes = [];
            this.bootLinks = [];
            this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
            this.sceneRotation = { x: -0.28, y: 0.36, z: 0 };
            this.lastFrame = performance.now();
            this.center = { x: 0, y: 0 };
            this.scale = 0;
            this.uiActivated = false;

            this.nodeBirthStart = this.prefersReducedMotion ? 20 : 80;
            this.nodeBirthDuration = this.prefersReducedMotion ? 460 : 1200;
            this.nodeBirthSpread = this.prefersReducedMotion ? 120 : 760;
            this.nodeBirthJitter = this.prefersReducedMotion ? 100 : 520;
            this.formStart = this.prefersReducedMotion ? 80 : 360;
            this.formDuration = this.prefersReducedMotion ? 650 : 1450;
            this.formSpread = this.prefersReducedMotion ? 180 : 650;
            this.formJitter = this.prefersReducedMotion ? 120 : 420;
            this.connectionStart = this.prefersReducedMotion ? 260 : 1720;
            this.connectionDuration = this.prefersReducedMotion ? 620 : 1300;
            this.connectionSpread = this.prefersReducedMotion ? 160 : 560;
            this.connectionJitter = this.prefersReducedMotion ? 100 : 280;
            this.connectionEnd = this.connectionStart + this.connectionDuration;
            this.contourStart = this.connectionStart + this.connectionDuration * (this.prefersReducedMotion ? 0.25 : 0.35);
            this.contourDuration = this.prefersReducedMotion ? 420 : 760;
            this.handoffStart = this.prefersReducedMotion ? 860 : 3150;
            this.handoffDuration = this.prefersReducedMotion ? 430 : 900;
            this.revealStart = this.prefersReducedMotion ? 1050 : 3900;
            this.revealDuration = this.prefersReducedMotion ? 850 : 1600;
            this.introDuration = this.revealStart + 240;
            this.uiDelay = this.prefersReducedMotion ? 40 : 180;
            this.uiRevealDuration = this.prefersReducedMotion ? 750 : 1420;
            this.bootConnectDuration = this.connectionEnd;
            this.startTime = this.lastFrame;

            document.body.classList.add("landing-sequenced");
            document.body.style.setProperty("--landing-ui-progress", "0");
            document.body.style.setProperty("--landing-drop-progress", "0");
            document.body.style.setProperty("--landing-reveal-progress", "0");
            document.body.style.setProperty("--landing-shell-opacity", "0");
            document.body.style.setProperty("--landing-drop-y", "-18vh");
            document.body.style.setProperty("--landing-drop-blur", "14px");
            document.body.style.setProperty("--landing-drop-clip", "100%");
            document.body.style.setProperty("--landing-ui-y", "-34px");
            document.body.style.setProperty("--landing-header-y", "-46px");
            document.body.style.setProperty("--landing-ui-blur", "12px");
            document.body.style.setProperty("--landing-header-blur", "10px");
            document.body.style.setProperty("--landing-copy-rotate-x", "-3deg");
            document.body.style.setProperty("--landing-copy-scale", "0.98");
            document.body.style.setProperty("--landing-main-mask-opacity", "1");
            document.body.style.setProperty("--landing-main-mask-scale", "1.06");
            document.body.style.setProperty("--landing-main-glow-opacity", "0.9");
            document.body.style.setProperty("--landing-main-glow-scale", "1");
            document.body.style.setProperty("--landing-cube-field-opacity", "0");
            document.body.style.setProperty("--landing-instrument-opacity", "0");
            document.body.style.setProperty("--landing-instrument-x", "0px");
            document.body.style.setProperty("--landing-instrument-y", "0px");
            document.body.style.setProperty("--landing-card-tilt-x", "0deg");
            document.body.style.setProperty("--landing-card-tilt-y", "0deg");
            document.body.style.setProperty("--landing-light-x", "50%");
            document.body.style.setProperty("--landing-light-y", "44%");
            document.body.style.setProperty("--landing-pointer-x", "0");
            document.body.style.setProperty("--landing-pointer-y", "0");
            document.body.classList.remove("landing-preload");

            this.resize();
            this.buildCubes();
            this.createTrails();
            this.prewarm();
            this.bindEvents();
            this.bindButtonMagnetism();
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
            this.scale = Math.min(this.width, this.height) * (this.isMobile ? 0.24 : 0.47);
            this.generateBootNetwork();
        }

        seededRandom() {
            const x = Math.sin(this.seed++) * 10000;
            return x - Math.floor(x);
        }

        sampleManifoldTarget(node, time, revealProgress = 0, idleProgress = 0) {
            const u = node.u;
            const v = node.v;
            const scale = this.isMobile ? 1.62 : 1.86;
            const radius = Math.sqrt(u * u + v * v);
            const falloff = Math.exp(-radius * 0.32);
            const breathing = lerp(1, 0.66, idleProgress);
            const waveA = Math.sin(u * 3.1 + time * 0.72 + node.phase) * Math.cos(v * 2.7 - time * 0.46);
            const waveB = Math.sin((u + v) * 2.0 - time * 0.38 + node.phase * 0.7);
            const saddle = (u * u - v * v) * 0.18;
            const compression = Math.sin(clamp((time * 1000 - this.handoffStart) / this.handoffDuration, 0, 1) * Math.PI);
            const revealOpen = easeOutCubic(revealProgress);

            let x = u * scale + Math.sin(v * 2.1 + time * 0.32 + node.phase) * 0.09 * falloff;
            let z = v * scale * 0.9 + Math.cos(u * 1.8 - time * 0.28 + node.phase) * 0.12 * falloff;
            let y = (waveA * 0.64 + waveB * 0.2 + saddle) * scale * 0.5 * falloff * breathing;

            x *= 1 - compression * 0.18 + revealOpen * (this.isMobile ? 0.18 : 0.08);
            z *= 1 - compression * 0.14 + revealOpen * (this.isMobile ? 0.22 : 0.1);
            y *= 1 + compression * 0.28 - revealOpen * 0.08;

            return { x, y, z };
        }

        generateBootNetwork() {
            this.seed = 42;
            this.bootNodes = [];
            this.bootLinks = [];

            const gridSize = this.isMobile ? 13 : 21;
            this.gridSize = gridSize;
            const maxRadius = Math.sqrt(2);

            for (let row = 0; row < gridSize; row += 1) {
                for (let column = 0; column < gridSize; column += 1) {
                    const u = (column / (gridSize - 1)) * 2 - 1;
                    const v = (row / (gridSize - 1)) * 2 - 1;
                    const radius = Math.sqrt(u * u + v * v) / maxRadius;
                    const surfaceMask = clamp((0.88 - radius) / 0.22, 0, 1);
                    const phase = this.seededRandom() * TAU;
                    const targetScale = this.isMobile ? 1.62 : 1.86;
                    const falloff = Math.exp(-Math.sqrt(u * u + v * v) * 0.32);
                    const waveA = Math.sin(u * 3.1 + phase) * Math.cos(v * 2.7);
                    const waveB = Math.sin((u + v) * 2.0 + phase * 0.7);
                    const saddle = (u * u - v * v) * 0.18;
                    const startX = (u * targetScale + Math.sin(v * 2.1 + phase) * 0.09 * falloff) * 0.82 + (this.seededRandom() - 0.5) * 0.22;
                    const startY = ((waveA * 0.64 + waveB * 0.2 + saddle) * targetScale * 0.5 * falloff) * 0.62 + (this.seededRandom() - 0.5) * 0.18;
                    const startZ = (v * targetScale * 0.9 + Math.cos(u * 1.8 + phase) * 0.12 * falloff) * 0.82 + (this.seededRandom() - 0.5) * 0.2;
                    const birthDelay = this.nodeBirthStart + Math.pow(radius, 1.25) * this.nodeBirthSpread + this.seededRandom() * this.nodeBirthJitter;
                    const formDelay = this.formStart + radius * this.formSpread + this.seededRandom() * this.formJitter;

                    this.bootNodes.push({
                        u,
                        v,
                        x: startX,
                        y: startY,
                        z: startZ,
                        vx: 0,
                        vy: 0,
                        vz: 0,
                        startX,
                        startY,
                        startZ,
                        birthDelay,
                        birthDuration: (this.prefersReducedMotion ? 320 : 780) + (1 - radius) * (this.prefersReducedMotion ? 120 : 320) + this.seededRandom() * (this.prefersReducedMotion ? 120 : 520),
                        formDelay,
                        formDuration: (this.prefersReducedMotion ? 500 : 950) + (1 - radius) * (this.prefersReducedMotion ? 180 : 380) + this.seededRandom() * (this.prefersReducedMotion ? 140 : 430),
                        birth: 0,
                        form: 0,
                        surfaceMask,
                        size: 0.72 + this.seededRandom() * 1.75,
                        opacity: 0.48 + this.seededRandom() * 0.62,
                        phase
                    });

                    const index = row * gridSize + column;
                    const addLink = (from, to, weight = 0) => {
                        const fromNode = this.bootNodes[from];
                        const toNode = this.bootNodes[to];
                        const linkRadius = (Math.sqrt(fromNode.u * fromNode.u + fromNode.v * fromNode.v) + Math.sqrt(toNode.u * toNode.u + toNode.v * toNode.v)) / (2 * maxRadius);

                        this.bootLinks.push({
                            from,
                            to,
                            mask: Math.min(fromNode.surfaceMask, toNode.surfaceMask),
                            delay: this.connectionStart + linkRadius * this.connectionSpread + weight + this.seededRandom() * this.connectionJitter,
                            duration: (this.prefersReducedMotion ? 420 : 620) + this.seededRandom() * (this.prefersReducedMotion ? 220 : 480),
                            opacity: 0.48 + this.seededRandom() * 0.48,
                            progress: 0
                        });
                    };

                    if (column > 0) addLink(index - 1, index);
                    if (row > 0) addLink(index - gridSize, index, 80);
                }
            }
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

            window.addEventListener("mouseleave", () => {
                this.pointer.targetX = 0;
                this.pointer.targetY = 0;
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

        bindButtonMagnetism() {
            if (this.prefersReducedMotion) {
                return;
            }

            const buttons = document.querySelectorAll(".landing-actions .btn");

            buttons.forEach((button) => {
                button.addEventListener("mousemove", (event) => {
                    const rect = button.getBoundingClientRect();
                    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
                    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;

                    button.style.setProperty("--button-x", `${x.toFixed(2)}px`);
                    button.style.setProperty("--button-y", `${y.toFixed(2)}px`);
                }, { passive: true });

                button.addEventListener("mouseleave", () => {
                    button.style.setProperty("--button-x", "0px");
                    button.style.setProperty("--button-y", "0px");
                }, { passive: true });
            });
        }

        buildCubes() {
            const configs = [
                { size: 122, x: -1.65, y: -0.88, z: -140, rx: -18, ry: 24, rz: 12, delay: 0.02, drift: 0.18, sx: 1.0, sy: 1.0, sz: 1.0, sourceU: -0.82, sourceV: 0.46 },
                { size: 96, x: 1.68, y: -0.78, z: -80, rx: 14, ry: -26, rz: -8, delay: 0.11, drift: 0.22, sx: 0.86, sy: 1.22, sz: 0.86, sourceU: 0.74, sourceV: 0.36 },
                { size: 138, x: -1.44, y: 0.95, z: -220, rx: 32, ry: 18, rz: -22, delay: 0.19, drift: 0.15, sx: 1.18, sy: 0.62, sz: 1.18, sourceU: -0.58, sourceV: -0.74 },
                { size: 104, x: 1.78, y: 0.92, z: -110, rx: -26, ry: 28, rz: 16, delay: 0.27, drift: 0.2, sx: 0.92, sy: 0.92, sz: 0.92, sourceU: 0.68, sourceV: -0.66 },
                { size: 88, x: 0.24, y: -1.3, z: -40, rx: 18, ry: -14, rz: 34, delay: 0.22, drift: 0.16, sx: 0.78, sy: 1.1, sz: 0.78, sourceU: 0.08, sourceV: 0.86 }
            ];

            const faces = ["front", "back", "left", "right", "top", "bottom"];

            this.cubeField.innerHTML = "";
            this.cubes = configs.map((config, index) => {
                const cube = document.createElement("div");
                cube.className = `ice-cube ice-cube--${index + 1}`;
                cube.style.setProperty("--cube-size", `${config.size}px`);
                cube.style.setProperty("--cube-depth", `${config.size * 0.5}px`);

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
                    config,
                    sourceNode: {
                        u: config.sourceU,
                        v: config.sourceV,
                        phase: index * 1.47
                    }
                };
            });
        }

        randomPoint(revealProgress, phase) {
            const angle = phase ?? Math.random() * TAU;
            const radius = revealProgress < 0.35
                ? 0.7 + Math.random() * 1.35
                : 2.7 + Math.random() * 2.9;

            return {
                x: Math.cos(angle) * radius,
                y: (Math.random() - 0.5) * (revealProgress < 0.35 ? 1.6 : 3.2),
                z: Math.sin(angle) * radius * 0.82 + (Math.random() - 0.5) * 1.25
            };
        }

        createTrails() {
            const palette = [
                "255, 255, 255",
                "230, 238, 244",
                "210, 226, 234",
                "196, 196, 196",
                "166, 174, 180"
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
                    width: 0.7 + Math.random() * 0.82,
                    speed: 0.013 + Math.random() * 0.01,
                    opacity: 0.035 + Math.random() * 0.045
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
            const bootEnergy = 1 - revealProgress;
            const orbitSpeed = 1.16 + revealProgress * 0.74 + bootEnergy * 0.48;
            vx += (-z / orbitLength) * orbitSpeed;
            vz += (x / orbitLength) * orbitSpeed;
            vy *= 0.56 + bootEnergy * 0.34;

            if (revealProgress > 0) {
                const focusX = Math.max(0, 2.45 - Math.abs(x));
                const focusY = Math.max(0, 1.45 - Math.abs(y));
                const repulsion = (focusX / 2.45) * (focusY / 1.45) * revealProgress * 2.15;

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
            const speedScale = lerp(1, 0.58, idleProgress);

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

        updateSceneRotation(elapsedMs, revealProgress) {
            const time = elapsedMs * 0.001;
            const revealTurn = easeOutCubic(revealProgress) * 0.16;

            this.pointer.x = lerp(this.pointer.x, this.pointer.targetX, 0.045);
            this.pointer.y = lerp(this.pointer.y, this.pointer.targetY, 0.045);
            this.sceneRotation.x = -0.33 + Math.sin(time * 0.17) * 0.055 - this.pointer.y * 0.045;
            this.sceneRotation.y = 0.48 + Math.sin(time * 0.14) * 0.12 + this.pointer.x * 0.07 + revealTurn;
            this.sceneRotation.z = Math.sin(time * 0.1) * 0.025;
        }

        updateManifold(delta, elapsedMs, revealProgress, idleProgress) {
            const deltaFactor = delta * 60;
            const time = elapsedMs * 0.001;

            this.bootNodes.forEach((node) => {
                const birthRaw = clamp((elapsedMs - node.birthDelay) / node.birthDuration, 0, 1);
                const formRaw = clamp((elapsedMs - node.formDelay) / node.formDuration, 0, 1);
                const birth = exponentialRamp(birthRaw, 5.6);
                const form = exponentialRamp(formRaw, 4.4);
                const target = this.sampleManifoldTarget(node, time, revealProgress, idleProgress);
                const pullTarget = {
                    x: lerp(node.startX, target.x, form),
                    y: lerp(node.startY, target.y, form),
                    z: lerp(node.startZ, target.z, form)
                };
                const stiffness = (0.012 + form * 0.036 + birth * 0.012) * deltaFactor;
                const damping = Math.pow(0.82 - form * 0.08, deltaFactor);

                node.vx += (pullTarget.x - node.x) * stiffness;
                node.vy += (pullTarget.y - node.y) * stiffness;
                node.vz += (pullTarget.z - node.z) * stiffness;
                node.vx *= damping;
                node.vy *= damping;
                node.vz *= damping;
                node.x += node.vx * deltaFactor;
                node.y += node.vy * deltaFactor;
                node.z += node.vz * deltaFactor;
                node.birth = birth;
                node.form = form;
            });
        }

        project(point) {
            const cosY = Math.cos(this.sceneRotation.y);
            const sinY = Math.sin(this.sceneRotation.y);
            const cosX = Math.cos(this.sceneRotation.x);
            const sinX = Math.sin(this.sceneRotation.x);
            const cosZ = Math.cos(this.sceneRotation.z);
            const sinZ = Math.sin(this.sceneRotation.z);
            const rx = point.x * cosY - point.z * sinY;
            const rz = point.x * sinY + point.z * cosY;
            const ry = point.y * cosX - rz * sinX;
            const rzz = point.y * sinX + rz * cosX;
            const sx = rx * cosZ - ry * sinZ;
            const sy = rx * sinZ + ry * cosZ;
            const depth = rzz + 9.4;
            const perspective = clamp(1 / Math.max(0.8, depth * 0.2), 0.42, 1.14);
            const x = this.center.x + sx * this.scale * perspective + this.pointer.x * 22;
            const y = this.center.y + sy * this.scale * perspective + this.pointer.y * 13;

            return { x, y, depth, perspective };
        }

        drawGlow(introProgress, revealProgress, idleProgress, elapsedMs) {
            const connectionProgress = exponentialRamp(clamp(elapsedMs / this.bootConnectDuration, 0, 1), 3.4);
            const pulse = 0.91 + Math.sin(elapsedMs * 0.0021) * 0.06;
            const handoffPulse = Math.sin(clamp((elapsedMs - this.handoffStart) / this.handoffDuration, 0, 1) * Math.PI);
            const glowRadius = (lerp(220, 680, introProgress) + connectionProgress * this.scale * 0.9 + handoffPulse * this.scale * 0.68) * pulse * (1 - revealProgress * 0.24) * lerp(1, 0.78, idleProgress);

            const gradient = this.ctx.createRadialGradient(
                this.center.x,
                this.center.y,
                0,
                this.center.x,
                this.center.y,
                glowRadius
            );
            const baseAlpha = (0.14 + connectionProgress * 0.3 + handoffPulse * 0.18) * (1 - revealProgress * 0.18);

            gradient.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha})`);
            gradient.addColorStop(0.32, `rgba(220, 232, 238, ${baseAlpha * 0.46})`);
            gradient.addColorStop(1, "rgba(214, 214, 214, 0)");

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, glowRadius, 0, TAU);
            this.ctx.fill();
        }

        drawTransitionWave(elapsedMs, revealProgress, idleProgress) {
            const waveProgress = easeOutCubic(clamp((elapsedMs - this.revealStart + 180) / 1680, 0, 1));

            if (waveProgress <= 0 || waveProgress >= 1) {
                return;
            }

            const maxRadius = Math.max(this.width, this.height) * 0.48;
            const radius = lerp(this.scale * 0.32, maxRadius, waveProgress);
            const alpha = (1 - waveProgress) * 0.16 * lerp(1, 0.7, idleProgress);

            this.ctx.save();
            this.ctx.globalCompositeOperation = "lighter";
            this.ctx.strokeStyle = `rgba(235, 244, 248, ${alpha})`;
            this.ctx.lineWidth = lerp(1.8, 0.45, waveProgress);
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, radius, 0, TAU);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            this.ctx.lineWidth = lerp(1.2, 0.32, waveProgress);
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, radius * 0.72, 0, TAU);
            this.ctx.stroke();
            this.ctx.restore();
        }

        drawSurfaceFacets(projectedNodes, manifoldAlpha, revealProgress, elapsedMs) {
            if (this.isMobile || !this.gridSize) {
                return;
            }

            const connectionEnergy = exponentialRamp(clamp((elapsedMs - this.connectionStart) / this.connectionDuration, 0, 1), 4.8);
            const revealRetreat = easeOutCubic(revealProgress);
            const surfaceAlpha = manifoldAlpha * connectionEnergy * (1 - revealRetreat * 0.86);
            const cells = [];

            if (surfaceAlpha <= 0.01) {
                return;
            }

            for (let row = 0; row < this.gridSize - 1; row += 1) {
                for (let column = 0; column < this.gridSize - 1; column += 1) {
                    const a = projectedNodes[row * this.gridSize + column];
                    const b = projectedNodes[row * this.gridSize + column + 1];
                    const c = projectedNodes[(row + 1) * this.gridSize + column + 1];
                    const d = projectedNodes[(row + 1) * this.gridSize + column];
                    const birth = Math.min(a.node.birth, b.node.birth, c.node.birth, d.node.birth);
                    const form = Math.min(a.node.form, b.node.form, c.node.form, d.node.form);
                    const mask = Math.min(a.node.surfaceMask, b.node.surfaceMask, c.node.surfaceMask, d.node.surfaceMask);

                    if (birth < 0.22 || form < 0.22 || mask < 0.08) {
                        continue;
                    }

                    cells.push({
                        points: [a.projected, b.projected, c.projected, d.projected],
                        birth,
                        mask,
                        form,
                        depth: (a.projected.depth + b.projected.depth + c.projected.depth + d.projected.depth) * 0.25,
                        parity: (row + column) % 2
                    });
                }
            }

            cells.sort((a, b) => b.depth - a.depth);

            this.ctx.save();
            this.ctx.globalCompositeOperation = "lighter";

            cells.forEach((cell) => {
                const depthLight = clamp(1.18 - cell.depth * 0.07, 0.34, 1);
                const formed = cell.form * cell.form;
                const alpha = surfaceAlpha * cell.birth * cell.mask * formed * (cell.parity ? 0.018 : 0.03) * depthLight;

                this.ctx.fillStyle = `rgba(210, 234, 242, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.moveTo(cell.points[0].x, cell.points[0].y);
                this.ctx.lineTo(cell.points[1].x, cell.points[1].y);
                this.ctx.lineTo(cell.points[2].x, cell.points[2].y);
                this.ctx.lineTo(cell.points[3].x, cell.points[3].y);
                this.ctx.closePath();
                this.ctx.fill();
            });

            this.ctx.restore();
        }

        drawSurfaceContours(projectedNodes, manifoldAlpha, revealProgress, elapsedMs) {
            if (this.isMobile || !this.gridSize) {
                return;
            }

            const contourEnergy = exponentialRamp(
                clamp((elapsedMs - this.contourStart) / this.contourDuration, 0, 1),
                3.2
            );
            const contourFade = (1 - easeOutCubic(revealProgress) * 0.78) * manifoldAlpha * contourEnergy;
            const contourLines = [0.22, 0.36, 0.5, 0.64, 0.78].map((value) => Math.round((this.gridSize - 1) * value));
            const rows = contourLines;
            const columns = contourLines;

            if (contourFade <= 0.01) {
                return;
            }

            const drawCurve = (indices, alphaScale) => {
                const points = indices
                    .map((index) => projectedNodes[index])
                    .filter((item) => item && item.node.birth * item.node.form * item.node.surfaceMask > 0.18);

                if (points.length < 3) {
                    return;
                }

                this.ctx.beginPath();
                this.ctx.moveTo(points[0].projected.x, points[0].projected.y);

                for (let index = 1; index < points.length - 1; index += 1) {
                    const current = points[index].projected;
                    const next = points[index + 1].projected;
                    const midX = (current.x + next.x) * 0.5;
                    const midY = (current.y + next.y) * 0.5;

                    this.ctx.quadraticCurveTo(current.x, current.y, midX, midY);
                }

                const finalPoint = points[points.length - 1].projected;
                this.ctx.lineTo(finalPoint.x, finalPoint.y);
                this.ctx.strokeStyle = `rgba(236, 245, 248, ${contourFade * alphaScale})`;
                this.ctx.lineWidth = 1.15;
                this.ctx.stroke();
            };

            this.ctx.save();
            this.ctx.globalCompositeOperation = "lighter";

            rows.forEach((row, rowIndex) => {
                const indices = [];

                for (let column = 0; column < this.gridSize; column += 1) {
                    indices.push(row * this.gridSize + column);
                }

                drawCurve(indices, rowIndex === 2 ? 0.58 : 0.34);
            });

            columns.forEach((column, columnIndex) => {
                const indices = [];

                for (let row = 0; row < this.gridSize; row += 1) {
                    indices.push(row * this.gridSize + column);
                }

                drawCurve(indices, columnIndex === 2 ? 0.5 : 0.28);
            });

            this.ctx.restore();
        }

        drawBootNetwork(elapsedMs, revealProgress, idleProgress) {
            if (!this.bootNodes.length) {
                return;
            }

            const globalBirth = exponentialRamp(clamp((elapsedMs - this.nodeBirthStart) / this.nodeBirthDuration, 0, 1), 4.8);
            const connectionEnergy = exponentialRamp(clamp((elapsedMs - this.connectionStart) / this.connectionDuration, 0, 1), 5.2);
            const nodeOnlyEmphasis = 1 - connectionEnergy * 0.5;
            const revealFade = lerp(1.7, 0.18, easeOutCubic(revealProgress)) * lerp(1, 0.62, idleProgress);
            const manifoldAlpha = revealFade * (0.28 + globalBirth * 1.32);
            const projectedNodes = this.bootNodes.map((node) => ({
                node,
                projected: this.project(node)
            }));

            this.ctx.save();
            this.ctx.globalCompositeOperation = "lighter";
            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";

            this.drawSurfaceFacets(projectedNodes, manifoldAlpha, revealProgress, elapsedMs);

            const visibleLinks = this.bootLinks.map((link) => {
                const from = projectedNodes[link.from];
                const to = projectedNodes[link.to];
                const availability = Math.min(from.node.birth * from.node.form, to.node.birth * to.node.form) * link.mask;
                const linkRaw = clamp((elapsedMs - link.delay) / link.duration, 0, 1);
                const linkDraw = Math.min(exponentialRamp(linkRaw, 5.4), availability, connectionEnergy);

                return {
                    link,
                    from,
                    to,
                    draw: linkDraw,
                    depth: (from.projected.depth + to.projected.depth) * 0.5,
                    availability
                };
            }).filter((item) => item.draw > 0.012 && item.link.mask > 0.18).sort((a, b) => b.depth - a.depth);

            visibleLinks.forEach((item) => {
                const from = item.from.projected;
                const to = item.to.projected;
                const draw = item.draw;
                const x = lerp(from.x, to.x, draw);
                const y = lerp(from.y, to.y, draw);
                const depthLight = clamp(1.2 - item.depth * 0.075, 0.36, 1);
                const alpha = manifoldAlpha * item.link.opacity * item.availability * (0.2 + draw * 0.82) * depthLight;

                this.ctx.strokeStyle = `rgba(225, 238, 244, ${alpha * 0.48})`;
                this.ctx.lineWidth = (this.isMobile ? 1.25 : 3.2) * from.perspective;
                this.ctx.beginPath();
                this.ctx.moveTo(from.x, from.y);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();

                this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.lineWidth = (this.isMobile ? 0.42 : 1.1) * from.perspective;
                this.ctx.beginPath();
                this.ctx.moveTo(from.x, from.y);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            });

            this.drawSurfaceContours(projectedNodes, manifoldAlpha, revealProgress, elapsedMs);

            projectedNodes
                .filter((item) => item.node.birth * item.node.surfaceMask > 0.018)
                .sort((a, b) => b.projected.depth - a.projected.depth)
                .forEach((item) => {
                    const node = item.node;
                    const projected = item.projected;
                    const depthLight = clamp(1.24 - projected.depth * 0.075, 0.38, 1);
                    const energy = node.birth * (0.36 + node.form * 0.64);
                    const radius = node.size * (0.5 + energy * 1.24 + nodeOnlyEmphasis * 0.18) * projected.perspective;
                    const alpha = manifoldAlpha * node.opacity * energy * depthLight * node.surfaceMask * (1 + nodeOnlyEmphasis * 0.42);

                    this.ctx.fillStyle = `rgba(232, 241, 246, ${alpha * (0.54 + nodeOnlyEmphasis * 0.18)})`;
                    this.ctx.beginPath();
                    this.ctx.arc(projected.x, projected.y, radius * (2.9 + nodeOnlyEmphasis * 0.65), 0, TAU);
                    this.ctx.fill();

                    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(projected.x, projected.y, radius, 0, TAU);
                    this.ctx.fill();
                });

            this.ctx.restore();
        }

        drawHandoffPulse(elapsedMs) {
            const progress = clamp((elapsedMs - this.handoffStart) / this.handoffDuration, 0, 1);

            if (progress <= 0 || progress >= 1) {
                return;
            }

            const eased = easeOutCubic(progress);
            const alpha = Math.sin(progress * Math.PI);
            const radius = lerp(this.scale * 0.18, this.scale * (this.isMobile ? 0.86 : 1.46), eased);

            this.ctx.save();
            this.ctx.globalCompositeOperation = "lighter";

            const gradient = this.ctx.createRadialGradient(
                this.center.x,
                this.center.y,
                radius * 0.12,
                this.center.x,
                this.center.y,
                radius
            );

            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.1 * alpha})`);
            gradient.addColorStop(0.62, `rgba(228, 239, 244, ${0.045 * alpha})`);
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, radius, 0, TAU);
            this.ctx.fill();

            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.32 * alpha})`;
            this.ctx.lineWidth = lerp(1.8, 0.5, eased);
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, radius * 0.72, 0, TAU);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(230, 240, 244, ${0.18 * alpha})`;
            this.ctx.lineWidth = lerp(1.2, 0.36, eased);
            this.ctx.beginPath();
            this.ctx.moveTo(this.center.x - radius * 0.84, this.center.y);
            this.ctx.lineTo(this.center.x + radius * 0.84, this.center.y);
            this.ctx.stroke();

            this.ctx.restore();
        }

        drawTrails(introProgress, revealProgress, idleProgress, elapsedMs) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.drawGlow(introProgress, revealProgress, idleProgress, elapsedMs);

            const handoff = Math.sin(clamp((elapsedMs - this.handoffStart) / this.handoffDuration, 0, 1) * Math.PI);
            const ambientBootDim = lerp(0.58, 1, exponentialRamp(clamp(elapsedMs / this.connectionEnd, 0, 1), 3.2)) + handoff * 0.08;
            const trailWake = easeOutCubic(clamp((elapsedMs - (this.handoffStart + 260)) / 2200, 0, 1));

            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";
            this.ctx.globalCompositeOperation = "lighter";

            this.trails.forEach((trail) => {
                const revealGate = trailWake * (0.34 + revealProgress * 0.66);
                const alpha = trail.opacity * ambientBootDim * revealGate * (0.46 + introProgress * 0.42) * (1 - revealProgress * 0.24) * lerp(1, 0.68, idleProgress);

                this.ctx.strokeStyle = `rgba(${trail.color}, ${alpha})`;
                this.ctx.lineWidth = trail.width * (this.isMobile ? 0.86 : 1);
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
                this.ctx.fillStyle = `rgba(${trail.color}, ${alpha * 0.7})`;
                this.ctx.beginPath();
                this.ctx.arc(head.x, head.y, 1 + head.perspective * 0.9, 0, TAU);
                this.ctx.fill();
            });

            this.drawBootNetwork(elapsedMs, revealProgress, idleProgress);
            this.drawHandoffPulse(elapsedMs);
            this.drawTransitionWave(elapsedMs, revealProgress, idleProgress);
            this.ctx.globalCompositeOperation = "source-over";
        }

        updateCubes(elapsedMs, revealProgress, idleProgress) {
            const time = elapsedMs * 0.001;
            const xSpan = this.isMobile ? this.width * 0.32 : this.width * 0.22;
            const ySpan = this.isMobile ? this.height * 0.2 : this.height * 0.18;

            this.cubes.forEach((cube) => {
                const config = cube.config;
                const rawProgress = clamp((revealProgress - config.delay) / 0.56, 0, 1);
                const motionProgress = easeOutBack(rawProgress);
                const settled = easeOutCubic(clamp((revealProgress - config.delay) / 0.9, 0, 1));
                const sourcePoint = this.sampleManifoldTarget(cube.sourceNode, time, revealProgress, idleProgress);
                const source = this.project(sourcePoint);
                const targetX = config.x * xSpan;
                const targetY = config.y * ySpan;
                const liveDrift = lerp(1, 0.42, idleProgress);
                const driftX = Math.sin(time * (0.36 + config.drift) + config.delay * 8) * 7 * settled * liveDrift;
                const driftY = Math.cos(time * (0.48 + config.drift) + config.delay * 9) * 8 * settled * liveDrift;
                const sourceX = source.x - this.center.x;
                const sourceY = source.y - this.center.y;
                const x = lerp(sourceX, targetX, motionProgress) + driftX + this.pointer.x * 16;
                const y = lerp(sourceY, targetY, motionProgress) + driftY + this.pointer.y * 10;
                const z = lerp(-180 + source.depth * -8, config.z, motionProgress);
                const opacity = settled * (this.isMobile ? 0.46 : 0.88);
                const scale = lerp(0.12, this.isMobile ? 0.72 : 1, clamp(motionProgress, 0, 1));
                const rotateX = config.rx + time * (4.2 + config.drift * 4.8) + this.pointer.y * 6;
                const rotateY = config.ry + time * (6.5 + config.drift * 5.4) + this.pointer.x * 12;
                const rotateZ = config.rz + Math.sin(time * 0.48 + config.delay * 12) * 5;

                cube.element.style.left = `${this.center.x + x}px`;
                cube.element.style.top = `${this.center.y + y}px`;
                cube.element.style.opacity = opacity.toFixed(3);
                cube.element.style.transform =
                    `translate3d(-50%, -50%, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale3d(${config.sx * scale}, ${config.sy * scale}, ${config.sz * scale})`;
            });
        }

        updateUi(uiProgress, revealProgress) {
            const eased = easeOutCubic(uiProgress);
            const drop = easeInOutCubic(revealProgress);
            const hidden = 1 - drop;
            document.body.style.setProperty("--landing-ui-progress", eased.toFixed(4));
            document.body.style.setProperty("--landing-drop-progress", drop.toFixed(4));
            document.body.style.setProperty("--landing-reveal-progress", easeInOutCubic(revealProgress).toFixed(4));
            document.body.style.setProperty("--landing-shell-opacity", clamp((drop - 0.02) / 0.98, 0, 1).toFixed(4));
            document.body.style.setProperty("--landing-drop-y", `${lerp(-18, 0, drop).toFixed(3)}vh`);
            document.body.style.setProperty("--landing-drop-blur", `${lerp(14, 0, drop).toFixed(3)}px`);
            document.body.style.setProperty("--landing-drop-clip", `${(hidden * 100).toFixed(3)}%`);
            document.body.style.setProperty("--landing-ui-y", `${lerp(-34, 0, eased).toFixed(3)}px`);
            document.body.style.setProperty("--landing-header-y", `${lerp(-46, 0, eased).toFixed(3)}px`);
            document.body.style.setProperty("--landing-ui-blur", `${lerp(12, 0, eased).toFixed(3)}px`);
            document.body.style.setProperty("--landing-header-blur", `${lerp(10, 0, eased).toFixed(3)}px`);
            document.body.style.setProperty("--landing-copy-rotate-x", `${lerp(-3, 0, eased).toFixed(3)}deg`);
            document.body.style.setProperty("--landing-copy-scale", lerp(0.98, 1, eased).toFixed(4));
            document.body.style.setProperty("--landing-main-mask-opacity", (1 - drop * 0.92).toFixed(4));
            document.body.style.setProperty("--landing-main-mask-scale", lerp(1.06, 1, drop).toFixed(4));
            document.body.style.setProperty("--landing-main-glow-opacity", (hidden * 0.9).toFixed(4));
            document.body.style.setProperty("--landing-main-glow-scale", lerp(1, 0.78, drop).toFixed(4));
            document.body.style.setProperty("--landing-cube-field-opacity", lerp(0, 1, drop).toFixed(4));
            document.body.style.setProperty("--landing-instrument-opacity", lerp(0, 0.54, eased).toFixed(4));

            if (!this.uiActivated && uiProgress > 0.035) {
                this.uiActivated = true;
                document.body.classList.add("landing-ui-live");
            }
        }

        updateCardResponse(revealProgress, idleProgress) {
            if (!this.landingCopy) {
                return;
            }

            const response = this.prefersReducedMotion ? 0 : easeOutCubic(clamp(revealProgress * 1.35, 0, 1));
            const settledResponse = response * lerp(0.55, 1, idleProgress);
            const tiltX = this.pointer.y * -2.0 * settledResponse;
            const tiltY = this.pointer.x * 2.45 * settledResponse;
            const lightX = clamp(50 + this.pointer.x * 18, 22, 78);
            const lightY = clamp(44 + this.pointer.y * 14, 18, 72);

            document.body.style.setProperty("--landing-card-tilt-x", `${tiltX.toFixed(3)}deg`);
            document.body.style.setProperty("--landing-card-tilt-y", `${tiltY.toFixed(3)}deg`);
            document.body.style.setProperty("--landing-light-x", `${lightX.toFixed(2)}%`);
            document.body.style.setProperty("--landing-light-y", `${lightY.toFixed(2)}%`);
            document.body.style.setProperty("--landing-pointer-x", this.pointer.x.toFixed(3));
            document.body.style.setProperty("--landing-pointer-y", this.pointer.y.toFixed(3));
            document.body.style.setProperty("--landing-instrument-x", `${(this.pointer.x * -12).toFixed(3)}px`);
            document.body.style.setProperty("--landing-instrument-y", `${(this.pointer.y * -8).toFixed(3)}px`);
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
            const uiProgress = clamp((elapsedMs - (this.revealStart + this.uiDelay)) / this.uiRevealDuration, 0, 1);

            this.updateSceneRotation(elapsedMs, revealProgress);
            this.updateManifold(delta, elapsedMs, revealProgress, idleProgress);
            this.updateTrails(delta, elapsedMs, revealProgress, idleProgress);
            this.drawTrails(introProgress, revealProgress, idleProgress, elapsedMs);
            this.updateCubes(elapsedMs, revealProgress, idleProgress);
            this.updateCardResponse(revealProgress, idleProgress);
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
            document.body.classList.add("landing-ui-live");
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
