// TRANSITIONS

function handleTransition(targetUrl) {
    const overlay = document.querySelector('.transition-overlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 1000); // 1s 
    } else {
        window.location.href = targetUrl;
    }
}

window.addEventListener('pageshow', (event) => {
    // If the page is loaded from cache (e.g. Back button), hide the overlay
    const overlay = document.querySelector('.transition-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Reveal page on load
    const overlay = document.querySelector('.transition-overlay');
    if (overlay) {
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 100);
    }

    // Intercept links for smooth transition
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        // Only internal links
        if (href && !href.startsWith('#') && !href.startsWith('mailto') && !href.startsWith('http')) {
            if (href.toLowerCase().includes('.pdf')) return; // Instant PDFs

            link.addEventListener('click', (e) => {
                e.preventDefault();
                handleTransition(href);
            });
        }
    });

    // specific page logics
    if (document.getElementById('blackhole-canvas')) {
        new BlackHole(document.getElementById('blackhole-canvas'));
    } else if (document.querySelector('.about-page') || document.querySelector('.notes-page') || document.querySelector('.demos-page')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '0';
        canvas.style.pointerEvents = 'none';
        document.body.prepend(canvas);
        new BlockyBackground(canvas);
    }

    initScrollHandlers();
    initScrollReveal();
});

// SCROLL system
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            } else {
                entry.target.classList.remove('revealed');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal-on-scroll, .glass-card, .experience-card, .semester-box, .project-card').forEach(el => {
        observer.observe(el);
    });
}


//  intor naimation

class BlackHole {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.shockwaves = []; //  shockwaves array
        this.numParticles = window.innerWidth < 768 ? 1200 : 2200;
        this.initialParticles = this.numParticles;
        this.radius = 60;
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
        this.mouse = { x: this.centerX, y: this.centerY };

        this.state = 'CHAOS'; // Start andom movement
        this.startTime = Date.now();
        this.stateStartTime = this.startTime;

        this.bhOpacity = 1;
        this.isDone = false;

