class Globe {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('globe-canvas'),
            antialias: false 
        });
        
        // Initialize globe
        this.initGlobe();
        
        // Add halo effect
        this.addHalo();
        
        // Setup lights
        this.setupLights();
        
        // Start animation
        this.animate();
    }
    
    initGlobe() {
        const GLOBE_RADIUS = 5;
        const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x2b3595,
            transparent: true,
            opacity: 0.8
        });
        
        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);
        
        // Position camera
        this.camera.position.z = 15;
    }
    
    addHalo() {
        const haloGeometry = new THREE.SphereGeometry(5.2, 32, 32);
        const haloMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        this.scene.add(halo);
    }
    
    setupLights() {
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 3, 5);
        this.scene.add(light);
        
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.globe.rotation.y += 0.001;
        this.renderer.render(this.scene, this.camera);
    }
}