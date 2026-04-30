// TRANSITIONS

function handleTransition(targetUrl) {
    const overlay = document.querySelector('.transition-overlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 320);
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

    if (document.body.classList.contains('portfolio-landing')) {
        window.scrollTo(0, 0);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('portfolio-landing')) {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }

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
    } else if (document.querySelector('.notes-page') || document.querySelector('.demos-page')) {
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
    initPageEntrance();
    initSectionAtmosphere();
    initAboutScene();
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

function initPageEntrance() {
    const pageRevealElements = document.querySelectorAll('[data-page-reveal]');

    if (pageRevealElements.length === 0) {
        return;
    }

    pageRevealElements.forEach((element, index) => {
        element.style.setProperty('--page-reveal-delay', `${70 + index * 70}ms`);
    });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            pageRevealElements.forEach((element) => {
                element.classList.add('page-revealed');
            });
        });
    });
}

function initSectionAtmosphere() {
    const sections = Array.from(document.querySelectorAll('[data-tone]'));

    if (sections.length === 0) {
        return;
    }

    const tonePresets = {
        frost: { accent: '199, 212, 223', secondary: '108, 124, 138', glow: '244, 247, 250' },
        steel: { accent: '184, 198, 211', secondary: '92, 108, 122', glow: '238, 244, 248' },
        graphite: { accent: '158, 171, 182', secondary: '78, 88, 98', glow: '234, 239, 243' },
        silver: { accent: '216, 224, 232', secondary: '122, 134, 145', glow: '246, 248, 250' },
        glow: { accent: '236, 241, 245', secondary: '138, 146, 154', glow: '255, 255, 255' }
    };

    const indicator = document.querySelector('[data-section-indicator]');
    const navHeaders = Array.from(document.querySelectorAll('.nav-header[data-scroll]'));
    const navById = new Map(navHeaders.map((header) => [header.getAttribute('data-scroll'), header]));
    const indicatorButtons = [];

    if (indicator) {
        indicator.innerHTML = '';

        sections.forEach((section) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'section-indicator__dot';
            button.setAttribute('data-label', section.dataset.label || section.id || 'Section');
            button.setAttribute('aria-label', `Jump to ${section.dataset.label || section.id || 'section'}`);
            button.addEventListener('click', () => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            indicator.appendChild(button);
            indicatorButtons.push(button);
        });
    }

    let activeSection = sections[0];

    const applyTone = (section) => {
        if (!section) {
            return;
        }

        activeSection = section;
        const tone = tonePresets[section.dataset.tone] || tonePresets.frost;

        document.body.style.setProperty('--page-accent-rgb', tone.accent);
        document.body.style.setProperty('--page-secondary-rgb', tone.secondary);
        document.body.style.setProperty('--page-glow-rgb', tone.glow);

        indicatorButtons.forEach((button, index) => {
            button.classList.toggle('is-active', sections[index] === section);
        });

        navHeaders.forEach((header) => header.classList.remove('is-active'));

        if (section.id && navById.has(section.id)) {
            navById.get(section.id).classList.add('is-active');
        }
    };

    applyTone(activeSection);

    const observer = new IntersectionObserver((entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
            applyTone(visible[0].target);
        }
    }, {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: '-12% 0px -28% 0px'
    });

    sections.forEach((section) => observer.observe(section));
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
                color: Math.random() > 0.4 ? '#f2f2f2' : '#9a9a9a',
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
            color: Math.random() > 0.4 ? '#f2f2f2' : '#9a9a9a',
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
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${s.alpha})`;
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
        this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.time = 0;
        this.isMobile = window.innerWidth < 768;
        this.numBlocks = this.isMobile ? 72 : 132;
        this.accent = { r: 199, g: 212, b: 223 };
        this.secondary = { r: 108, g: 124, b: 138 };
        this.targetAccent = { ...this.accent };
        this.targetSecondary = { ...this.secondary };
        this.frameCount = 0;
        this.resize();
        this.createBlocks();

        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth < 768;
            this.numBlocks = this.isMobile ? 72 : 132;
            this.resize();
            this.createBlocks();
        });
        window.addEventListener('pointermove', (event) => {
            this.pointer.targetX = event.clientX / this.canvas.width - 0.5;
            this.pointer.targetY = event.clientY / this.canvas.height - 0.5;
        }, { passive: true });
        this.animate();
    }

    createBlocks() {
        this.blocks = [];

        for (let i = 0; i < this.numBlocks; i++) {
            this.blocks.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2.4 + 0.8,
                length: Math.random() * 12 + 8,
                vx: (Math.random() - 0.5) * (this.isMobile ? 0.16 : 0.24),
                vy: (Math.random() - 0.5) * (this.isMobile ? 0.14 : 0.22),
                opacity: Math.random() * 0.34 + 0.08,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    parseRgb(value, fallback) {
        const parts = value.split(',').map((part) => Number(part.trim()));

        if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
            return fallback;
        }

        return { r: parts[0], g: parts[1], b: parts[2] };
    }

    syncTone() {
        const styles = getComputedStyle(document.body);
        this.targetAccent = this.parseRgb(styles.getPropertyValue('--page-accent-rgb'), this.targetAccent);
        this.targetSecondary = this.parseRgb(styles.getPropertyValue('--page-secondary-rgb'), this.targetSecondary);
    }

    lerpColor(current, target, amount) {
        current.r += (target.r - current.r) * amount;
        current.g += (target.g - current.g) * amount;
        current.b += (target.b - current.b) * amount;
    }

    drawGlow(x, y, radius, color, alpha) {
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    animate() {
        this.frameCount += 1;

        if (this.frameCount % 12 === 0) {
            this.syncTone();
        }

        this.lerpColor(this.accent, this.targetAccent, 0.05);
        this.lerpColor(this.secondary, this.targetSecondary, 0.05);
        this.time += 0.006;
        this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.04;
        this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.04;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGlow(
            this.canvas.width * 0.18 + this.pointer.x * 90,
            this.canvas.height * 0.22 + Math.sin(this.time) * 22,
            this.isMobile ? 150 : 240,
            this.accent,
            0.08
        );
        this.drawGlow(
            this.canvas.width * 0.82 - this.pointer.x * 70,
            this.canvas.height * 0.72 + Math.cos(this.time * 1.2) * 28,
            this.isMobile ? 130 : 220,
            this.secondary,
            0.06
        );

        this.ctx.strokeStyle = `rgba(${this.accent.r}, ${this.accent.g}, ${this.accent.b}, 0.06)`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width * 0.12, this.canvas.height * (0.28 + this.pointer.y * 0.04));
        this.ctx.lineTo(this.canvas.width * 0.88, this.canvas.height * (0.28 - this.pointer.y * 0.03));
        this.ctx.stroke();

        this.blocks.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;
            b.opacity += Math.sin(this.time + b.phase) * 0.002;

            if (b.x < -30) b.x = this.canvas.width + 30;
            if (b.x > this.canvas.width + 30) b.x = -30;
            if (b.y < -30) b.y = this.canvas.height + 30;
            if (b.y > this.canvas.height + 30) b.y = -30;

            this.ctx.strokeStyle = `rgba(${this.secondary.r}, ${this.secondary.g}, ${this.secondary.b}, ${Math.max(0.03, b.opacity * 0.24)})`;
            this.ctx.lineWidth = b.size * 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(b.x, b.y);
            this.ctx.lineTo(
                b.x - b.vx * b.length - this.pointer.x * 10,
                b.y - b.vy * b.length - this.pointer.y * 8
            );
            this.ctx.stroke();

            this.ctx.fillStyle = `rgba(${this.accent.r}, ${this.accent.g}, ${this.accent.b}, ${Math.max(0.08, b.opacity * 0.6)})`;
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

// ABOUT HERO - canvas field and 3D stage interaction
class AboutOrbitScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.section = canvas.closest('.about-section-wrapper');
        this.ctx = canvas.getContext('2d');

        if (!this.section || !this.ctx) {
            return;
        }

        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.nodes = [];
        this.links = [];
        this.columns = 0;
        this.rows = 0;
        this.scroll = { current: 0, target: 0 };
        this.time = 0;
        this.frame = null;
        this.resize();
        this.createField();
        this.bindEvents();
        this.animate();
    }

    seededRandom(seed) {
        return Math.sin(seed * 9283.21) * 0.5 + 0.5;
    }

    resize() {
        const rect = this.section.getBoundingClientRect();
        this.width = Math.max(1, rect.width);
        this.height = Math.max(1, rect.height);
        this.isMobile = this.width < 760;
        this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.center = {
            x: this.width * (this.isMobile ? 0.5 : 0.66),
            y: this.height * (this.isMobile ? 0.54 : 0.47)
        };
        this.scale = Math.min(this.width, this.height) * (this.isMobile ? 0.38 : 0.53);
    }

    createField() {
        const columns = this.isMobile ? 9 : 19;
        const rows = this.isMobile ? 7 : 13;
        this.columns = columns;
        this.rows = rows;
        this.nodes = [];
        this.links = [];

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const index = row * columns + column;
                const u = (column / (columns - 1)) * 2 - 1;
                const v = (row / (rows - 1)) * 2 - 1;
                const radius = Math.sqrt(u * u + v * v);

                this.nodes.push({
                    u,
                    v,
                    radius,
                    row,
                    column,
                    phase: this.seededRandom(index + 1) * Math.PI * 2,
                    size: 1 + this.seededRandom(index + 4) * 1.65,
                    alpha: 0.34 + this.seededRandom(index + 9) * 0.52
                });

                if (column > 0) {
                    this.links.push([index - 1, index]);
                }

                if (row > 0) {
                    this.links.push([index - columns, index]);
                }
            }
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createField();
            this.updateScroll();
            if (this.prefersReducedMotion) {
                this.draw(0);
            }
        });
        window.addEventListener('scroll', () => this.updateScroll(), { passive: true });
        this.updateScroll();

        if (!this.prefersReducedMotion) {
            window.addEventListener('pointermove', (event) => {
                this.pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
                this.pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
            }, { passive: true });

            window.addEventListener('pointerleave', () => {
                this.pointer.targetX = 0;
                this.pointer.targetY = 0;
            }, { passive: true });
        }
    }

    updateScroll() {
        const rect = this.section.getBoundingClientRect();
        const travel = window.innerHeight + rect.height;
        this.scroll.target = Math.min(Math.max((window.innerHeight - rect.top) / travel, 0), 1);
    }

    project(node, time) {
        const scrollLift = this.scroll.current;
        const radiusFalloff = Math.max(0.18, 1.15 - node.radius * 0.28);
        const saddle = (node.u * node.u - node.v * node.v) * 0.26;
        const waveA = Math.sin(node.u * (3.4 + scrollLift * 1.4) + time * 1.15 + node.phase) * Math.cos(node.v * 2.8 - time * 0.82);
        const waveB = Math.sin((node.u - node.v) * 4.1 - time * (0.68 + scrollLift * 0.9)) * 0.24;
        let x = node.u * 2.22 + Math.sin(node.v * 2.2 + time * 0.45) * 0.08;
        let y = (waveA * 0.54 + waveB + saddle + Math.sin(scrollLift * Math.PI + node.phase) * 0.12) * radiusFalloff;
        let z = node.v * 1.58 + Math.cos(node.u * 2.4 + time * 0.38 + node.phase) * 0.18;

        const rotX = -0.8 + this.pointer.y * 0.1 + Math.sin(time * 0.18) * 0.04 + scrollLift * 0.12;
        const rotY = 0.72 + this.pointer.x * 0.13 + Math.cos(time * 0.14) * 0.06 + scrollLift * 0.18;
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        const ry = y * cosX - rz * sinX;
        const depth = y * sinX + rz * cosX + 5.5;
        const perspective = 1 / Math.max(0.7, depth * 0.22);

        return {
            x: this.center.x + rx * this.scale * perspective,
            y: this.center.y + ry * this.scale * perspective,
            depth,
            perspective
        };
    }

    drawGuideLines(time) {
        const ctx = this.ctx;
        const sweep = (Math.sin(time * 0.45) + 1) * 0.5;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1;

        for (let index = 0; index < 6; index += 1) {
            const offset = index * 0.095;
            const y = this.height * (0.24 + offset + sweep * 0.024);
            const alpha = 0.065 - index * 0.006;
            ctx.strokeStyle = `rgba(235, 244, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(this.width * 0.02, y);
            ctx.bezierCurveTo(
                this.width * 0.34,
                y - 72,
                this.width * 0.62,
                y + 96,
                this.width * 0.99,
                y - 34
            );
            ctx.stroke();
        }

        ctx.restore();
    }

    drawSurface(projected) {
        if (!this.columns || !this.rows) {
            return;
        }

        const cells = [];

        for (let row = 0; row < this.rows - 1; row += 1) {
            for (let column = 0; column < this.columns - 1; column += 1) {
                const a = projected[row * this.columns + column];
                const b = projected[row * this.columns + column + 1];
                const c = projected[(row + 1) * this.columns + column + 1];
                const d = projected[(row + 1) * this.columns + column];
                const centerRadius = (a.node.radius + b.node.radius + c.node.radius + d.node.radius) * 0.25;

                cells.push({
                    points: [a.point, b.point, c.point, d.point],
                    depth: (a.point.depth + b.point.depth + c.point.depth + d.point.depth) * 0.25,
                    alpha: Math.max(0, 0.06 - centerRadius * 0.022),
                    parity: (row + column) % 2
                });
            }
        }

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        cells
            .sort((a, b) => b.depth - a.depth)
            .forEach((cell) => {
                const depthLight = Math.max(0.18, 1.08 - cell.depth * 0.09);
                const alpha = cell.alpha * depthLight * (cell.parity ? 0.55 : 1);

                if (alpha <= 0.002) {
                    return;
                }

                this.ctx.fillStyle = `rgba(190, 224, 238, ${alpha})`;
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

    draw(time) {
        const ctx = this.ctx;
        const projected = this.nodes.map((node) => ({
            node,
            point: this.project(node, time)
        }));

        ctx.clearRect(0, 0, this.width, this.height);

        const glow = ctx.createRadialGradient(
            this.center.x,
            this.center.y,
            0,
            this.center.x,
            this.center.y,
            this.scale * 1.8
        );
        glow.addColorStop(0, 'rgba(237, 246, 250, 0.18)');
        glow.addColorStop(0.32, 'rgba(190, 208, 218, 0.08)');
        glow.addColorStop(1, 'rgba(190, 208, 218, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.scale * 1.8, 0, Math.PI * 2);
        ctx.fill();

        this.drawGuideLines(time);
        this.drawSurface(projected);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        this.links.forEach(([fromIndex, toIndex]) => {
            const from = projected[fromIndex];
            const to = projected[toIndex];
            const depthLight = Math.max(0.18, 1.08 - ((from.point.depth + to.point.depth) * 0.5) * 0.12);
            const rim = Math.max(0, 1 - (from.node.radius + to.node.radius) * 0.32);
            const alpha = 0.09 * depthLight * rim;

            if (alpha < 0.006) {
                return;
            }

            ctx.strokeStyle = `rgba(230, 241, 247, ${alpha})`;
            ctx.lineWidth = 1.05 * Math.max(0.52, from.point.perspective);
            ctx.beginPath();
            ctx.moveTo(from.point.x, from.point.y);
            ctx.lineTo(to.point.x, to.point.y);
            ctx.stroke();
        });

        projected
            .sort((a, b) => b.point.depth - a.point.depth)
            .forEach(({ node, point }) => {
                const alpha = node.alpha * Math.max(0.18, 1.06 - point.depth * 0.1);
                const size = node.size * Math.max(0.55, point.perspective);
                ctx.fillStyle = `rgba(246, 250, 252, ${alpha})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fill();
            });

        ctx.restore();
    }

    animate() {
        this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.045;
        this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.045;
        this.scroll.current += (this.scroll.target - this.scroll.current) * 0.045;
        this.time += this.prefersReducedMotion ? 0 : 0.01 + Math.abs(this.scroll.target - this.scroll.current) * 0.035;
        this.draw(this.time);

        if (!this.prefersReducedMotion) {
            this.frame = requestAnimationFrame(() => this.animate());
        }
    }
}

class AboutPageFlowScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        if (!this.ctx) {
            return;
        }

        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.points = [];
        this.scroll = { current: 0, target: 0 };
        this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.time = 0;
        this.resize();
        this.createPoints();
        this.bindEvents();
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, 1.4);
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    createPoints() {
        const count = this.width < 760 ? 34 : 72;
        this.points = Array.from({ length: count }, (_, index) => ({
            seed: index * 1.73 + 0.31,
            radius: 0.14 + (index % 11) * 0.032,
            speed: 0.22 + (index % 7) * 0.04,
            size: 0.8 + (index % 5) * 0.28
        }));
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createPoints();
        });
        window.addEventListener('scroll', () => this.updateScroll(), { passive: true });
        window.addEventListener('pointermove', (event) => {
            this.pointer.targetX = (event.clientX / this.width - 0.5) * 2;
            this.pointer.targetY = (event.clientY / this.height - 0.5) * 2;
        }, { passive: true });
        this.updateScroll();
    }

    updateScroll() {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        this.scroll.target = window.scrollY / maxScroll;
    }

    drawCurve(offset, alpha, widthScale) {
        const ctx = this.ctx;
        const scroll = this.scroll.current;
        const phase = this.time * 0.42 + offset + scroll * Math.PI * 3.2;
        const yBase = this.height * (0.18 + ((offset * 0.17 + scroll * 0.86) % 0.72));

        ctx.beginPath();
        ctx.moveTo(-this.width * 0.08, yBase);

        for (let step = 0; step <= 7; step += 1) {
            const x = this.width * (step / 7);
            const y = yBase
                + Math.sin(step * 0.92 + phase) * this.height * 0.055
                + Math.cos(step * 0.48 - phase * 0.8) * this.height * 0.025;
            const cx = x - this.width * 0.07;
            ctx.quadraticCurveTo(cx, y, x, y);
        }

        ctx.strokeStyle = `rgba(227, 241, 248, ${alpha})`;
        ctx.lineWidth = widthScale;
        ctx.stroke();
    }

    animate() {
        this.scroll.current += (this.scroll.target - this.scroll.current) * 0.06;
        this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.04;
        this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.04;
        this.time += this.prefersReducedMotion ? 0 : 0.009 + Math.abs(this.scroll.target - this.scroll.current) * 0.05;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (let i = 0; i < 5; i += 1) {
            this.drawCurve(i * 0.87, 0.035 + i * 0.004, 0.7 + i * 0.08);
        }

        this.points.forEach((point) => {
            const angle = this.time * point.speed + point.seed + this.scroll.current * Math.PI * 5;
            const drift = Math.sin(point.seed + this.scroll.current * Math.PI * 2);
            const x = this.width * (0.5 + Math.cos(angle) * point.radius + this.pointer.x * 0.012 + drift * 0.03);
            const y = this.height * (0.5 + Math.sin(angle * 0.83) * point.radius * 0.72 + this.pointer.y * 0.014);
            const pulse = 0.45 + Math.sin(this.time * 2 + point.seed) * 0.25;

            ctx.fillStyle = `rgba(242, 249, 252, ${0.08 + pulse * 0.08})`;
            ctx.beginPath();
            ctx.arc(x, y, point.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        if (!this.prefersReducedMotion) {
            requestAnimationFrame(() => this.animate());
        }
    }
}

class StellarSkillVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) return;

        this.parent = canvas.parentElement;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this.time = 0;
        this.hover = 0;
        this.hoverTarget = 0;
        this.activeSkill = -1;
        this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0, screenX: 0, screenY: 0 };
        this.dust = [];
        this.satellites = [];
        this.skills = [
            { name: 'Physics', orbit: 0.72, angle: -2.72, speed: 0.54, tilt: 0.27, y: -0.03, z: 0.16, size: 5.8 },
            { name: 'Systems', orbit: 0.93, angle: -0.72, speed: 0.39, tilt: 0.34, y: -0.08, z: -0.06, size: 5.2 },
            { name: 'Backend', orbit: 1.05, angle: 0.18, speed: 0.34, tilt: 0.29, y: 0.01, z: 0.1, size: 5.7 },
            { name: 'Simulation', orbit: 0.86, angle: 2.36, speed: 0.46, tilt: 0.36, y: 0.08, z: -0.12, size: 5.4 },
            { name: 'Automation', orbit: 0.62, angle: -1.38, speed: 0.63, tilt: 0.22, y: -0.1, z: 0.2, size: 4.8 },
            { name: '3D Tools', orbit: 1.14, angle: 1.35, speed: 0.31, tilt: 0.31, y: 0.11, z: 0.02, size: 5.5 }
        ];
        this.labelEls = Array.from(this.parent.querySelectorAll('.skill-star'));
        this.resize();
        this.createSystem();
        this.bindEvents();
        this.animate();
    }

    seededRandom(seed) {
        return Math.sin(seed * 137.42) * 0.5 + 0.5;
    }

    resize() {
        const rect = this.parent.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.center = {
            x: this.width * 0.5,
            y: this.height * 0.51
        };
        this.scale = Math.min(this.width, this.height) * (this.width < 760 ? 0.28 : 0.31);
    }

    createSystem() {
        const dustCount = this.width < 760 ? 42 : 76;
        this.dust = [];
        this.satellites = [];

        for (let i = 0; i < dustCount; i += 1) {
            const seed = i + 1;
            const angle = this.seededRandom(seed) * Math.PI * 2;
            const orbit = 0.42 + this.seededRandom(seed + 8) * 0.94;

            this.dust.push({
                orbit,
                phase: angle,
                speed: 0.13 + this.seededRandom(seed + 14) * 0.22,
                tilt: 0.2 + this.seededRandom(seed + 19) * 0.24,
                size: 0.65 + this.seededRandom(seed + 24) * 1.15,
                alpha: 0.18 + this.seededRandom(seed + 29) * 0.22
            });
        }

        this.skills.forEach((skill, skillIndex) => {
            const count = this.width < 760 ? 2 : 3;

            for (let i = 0; i < count; i += 1) {
                const seed = skillIndex * 10 + i + 1;

                this.satellites.push({
                    skillIndex,
                    phase: this.seededRandom(seed) * Math.PI * 2,
                    speed: 1.25 + this.seededRandom(seed + 3) * 1.35,
                    orbit: 0.08 + this.seededRandom(seed + 6) * 0.07,
                    size: 1.35 + this.seededRandom(seed + 9) * 1.1
                });
            }
        });
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createSystem();
        });

        this.parent.addEventListener('pointerenter', () => {
            this.hoverTarget = 1;
        }, { passive: true });

        this.parent.addEventListener('pointermove', (e) => {
            const rect = this.parent.getBoundingClientRect();
            this.pointer.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            this.pointer.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
            this.pointer.screenX = e.clientX - rect.left;
            this.pointer.screenY = e.clientY - rect.top;
        }, { passive: true });

        this.parent.addEventListener('pointerleave', () => {
            this.hoverTarget = 0;
            this.activeSkill = -1;
            this.pointer.targetX = 0;
            this.pointer.targetY = 0;
            this.pointer.screenX = this.center.x;
            this.pointer.screenY = this.center.y;
        }, { passive: true });

        this.labelEls.forEach((label, index) => {
            label.addEventListener('pointerenter', () => {
                this.activeSkill = index;
                this.hoverTarget = 1;
            }, { passive: true });

            label.addEventListener('pointerleave', () => {
                this.activeSkill = -1;
            }, { passive: true });
        });
    }

    project(x, y, z, drift = 0) {
        const rotX = -0.72 + Math.sin(this.time * 0.12) * 0.05 + this.pointer.y * 0.2;
        const rotY = 0.5 + Math.sin(this.time * 0.08) * 0.05 + this.pointer.x * 0.26;
        const rotZ = -0.08 + Math.sin(this.time * 0.1) * 0.06;

        x += Math.cos(this.time * 0.36 + drift) * 0.012;
        y += Math.sin(this.time * 0.32 + drift) * 0.01;

        let px = x * Math.cos(rotY) - z * Math.sin(rotY);
        let pz = x * Math.sin(rotY) + z * Math.cos(rotY);
        let py = y * Math.cos(rotX) - pz * Math.sin(rotX);
        pz = y * Math.sin(rotX) + pz * Math.cos(rotX);

        let tx = px * Math.cos(rotZ) - py * Math.sin(rotZ);
        let ty = px * Math.sin(rotZ) + py * Math.cos(rotZ);

        const depth = pz + 5.4;
        const scale = 1 / Math.max(0.68, depth * 0.22);
        const hoverPull = this.hover * 7;

        return {
            x: this.center.x + tx * scale * this.scale + this.pointer.x * hoverPull,
            y: this.center.y + ty * scale * this.scale + this.pointer.y * hoverPull * 0.65,
            scale,
            depth
        };
    }

    orbitalPoint(skill, timeOffset = 0) {
        const angle = skill.angle + this.time * skill.speed + timeOffset;
        const hoverBreath = 1 + this.hover * 0.035 * Math.sin(this.time * 1.7 + skill.angle);
        const radius = skill.orbit * hoverBreath;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * skill.tilt + skill.y;
        const z = Math.sin(angle) * radius * 0.82 + skill.z;

        return {
            angle,
            point: this.project(x, y, z, skill.angle),
            model: { x, y, z }
        };
    }

    orbitModelPoint(skill, angle) {
        return {
            x: Math.cos(angle) * skill.orbit,
            y: Math.sin(angle) * skill.orbit * skill.tilt + skill.y,
            z: Math.sin(angle) * skill.orbit * 0.82 + skill.z
        };
    }

    drawOrbit(skill, index, alpha) {
        const activeBoost = this.activeSkill === index ? 1 : 0;

        for (let step = 0; step < 180; step += 1) {
            const a = (step / 180) * Math.PI * 2;
            const b = ((step + 1) / 180) * Math.PI * 2;
            const fromModel = this.orbitModelPoint(skill, a);
            const toModel = this.orbitModelPoint(skill, b);
            const from = this.project(fromModel.x, fromModel.y, fromModel.z, skill.angle + a);
            const to = this.project(toModel.x, toModel.y, toModel.z, skill.angle + b);
            const front = Math.max(0, ((fromModel.z + toModel.z) * 0.5 + skill.orbit) / (skill.orbit * 2));
            const segmentAlpha = alpha * (0.28 + front * 0.9) + this.hover * 0.018 + activeBoost * 0.08;

            if (segmentAlpha < 0.012) {
                continue;
            }

            this.ctx.strokeStyle = `rgba(220, 238, 247, ${segmentAlpha})`;
            this.ctx.lineWidth = (0.42 + front * 0.92 + activeBoost * 0.34) * Math.max(0.78, from.scale);
            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.stroke();
        }
    }

    drawBackground() {
        const radius = Math.min(this.width, this.height) * 0.58;
        const glow = this.ctx.createRadialGradient(
            this.center.x,
            this.center.y,
            0,
            this.center.x,
            this.center.y,
            radius
        );
        glow.addColorStop(0, `rgba(232, 245, 250, ${0.2 + this.hover * 0.06})`);
        glow.addColorStop(0.28, 'rgba(202, 222, 232, 0.075)');
        glow.addColorStop(0.72, 'rgba(202, 222, 232, 0.028)');
        glow.addColorStop(1, 'rgba(202, 222, 232, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(this.center.x, this.center.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        if (this.hover > 0.02) {
            const attractor = this.ctx.createRadialGradient(
                this.pointer.screenX,
                this.pointer.screenY,
                0,
                this.pointer.screenX,
                this.pointer.screenY,
                this.scale * 0.62
            );
            attractor.addColorStop(0, `rgba(246, 252, 254, ${0.1 * this.hover})`);
            attractor.addColorStop(1, 'rgba(246, 252, 254, 0)');
            this.ctx.fillStyle = attractor;
            this.ctx.beginPath();
            this.ctx.arc(this.pointer.screenX, this.pointer.screenY, this.scale * 0.62, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawSphere(point, size, alpha, phase, activeBoost = 0) {
        const radius = Math.max(1, size);
        const highlightX = point.x - radius * (0.42 + this.pointer.x * 0.08);
        const highlightY = point.y - radius * (0.46 + this.pointer.y * 0.06);
        const glowSize = radius * (2.1 + activeBoost * 0.8);
        const glow = this.ctx.createRadialGradient(point.x, point.y, radius * 0.3, point.x, point.y, glowSize);

        glow.addColorStop(0, `rgba(246, 252, 253, ${0.16 * alpha + activeBoost * 0.04})`);
        glow.addColorStop(1, 'rgba(246, 252, 253, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, glowSize, 0, Math.PI * 2);
        this.ctx.fill();

        const sphere = this.ctx.createRadialGradient(
            highlightX,
            highlightY,
            radius * 0.12,
            point.x,
            point.y,
            radius * 1.18
        );
        sphere.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.98, alpha + 0.18 + activeBoost * 0.12)})`);
        sphere.addColorStop(0.36, `rgba(220, 238, 247, ${Math.min(0.78, alpha * 0.72 + activeBoost * 0.08)})`);
        sphere.addColorStop(0.72, `rgba(126, 145, 155, ${Math.min(0.34, alpha * 0.36)})`);
        sphere.addColorStop(1, `rgba(14, 18, 21, ${Math.min(0.48, alpha * 0.44)})`);

        this.ctx.fillStyle = sphere;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(239, 249, 253, ${0.2 * alpha + activeBoost * 0.16})`;
        this.ctx.lineWidth = 0.7;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius + 0.45, 0, Math.PI * 2);
        this.ctx.stroke();

        if (radius > 3.2) {
            this.ctx.strokeStyle = `rgba(239, 249, 253, ${(0.16 + activeBoost * 0.1) * alpha})`;
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            this.ctx.ellipse(
                point.x,
                point.y,
                radius * (2.55 + activeBoost * 0.4),
                radius * 0.82,
                phase * 0.34 + this.pointer.x * 0.12,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';

        this.skills.forEach((skill, index) => {
            this.drawOrbit(skill, index, index % 2 ? 0.055 : 0.075);
        });

        const planetNodes = this.skills.map(skill => ({
            skill,
            ...this.orbitalPoint(skill)
        }));

        const dustNodes = this.dust.map(dust => {
            const angle = dust.phase + this.time * dust.speed;
            return {
                dust,
                point: this.project(
                    Math.cos(angle) * dust.orbit,
                    Math.sin(angle) * dust.orbit * dust.tilt,
                    Math.sin(angle) * dust.orbit * 0.75,
                    dust.phase
                )
            };
        });

        dustNodes
            .sort((a, b) => b.point.depth - a.point.depth)
            .forEach(({ dust, point }) => {
                const depthLight = Math.max(0.2, 1.08 - point.depth * 0.1);
                this.ctx.fillStyle = `rgba(238, 248, 252, ${dust.alpha * depthLight * (0.7 + this.hover * 0.45)})`;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, dust.size * point.scale, 0, Math.PI * 2);
                this.ctx.fill();
            });

        planetNodes.forEach(({ point }) => {
            const depthLight = Math.max(0.28, 1.14 - point.depth * 0.1);
            this.ctx.strokeStyle = `rgba(232, 244, 250, ${(0.14 + this.hover * 0.08) * depthLight})`;
            this.ctx.lineWidth = 0.95 * Math.max(0.68, point.scale);
            this.ctx.beginPath();
            this.ctx.moveTo(this.center.x, this.center.y);
            this.ctx.lineTo(point.x, point.y);
            this.ctx.stroke();
        });

        for (let i = 0; i < planetNodes.length; i += 1) {
            const current = planetNodes[i];
            const next = planetNodes[(i + 1) % planetNodes.length];
            const depthLight = Math.max(0.22, 1.12 - ((current.point.depth + next.point.depth) * 0.5) * 0.1);
            this.ctx.strokeStyle = `rgba(232, 244, 250, ${(0.055 + this.hover * 0.035) * depthLight})`;
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            this.ctx.moveTo(current.point.x, current.point.y);
            this.ctx.lineTo(next.point.x, next.point.y);
            this.ctx.stroke();
        }

        const satelliteNodes = this.satellites.map(satellite => {
            const planet = planetNodes[satellite.skillIndex];
            const angle = satellite.phase + this.time * satellite.speed;
            const satellitePoint = this.project(
                planet.model.x + Math.cos(angle) * satellite.orbit,
                planet.model.y + Math.sin(angle) * satellite.orbit * 0.54,
                planet.model.z + Math.sin(angle) * satellite.orbit,
                satellite.phase
            );

            return { satellite, planet, point: satellitePoint };
        });

        [...satelliteNodes, ...planetNodes]
            .sort((a, b) => b.point.depth - a.point.depth)
            .forEach((item) => {
                const { point } = item;
                const depthLight = Math.max(0.24, 1.08 - point.depth * 0.1);
                const isPlanet = Boolean(item.skill);
                const activeBoost = isPlanet && this.skills.indexOf(item.skill) === this.activeSkill ? 1 : 0;
                const pulse = isPlanet
                    ? 0.82 + Math.sin(this.time * 2.1 + item.skill.angle) * 0.12
                    : 0.52 + Math.sin(this.time * 2.6 + item.satellite.phase) * 0.1;
                const baseSize = isPlanet ? item.skill.size : item.satellite.size;
                const size = baseSize * point.scale * (1 + this.hover * (isPlanet ? 0.18 : 0.08) + activeBoost * 0.22);

                this.drawSphere(
                    point,
                    size,
                    depthLight * pulse,
                    isPlanet ? item.angle : item.satellite.phase,
                    activeBoost
                );
            });

        this.ctx.restore();
    }

    animate() {
        this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.05;
        this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.05;
        this.hover += (this.hoverTarget - this.hover) * 0.06;
        this.time += this.prefersReducedMotion ? 0 : 0.01 + this.hover * 0.018;
        this.draw();

        if (!this.prefersReducedMotion) {
            requestAnimationFrame(() => this.animate());
        }
    }
}

function initAboutScene() {
    const flowCanvas = document.getElementById('about-flow-canvas');
    const canvas = document.getElementById('about-orbit-canvas');
    const calcCanvas = document.getElementById('calculus-canvas');

    if (flowCanvas) {
        new AboutPageFlowScene(flowCanvas);
    }

    if (canvas) {
        new AboutOrbitScene(canvas);
    }

    if (calcCanvas) {
        new StellarSkillVisualizer(calcCanvas);
    }

    // Tilt hover logic for elements with data-tilt
    const tiltTargets = document.querySelectorAll('[data-tilt], [data-about-tilt]');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (tiltTargets.length > 0 && !prefersReducedMotion) {
        tiltTargets.forEach(target => {
            target.addEventListener('pointermove', (event) => {
                const rect = target.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;

                // Use CSS variables for tilt
                target.style.setProperty('--about-tilt-x', `${(-y * 8).toFixed(2)}deg`);
                target.style.setProperty('--about-tilt-y', `${(x * 10).toFixed(2)}deg`);
                target.style.setProperty('--about-light-x', `${(50 + x * 34).toFixed(1)}%`);
                target.style.setProperty('--about-light-y', `${(42 + y * 30).toFixed(1)}%`);

                // Add mouse tracking for glass cards
                if (target.classList.contains('glass-card')) {
                    target.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
                    target.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
                    target.style.transform = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${ (x * 6).toFixed(2)}deg) scale(1.02)`;
                }
            }, { passive: true });

            target.addEventListener('pointerleave', () => {
                target.style.setProperty('--about-tilt-x', '0deg');
                target.style.setProperty('--about-tilt-y', '0deg');
                target.style.setProperty('--about-light-x', '62%');
                target.style.setProperty('--about-light-y', '36%');

                if (target.classList.contains('glass-card')) {
                    target.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
                }
            }, { passive: true });
        });
    }

    // Timeline scroll tracking
    const timeline = document.querySelector('.experience-timeline-progress');
    const experienceGrid = document.querySelector('.experience-grid');
    if (timeline && experienceGrid) {
        window.addEventListener('scroll', () => {
            const rect = experienceGrid.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Calculate progress (0 to 1) based on scroll position within the grid
            let progress = (viewportHeight / 2 - rect.top) / rect.height;
            progress = Math.max(0, Math.min(1, progress));

            timeline.style.transform = `scaleY(${progress})`;
        }, { passive: true });
    }
}

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
            color: 0xffffff,
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
            color: 0xffffff,
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
                src: 'https://cdn.discordapp.com/attachments/979106511886368828/1472829136387964970/image.png?ex=6993fe85&is=6992ad05&hm=def85077e09b157fffe65943ab195d0476fb77e87004c4d189f8479bbfab337f&',
                alt: 'Pong AI gallery image 1'
            },
            {
                src: 'https://cdn.discordapp.com/attachments/979106511886368828/1472828960802078740/image.png?ex=6993fe5c&is=6992acdc&hm=ef6c70697669576f64c5957ad6418e2df5018115fc58d18875ec72f0c8d995c1&',
                alt: 'Pong AI gallery image 2'
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

function showDemoDetails(data) {
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
    tagsEl.innerHTML = (data.tags || []).map(t => '<span class="tech-tag">' + t + '</span>').join('');

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

function openDemoModal(index) {
    const data = demoData[index];
    showDemoDetails(data);
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
        desc: 'Server-side logic and gameplay mechanics in Lua for high-concurrency titles.',
        tags: ['Lua', 'Roblox Studio'],
        preview: null,
        gallery: [],
        note: null,
        assignment: null,
        linkedin: null,
        repo: null,
        project: null,
        demo: null
    },
    {
        title: '3D Character Animations',
        desc: 'Blender-made animations exported and integrated into Roblox Studio.',
        tags: ['Blender', 'Roblox Studio'],
        preview: null,
        gallery: [],
        note: null,
        assignment: null,
        linkedin: null,
        repo: null,
        project: null,
        demo: null
    },
    {
        title: 'Physics & Combat Systems',
        desc: 'Custom hit detection, ragdoll physics, and ability systems at scale.',
        tags: ['Lua', 'Physics'],
        preview: null,
        gallery: [],
        note: null,
        assignment: null,
        linkedin: null,
        repo: null,
        project: null,
        demo: null
    }
];

function openRobloxModal() {
    const modal = document.getElementById('roblox-modal');
    const list = document.getElementById('roblox-demos-list');

    list.innerHTML = robloxDemos.map((d, index) =>
        '<div class="roblox-demo-item" onclick="openRobloxDemo(' + index + ')">' +
            '<div class="roblox-demo-thumb"><div class="demo-placeholder"><span>GIF</span></div></div>' +
            '<div class="roblox-demo-text"><h4>' + d.title + '</h4><p>' + d.desc + '</p></div>' +
            '<span class="roblox-demo-cta">Click me!</span>' +
        '</div>'
    ).join('');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openRobloxDemo(index) {
    const data = robloxDemos[index];
    if (!data) return;

    const robloxModal = document.getElementById('roblox-modal');
    robloxModal.classList.remove('active');

    showDemoDetails(data);
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
window.openRobloxDemo = openRobloxDemo;
window.closeRobloxModal = closeRobloxModal;

// ============================================
// PROJECT MODALS (About Page)
// ============================================

const projectData = [
    {
        title: 'Gaussian Simulations',
        desc: 'Independent research project deriving closed-form entanglement survival conditions for two-mode squeezed vacuum states in symmetric phase-insensitive Gaussian channels. Uses symplectic-invariant reduction to convert PPT checks into explicit, analytically invertible thresholds for thermal-loss and symmetric quantum-limited amplification settings.',
        tags: ['Python', 'Quantum Information'],
        date: 'Until Feb 2026',
        assignment: null,
        linkedin: null,
        repo: 'https://github.com/mohamedelsayed-0/gaussian_simulations/tree/main',
        project: null,
        demo: null
    },
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
        date: 'Until Dec 2025',
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
