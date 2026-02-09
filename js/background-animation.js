/**
 * Global Background Animation using Three.js
 * Creates a rotating sphere of connected nodes (particles) representing a data network.
 * Applies to the entire website background.
 */
(function () {
    function init() {
        let canvas = document.getElementById('bg-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'bg-canvas';
            document.body.prepend(canvas);
        }

        // Enhance canvas styles (forced)
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '0'; // Prioritize visibility over background
        canvas.style.pointerEvents = 'none';



        if (typeof THREE === 'undefined') {
            console.error('Three.js is not loaded.');
            return;
        }

        // State Variables
        let mouseX = 0;
        let mouseY = 0;
        let windowHalfX = window.innerWidth / 2;
        let windowHalfY = window.innerHeight / 2;
        let lastMouseMoveTime = Date.now();
        let isIdle = true;
        let currentSpeedY = 0.0003;
        let currentSpeedX = 0.0001;

        // Scene setup
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true, // Crucial for transparent background
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // --- OBJECTS ---
        const sphereGroup = new THREE.Group();
        scene.add(sphereGroup);

        // 1. Dots on Sphere
        const geometryDots = new THREE.IcosahedronGeometry(15, 2);
        const materialDots = new THREE.PointsMaterial({
            color: 0x1f4f7b, // Default, will update
            size: 0.15,
            transparent: true,
            opacity: 0.8
        });
        const points = new THREE.Points(geometryDots, materialDots);
        sphereGroup.add(points);

        // 2. Wireframe Connections
        // We can use a wireframe geometry derived from the icosahedron
        const materialWire = new THREE.LineBasicMaterial({
            color: 0x1f4f7b,
            transparent: true,
            opacity: 0.15
        });
        const wireframeGeometry = new THREE.WireframeGeometry(geometryDots);
        const lines = new THREE.LineSegments(wireframeGeometry, materialWire);
        sphereGroup.add(lines);

        // 3. Floating Particles (Background stars/dust)
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 300; // Number of background particles
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            // Random positions spread out
            posArray[i] = (Math.random() - 0.5) * 100;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const starsMaterial = new THREE.PointsMaterial({
            color: 0x1f4f7b, // Default, will update
            size: 0.1,
            transparent: true,
            opacity: 0.4
        });

        const starField = new THREE.Points(particlesGeometry, starsMaterial);
        scene.add(starField);


        // Base speeds
        const IDLE_ROTATION_SPEED_Y = 0.0003;
        const ACTIVE_ROTATION_SPEED_Y = 0.001;
        const IDLE_ROTATION_SPEED_X = 0.0001;
        const ACTIVE_ROTATION_SPEED_X = 0.0002;

        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX - windowHalfX) * 0.001;
            mouseY = (event.clientY - windowHalfY) * 0.001;
            lastMouseMoveTime = Date.now();
            isIdle = false;
        });

        // Scroll Interaction
        let targetScrollY = 0;
        document.addEventListener('scroll', () => {
            // Use scroll measure for rotation
            targetScrollY = window.scrollY * 0.0005;
            isIdle = false;
            lastMouseMoveTime = Date.now();
        });

        document.addEventListener('mouseleave', () => {
            isIdle = true; // Immediately idle when leaving window
        });

        // --- THEME HANDLING ---
        function updateColors() {
            // Read CSS variables
            const styles = getComputedStyle(document.documentElement);
            const accentHex = styles.getPropertyValue('--accent').trim();

            // We want the network to be the accent color mostly
            const accentColor = new THREE.Color(accentHex || '#1f4f7b');
            // We do NOT set scene.background to allow transparency (so CSS background shows)
            scene.background = null;

            materialDots.color = accentColor;
            materialWire.color = accentColor;
            starsMaterial.color = accentColor;
        }

        // Update on init
        updateColors();

        // Update on theme change event (from site-shell.js)
        window.addEventListener('theme-changed', () => {
            // Short delay to ensure CSS variable is applied to DOM
            setTimeout(updateColors, 50);
        });


        // --- ANIMATION LOOP ---
        // Smooth mouse target values
        let targetX = 0;
        let targetY = 0;

        function render() {
            requestAnimationFrame(render);

            const timeSinceMove = Date.now() - lastMouseMoveTime;
            // Idle detection mainly for the "speed up" effect
            if (timeSinceMove > 500) {
                isIdle = true;
            }

            // 1. Auto-Rotation Speed Control
            // When active (moving mouse), spin faster. When idle, spin slow.
            const targetSpeedY = isIdle ? IDLE_ROTATION_SPEED_Y : ACTIVE_ROTATION_SPEED_Y;
            const targetSpeedX = isIdle ? IDLE_ROTATION_SPEED_X : ACTIVE_ROTATION_SPEED_X;

            currentSpeedY += (targetSpeedY - currentSpeedY) * 0.05;
            currentSpeedX += (targetSpeedX - currentSpeedX) * 0.05;

            // Apply constant spin to the GROUP (the object itself)
            sphereGroup.rotation.y += currentSpeedY;
            sphereGroup.rotation.x += currentSpeedX;

            // Apply scroll rotation on Z axis for a "rolling" feeling or Y/X
            sphereGroup.rotation.x += (targetScrollY - sphereGroup.rotation.x) * 0.05;

            // Background stars counter-rotate
            starField.rotation.y -= currentSpeedY * 0.3;
            starField.rotation.x -= (targetScrollY - starField.rotation.x) * 0.02; // Subtle parallax on stars

            // 2. Mouse Interaction (Tilt/Look)
            // We want the whole scene to slightly tilt towards the mouse position always.
            // mouseX and mouseY are normative values (-1 to 1 approx) updated by event listener.

            targetX = mouseX * 0.5; // Sensitivity
            targetY = mouseY * 0.5;

            // Smoothly interpolate scene rotation towards target mouse position
            // Note: We rotate the SCENE or CAMERA group to tilt the view, while sphereGroup spins.
            scene.rotation.y += 0.05 * (targetX - scene.rotation.y);
            scene.rotation.x += 0.05 * (targetY - scene.rotation.x);

            renderer.render(scene, camera);
        }

        render();

        // Resize Handler
        window.addEventListener('resize', () => {
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
