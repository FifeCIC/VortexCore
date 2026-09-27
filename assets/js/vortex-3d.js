// Vortex Core 3D Visualization - Simplified & Tested
// Uses Three.js for interactive 3D model rendering

(function() {
    'use strict';

    class VortexCore3D {
        constructor(containerId) {
            this.containerId = containerId;
            this.container = document.getElementById(containerId);
            
            if (!this.container) {
                console.error('Container not found:', containerId);
                return;
            }
            
            // Check if Three.js is available
            if (typeof THREE === 'undefined') {
                console.error('Three.js not loaded');
                this.showFallback('Three.js library not loaded');
                return;
            }
            
            // Ensure container has dimensions
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            
            if (width === 0 || height === 0) {
                console.error('Container has no dimensions');
                this.showFallback('Container has no dimensions');
                return;
            }
            
            try {
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x1C2E4A);
                
                this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
                this.camera.position.z = 6;
                
                this.renderer = new THREE.WebGLRenderer({ 
                    antialias: true, 
                    alpha: false,
                    powerPreference: 'high-performance'
                });
                
                this.renderer.setSize(width, height);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                
                this.container.appendChild(this.renderer.domElement);
                
                this.particles = [];
                this.isDragging = false;
                this.previousMousePosition = { x: 0, y: 0 };
                
                this.setupScene();
                this.setupControls();
                this.animate();
                
                // Handle window resize
                window.addEventListener('resize', () => this.onWindowResize());
                
            } catch (error) {
                console.error('Error initializing 3D model:', error);
                this.showFallback(error.message);
            }
        }
        
        setupScene() {
            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            this.scene.add(ambientLight);
            
            const pointLight1 = new THREE.PointLight(0x44B8E0, 1.5);
            pointLight1.position.set(5, 5, 5);
            this.scene.add(pointLight1);
            
            const pointLight2 = new THREE.PointLight(0xC4A882, 1);
            pointLight2.position.set(-5, -5, 5);
            this.scene.add(pointLight2);
            
            // Create vortex group
            this.vortexGroup = new THREE.Group();
            this.scene.add(this.vortexGroup);
            
            // Main cone (cyclone body)
            const coneGeometry = new THREE.ConeGeometry(2, 3, 32);
            const coneMaterial = new THREE.MeshPhongMaterial({
                color: 0x44B8E0,
                emissive: 0x1f4a63,
                shininess: 100,
                side: THREE.DoubleSide
            });
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            this.vortexGroup.add(cone);
            
            // Inner tube (vortex finder)
            const tubeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2.5, 32);
            const tubeMaterial = new THREE.MeshPhongMaterial({
                color: 0x8DC63F,
                emissive: 0x2f4a12,
                shininess: 80
            });
            const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
            this.vortexGroup.add(tube);
            
            // Inlet pipe
            const inletGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 16);
            const inletMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x2a9bc4,
                shininess: 60
            });
            const inlet = new THREE.Mesh(inletGeometry, inletMaterial);
            inlet.rotation.z = Math.PI / 2;
            inlet.position.set(2, 1, 0);
            this.vortexGroup.add(inlet);
            
            // Outlet pipe
            const outletGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 16);
            const outletMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x74a832,
                shininess: 60
            });
            const outlet = new THREE.Mesh(outletGeometry, outletMaterial);
            outlet.rotation.z = Math.PI / 2;
            outlet.position.set(-2, -1, 0);
            this.vortexGroup.add(outlet);
            
            // Create particles
            this.createParticles();
        }
        
        createParticles() {
            const particleCount = 120;
            const particleGeometry = new THREE.SphereGeometry(0.08, 8, 8);
            
            for (let i = 0; i < particleCount; i++) {
                const isHeavy = Math.random() > 0.5;
                const particleMaterial = new THREE.MeshPhongMaterial({
                    color: isHeavy ? 0xC4A882 : 0xC4A882,
                    emissive: isHeavy ? 0x2b2318 : 0x5a4a2e,
                    shininess: 40
                });
                
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                
                particle.position.set(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4
                );
                
                particle.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.03,
                    (Math.random() - 0.5) * 0.03,
                    (Math.random() - 0.5) * 0.03
                );
                
                this.scene.add(particle);
                this.particles.push(particle);
            }
        }
        
        setupControls() {
            const canvas = this.renderer.domElement;
            
            // Mouse controls
            canvas.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            });
            
            canvas.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    const deltaX = e.clientX - this.previousMousePosition.x;
                    const deltaY = e.clientY - this.previousMousePosition.y;
                    this.vortexGroup.rotation.y += deltaX * 0.01;
                    this.vortexGroup.rotation.x += deltaY * 0.01;
                    this.previousMousePosition = { x: e.clientX, y: e.clientY };
                }
            });
            
            canvas.addEventListener('mouseup', () => {
                this.isDragging = false;
            });
            
            canvas.addEventListener('mouseleave', () => {
                this.isDragging = false;
            });
            
            // Scroll zoom
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.camera.position.z += e.deltaY * 0.01;
                this.camera.position.z = Math.max(2, Math.min(15, this.camera.position.z));
            }, { passive: false });
            
            // Touch controls for mobile
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.isDragging = true;
                    this.previousMousePosition = { 
                        x: e.touches[0].clientX, 
                        y: e.touches[0].clientY 
                    };
                }
            });
            
            canvas.addEventListener('touchmove', (e) => {
                if (this.isDragging && e.touches.length === 1) {
                    const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
                    const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
                    this.vortexGroup.rotation.y += deltaX * 0.01;
                    this.vortexGroup.rotation.x += deltaY * 0.01;
                    this.previousMousePosition = { 
                        x: e.touches[0].clientX, 
                        y: e.touches[0].clientY 
                    };
                }
            });
            
            canvas.addEventListener('touchend', () => {
                this.isDragging = false;
            });
        }
        
        updateParticles() {
            this.particles.forEach(particle => {
                particle.position.add(particle.velocity);
                const distance = particle.position.length();
                
                if (distance > 6) {
                    particle.position.set(
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4
                    );
                }
                
                particle.rotation.x += 0.01;
                particle.rotation.y += 0.01;
            });
        }
        
        animate() {
            requestAnimationFrame(() => this.animate());
            
            // Rotate vortex
            this.vortexGroup.rotation.z += 0.003;
            
            // Update particles
            this.updateParticles();
            
            // Render
            this.renderer.render(this.scene, this.camera);
        }
        
        onWindowResize() {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            
            if (width > 0 && height > 0) {
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height);
            }
        }
        
        showFallback(message) {
            this.container.innerHTML = `
                <div style="
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, rgba(0, 102, 204, 0.1) 0%, rgba(0, 212, 255, 0.05) 100%);
                    border-radius: 8px;
                    border: 1px solid rgba(0, 212, 255, 0.2);
                    color: #a0a0a0;
                    font-size: 16px;
                    text-align: center;
                    padding: 2rem;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 1rem;">🌀</div>
                        <p>3D Model Loading...</p>
                        <p style="font-size: 12px; margin-top: 1rem; color: #707070;">
                            ${message || 'Ensure Three.js library is loaded'}
                        </p>
                    </div>
                </div>
            `;
        }
    }
    
    // Initialize when DOM is ready
    function init() {
        const container = document.getElementById('vortex-3d');
        if (container) {
            // Wait a bit for Three.js to load
            if (typeof THREE !== 'undefined') {
                new VortexCore3D('vortex-3d');
            } else {
                setTimeout(init, 500);
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