        this.resize();
        this.init();
        this.bindEvents();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    init() {
        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle(isNew = false, isAmbient = false) {
        const angle = Math.random() * Math.PI * 2;
        let dist = isNew ?
            Math.max(this.canvas.width, this.canvas.height) * 0.8 :
            Math.random() * Math.max(this.canvas.width, this.canvas.height) * 0.8 + this.radius;

        if (isAmbient && isNew) {
            return {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5, // gentle drift
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 1.5 + 0.5, // same size as chaos
                color: Math.random() > 0.4 ? '#9d4edd' : '#e0aaff',
                baseAlpha: Math.random() * 0.5 + 0.4 // slightly brighter
            };
        }

        // high velocity at start
        const chaosVx = isNew ? 0 : (Math.random() - 0.5) * 4;
        const chaosVy = isNew ? 0 : (Math.random() - 0.5) * 4;

        return {
            x: this.centerX + Math.cos(angle) * dist,
            y: this.centerY + Math.sin(angle) * dist,
            vx: isNew ? -Math.sin(angle) * (Math.random() * 2 + 1) : chaosVx,
            vy: isNew ? Math.cos(angle) * (Math.random() * 2 + 1) : chaosVy,
            size: Math.random() * 1.5 + 0.5,
            color: Math.random() > 0.4 ? '#9d4edd' : '#e0aaff',
            baseAlpha: Math.random() * 0.5 + 0.5
        };
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    animate() {
        const now = Date.now();
        const elapsed = (now - this.stateStartTime);

        // adjust intensity based on state
        const clearAlpha = (this.state === 'CHAOS' || this.state === 'AMBIENT') ? 0.4 : 0.25;
        this.ctx.fillStyle = `rgba(5, 5, 8, ${clearAlpha})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.updateState(elapsed);
        this.drawScene();

        requestAnimationFrame(() => this.animate());
    }

    updateState(elapsed) {
        switch (this.state) {
            case 'CHAOS':
                // ramp up pull to flow into anim
                const duration = 1200;
                const progress = Math.min(elapsed / duration, 1);
                // ramp from 0.8 (initial pull) to 3.5 
                const currentG = 0.8 + (2.7 * (progress * progress)); // Ease in

                if (elapsed > duration) {
                    this.state = 'SINK';
                    this.stateStartTime = Date.now();
                }

                // increase spin slightly
                this.applyPhysics(currentG, 0.2 + (progress * 0.7));
                break;

            case 'SINK':
                // Track progress by particles remaining
                this.bhOpacity = this.particles.length / this.initialParticles;

                // TRIGGER: when mostly empty OR time is up. 
                if (this.particles.length < this.initialParticles * 0.2 || elapsed > 1000) {
                    this.state = 'BLACKOUT';
                    this.stateStartTime = Date.now();
                    this.bhOpacity = 0;
                    this.particles = []; // clear remaining particles

                    // Trigger flash and rings
                    this.bloomSize = 0;
                    this.bloomOpacity = 1;
                    this.flashOpacity = 1; //  white flash
                    this.createShockwave();
                }
                // Classic suction physics 
                this.applyPhysics(3.5, 0.9);
                break;

            case 'BLACKOUT':
                // Trigger reveal immediately at the start of blackout
                if (elapsed < 30) {
                    this.revealContent();
                }
                if (elapsed > 60) {
                    this.state = 'FADE_IN';
                    this.stateStartTime = Date.now();
                }

                this.bloomSize += 45; // Faster expansion
                this.bloomOpacity = Math.max(0, this.bloomOpacity - 0.04);
                this.flashOpacity = Math.max(0, this.flashOpacity - 0.1); // flash fade

                this.updateShockwaves();
                break;

            case 'FADE_IN':
                // Transition to ambient when landing beings
                // Fade out 
                this.flashOpacity = Math.max(0, this.flashOpacity - 0.05);

                if (elapsed > 750) {
                    this.state = 'AMBIENT';
                    this.stateStartTime = Date.now();
                    this.isDone = true;
                }
                this.updateShockwaves();
                break;

            case 'AMBIENT':
                // Linear drift with wrapping
                if (this.particles.length < 400) { // Increased to 400 for more dots
                    this.particles.push(this.createParticle(true, true));
                }
                this.applyPhysics(0, 0); // No central forces
                break;
        }
    }
    createShockwave() {
        for (let i = 0; i < 3; i++) {
            this.shockwaves.push({
                x: this.centerX,
                y: this.centerY,
                radius: 0,
                speed: 20 + (i * 5), //
                alpha: 1 - (i * 0.2), // Outer rings fainter
                decay: 0.02 + (i * 0.005),
                width: 2 + i // Varying widths
            });
        }
    }

    updateShockwaves() {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.radius += s.speed;
            s.speed *= 0.99; // deceleration
            s.alpha -= s.decay;
            if (s.alpha <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }
    }


    applyPhysics(gravityForce, spinForce) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const obj = this.particles[i];

            const dx = this.centerX - obj.x;
            const dy = this.centerY - obj.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.1) dist = 0.1; // division by zero


            // Vortex suction
            const distFactor = this.state === 'SINK' ? (this.radius * 2) / (dist + 10) + 1 : 1.0;
            const pull = (gravityForce * 320 * distFactor) / (dist + 30);

            if (gravityForce !== 0) {
                obj.vx += (dx / dist) * pull;
                obj.vy += (dy / dist) * pull;
            }

            // Mouse Interaction (not there for ambENT)
            if (this.state !== 'AMBIENT') {
                const mdx = this.mouse.x - obj.x;
                const mdy = this.mouse.y - obj.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 300) {
                    const strength = (300 - mdist) / 300;
                    obj.vx += (mdx / mdist) * strength * 0.15;
                    obj.vy += (mdy / mdist) * strength * 0.15;
                }
            }

            if (spinForce !== 0) {
                const tx = -dy / dist;
                const ty = dx / dist;
                obj.vx += tx * spinForce;
                obj.vy += ty * spinForce;
            }

            const drag = this.state === 'SINK' ? 0.96 : (this.state === 'AMBIENT' ? 1.0 : 0.985);
            obj.vx *= drag;
            obj.vy *= drag;

            obj.x += obj.vx;
            obj.y += obj.vy;

            // Screen wrapping
            if (this.state === 'AMBIENT') {
                if (obj.x < 0) obj.x = this.canvas.width;
                if (obj.x > this.canvas.width) obj.x = 0;
                if (obj.y < 0) obj.y = this.canvas.height;
                if (obj.y > this.canvas.height) obj.y = 0;
            }

            // Remove particles if they reach the center during SINK
            if (dist < 4 && this.state === 'SINK') {
                this.particles.splice(i, 1);
            }
        }
    }

    drawScene() {
        this.ctx.save();
        this.ctx.globalAlpha = this.state === 'SINK' ? this.bhOpacity : 1;

        // Flash Effect (White overlay)
        if (this.flashOpacity > 0.01) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Shockwaves
        this.shockwaves.forEach(s => {
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(157, 78, 221, ${s.alpha})`;
            this.ctx.lineWidth = s.width || 2;
            this.ctx.stroke();
        });

        // Particles
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.baseAlpha * (this.state === 'SINK' ? this.bhOpacity : 1);
            this.ctx.fill();
        });

        this.ctx.restore();
    }

    revealContent() {
        const hero = document.querySelector('.hero-content');
        const footer = document.querySelector('.footer-links');

        if (hero) {
            hero.style.visibility = 'visible';
            hero.style.opacity = '0'; //  hidden
            hero.style.filter = 'blur(20px)';

            // Delay
            setTimeout(() => {
                hero.style.opacity = '1';
                hero.style.filter = 'blur(0)';
                hero.style.transform = 'perspective(800px) rotateX(0deg) translateY(0)';

                //  after content is revealed
                setTimeout(() => initTypingEffects(), 500);

            }, 1600); // Wait 1600ms (extra 1s)

            // Staggered reveal
            const children = hero.children;
            Array.from(children).forEach((child, index) => {
                child.style.opacity = '0';
                child.style.transform = 'translateY(20px)';
                child.style.transition = `all 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${0.8 + index * 0.2}s`; // Slower transition

                setTimeout(() => {
                    child.style.opacity = '1';
                    child.style.transform = 'translateY(0)';
                }, 800);
            });
        }

        if (footer) {
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';

            // Stagger individual footer links
            const links = footer.querySelectorAll('.footer-link');
            links.forEach((link, i) => {
                link.style.opacity = '0';
                link.style.transform = 'translateY(12px)';
                link.style.transition = `opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) ${2.0 + i * 0.15}s, transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) ${2.0 + i * 0.15}s`;
            });

            setTimeout(() => {
                links.forEach(link => {
                    link.style.opacity = '1';
                    link.style.transform = 'translateY(0)';
                });
            }, 50);
        }
    }
}

