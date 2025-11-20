document.addEventListener("DOMContentLoaded", function() {
    const headerHTML = `
    <header class="fixed top-0 z-50 w-full bg-white backdrop-blur-sm transition-colors duration-300 border-b border-indigo-300 dark:border-slate-700 dark:bg-slate-800">
        <div class="px-4 sm:px-6 mx-auto">
            <div class="flex items-center justify-between h-16">
                <div class="flex-shrink-0">
                    <a href="https://www.alltoolai.com/" class="flex items-center space-x-3 transition-opacity hover:opacity-85" aria-label="Homepage">
                        <img src="/assets/icon/favicon.svg" alt="All Tool AI Logo" class="w-10 h-10 lg:w-12 lg:h-12">
                        <div class="logo-text-block">
                            <div class="logo-main-line"><span class="logo-text alltool">All Tool&ensp;</span><span class="logo-text ai">Ai</span></div>
                            <div class="logo-sub-line"><span class="com-color">.Com</span></div>
                        </div>
                    </a>
                </div>
                <nav class="hidden md:flex items-center space-x-8 text-lg font-semibold text-slate-800 dark:text-slate-200">
                    <a href="https://www.alltoolai.com/" class="nav-link-animated hover:text-purple-600 dark:hover:text-purple-400">Home</a>
                    <a href="#main-tools" class="nav-link-animated hover:text-purple-600 dark:hover:text-purple-400">Tools List</a>
                    <a href="/about" class="nav-link-animated hover:text-purple-600 dark:hover:text-purple-400">About</a>
                    <a href="/contact" class="nav-link-animated hover:text-purple-600 dark:hover:text-purple-400">Contact</a>
                    <a href="https://play.google.com/store/" aria-label="Get our app on Google Play" title="Google Play" class="transition-transform hover:scale-110 focus:scale-110 flex items-center">
                        <span class="sr-only">Google Play</span>
                        <img src="/assets/svg/play.svg" alt="Google Play Icon" class="w-8 h-8">
                    </a>
                </nav>

                <div class="flex items-center">
                    <label class="theme-switch" for="theme-switch-checkbox">
                        <input type="checkbox" id="theme-switch-checkbox" />
                        <div class="slider round"></div>
                    </label>

                    <div class="md:hidden">
                        <button id="mobile-menu-button" type="button" class="bg-slate-200 border-2 border-indigo-600 p-1 ml-4 text-slate-500 hover:text-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-300" aria-controls="mobile-menu" aria-expanded="false">
                            <span class="sr-only">Open main menu</span>
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path id="menuopen-icon" class="inline-flex" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                                <path id="menuclose-icon" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile menu, show/hide based on menu state. -->
        <div id="mobile-menu" class="lg:hidden hidden">
            <div class="p-2 text-base font-medium text-slate-700 dark:text-slate-300">
                <a href="https://www.alltoolai.com/" class="block p-2 mt-1 hover:bg-slate-100 dark:hover:bg-slate-700">Home</a>
                <a href="#main-tools" class="block p-2 mt-1 hover:bg-slate-100 dark:hover:bg-slate-700">Tools List</a>
                <a href="/about" class="block p-2 mt-1 hover:bg-slate-100 dark:hover:bg-slate-700">About</a>
                <a href="/contact" class="block p-2 mt-1 hover:bg-slate-100 dark:hover:bg-slate-700">Contact</a>
                <a href="https://play.google.com/store/" aria-label="Get our app on Google Play" title="Google Play" class="flex items-center p-2 mt-1 hover:bg-slate-100 dark:hover:bg-slate-700">
                <span class="sr-only">Google Play</span>
                <img src="/assets/svg/play.svg" alt="Google Play Icon" class="w-6 h-6"><span class="ml-2">Google Play</span></a>
            </div>
        </div>
    </header>
    `;
    const placeholder = document.getElementById("header-placeholder");
    if (placeholder) {
        placeholder.innerHTML = headerHTML;
    }
});



