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
    } else if (document.querySelector('.about-page') || document.querySelector('.notes-page')) {
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
            footer.style.opacity = '0';
            footer.style.transform = 'translateY(10px)';
            footer.style.transition = 'all 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.5s'; // Later delay

            setTimeout(() => {
                footer.style.opacity = '1';
                footer.style.transform = 'translateY(0)';
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
        typeWriter(greeting, "Hello! I'm Mohamed.", 40);
    }
    if (bio) {
        setTimeout(() => {
            typeWriter(bio, "I'm a passionate physics lover, currently pursuing a bachelors in Engineering Science. I'm interested in Math, Physics, Reading, and Space!", 40);
        }, 1200);
    }
}

function typeWriter(element, text, speed) {
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