// BACKGROUND
class BlockyBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.blocks = [];
        this.numBlocks = 200;
        this.resize();

        for (let i = 0; i < this.numBlocks; i++) {
            this.blocks.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.3 + 0.1
            });
        }

        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.blocks.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;

            // Bounce/Wrap
            if (b.x < 0 || b.x > this.canvas.width) b.vx *= -1;
            if (b.y < 0 || b.y > this.canvas.height) b.vy *= -1;

            this.ctx.fillStyle = `rgba(157, 78, 221, ${b.opacity})`;
            this.ctx.fillRect(b.x, b.y, b.size, b.size);
        });

        requestAnimationFrame(() => this.animate());
    }
}

// starting HELPERS

function createFloatingBlocks() {
    const container = document.querySelector('.stars-container');
    if (!container) return;
    container.innerHTML = '';
}

function initTypingEffects() {
    const greeting = document.getElementById('greeting');
    const bio = document.getElementById('bio');

    if (greeting) {
        typeWriter(greeting, "Hello! I'm Mohamed.", 40, () => {
            greeting.classList.add('glow-pulse');
        });
    }
    if (bio) {
        setTimeout(() => {
            typeWriter(bio, "I'm a passionate physics lover, currently pursuing a bachelors in Engineering Science. I'm interested in Math, Physics, Reading, and Space!", 40);
        }, 1200);
    }
}

