// Easing functions
const easing = {
    easeOutCubic: 'cubic-bezier(0.22, 1, 0.36, 1)',
    easeInOutCubic: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    easeInOutQuart: 'cubic-bezier(0.76, 0, 0.24, 1)'
};

// Animation utilities
function animate(element, properties, duration = 300, easingType = 'easeOutCubic') {
    return new Promise(resolve => {
        const startTime = performance.now();
        const startValues = {};
        
        // Get starting values
        Object.keys(properties).forEach(prop => {
            const computed = getComputedStyle(element);
            startValues[prop] = parseFloat(computed[prop]) || 0;
        });
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Apply eased progress
            const easedProgress = applyEasing(progress, easingType);
            
            Object.keys(properties).forEach(prop => {
                const start = startValues[prop];
                const end = properties[prop];
                const current = start + (end - start) * easedProgress;
                
                element.style[prop] = `${current}px`;
            });
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                resolve();
            }
        }
        
        requestAnimationFrame(update);
    });
}

function applyEasing(t, type) {
    switch (type) {
        case 'easeOutCubic':
            return 1 - Math.pow(1 - t, 3);
        case 'easeInOutCubic':
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        case 'easeOutBack':
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        default:
            return t;
    }
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export utilities
window.easing = easing;
window.animate = animate;
window.debounce = debounce;