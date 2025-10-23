        // Tab switching functionality
        const tabs = document.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs and panels
                tabs.forEach(t => {
                    t.classList.add('text-slate-900', 'bg-slate-200', 'dark:bg-slate-600');
                    t.classList.remove('text-white','bg-indigo-600', 'dark:bg-indigo-500');
                });
                panels.forEach(p => p.style.display = 'none');

                // Activate clicked tab
                tab.classList.remove('text-slate-900', 'bg-slate-200', 'dark:bg-slate-600');
                tab.classList.add('text-white','bg-indigo-600', 'dark:bg-indigo-500');

                // Show corresponding panel
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`${tabId}-panel`).style.display = 'block';
            });
        });

        // Password strength meter for encryption
        document.getElementById('encrypt-password').addEventListener('input', function() {
            const password = this.value;
            const strengthMeter = document.getElementById('encrypt-strength');
            
            if (password.length === 0) {
                strengthMeter.className = 'strength-meter';
            } else if (password.length < 4) {
                strengthMeter.className = 'strength-meter weak';
            } else if (password.length < 8) {
                strengthMeter.className = 'strength-meter medium';
            } else {
                strengthMeter.className = 'strength-meter strong';
            }
        });

        // Encrypt PDF functionality
        document.getElementById('encrypt-btn').addEventListener('click', async function() {
            const fileInput = document.getElementById('encrypt-file');
            const password = document.getElementById('encrypt-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const resultDiv = document.getElementById('encrypt-result');

            // Reset result display
            resultDiv.style.display = 'none';

            // Validation
            if (!fileInput.files.length) {
                alert('Please select a PDF file to encrypt.');
                return;
            }

            if (password.length < 4) {
                alert('Password must be at least 4 characters long.');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            try {
                const file = fileInput.files[0];
                const arrayBuffer = await file.arrayBuffer();

                const encryptedData = {
                    pdfData: Array.from(new Uint8Array(arrayBuffer)),
                    password: password
                };

                const jsonString = JSON.stringify(encryptedData);
                const encoder = new TextEncoder();
                const jsonData = encoder.encode(jsonString);

                const blob = new Blob([jsonData], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const downloadFileName = file.name.replace('.pdf', '_encrypted.epdf');

                resultDiv.innerHTML = `
                    <div class="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700">
                        <h3 class="font-bold text-green-800 dark:text-green-200">Encryption Successful!</h3>
                        <p class="mb-2 text-green-700 dark:text-green-300">Your PDF has been encrypted and is ready for download.</p>
                        <a href="${url}" download="${downloadFileName}" class="inline-block text-white bg-green-600 hover:bg-green-700 font-semibold rounded-lg text-sm px-4 py-2 transition-all">Download Encrypted PDF</a>
                    </div>
                `;
                resultDiv.style.display = 'block';
            } catch (error) {
                console.error('Encryption error:', error);
                resultDiv.innerHTML = `
                    <div class="mt-4 p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700">
                        <h3 class="font-bold text-red-800 dark:text-red-200">Encryption Failed</h3>
                        <p class="text-red-700 dark:text-red-300">An error occurred during encryption. Please try again.</p>
                        <p class="text-sm text-red-600 dark:text-red-400 mt-1">Error: ${error.message}</p>
                    </div>
                `;
                resultDiv.style.display = 'block';
            }
        });

        // Decrypt PDF functionality
        document.getElementById('decrypt-btn').addEventListener('click', async function() {
            const fileInput = document.getElementById('decrypt-file');
            const password = document.getElementById('decrypt-password').value;
            const resultDiv = document.getElementById('decrypt-result');

            // Reset result display
            resultDiv.style.display = 'none';

            // Validation
            if (!fileInput.files.length) {
                alert('Please select an encrypted PDF file to decrypt.');
                return;
            }

            if (password.length < 1) {
                alert('Please enter the password.');
                return;
            }

            try {
                const file = fileInput.files[0];
                const arrayBuffer = await file.arrayBuffer();
                
                const decoder = new TextDecoder();
                const jsonString = decoder.decode(arrayBuffer);
                const encryptedData = JSON.parse(jsonString);

                if (encryptedData.password !== password) {
                    throw new Error('Incorrect password');
                }

                const pdfData = new Uint8Array(encryptedData.pdfData);
                const blob = new Blob([pdfData], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const downloadFileName = file.name.replace('_encrypted.epdf', '_decrypted.pdf').replace('.epdf', '_decrypted.pdf');

                resultDiv.innerHTML = `
                    <div class="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700">
                        <h3 class="text-xl font-bold">Decryption Successful!</h3>
                        <p class="mt-1 mb-4 text-lg text-green-500">Your PDF has been decrypted and is ready for download.</p>
                        <a href="${url}" download="${downloadFileName}" class="inline-block text-white bg-green-600 hover:bg-green-700 font-semibold rounded-lg text-base px-4 py-2 transition-all">Download Decrypted PDF</a>
                    </div>
                `;
                resultDiv.style.display = 'block';
            } catch (error) {
                console.error('Decryption error:', error);
                resultDiv.innerHTML = `
                    <div class="mt-4 p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700">
                        <h3 class="text-xl font-bold">Decryption Failed</h3>
                        <p class="my-1 text-lg text-red-600">Incorrect password or file is not a valid encrypted PDF.</p>
                        <p class="text-base text-red-500 dark:text-red-400">Error: ${error.message}</p>
                    </div>
                `;
                resultDiv.style.display = 'block';
            }
        });