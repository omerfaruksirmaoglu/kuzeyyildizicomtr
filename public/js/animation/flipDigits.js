function mountFlipCounter(element, updateFn) {
    if (!element) return;
    
    let animationId;
    
    function animate() {
        if (typeof updateFn === 'function') {
            updateFn();
        }
        animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    // Return cleanup function
    return () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    };
}

// Simple flip digit animation
function animateDigitChange(element, newValue) {
    if (!element) return;
    
    const currentValue = element.textContent;
    if (currentValue === newValue) return;
    
    // Simple fade transition for now
    element.style.transition = 'opacity 0.2s ease';
    element.style.opacity = '0.5';
    
    setTimeout(() => {
        element.textContent = newValue;
        element.style.opacity = '1';
    }, 100);
}

// Export for use in other scripts
window.mountFlipCounter = mountFlipCounter;
window.animateDigitChange = animateDigitChange;