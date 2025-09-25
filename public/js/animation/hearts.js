function floatHearts(container) {
    const heartsContainer = document.createElement('div');
    heartsContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
    `;
    
    container.style.position = 'relative';
    container.appendChild(heartsContainer);
    
    // Create floating hearts
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.innerHTML = '💖';
            heart.style.cssText = `
                position: absolute;
                font-size: 1.5rem;
                left: ${Math.random() * 80 + 10}%;
                top: 100%;
                opacity: 0.8;
                animation: floatHeart 2s ease-out forwards;
            `;
            
            heartsContainer.appendChild(heart);
            
            setTimeout(() => heart.remove(), 2000);
        }, i * 300);
    }
    
    // Add CSS animation if not already added
    if (!document.getElementById('floatHeartStyle')) {
        const style = document.createElement('style');
        style.id = 'floatHeartStyle';
        style.textContent = `
            @keyframes floatHeart {
                0% {
                    transform: translateY(0) scale(0);
                    opacity: 0.8;
                }
                50% {
                    transform: translateY(-50px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100px) scale(0.5);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Export for use in other scripts
window.floatHearts = floatHearts;