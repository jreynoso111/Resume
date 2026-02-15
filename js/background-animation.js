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
        let pointerTouchActive = false;
        let activeTouchId = null;

        const BASE_ROTATION_SPEED_Y = 0.0012; // Doubled
        const BASE_ROTATION_SPEED_X = 0.0004; // Doubled
        const DRAG_FORCE = 0.0003; // Base drag force (mouse/pen)
        const TOUCH_DRAG_FORCE_MULT = 4.0; // Stronger response on mobile touch
        const DRAG_DAMPING = 0.97; // Closer to 1 for sustained momentum
        const MAX_POINTER_STEP = 80; // Ignore large jumps when pointer re-enters elsewhere
        const TOUCH_MAX_POINTER_STEP = 160;
        const INTERACTION_RADIUS_MULT_DESKTOP = 0.35;
        const INTERACTION_RADIUS_MULT_TOUCH = 0.60;

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

        function isInInteractionZone(clientX, clientY, pointerType) {
            const dx = clientX - windowHalfX;
            const dy = clientY - windowHalfY;
            const isTouch = pointerType === 'touch';
            const mult = isTouch ? INTERACTION_RADIUS_MULT_TOUCH : INTERACTION_RADIUS_MULT_DESKTOP;
            const interactionRadius = Math.min(window.innerWidth, window.innerHeight) * mult;

            return (dx * dx + dy * dy) <= interactionRadius * interactionRadius;
        }

        function applyDragDelta(deltaX, deltaY, pointerType) {
            const isTouch = pointerType === 'touch';
            const force = DRAG_FORCE * (isTouch ? TOUCH_DRAG_FORCE_MULT : 1);
            angularVelocity.y += deltaX * force;
            angularVelocity.x += deltaY * force;
        }

        document.addEventListener('pointermove', (event) => {
            const pointerType = event.pointerType || 'mouse';
            const isInsideZone = isInInteractionZone(event.clientX, event.clientY, pointerType);

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

            const maxStep = pointerType === 'touch' ? TOUCH_MAX_POINTER_STEP : MAX_POINTER_STEP;
            // Ignore abrupt pointer teleports (e.g. stylus lifted and re-introduced elsewhere)
            if (Math.abs(deltaX) > maxStep || Math.abs(deltaY) > maxStep) {
                lastPointerPosition = { x: event.clientX, y: event.clientY };
                return;
            }

            lastPointerPosition = { x: event.clientX, y: event.clientY };
            applyDragDelta(deltaX, deltaY, pointerType);
        });

        document.addEventListener('pointerdown', (event) => {
            const pointerType = event.pointerType || 'mouse';
            if (pointerType === 'touch') pointerTouchActive = true;
            lastPointerPosition = { x: event.clientX, y: event.clientY };
            isPointerInInteractionZone = isInInteractionZone(event.clientX, event.clientY, pointerType);
        });

        function resetPointerTracking() {
            isPointerInInteractionZone = false;
            pointerTouchActive = false;
            activeTouchId = null;
        }

        document.addEventListener('pointerup', resetPointerTracking);
        document.addEventListener('pointercancel', resetPointerTracking);
        document.addEventListener('pointerleave', resetPointerTracking);
        window.addEventListener('blur', resetPointerTracking);

        // Touch fallback (helps on mobile browsers where pointermove may be throttled/canceled during scroll).
        function getPrimaryTouch(touchList) {
            if (!touchList || touchList.length === 0) return null;
            if (activeTouchId == null) return touchList[0];
            for (let i = 0; i < touchList.length; i++) {
                if (touchList[i].identifier === activeTouchId) return touchList[i];
            }
            return touchList[0];
        }

        document.addEventListener('touchstart', (event) => {
            if (pointerTouchActive) return; // Avoid double-counting when pointer events are active.
            const t = getPrimaryTouch(event.touches);
            if (!t) return;
            activeTouchId = t.identifier;
            lastPointerPosition = { x: t.clientX, y: t.clientY };
            isPointerInInteractionZone = isInInteractionZone(t.clientX, t.clientY, 'touch');
        }, { passive: true });

        document.addEventListener('touchmove', (event) => {
            if (pointerTouchActive) return;
            const t = getPrimaryTouch(event.touches);
            if (!t) return;
            const isInsideZone = isInInteractionZone(t.clientX, t.clientY, 'touch');
            if (!isInsideZone) {
                isPointerInInteractionZone = false;
                lastPointerPosition = { x: t.clientX, y: t.clientY };
                return;
            }
            if (!isPointerInInteractionZone) {
                lastPointerPosition = { x: t.clientX, y: t.clientY };
                isPointerInInteractionZone = true;
                return;
            }

            const deltaX = t.clientX - lastPointerPosition.x;
            const deltaY = t.clientY - lastPointerPosition.y;
            if (Math.abs(deltaX) > TOUCH_MAX_POINTER_STEP || Math.abs(deltaY) > TOUCH_MAX_POINTER_STEP) {
                lastPointerPosition = { x: t.clientX, y: t.clientY };
                return;
            }
            lastPointerPosition = { x: t.clientX, y: t.clientY };
            applyDragDelta(deltaX, deltaY, 'touch');
        }, { passive: true });

        document.addEventListener('touchend', resetPointerTracking, { passive: true });
        document.addEventListener('touchcancel', resetPointerTracking, { passive: true });

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
