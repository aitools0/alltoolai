document.addEventListener("DOMContentLoaded", function() {
    const footerHTML = `
    <footer class="bg-slate-100 p-8 dark:bg-slate-800">
    <div class="max-w-screen-xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <!-- Logo and Social Media Section -->
            <div class="space-y-4 text-slate-800 dark:text-slate-300">
                <a href="https://www.alltoolai.com/" class="flex items-center space-x-2">
                    <img src="/assets/icon/favicon.svg" alt="All Tool AI Logo" class="w-10 h-10">
                    <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">All Tool AI</span>
                </a>
                <p class="font-semibold">
                    Your trusted hub for free, web-based applications. We build simple, powerful, and secure applications for users worldwide.
                </p>
                <div class="flex items-center space-x-4 text-indigo-600 dark:text-slate-400">
                    <a href="https://www.facebook.com/" aria-label="Facebook">
                        <svg class="w-6 h-6 hover:text-purple-600 dark:hover:text-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                    </a>
                    <a href="https://x.com/" aria-label="Twitter X">
                         <svg class="w-6 h-6 hover:text-purple-600 dark:hover:text-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                         <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                         </svg>
                    </a>
                    <a href="https://www.instagram.com/" aria-label="Instagram">
                        <svg class="w-6 h-6 hover:text-purple-600 dark:hover:text-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                    </a>
                    <a href="https://www.linkedin.com/" aria-label="LinkedIn">
                         <svg class="w-6 h-6 hover:text-purple-600 dark:hover:text-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                         <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                         <rect x="2" y="9" width="4" height="12"></rect>
                         <circle cx="4" cy="4" r="2"></circle>
                         </svg>
                    </a>
                    <a href="https://github.com/" aria-label="GitHub">
                        <svg class="w-6 h-6 hover:text-purple-600 dark:hover:text-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                        </svg>
                    </a>
                </div>
            </div>

            <!-- Quick Links -->
            <div>
                <h2 class="text-indigo-600 dark:text-indigo-400 text-xl font-bold underline mb-4 underline-offset-8">Quick Links</h2>
                <ul class="mt-4 space-y-2 list-disc pl-5 text-slate-800 text-lg font-semibold dark:text-slate-300">
                    <li><a href="https://www.alltoolai.com/" class="color-home hover:text-purple-600 dark:hover:text-purple-400">Home</a></li>
                    <li><a href="/about" class="color-about hover:text-purple-600 dark:hover:text-purple-400">About Us</a></li>
                    <li><a href="/contact" class="color-contact hover:text-purple-600 dark:hover:text-purple-400">Contact</a></li>
                    <li><a href="/privacy-policy" class="color-policy hover:text-purple-600 dark:hover:text-purple-400">Privacy Policy</a></li>
                </ul>
            </div>

            <!-- Main Tools -->
            <div>
                <h2 id="main-tools" class="text-indigo-600 dark:text-indigo-400 text-xl font-bold underline mb-4 underline-offset-8 scroll-mt-16">Main Tools</h2>
                <ul class="mt-4 space-y-2 list-disc pl-5 text-slate-800 text-lg font-semibold dark:text-slate-300">
                    <li><a href="https://www.alltoolai.com/image-tools" class="hover:text-purple-600 dark:hover:text-purple-400">Image Tools</a></li>
                    <li><a href="https://www.alltoolai.com/pdf-tools" class="hover:text-purple-600 dark:hover:text-purple-400">PDF Tools</a></li>
                    <li><a href="https://www.alltoolai.com/text-tools" class="hover:text-purple-600 dark:hover:text-purple-400">Text Tools</a></li>
                    <li><a href="https://www.alltoolai.com/calculator-tools" class="hover:text-purple-600 dark:hover:text-purple-400">Calculator Tools</a></li>
                    <li><a href="https://www.alltoolai.com/unit-converter-tools" class="hover:text-purple-600 dark:hover:text-purple-400">Unit Converter Tools</a></li>
                    <li><a href="https://www.alltoolai.com/qr-generator-tools" class="hover:text-purple-600 dark:hover:text-purple-400">QR Generator Tools</a></li>
                    <li><a href="https://www.alltoolai.com/audio-tools" class="hover:text-purple-600 dark:hover:text-purple-400">Audio Tools</a></li>
                </ul>
            </div>
        </div>

        <!-- Footer Bottom -->
        <div class="mt-8 pt-8 border-t border-slate-400 dark:border-slate-600 text-center font-semibold text-slate-800 dark:text-slate-400">
            <p>© <span id="year"></span> All Tool AI. Proudly serving our users worldwide.</p>
        </div>
    </div>
</footer>
    `;
    const placeholder = document.getElementById("footer-placeholder");
    if (placeholder) {
        placeholder.innerHTML = footerHTML;
    }

});
