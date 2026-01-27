/**
 * Harmony Loop - 3D Core Engine
 * Full 3D UI experience using Three.js
 * Theme: Orange/Yellow (cam/vàng)
 * Optimized for multi-device performance
 */

// Device performance detection
const HL3D = {
    // Performance tier: 'high', 'medium', 'low'
    performanceTier: 'high',
    isMobile: false,
    isReducedMotion: false,
    
    // Theme colors
    colors: {
        primary: 0xff6a00,      // Primary orange
        primaryDark: 0xe55a00,
        accent: 0xffd166,       // Yellow accent
        background: 0x0f172a,   // Dark blue background
        backgroundLight: 0x1e293b,
        white: 0xffffff,
        softGlow: 0xffa500
    },

    // Detect device capabilities
    detectPerformance() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Check GPU/device performance
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            this.performanceTier = 'low';
            return;
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
        
        // Mobile or integrated GPU = lower tier
        if (this.isMobile) {
            this.performanceTier = 'medium';
        }
        
        // Very old devices
        if (renderer.includes('Intel HD Graphics 4') || renderer.includes('Mali-4')) {
            this.performanceTier = 'low';
        }

        // Reduced motion preference
        if (this.isReducedMotion) {
            this.performanceTier = 'low';
        }

        console.log(`[HL3D] Performance tier: ${this.performanceTier}, Mobile: ${this.isMobile}`);
    },

    // Get quality settings based on performance tier
    getQualitySettings() {
        const settings = {
            high: {
                particleCount: 150,
                shadowsEnabled: true,
                antialias: true,
                pixelRatio: Math.min(window.devicePixelRatio, 2),
                bloomEnabled: true,
                animationSpeed: 1,
                geometryDetail: 64
            },
            medium: {
                particleCount: 80,
                shadowsEnabled: false,
                antialias: true,
                pixelRatio: Math.min(window.devicePixelRatio, 1.5),
                bloomEnabled: false,
                animationSpeed: 1,
                geometryDetail: 32
            },
            low: {
                particleCount: 30,
                shadowsEnabled: false,
                antialias: false,
                pixelRatio: 1,
                bloomEnabled: false,
                animationSpeed: 0.5,
                geometryDetail: 16
            }
        };
        return settings[this.performanceTier];
    }
};

/**
 * Main 3D Scene Manager
 */
class HL3DScene {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = Object.assign({
            background: true,
            particles: true,
            interactive: true,
            fog: true
        }, options);
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.floatingObjects = [];
        this.mouse = { x: 0, y: 0 };
        this.clock = null;
        this.animationId = null;
        this.isDestroyed = false;
        
