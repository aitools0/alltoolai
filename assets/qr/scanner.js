        document.addEventListener('DOMContentLoaded', () => {
            
            // --- DOM Element References ---
            const uploadSection = document.getElementById('upload-section');
            const dropZone = document.getElementById('drop-zone');
            const fileUpload = document.getElementById('file-upload');
            const loadingOverlay = document.getElementById('loading-overlay');
            
            const outputSection = document.getElementById('output-section');
            const previewImage = document.getElementById('preview-image');
            const resultContainer = document.getElementById('result-container');
            const resultContent = document.getElementById('result-content');
            const errorStatus = document.getElementById('error-status');
            const successStatus = document.getElementById('success-status');
            const clearBtn = document.getElementById('clear-btn');

            // --- CONTROLLERS ---

            const UploadController = {
                init() {
                    fileUpload.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

                    dropZone.addEventListener('dragover', e => {
                        e.preventDefault();
                        dropZone.classList.add('border-indigo-600', 'dark:border-indigo-300');
                    });
                    ['dragleave', 'dragend', 'drop'].forEach(type => {
                        dropZone.addEventListener(type, (e) => {
                            e.preventDefault();
                            dropZone.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                        });
                    });
                    dropZone.addEventListener('drop', e => {
                        this.handleFileSelect(e.dataTransfer.files)
                    });
                },

                handleFileSelect(files) {
                    UIController.clearMessages();
                    
                    if (files.length === 0) return;
                    const file = files[0];
                    
                    if (!file.type.startsWith('image/')) {
                        UIController.showError('Error: The selected file is not a valid image.');
                        return;
                    }

                    UIController.showLoading();
                    ScannerController.process(file);
                }
            };

            const ScannerController = {
                process(file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const dataURI = e.target.result;
                        previewImage.src = dataURI;

                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            
                            try {
                                const code = jsQR(imageData.data, imageData.width, imageData.height);
                                if (code) {
                                    successStatus.classList.remove('hidden');
                                    UIController.displayResult(code.data);
                                } else {
                                    UIController.showError('No QR code detected. Please try a different image.');
                                }
                            } catch (err) {
                                console.error('Error scanning QR code:', err);
                                UIController.showError(`Error scanning QR code: ${err.message || 'Unknown error'}`);
                            } finally {
                                UIController.hideLoading();
                            }
                        };
                        img.onerror = () => {
                            // **FIX:** Removed reset call to prevent error message from disappearing.
                            UIController.showError("Error: Couldn't load the image. It might be corrupted or in an unsupported format.");
                            UIController.hideLoading();
                        }
                        img.src = dataURI;
                    };
                    reader.onerror = () => {
                        // **FIX:** Removed reset call to prevent error message from disappearing.
                        UIController.showError('Error: An error occurred while reading the file.');
                        UIController.hideLoading();
                    };
                    reader.readAsDataURL(file);
                }
            };
            
            const UIController = {
                init() {
                    clearBtn.addEventListener('click', this.reset.bind(this));
                },
                
                showLoading() {
                     loadingOverlay.classList.remove('hidden');
                },
                hideLoading() {
                     loadingOverlay.classList.add('hidden');
                },
                 showError(message) {
                     resultContainer.style.display = 'none'; // Hide result container on error
                     errorStatus.textContent = message;
                     errorStatus.classList.remove('hidden');
                     uploadSection.classList.add('hidden');
                     outputSection.classList.remove('hidden');
                 },
                 clearMessages() {
                      errorStatus.classList.add('hidden');
                      successStatus.classList.add('hidden');
                      errorStatus.textContent = '';
                 },
                displayResult(data) {
                    // **FIX:** Hide "Processing" message once result is ready.
                    successStatus.classList.add('hidden');

                    let displayText = data;
                
                    // **FIX:** Improved WiFi parsing to handle colons in values (e.g., passwords).
                    if (data.startsWith('WIFI:')) {
                        const parts = data.substring(5).split(';').filter(part => part.trim().length > 0 && part.includes(':'));
                        const wifiInfo = {};
                        
                        for (const part of parts) {
                            const [key, ...valueParts] = part.split(':');
                            const value = valueParts.join(':');
                            if (key && value) {
                                wifiInfo[key] = value;
                            }
                        }
                        
                        let wifiDetails = `Type: WiFi Network\n`;
                        if (wifiInfo.S) wifiDetails += `Network Name (SSID): ${wifiInfo.S}\n`;
                        if (wifiInfo.T) wifiDetails += `Security: ${wifiInfo.T}\n`;
                        if (wifiInfo.P) wifiDetails += `Password: ${wifiInfo.P}\n`;
                        if (wifiInfo.H === 'true') wifiDetails += `Hidden Network: Yes\n`;

                        displayText = wifiDetails.trim();
                    }
                    
                    resultContent.textContent = displayText;
                    resultContainer.style.display = 'block';
                    
                    uploadSection.classList.add('hidden');
                    outputSection.classList.remove('hidden');
                },
                reset() {
                    fileUpload.value = '';
                    previewImage.src = '#';
                    this.clearMessages();
                    
                    outputSection.classList.add('hidden');
                    uploadSection.classList.remove('hidden');
                }
            };

            // --- APPLICATION INITIALIZATION ---
            UploadController.init();
            UIController.init();
        });