document.addEventListener('DOMContentLoaded', function () {
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuopenIcon = document.getElementById('menuopen-icon');
    const menucloseIcon = document.getElementById('menuclose-icon');

    function toggleMobileMenu() {
        const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
        mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
        mobileMenu.classList.toggle('hidden');
        menuopenIcon.classList.toggle('hidden');
        menuopenIcon.classList.toggle('inline-flex');
        menucloseIcon.classList.toggle('hidden');
        menucloseIcon.classList.toggle('inline-flex');
    }

    mobileMenuButton.addEventListener('click', toggleMobileMenu);

    // Close mobile menu when a link is clicked
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                toggleMobileMenu();
            }
        });
    });

    // Set footer year
    const yearSpan = document.querySelector('#year');
        if (yearSpan) {
          yearSpan.textContent = new Date().getFullYear();
        }

    

    // Theme Switcher
    const themeSwitch = document.getElementById('theme-switch-checkbox');
    const html = document.documentElement;

    // check for saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        html.classList.add('dark');
        themeSwitch.checked = true;
    } else {
        html.classList.remove('dark');
        themeSwitch.checked = false;
    }

    themeSwitch.addEventListener('change', function () {
        if (this.checked) {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    });
});