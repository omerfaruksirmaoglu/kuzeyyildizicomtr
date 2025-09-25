// Check if already logged in
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.loggedIn) {
            window.location.href = '/app.html';
        }
        
        // Show content after auth check is complete
        document.body.classList.remove('preload-hidden');
        document.body.classList.add('preload-visible');
    } catch (error) {
        console.error('Failed to check login status:', error);
        // Show content even if auth check fails
        document.body.classList.remove('preload-hidden');
        document.body.classList.add('preload-visible');
    }
}

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('errorMessage');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/';
        } else {
            showError('Geçersiz kullanıcı adı veya şifre ❤️');
            shakeForm();
        }
    } catch (error) {
        showError('Giriş yapılırken bir hata oluştu');
        console.error('Login error:', error);
    }
});

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.classList.remove('hide');
}

function shakeForm() {
    const form = document.getElementById('loginForm');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 500);
}

// Initialize
checkLoginStatus();