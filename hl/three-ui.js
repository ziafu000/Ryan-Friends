/**
 * Harmony Loop - 3D Navbar & UI Components
 * Creates immersive 3D navigation experience
 */

class HL3DNavbar {
    constructor(navbarSelector = '.navbar') {
        this.navbar = document.querySelector(navbarSelector);
        this.navItems = [];
        this.isScrolled = false;
        this.scrollThreshold = 50;

        if (this.navbar) {
            this.init();
        }
    }

    init() {
        // Add 3D classes
        this.navbar.classList.add('hl-navbar-3d');

        // Setup nav items with 3D effects
        const items = this.navbar.querySelectorAll('.nav-link');
        items.forEach((item, index) => {
            item.classList.add('hl-nav-item-3d');
            item.style.setProperty('--item-index', index);
            this.setupItemEffects(item);
        });

        // Scroll effect
        this.setupScrollEffect();

        // Parallax on navbar
        this.setupParallax();
    }

    setupItemEffects(item) {
        item.addEventListener('mouseenter', (e) => {
            this.createRipple(e, item);
        });

        item.addEventListener('mousemove', (e) => {
            const rect = item.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            item.style.transform = `
                perspective(500px)
                rotateX(${-y * 0.1}deg)
                rotateY(${x * 0.1}deg)
                translateZ(10px)
            `;
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = '';
        });
    }

    createRipple(e, element) {
        const ripple = document.createElement('span');
        ripple.classList.add('hl-ripple-3d');

        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

        element.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    setupScrollEffect() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;

                    if (scrollY > this.scrollThreshold && !this.isScrolled) {
                        this.isScrolled = true;
                        this.navbar.classList.add('hl-navbar-scrolled');
                    } else if (scrollY <= this.scrollThreshold && this.isScrolled) {
                        this.isScrolled = false;
                        this.navbar.classList.remove('hl-navbar-scrolled');
                    }

                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    setupParallax() {
        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;

            this.navbar.style.transform = `
                perspective(1000px)
                rotateX(${-y * 0.5}deg)
                rotateY(${x * 0.5}deg)
            `;
        });
    }
}

/**
 * 3D Card Component
 */
class HL3DCard {
    constructor(cardSelector = '.card') {
        this.cards = document.querySelectorAll(cardSelector);
        this.init();
    }

    init() {
        this.cards.forEach((card, index) => {
            card.classList.add('hl-card-3d');
            card.style.setProperty('--card-index', index);

            // Staggered entrance animation
            card.style.animationDelay = `${index * 0.1}s`;

            this.setupTiltEffect(card);
            this.setupGlowEffect(card);
        });
    }

    setupTiltEffect(card) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const rotateX = (e.clientY - centerY) / 10;
            const rotateY = -(e.clientX - centerX) / 10;

            card.style.transform = `
                perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                translateZ(30px)
                scale(1.02)
            `;

            // Move inner elements for depth
            const inner = card.querySelector('.card-body');
            if (inner) {
                inner.style.transform = `translateZ(40px)`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            const inner = card.querySelector('.card-body');
            if (inner) {
                inner.style.transform = '';
            }
        });
    }

    setupGlowEffect(card) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            card.style.setProperty('--glow-x', `${x}%`);
            card.style.setProperty('--glow-y', `${y}%`);
        });
    }
}

/**
 * 3D Button Effects
 */
class HL3DButton {
    constructor(buttonSelector = '.btn') {
        this.buttons = document.querySelectorAll(buttonSelector);
        this.init();
    }

    init() {
        this.buttons.forEach(btn => {
            btn.classList.add('hl-btn-3d');
            this.setupEffect(btn);
        });
    }

    setupEffect(btn) {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-3px) translateZ(20px) scale(1.05)';
            btn.style.boxShadow = `
                0 10px 30px rgba(255, 106, 0, 0.4),
                0 0 20px rgba(255, 209, 102, 0.3)
            `;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            btn.style.boxShadow = '';
        });

        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'translateY(0) translateZ(10px) scale(0.98)';
        });

        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'translateY(-3px) translateZ(20px) scale(1.05)';
        });
    }
}

/**
 * 3D Hero Section with Canvas Background
 */
class HL3DHero {
    constructor(heroSelector) {
        this.hero = document.querySelector(heroSelector);
        this.scene = null;

        if (this.hero) {
            this.init();
        }
    }