function typeWriter(element, text, speed, onComplete) {
    let i = 0;
    element.innerHTML = ''; // Clear
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    element.appendChild(cursor);

    function type() {
        if (i < text.length) {
            const char = document.createTextNode(text.charAt(i));
            element.insertBefore(char, cursor);
            i++;
            setTimeout(type, speed);
        } else if (onComplete) {
            onComplete();
        }
    }
    type();
}

function initScrollHandlers() {
    document.querySelectorAll('[data-scroll]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-scroll');
            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function handlePrivateRepo(event) {
    event.preventDefault();
    showError('Sorry, this is a private repository');
}

function showError(message) {
    let toast = document.getElementById('error-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'error-toast';
        toast.className = 'error-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

//  NOTES INTERACTION
function toggleSemester(header) {
    header.classList.toggle('open');
    const content = header.nextElementSibling;
    content.classList.toggle('open');
}

function toggleCourse(header) {
    header.classList.toggle('open');
    const content = header.nextElementSibling;
    content.classList.toggle('open');
}

// global scope for HTML onclick attributes
window.toggleSemester = toggleSemester;
window.toggleCourse = toggleCourse;

// ============================================
// ABOUT SECTION - Repeating Slide-In Animations
// Smooth, professional motion that replays on re-entry
// ============================================

function initAboutAnimations() {
    const aboutElements = document.querySelectorAll('[data-about-animate]');

    if (aboutElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Small delay for smoother visual entry
                requestAnimationFrame(() => {
                    entry.target.classList.add('about-visible');
                });
            } else {
                // Remove class when fully out of view (enables re-animation)
                entry.target.classList.remove('about-visible');
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px'
    });

    aboutElements.forEach(el => observer.observe(el));
}

// Initialize about animations when DOM is ready
document.addEventListener('DOMContentLoaded', initAboutAnimations);

// ============================================
// THREE.JS SUBTLE PARTICLE BACKGROUND
// Only runs on landing page (index.html)
// ============================================

class SubtleParticleField {
    constructor(canvas) {
        if (!canvas || typeof THREE === 'undefined') return;

        this.canvas = canvas;
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };

        this.isMobile = window.innerWidth < 768;
        this.particleCount = this.isMobile ? 120 : 250;
        this.connectionDistance = this.isMobile ? 12 : 18;
        this.maxConnections = this.isMobile ? 40 : 80;

        this.init();
        this.createParticles();
        this.createConnectionLines();
        this.bindEvents();
        this.animate();

        setTimeout(() => {
            this.canvas.classList.add('visible');
        }, 500);
    }

    init() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
    }

    createParticles() {
        const positions = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 120;
            positions[i3 + 1] = (Math.random() - 0.5) * 120;
            positions[i3 + 2] = (Math.random() - 0.5) * 80 - 10;
            // Depth-based sizing: closer particles (higher z) are larger
            sizes[i] = Math.random() * 2.5 + 1.0;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: this.isMobile ? 2.0 : 2.5,
            color: 0x9d4edd,
            transparent: true,
            opacity: 0.55,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        this.originalPositions = positions.slice();
        this.time = 0;
    }

    createConnectionLines() {
        // Pre-allocate geometry for connection lines
        const linePositions = new Float32Array(this.maxConnections * 6); // 2 vertices * 3 coords per line
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        lineGeometry.setDrawRange(0, 0);

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x9d4edd,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending
        });

        this.lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.scene.add(this.lines);
    }

    updateConnections() {
        const positions = this.particles.geometry.attributes.position.array;
        const linePositions = this.lines.geometry.attributes.position.array;
        let lineIndex = 0;
        const distSq = this.connectionDistance * this.connectionDistance;

        // Check pairs for nearby particles
        for (let i = 0; i < this.particleCount && lineIndex < this.maxConnections; i++) {
            const i3 = i * 3;
            for (let j = i + 1; j < this.particleCount && lineIndex < this.maxConnections; j++) {
                const j3 = j * 3;
                const dx = positions[i3] - positions[j3];
                const dy = positions[i3 + 1] - positions[j3 + 1];
                const dz = positions[i3 + 2] - positions[j3 + 2];
                const d = dx * dx + dy * dy + dz * dz;

                if (d < distSq) {
                    const li = lineIndex * 6;
                    linePositions[li] = positions[i3];
                    linePositions[li + 1] = positions[i3 + 1];
                    linePositions[li + 2] = positions[i3 + 2];
                    linePositions[li + 3] = positions[j3];
                    linePositions[li + 4] = positions[j3 + 1];
                    linePositions[li + 5] = positions[j3 + 2];
                    lineIndex++;
                }
            }
        }

        this.lines.geometry.setDrawRange(0, lineIndex * 2);
        this.lines.geometry.attributes.position.needsUpdate = true;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.onResize());
        if (!this.isMobile) {
            window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(e) {
        this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.time += 0.0012;

        // Smooth mouse follow
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.03;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.03;

        if (this.particles) {
            // Slow rotation
            this.particles.rotation.y += 0.00025;
            this.particles.rotation.x += 0.00012;

            // Stronger mouse parallax
            this.particles.rotation.y += this.mouse.x * 0.002;
            this.particles.rotation.x += this.mouse.y * 0.001;

            // Drift animation with varied motion per particle
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                const phase = i * 0.13;
                positions[i3] = this.originalPositions[i3] +
                    Math.sin(this.time * 1.5 + phase) * 1.2;
                positions[i3 + 1] = this.originalPositions[i3 + 1] +
                    Math.cos(this.time * 2.0 + phase * 0.7) * 0.8;
                positions[i3 + 2] = this.originalPositions[i3 + 2] +
                    Math.sin(this.time * 1.0 + phase * 1.3) * 0.6;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;

            // Update connection lines
            this.updateConnections();

            // Sync line rotation with particles
            this.lines.rotation.copy(this.particles.rotation);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize Three.js background only on landing page
(function() {
    const threeBg = document.getElementById('three-bg');
    if (threeBg) {
        new SubtleParticleField(threeBg);
    }
})();

// ============================================
// DEMOS PAGE - Modal System
// ============================================

const demoData = [
    {
        title: 'Roblox Game Development',
        desc: 'Collaborated with game development studios on projects that collectively surpassed 1.7 billion platform visits and 250,000 concurrent players. Engineered gameplay systems in Lua and created 3D animations in Blender.',
        tags: ['Lua', 'Blender', 'Roblox Studio'],
        preview: null,
        assignment: null,
        gallery: [],
        note: null,
        linkedin: null,
        repo: null,
        project: null,
        demo: null
    },
    {
        title: 'Structural Beam Simulation',
        desc: 'Built a general beam deflection calculator for arbitrary cross sections by computing section properties directly from geometry. Generates deflection curves, factor of safety metrics, and 3D stress/deformation visualizations under moving and distributed loads.',
        tags: ['Python', 'MATLAB'],
        preview: null,
        assignment: null,
        gallery: [],
        note: null,
        linkedin: null,
        repo: 'https://github.com/mohamedelsayed-0/CIV102',
        project: null,
        demo: null
    },
    {
        title: 'Pong AI',
        desc: 'AI-driven Pong agent built for the ESC180 tournament — placed 3rd overall. Implements collision physics and responsive paddle controls with an adaptive strategy.',
        tags: ['Python', 'Pygame'],
        preview: 'https://www.cs.toronto.edu/~guerzhoy/niftypong/pongAIvAI.gif',
        assignment: 'https://www.cs.toronto.edu/~guerzhoy/niftypong/',
        gallery: [
            {
                src: 'https://cdn.discordapp.com/attachments/979106511886368828/1472828960802078740/image.png?ex=6993fe5c&is=6992acdc&hm=ef6c70697669576f64c5957ad6418e2df5018115fc58d18875ec72f0c8d995c1&',
                alt: 'LinkedIn post about Pong AI Engines tournament results'
            },
            {
                src: 'https://cdn.discordapp.com/attachments/979106511886368828/1472829136387964970/image.png?ex=6993fe85&is=6992ad05&hm=def85077e09b157fffe65943ab195d0476fb77e87004c4d189f8479bbfab337f&',
                alt: 'Pong AI lecture photo and winners'
            }
        ],
        note: 'p.s. i skipped this lecture so i wasnt in any of the pictures..',
        linkedin: 'https://www.linkedin.com/feed/update/urn:li:activity:7415496511515504640/',
        repo: 'https://github.com/mohamedelsayed-0/Pong-AI',
        project: null,
        demo: null
    },
    {
        title: 'Lumina — LaTeX Notetaker',
        desc: 'Web-based tool that converts handwritten, typed, and audio notes into structured LaTeX documents. Built with a TypeScript frontend and Python backend for processing.',
        tags: ['TypeScript', 'Python', 'CSS'],
        preview: null,
        assignment: null,
        gallery: [],
        note: null,
        linkedin: null,
        repo: null,
        project: null,
        demo: null
    }
];

function openDemoModal(index) {
    const data = demoData[index];
    if (!data) return;

    const modal = document.getElementById('demo-modal');
    const previewEl = document.getElementById('demo-modal-preview');
    const extraEl = document.getElementById('demo-modal-extra');
    document.getElementById('demo-modal-title').textContent = data.title;
    document.getElementById('demo-modal-desc').textContent = data.desc;

    if (data.preview) {
        previewEl.innerHTML = '<img src="' + data.preview + '" alt="' + data.title + ' preview" loading="lazy">';
    } else {
        previewEl.innerHTML = '<div class="demo-placeholder demo-placeholder-lg"><span>GIF Preview</span></div>';
    }

    const tagsEl = document.getElementById('demo-modal-tags');
    tagsEl.innerHTML = data.tags.map(t => '<span class="tech-tag">' + t + '</span>').join('');

    let extraContent = '';
    if (data.gallery && data.gallery.length) {
        extraContent += '<div class="demo-modal-gallery">' +
            data.gallery.map(item =>
                '<figure class="demo-modal-gallery-item">' +
                    '<img src="' + item.src + '" alt="' + item.alt + '" loading="lazy">' +
                '</figure>'
            ).join('') +
            '</div>';
    }
    if (data.note) {
        extraContent += '<p class="demo-modal-note">' + data.note + '</p>';
    }
    extraEl.innerHTML = extraContent;

    const actionsEl = document.getElementById('demo-modal-actions');
    let buttons = '';
    if (data.assignment) {
        buttons += '<a href="' + data.assignment + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Assignment Description</a>';
    }
    if (data.linkedin) {
        buttons += '<a href="' + data.linkedin + '" target="_blank" rel="noopener noreferrer" class="btn btn-solid">linkedin post</a>';
    }
    if (data.repo) {
        buttons += '<a href="' + data.repo + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Go to Repo</a>';
    }
    if (data.project) {
        buttons += '<a href="' + data.project + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Go to Project</a>';
    }
    if (data.demo) {
        buttons += '<a href="' + data.demo + '" target="_blank" rel="noopener noreferrer" class="btn btn-solid">Go to Demo</a>';
    }
    actionsEl.innerHTML = buttons;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDemoModal(event, force) {
    if (force || event.target.classList.contains('demo-modal-overlay')) {
        const modal = document.getElementById('demo-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.demo-modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});

// ============================================
// ROBLOX MODAL (scrollable gallery)
// ============================================

const robloxDemos = [
    {
        title: 'Gameplay Systems Engineering',
        desc: 'Server-side logic and gameplay mechanics in Lua for high-concurrency titles.'
    },
    {
        title: '3D Character Animations',
        desc: 'Blender-made animations exported and integrated into Roblox Studio.'
    },
    {
        title: 'UI/UX Design',
        desc: 'In-game interfaces, menus, and HUD elements for multiple shipped titles.'
    },
    {
        title: 'Physics & Combat Systems',
        desc: 'Custom hit detection, ragdoll physics, and ability systems at scale.'
    },
    {
        title: 'World Building & Environment',
        desc: 'Large-scale map design and environmental storytelling for open-world games.'
    },
    {
        title: 'Monetization & Economy',
        desc: 'In-game shops, currency systems, and progression mechanics.'
    }
];

function openRobloxModal() {
    const modal = document.getElementById('roblox-modal');
    const list = document.getElementById('roblox-demos-list');

    list.innerHTML = robloxDemos.map(d =>
        '<div class="roblox-demo-item">' +
            '<div class="roblox-demo-thumb"><div class="demo-placeholder"><span>GIF</span></div></div>' +
            '<div class="roblox-demo-text"><h4>' + d.title + '</h4><p>' + d.desc + '</p></div>' +
            '<span class="roblox-demo-cta">Click me!</span>' +
        '</div>'
    ).join('');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeRobloxModal(event, force) {
    if (force || event.target.classList.contains('demo-modal-overlay')) {
        const modal = document.getElementById('roblox-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

window.openDemoModal = openDemoModal;
window.closeDemoModal = closeDemoModal;
window.openRobloxModal = openRobloxModal;
window.closeRobloxModal = closeRobloxModal;

// ============================================
// PROJECT MODALS (About Page)
// ============================================

const projectData = [
    {
        title: 'Structural Beam Simulation',
        desc: 'Built a general beam deflection calculator for arbitrary cross sections by computing section properties directly from geometry. Generates deflection curves, factor of safety metrics, and 3D stress/deformation visualizations including deflection animations under moving and distributed loads. Validated predictions against physical tests.',
        tags: ['Python', 'MATLAB'],
        date: 'Nov 2025',
        assignment: null,
        linkedin: null,
        repo: 'https://github.com/mohamedelsayed-0/CIV102',
        project: null,
        demo: null
    },
    {
        title: 'Pong AI',
        desc: 'AI-driven Pong agent developed for the annual ESC180 tournament, securing 3rd place. Maximizes score against a professor-built AI over a thousand rounds. Implements collision physics, responsive paddle controls, and an adaptive strategy with optimized time complexity.',
        tags: ['Python', 'Pygame'],
        date: 'Jan 2026',
        assignment: 'https://www.cs.toronto.edu/~guerzhoy/niftypong/',
        linkedin: 'https://www.linkedin.com/feed/update/urn:li:activity:7415496511515504640/',
        repo: 'https://github.com/mohamedelsayed-0/Pong-AI',
        project: null,
        demo: null
    },
    {
        title: 'Lumina — LaTeX Notetaker',
        desc: 'Web-based tool that converts handwritten, typed, and audio notes into structured LaTeX documents optimized for notation-heavy coursework and technical writing. Implements OCR, parsing, and automation pipelines to generate compilable LaTeX with support for equations, figures, and modular document organization.',
        tags: ['TypeScript', 'JavaScript', 'CSS', 'Python'],
        date: 'Dec 2025 – Present',
        assignment: null,
        linkedin: null,
        repo: null,
        project: null,
        demo: null
    }
];

function openProjectModal(index) {
    const data = projectData[index];
    if (!data) return;

    const modal = document.getElementById('project-modal');
    document.getElementById('project-modal-title').textContent = data.title;
    document.getElementById('project-modal-desc').textContent = data.desc;
    document.getElementById('project-modal-date').textContent = data.date;

    const tagsEl = document.getElementById('project-modal-tags');
    tagsEl.innerHTML = data.tags.map(t => '<span class="tech-tag">' + t + '</span>').join('');

    const actionsEl = document.getElementById('project-modal-actions');
    let buttons = '';
    if (data.assignment) {
        buttons += '<a href="' + data.assignment + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Assignment Description</a>';
    }
    if (data.linkedin) {
        buttons += '<a href="' + data.linkedin + '" target="_blank" rel="noopener noreferrer" class="btn btn-solid">linkedin post</a>';
    }
    if (data.repo) {
        buttons += '<a href="' + data.repo + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Go to Repo</a>';
    }
    if (data.project) {
        buttons += '<a href="' + data.project + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Go to Project</a>';
    }
    if (data.demo) {
        buttons += '<a href="' + data.demo + '" target="_blank" rel="noopener noreferrer" class="btn btn-solid">Go to Demo</a>';
    }
    actionsEl.innerHTML = buttons;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProjectModal(event, force) {
    if (force || event.target.classList.contains('demo-modal-overlay')) {
        const modal = document.getElementById('project-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;
