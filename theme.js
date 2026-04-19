function applyStudentTheme(theme) {
    const body = document.body;
    body.classList.remove('theme-intergalactic', 'theme-plain', 'theme-pink', 'theme-dark');
    body.classList.add(`theme-${theme}`);
    localStorage.setItem('studentThemeMode', theme);

    document.querySelectorAll('.theme-switcher button').forEach(button => {
        button.classList.toggle('active', button.dataset.theme === theme);
    });
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('studentThemeMode') || 'intergalactic';
    applyStudentTheme(savedTheme);
}

if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
}
