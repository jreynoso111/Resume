/**
 * Global Background Animation using Three.js
 * Creates a "satellite network" effect around a central globe.
 * Optimized to prevent multiple initializations and improve performance.
 */
(function () {
    if (window.BG_ANIMATION_INITIALIZED) return;

    function init() {
        if (window.BG_ANIMATION_INITIALIZED) return;

        let canvas = document.getElementById('bg-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'bg-canvas';
            document.body.prepend(canvas);
        }

        // Enhance canvas styles
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '0';
        canvas.style.pointerEvents = 'none';

        if (typeof THREE === 'undefined') {
            return;
        }

        window.BG_ANIMATION_INITIALIZED = true;

        // State Variables
        let windowHalfX = window.innerWidth / 2;
        let windowHalfY = window.innerHeight / 2;
        let lastPointerPosition = { x: windowHalfX, y: windowHalfY };
        let isPointerInInteractionZone = false;
        let angularVelocity = { x: 0, y: 0 };

        const BASE_ROTATION_SPEED_Y = 0.0012; // Doubled
        const BASE_ROTATION_SPEED_X = 0.0004; // Doubled
        const DRAG_FORCE = 0.0003; // Tripled for "accelerator" feel
        const DRAG_DAMPING = 0.97; // Closer to 1 for sustained momentum

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 45;

        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // --- OBJECTS ---
        const sphereGroup = new THREE.Group();
        scene.add(sphereGroup);

        // 1. Satellite Network Geometry
        const geometryDots = new THREE.IcosahedronGeometry(20, 1);

        // Subtle randomization
        const posAttribute = geometryDots.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);
            const z = posAttribute.getZ(i);
            const noise = 0.3;
            posAttribute.setXYZ(i, x + (Math.random() - 0.5) * noise, y + (Math.random() - 0.5) * noise, z + (Math.random() - 0.5) * noise);
        }

        const materialDots = new THREE.PointsMaterial({
            color: 0x1f4f7b,
            size: 0.15, // Smaller points for satellites
            transparent: true,
            opacity: 0.6
        });
        const points = new THREE.Points(geometryDots, materialDots);
        sphereGroup.add(points);

        // 2. Wireframe Connections (The "Network")
        const materialWire = new THREE.LineBasicMaterial({
            color: 0x1f4f7b,
            transparent: true,
            opacity: 0.06 // Very subtle lines
        });
        const wireframeGeometry = new THREE.WireframeGeometry(geometryDots);
        const lines = new THREE.LineSegments(wireframeGeometry, materialWire);
        sphereGroup.add(lines);

        function isInInteractionZone(clientX, clientY) {
            const dx = clientX - windowHalfX;
            const dy = clientY - windowHalfY;
            const interactionRadius = Math.min(window.innerWidth, window.innerHeight) * 0.35;

            return (dx * dx + dy * dy) <= interactionRadius * interactionRadius;
        }

        document.addEventListener('pointermove', (event) => {
            const isInsideZone = isInInteractionZone(event.clientX, event.clientY);

            if (!isInsideZone) {
                isPointerInInteractionZone = false;
                return;
            }

            if (!isPointerInInteractionZone) {
                lastPointerPosition = { x: event.clientX, y: event.clientY };
                isPointerInInteractionZone = true;
                return;
            }

            const deltaX = event.clientX - lastPointerPosition.x;
            const deltaY = event.clientY - lastPointerPosition.y;
            lastPointerPosition = { x: event.clientX, y: event.clientY };

            angularVelocity.y += deltaX * DRAG_FORCE;
            angularVelocity.x += deltaY * DRAG_FORCE;
        });

        document.addEventListener('pointerdown', (event) => {
            lastPointerPosition = { x: event.clientX, y: event.clientY };
            isPointerInInteractionZone = isInInteractionZone(event.clientX, event.clientY);
        });

        let targetScrollY = 0;
        document.addEventListener('scroll', () => {
            targetScrollY = window.scrollY * 0.0005;
        });

        // --- THEME HANDLING ---
        function updateColors() {
            const styles = getComputedStyle(document.documentElement);
            const accentHex = styles.getPropertyValue('--accent').trim();
            const bgHex = styles.getPropertyValue('--bg').trim();
            const isLightMode = bgHex === '#f5f5f5' || bgHex === '#ffffff' || bgHex.includes('245');

            const accentColor = new THREE.Color(accentHex || '#1f4f7b');

            materialDots.color = accentColor;
            materialWire.color = accentColor;

            if (isLightMode) {
                // Increased opacity from 0.3 to 0.7 for dots and 0.04 to 0.15 for wire in Light Mode
                materialDots.opacity = 0.7;
                materialWire.opacity = 0.15;
            } else {
                materialDots.opacity = 0.6;
                materialWire.opacity = 0.12;
            }
        }

        updateColors();
        window.addEventListener('theme-changed', () => {
            setTimeout(updateColors, 50);
        });

        // --- ANIMATION LOOP ---
        function render() {
            requestAnimationFrame(render);

            angularVelocity.x *= DRAG_DAMPING;
            angularVelocity.y *= DRAG_DAMPING;

            sphereGroup.rotation.y += BASE_ROTATION_SPEED_Y + angularVelocity.y;
            sphereGroup.rotation.x += BASE_ROTATION_SPEED_X + angularVelocity.x;

            // Removed scroll-locked rotation to allow complete rotation
            // sphereGroup.rotation.x += (targetScrollY - sphereGroup.rotation.x) * 0.05;

            renderer.render(scene, camera);
        }

        render();

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

