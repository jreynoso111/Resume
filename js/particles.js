/* js/particles.js */
(function () {
    if (window.PARTICLES_INITIALIZED) return;

    let canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'particle-canvas';
        document.body.prepend(canvas);
    }
    const ctx = canvas.getContext('2d');

    let particlesArray;
    let animationId;

    // Responsive configuration
    let particleCount = window.innerWidth < 768 ? 40 : 100;

    // Theme-based colors
    let currentParticleColor = 'rgba(148, 163, 184, 0.18)';
    let lineBaseRgb = '148, 163, 184';
    let lineBaseAlpha = 0.1;

    function colorToRgb(color, fallback) {
        if (!color) return fallback;
        if (color.startsWith('#')) {
            const hex = color.replace('#', '').trim();
            if (hex.length === 3) {
                return [
                    parseInt(hex[0] + hex[0], 16),
                    parseInt(hex[1] + hex[1], 16),
                    parseInt(hex[2] + hex[2], 16)
                ];
            }
            if (hex.length >= 6) {
                return [
                    parseInt(hex.substring(0, 2), 16),
                    parseInt(hex.substring(2, 4), 16),
                    parseInt(hex.substring(4, 6), 16)
                ];
            }
        }
        const rgbMatch = color.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
        if (rgbMatch) {
            return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
        }
        return fallback;
    }

    function updateTheme() {
        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue('--accent').trim() || '#1f4f7b';
        const muted = styles.getPropertyValue('--text-muted').trim() || '#94a3b8';
        const bg = styles.getPropertyValue('--bg').trim();
        const isLight = bg === '#f5f5f5' || bg === '#ffffff' || bg.includes('245');

        const baseColor = isLight ? accent : muted;
        const [r, g, b] = colorToRgb(baseColor, [148, 163, 184]);

        if (isLight) {
            currentParticleColor = `rgba(${r}, ${g}, ${b}, 0.34)`;
            lineBaseAlpha = 0.18;
        } else {
            currentParticleColor = `rgba(${r}, ${g}, ${b}, 0.22)`;
            lineBaseAlpha = 0.1;
        }
        lineBaseRgb = `${r}, ${g}, ${b}`;

        if (particlesArray) {
            particlesArray.forEach(p => p.color = currentParticleColor);
        }
    }

    // Set initial canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let mouse = {
        x: null,
        y: null,
        radius: 120
    }

    window.addEventListener('mousemove', function (event) {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }

            // Move
            this.x += this.directionX;
            this.y += this.directionY;

            this.draw();
        }
    }

    function init() {
        particlesArray = [];
        particleCount = (canvas.width * canvas.height) / 14000;
        if (particleCount > 150) particleCount = 150;

        for (let i = 0; i < particleCount; i++) {
            let size = (Math.random() * 1.5) + 0.5;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);

            // Speed: from 0.4 range to 0.6 range for a more active background
            let directionX = (Math.random() * 0.6) - 0.3;
            let directionY = (Math.random() * 0.6) - 0.3;
            let color = currentParticleColor;

            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
        window.PARTICLES_INITIALIZED = true;
    }

    function connect() {
        // Even smaller distance threshold for "too close" (1/16 of width)
        const maxDistance = (canvas.width / 16) * (canvas.height / 16);

        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let dx = particlesArray[a].x - particlesArray[b].x;
                let dy = particlesArray[a].y - particlesArray[b].y;
                let distance = (dx * dx) + (dy * dy);

                if (distance < maxDistance) {
                    const normalized = 1 - (distance / maxDistance);
                    const easedOpacity = Math.pow(normalized, 2);
                    const lineOpacity = easedOpacity * lineBaseAlpha;
                    ctx.strokeStyle = `rgba(${lineBaseRgb}, ${lineOpacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, innerWidth, innerHeight);

        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    window.addEventListener('resize', function () {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        init();
    });

    window.addEventListener('theme-changed', updateTheme);

    updateTheme();
    init();
    animate();
})();