    async init() {
        // Add 3D container class
        this.hero.classList.add('hl-hero-3d');

        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'hl-hero-canvas';
        canvasContainer.classList.add('hl-hero-canvas');
        this.hero.insertBefore(canvasContainer, this.hero.firstChild);

        // Initialize 3D scene
        if (window.HL3DScene) {
            this.scene = new HL3DScene('#hl-hero-canvas', {
                background: true,
                particles: true,
                interactive: true,
                fog: true
            });
            await this.scene.init();
        }

        // Setup parallax for hero content
        this.setupContentParallax();
    }

    setupContentParallax() {
        const content = this.hero.querySelectorAll(':scope > *:not(.hl-hero-canvas)');

        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;

            content.forEach((el, index) => {
                const depth = (index + 1) * 5;
                el.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
            });
        });
    }

    destroy() {
        if (this.scene) {
            this.scene.destroy();
        }
    }
}

/**
 * Scroll-triggered 3D animations
 */
class HL3DScrollAnimations {
    constructor() {
        this.elements = [];
        this.observer = null;
        this.init();
    }

    init() {
        // Find all sections/cards that should animate on scroll
        const animatables = document.querySelectorAll('.card, .sjl-hero, .sjl-section-card, section');

        animatables.forEach(el => {
            el.classList.add('hl-scroll-animate');
            this.elements.push(el);
        });

        // Setup IntersectionObserver
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('hl-visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        this.elements.forEach(el => this.observer.observe(el));
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

/**
 * Footer 3D Effects
 */
class HL3DFooter {
    constructor(footerSelector = 'footer') {
        this.footer = document.querySelector(footerSelector);
        if (this.footer) {
            this.init();
        }
    }

    init() {
        this.footer.classList.add('hl-footer-3d');

        // Social buttons 3D effect
        const socialBtns = this.footer.querySelectorAll('.btn-floating');
        socialBtns.forEach(btn => {
            btn.classList.add('hl-social-3d');

            btn.addEventListener('mouseenter', () => {
                btn.style.transform = `
                    translateY(-8px)
                    translateZ(20px)
                    rotateY(360deg)
                    scale(1.2)
                `;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }
}

/**
 * Main initialization
 */
class HL3DUI {
    constructor() {
        this.navbar = null;
        this.cards = null;
        this.buttons = null;
        this.hero = null;
        this.scrollAnims = null;
        this.footer = null;
        this.mainScene = null;
    }

    async init() {
        console.log('[HL3D UI] Initializing...');

        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        // Add body class for 3D mode
        document.body.classList.add('hl-3d-mode');

        // Create main background scene
        this.createMainScene();

        // Initialize components
        this.navbar = new HL3DNavbar();
        this.cards = new HL3DCard();
        this.buttons = new HL3DButton();
        this.scrollAnims = new HL3DScrollAnimations();
        this.footer = new HL3DFooter();

        // Hero section (if carousel exists, treat as hero)
        const carousel = document.querySelector('#slider');
        if (carousel) {
            this.setupCarousel3D(carousel);
        }

        console.log('[HL3D UI] Initialization complete');
    }

    createMainScene() {
        // Create full-page background container
        const bgContainer = document.createElement('div');
        bgContainer.id = 'hl-3d-background';
        bgContainer.classList.add('hl-3d-background');
        document.body.insertBefore(bgContainer, document.body.firstChild);

        // Initialize scene
        if (window.HL3DScene) {
            this.mainScene = new HL3DScene('#hl-3d-background', {
                background: true,
                particles: true,
                interactive: true,
                fog: true
            });
            this.mainScene.init();
        }
    }

    setupCarousel3D(carousel) {
        carousel.classList.add('hl-carousel-3d');

        const items = carousel.querySelectorAll('.carousel-item');
        items.forEach(item => {
            item.classList.add('hl-carousel-item-3d');
        });

        // Add perspective container
        const inner = carousel.querySelector('.carousel-inner');
        if (inner) {
            inner.style.perspective = '1000px';
            inner.style.transformStyle = 'preserve-3d';
        }
    }

    destroy() {
        if (this.mainScene) this.mainScene.destroy();
        if (this.scrollAnims) this.scrollAnims.destroy();
    }
}

// Auto-init
const hl3dUI = new HL3DUI();
hl3dUI.init();

// Export
window.HL3DUI = HL3DUI;
window.hl3dUI = hl3dUI;
