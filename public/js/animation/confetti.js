function fireConfetti() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    document.body.appendChild(canvas);
    
    const particles = [];
    const colors = ['#FF6FA3', '#9B8CFF', '#FFE6F0', '#E7F5FF', '#FCD34D'];
    
    // Create particles
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 5 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 6 + 2,
            gravity: 0.1,
            life: 100
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life--;
            
            if (p.life <= 0 || p.y > canvas.height) {
                particles.splice(i, 1);
                continue;
            }
            
            ctx.globalAlpha = p.life / 100;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        } else {
            document.body.removeChild(canvas);
        }
    }
    
    animate();
}

// Export for use in other scripts
window.fireConfetti = fireConfetti;