        this.quality = HL3D.getQualitySettings();
    }

    async init() {
        if (!this.container) {
            console.error('[HL3D] Container not found');
            return false;
        }

        // Wait for Three.js to load
        if (typeof THREE === 'undefined') {
            console.error('[HL3D] Three.js not loaded');
            return false;
        }

        this.clock = new THREE.Clock();
        
        // Setup scene
        this.scene = new THREE.Scene();
        
        // Fog for depth
        if (this.options.fog) {
            this.scene.fog = new THREE.Fog(HL3D.colors.background, 10, 50);
        }

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 20);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.quality.antialias,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(this.quality.pixelRatio);
        this.renderer.setClearColor(HL3D.colors.background, 1);
        
        if (this.quality.shadowsEnabled) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        this.container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '-1';
        this.renderer.domElement.style.pointerEvents = 'none';

        // Lights
        this.setupLights();

        // Background elements
        if (this.options.background) {
            this.createBackground();
        }

        // Particles
        if (this.options.particles) {
            this.createParticles();
        }

        // Floating objects
        this.createFloatingObjects();

        // Event listeners
        if (this.options.interactive) {
            this.setupEventListeners();
        }

        // Start animation
        this.animate();

        return true;
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (warm orange)
        const mainLight = new THREE.DirectionalLight(HL3D.colors.primary, 0.8);
        mainLight.position.set(10, 10, 10);
        this.scene.add(mainLight);

        // Accent light (yellow)
        const accentLight = new THREE.PointLight(HL3D.colors.accent, 0.6, 50);
        accentLight.position.set(-10, 5, 5);
        this.scene.add(accentLight);

        // Soft rim light
        const rimLight = new THREE.PointLight(HL3D.colors.softGlow, 0.4, 40);
        rimLight.position.set(0, -10, 10);
        this.scene.add(rimLight);
    }

    createBackground() {
        // Gradient sphere background
        const geometry = new THREE.SphereGeometry(80, this.quality.geometryDetail, this.quality.geometryDetail);
        
        // Custom shader for gradient
        const material = new THREE.ShaderMaterial({
            uniforms: {
                colorTop: { value: new THREE.Color(HL3D.colors.backgroundLight) },
                colorBottom: { value: new THREE.Color(HL3D.colors.background) },
                colorAccent: { value: new THREE.Color(HL3D.colors.primary) },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec2 vUv;
                void main() {
                    vPosition = position;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 colorTop;
                uniform vec3 colorBottom;
                uniform vec3 colorAccent;
                uniform float time;
                varying vec3 vPosition;
                varying vec2 vUv;
                
                void main() {
                    float gradient = smoothstep(-80.0, 80.0, vPosition.y);
                    vec3 color = mix(colorBottom, colorTop, gradient);
                    
                    // Add subtle orange glow
                    float glow = sin(vUv.x * 3.14159 + time * 0.5) * 0.5 + 0.5;
                    glow *= sin(vUv.y * 3.14159 + time * 0.3) * 0.5 + 0.5;
                    color = mix(color, colorAccent, glow * 0.15);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: THREE.BackSide
        });

        this.backgroundSphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.backgroundSphere);
    }

    createParticles() {
        const count = this.quality.particleCount;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const colorPrimary = new THREE.Color(HL3D.colors.primary);
        const colorAccent = new THREE.Color(HL3D.colors.accent);
        const colorWhite = new THREE.Color(HL3D.colors.white);

        for (let i = 0; i < count; i++) {
            // Random positions in a sphere
            const radius = 30 + Math.random() * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Random colors (orange, yellow, white)
            const colorChoice = Math.random();
            let color;
            if (colorChoice < 0.4) {
                color = colorPrimary;
            } else if (colorChoice < 0.7) {
                color = colorAccent;
            } else {
                color = colorWhite;
            }
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom shader for particles
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: this.quality.pixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                uniform float pixelRatio;
                
                void main() {
                    vColor = color;
                    vec3 pos = position;
                    
                    // Gentle floating animation
                    pos.y += sin(time * 0.5 + position.x * 0.1) * 2.0;
                    pos.x += cos(time * 0.3 + position.z * 0.1) * 1.5;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Soft circular particle
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    
                    float alpha = 1.0 - smoothstep(0.3, 0.5, d);
                    gl_FragColor = vec4(vColor, alpha * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createFloatingObjects() {
        const objectCount = HL3D.isMobile ? 5 : 10;
        
        for (let i = 0; i < objectCount; i++) {
            const geometry = this.getRandomGeometry();
            const material = new THREE.MeshPhongMaterial({
                color: Math.random() > 0.5 ? HL3D.colors.primary : HL3D.colors.accent,
                transparent: true,
                opacity: 0.6,
                shininess: 100
            });

            const mesh = new THREE.Mesh(geometry, material);
            
            // Random position
            mesh.position.set(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20 - 10
            );
            
            // Random rotation
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            // Store animation data
            mesh.userData = {
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02,
                    z: (Math.random() - 0.5) * 0.02
                },
                floatSpeed: 0.5 + Math.random() * 0.5,
                floatOffset: Math.random() * Math.PI * 2,
                originalY: mesh.position.y
            };

            this.floatingObjects.push(mesh);
            this.scene.add(mesh);
        }
    }

    getRandomGeometry() {
        const detail = this.quality.geometryDetail;
        const shapes = [
            () => new THREE.IcosahedronGeometry(1 + Math.random() * 2, 0),
            () => new THREE.OctahedronGeometry(1 + Math.random() * 2, 0),
            () => new THREE.TetrahedronGeometry(1 + Math.random() * 2, 0),
            () => new THREE.TorusGeometry(1 + Math.random(), 0.3, detail / 4, detail / 2),
            () => new THREE.TorusKnotGeometry(1, 0.3, detail, detail / 4)
        ];
        return shapes[Math.floor(Math.random() * shapes.length)]();
    }

    setupEventListeners() {
        // Mouse move for parallax
        this.onMouseMove = (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', this.onMouseMove);

        // Touch support
        this.onTouchMove = (e) => {
            if (e.touches.length > 0) {
                this.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            }
        };
        window.addEventListener('touchmove', this.onTouchMove);

        // Resize
        this.onResize = () => {
            if (!this.container || this.isDestroyed) return;
            
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        };
        window.addEventListener('resize', this.onResize);
    }

    animate() {
        if (this.isDestroyed) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime() * this.quality.animationSpeed;

        // Update background shader
        if (this.backgroundSphere) {
            this.backgroundSphere.material.uniforms.time.value = elapsed;
        }

        // Update particles
        if (this.particles) {
            this.particles.material.uniforms.time.value = elapsed;
            this.particles.rotation.y = elapsed * 0.02;
        }

        // Update floating objects
        this.floatingObjects.forEach(obj => {
            const data = obj.userData;
            obj.rotation.x += data.rotationSpeed.x;
            obj.rotation.y += data.rotationSpeed.y;
            obj.rotation.z += data.rotationSpeed.z;
            obj.position.y = data.originalY + Math.sin(elapsed * data.floatSpeed + data.floatOffset) * 2;
        });

        // Camera parallax (subtle)
        if (this.options.interactive) {
            this.camera.position.x += (this.mouse.x * 3 - this.camera.position.x) * 0.02;
            this.camera.position.y += (this.mouse.y * 2 - this.camera.position.y) * 0.02;
            this.camera.lookAt(0, 0, 0);
        }

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.isDestroyed = true;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Remove event listeners
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('resize', this.onResize);

        // Dispose geometries and materials
        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        // Remove renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        console.log('[HL3D] Scene destroyed');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    HL3D.detectPerformance();
});

// Export for global use
window.HL3D = HL3D;
window.HL3DScene = HL3DScene;
