// Authentication helper script to be included on all protected pages

// Check if user is logged in
function checkUserLogin() {
    const currentUser = localStorage.getItem('edufusion_current_user');
    if (!currentUser) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(currentUser);
}

// Get current logged in user
function getCurrentUser() {
    const user = localStorage.getItem('edufusion_current_user');
    return user ? JSON.parse(user) : null;
}

// Logout user
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('edufusion_current_user');
        localStorage.removeItem('edufusion_remember_me');
        window.location.href = 'login.html';
    }
}

// Update user header with current user info
function updateUserHeader() {
    const user = getCurrentUser();
    if (user) {
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        
        userNameElements.forEach(el => el.textContent = user.name);
        userEmailElements.forEach(el => el.textContent = user.email);
    }
}

// Add logout link handler
document.addEventListener('DOMContentLoaded', function() {
    const logoutLinks = document.querySelectorAll('a[onclick="logout()"]');
    logoutLinks.forEach(link => {
        link.href = '#';
        link.onclick = function(e) {
            e.preventDefault();
            logout();
        };
    });
});
