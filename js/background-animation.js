/**
 * Global Background Animation using Three.js
 * Creates a "satellite network" effect around a central globe.
 * Optimized to prevent multiple initializations and improve performance.
 */
(function () {
    if (window.BG_ANIMATION_INITIALIZED) return;

    function createRadialGlowTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;

        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        let i = 0;
        for (let y = 0; y < size; y++) {
            const ny = (y + 0.5 - center) / center;
            for (let x = 0; x < size; x++) {
                const nx = (x + 0.5 - center) / center;
                const d = Math.sqrt((nx * nx) + (ny * ny));
                let alpha = 0;
                if (d < 1) {
                    const core = Math.exp(-(d * d) * 4.8);
                    const tail = Math.exp(-(d * d) * 1.6);
                    const cutoff = Math.pow(Math.max(0, 1 - d), 1.2);
                    alpha = ((core * 0.65) + (tail * 0.35)) * cutoff;
                }
                const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
                data[i++] = 255;
                data[i++] = 255;
                data[i++] = 255;
                data[i++] = a;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        return texture;
    }

    function createHumanSilhouetteTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const cx = size / 2;
        const topY = 42;
        const leftX = 56;
        const rightX = size - leftX;
        const baseY = size - 36;

        // Solid central triangle.
        ctx.beginPath();
        ctx.moveTo(cx, topY);
        ctx.lineTo(rightX, baseY);
        ctx.lineTo(leftX, baseY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();

        // Subtle soft edge so it blends with the glow.
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

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
        const clock = new THREE.Clock();
        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();

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
            color: 0x94a3b8,
            size: 0.15, // Smaller points for satellites
            transparent: true,
            opacity: 0.3
        });
        const points = new THREE.Points(geometryDots, materialDots);
        sphereGroup.add(points);

        // 2. Wireframe Connections (The "Network")
        const materialWire = new THREE.LineBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.08 // Very subtle lines
        });
        const wireframeGeometry = new THREE.WireframeGeometry(geometryDots);
        const lines = new THREE.LineSegments(wireframeGeometry, materialWire);
        sphereGroup.add(lines);

        // 3. Core emitter: floating triangle with surrounding particles.
        const coreGroup = new THREE.Group();
        sphereGroup.add(coreGroup);

        const glowTexture = createRadialGlowTexture();
        const silhouetteTexture = createHumanSilhouetteTexture();

        // Volumetric-looking mist emitted from the core (no hard circular edge).
        const mistCount = 460;
        const mistPositions = new Float32Array(mistCount * 3);
        for (let i = 0; i < mistCount; i++) {
            // Gaussian spread around center to mimic light falloff from a point source.
            const u1 = Math.max(1e-6, Math.random());
            const u2 = Math.random();
            const u3 = Math.max(1e-6, Math.random());
            const u4 = Math.random();
            const r1 = Math.sqrt(-2 * Math.log(u1));
            const r2 = Math.sqrt(-2 * Math.log(u3));
            const a1 = 2 * Math.PI * u2;
            const a2 = 2 * Math.PI * u4;

            mistPositions[(i * 3) + 0] = Math.cos(a1) * r1 * 4.7;
            mistPositions[(i * 3) + 1] = Math.sin(a1) * r1 * 4.7;
            mistPositions[(i * 3) + 2] = Math.cos(a2) * r2 * 1.8;
        }
        const mistGeometry = new THREE.BufferGeometry();
        mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
        const mistMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.72,
            transparent: true,
            opacity: 0.09,
            map: glowTexture,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        const coreMist = new THREE.Points(mistGeometry, mistMaterial);
        coreGroup.add(coreMist);

        const silhouetteMaterial = new THREE.SpriteMaterial({
            map: silhouetteTexture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            depthTest: false
        });
        const silhouette = new THREE.Sprite(silhouetteMaterial);
        silhouette.scale.set(3.2, 3.2, 1);
        coreGroup.add(silhouette);

        let mistBaseOpacity = 0.09;
        let silhouetteBaseOpacity = 0.72;
        let asteroidColor = new THREE.Color('#cbd5e1');

        // 4. Click-to-spawn asteroids.
        const asteroids = [];
        const ASTEROID_MAX = 24;
        const asteroidGeometry = new THREE.IcosahedronGeometry(0.38, 0);

        function isInteractiveTarget(target) {
            if (!(target instanceof Element)) return false;
            return Boolean(
                target.closest(
                    'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable="true"], #theme-toggle, #theme-toggle-label'
                )
            );
        }

        function pointOnPlaneFromScreen(clientX, clientY, planeZ) {
            pointerNdc.x = (clientX / window.innerWidth) * 2 - 1;
            pointerNdc.y = -((clientY / window.innerHeight) * 2 - 1);
            raycaster.setFromCamera(pointerNdc, camera);
            const origin = raycaster.ray.origin;
            const direction = raycaster.ray.direction;
            if (Math.abs(direction.z) < 1e-5) {
                return origin.clone().add(direction.clone().multiplyScalar(20));
            }
            const t = (planeZ - origin.z) / direction.z;
            if (!isFinite(t) || t <= 0) {
                return origin.clone().add(direction.clone().multiplyScalar(20));
            }
            return origin.clone().add(direction.clone().multiplyScalar(t));
        }

        function removeAsteroid(index) {
            const asteroid = asteroids[index];
            if (!asteroid) return;
            scene.remove(asteroid.mesh);
            if (asteroid.material) asteroid.material.dispose();
            asteroids.splice(index, 1);
        }

        function spawnAsteroid(clientX, clientY) {
            const spawn = pointOnPlaneFromScreen(clientX, clientY, (Math.random() * 14) - 7);

            const direction = new THREE.Vector3(
                (Math.random() * 2) - 1,
                (Math.random() * 2) - 1,
                (Math.random() * 2) - 1
            ).normalize();
            if (Math.abs(direction.z) < 0.2) direction.z = direction.z >= 0 ? 0.2 : -0.2;
            direction.normalize();

            const speed = 4 + (Math.random() * 5);
            const size = 0.18 + (Math.random() * 0.22);
            const life = 2.6 + (Math.random() * 1.8);
            const opacity = 0.82 + (Math.random() * 0.14);

            const material = new THREE.MeshBasicMaterial({
                color: asteroidColor.clone(),
                transparent: true,
                opacity: opacity
            });
            const mesh = new THREE.Mesh(asteroidGeometry, material);
            mesh.position.copy(spawn);
            mesh.scale.set(size, size, size);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            scene.add(mesh);

            asteroids.push({
                mesh: mesh,
                material: material,
                velocity: direction.multiplyScalar(speed),
                spin: new THREE.Vector3(
                    (Math.random() * 2 - 1) * 2.2,
                    (Math.random() * 2 - 1) * 2.2,
                    (Math.random() * 2 - 1) * 2.2
                ),
                age: 0,
                life: life,
                baseOpacity: opacity
            });

            if (asteroids.length > ASTEROID_MAX) {
                removeAsteroid(0);
            }
        }

        function updateAsteroids(deltaSec) {
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const a = asteroids[i];
                a.age += deltaSec;
                a.mesh.position.addScaledVector(a.velocity, deltaSec);
                a.mesh.rotation.x += a.spin.x * deltaSec;
                a.mesh.rotation.y += a.spin.y * deltaSec;
                a.mesh.rotation.z += a.spin.z * deltaSec;

                const lifeRatio = a.age / a.life;
                const fade = lifeRatio < 0.65 ? 1 : Math.max(0, 1 - ((lifeRatio - 0.65) / 0.35));
                a.material.opacity = a.baseOpacity * fade;

                if (a.age >= a.life) {
                    removeAsteroid(i);
                }
            }
        }

        document.addEventListener('click', (event) => {
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (isInteractiveTarget(event.target)) return;
            spawnAsteroid(event.clientX, event.clientY);
        });

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
            const mutedHex = styles.getPropertyValue('--text-muted').trim();
            const textMainHex = styles.getPropertyValue('--text-main').trim();
            const bgHex = styles.getPropertyValue('--bg').trim();
            const isLightMode = bgHex === '#f5f5f5' || bgHex === '#ffffff' || bgHex.includes('245');

            const baseColor = isLightMode ? (accentHex || '#1f4f7b') : (mutedHex || accentHex || '#94a3b8');
            const accentColor = new THREE.Color(baseColor);
            const glowColor = isLightMode
                ? accentColor.clone()
                : new THREE.Color(textMainHex || '#ffffff');
            const mistColor = isLightMode
                ? new THREE.Color(accentHex || '#1f4f7b')
                : glowColor;
            const silhouetteColor = new THREE.Color('#ffffff');
            asteroidColor = isLightMode
                ? new THREE.Color(accentHex || '#1f4f7b')
                : new THREE.Color(mutedHex || '#cbd5e1');

            materialDots.color = accentColor;
            materialWire.color = accentColor;
            mistMaterial.color.copy(mistColor);
            mistMaterial.blending = isLightMode ? THREE.NormalBlending : THREE.AdditiveBlending;
            mistMaterial.needsUpdate = true;
            silhouetteMaterial.color.copy(silhouetteColor);
            asteroids.forEach((a) => {
                a.material.color.copy(asteroidColor);
            });

            if (isLightMode) {
                materialDots.opacity = 0.45;
                materialWire.opacity = 0.1;
                mistBaseOpacity = 0.075;
                silhouetteBaseOpacity = 0.58;
            } else {
                materialDots.opacity = 0.26;
                materialWire.opacity = 0.06;
                mistBaseOpacity = 0.09;
                silhouetteBaseOpacity = 0.72;
            }
        }

        updateColors();
        window.addEventListener('theme-changed', () => {
            setTimeout(updateColors, 50);
        });

        // --- ANIMATION LOOP ---
        function render() {
            requestAnimationFrame(render);
            const t = performance.now() * 0.001;
            const deltaSec = Math.min(clock.getDelta(), 0.05);

            angularVelocity.x *= DRAG_DAMPING;
            angularVelocity.y *= DRAG_DAMPING;

            sphereGroup.rotation.y += BASE_ROTATION_SPEED_Y + angularVelocity.y;
            sphereGroup.rotation.x += BASE_ROTATION_SPEED_X + angularVelocity.x;

            // Removed scroll-locked rotation to allow complete rotation
            // sphereGroup.rotation.x += (targetScrollY - sphereGroup.rotation.x) * 0.05;

            const floatY = Math.sin(t * 1.25) * 0.42;
            silhouette.position.y = floatY;
            silhouette.material.rotation = Math.sin(t * 0.6) * 0.03;
            mistMaterial.opacity = mistBaseOpacity * (0.95 + (Math.sin(t * 0.85 + 0.7) * 0.08));
            coreMist.rotation.z += 0.0009;
            coreMist.rotation.y += 0.0005;
            silhouetteMaterial.opacity = silhouetteBaseOpacity * (0.94 + (Math.sin(t * 1.35 + 1.0) * 0.06));
            updateAsteroids(deltaSec);

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
