document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const ssidInput = document.getElementById('ssid');
    const authInput = document.getElementById('auth');
    const passwordInput = document.getElementById('password');
    const hiddenInput = document.getElementById('hidden');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadPngBtn = document.getElementById('download-png-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const qrCodePreview = document.getElementById('qr-code-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const errorMessage = document.getElementById('error-message');
    const fgColorInput = document.getElementById('fg-color');
    const bgColorInput = document.getElementById('bg-color');
    const logoUpload = document.getElementById('logo-upload');
    const logoSizeSlider = document.getElementById('logo-size');

    // State Variables
    let qrCodeGenerated = false;
    let logoImage = null;
    let debounceTimeout = null;

    // --- Core Functions ---

    /**
     * Displays an error message for 3 seconds.
     * @param {string} message The error message to display.
     */
    const showError = (message) => {
        errorMessage.textContent = message;
        setTimeout(clearError, 3000);
    };

    /**
     * Clears the error message.
     */
    const clearError = () => {
        if (errorMessage.textContent) {
            errorMessage.textContent = '';
        }
    };
    
    /**
     * Clears the QR code preview area and disables download buttons.
     */
    const clearPreview = () => {
        qrCodePreview.innerHTML = '';
        previewPlaceholder.style.display = 'block';
        downloadPngBtn.disabled = true;
        downloadPdfBtn.disabled = true;
        qrCodeGenerated = false;
    };

    /**
     * Resets the entire tool to its default state.
     */
    const resetTool = () => {
        ssidInput.value = '';
        authInput.value = 'WPA';
        passwordInput.value = '';
        passwordInput.disabled = false;
        hiddenInput.checked = false;
        fgColorInput.value = '#000000';
        bgColorInput.value = '#ffffff';
        logoUpload.value = '';
        logoSizeSlider.value = '20';
        logoImage = null;
        clearError();
        clearPreview();
    };

    /**
     * Builds the Wi-Fi payload string.
     * @returns {string|null} The Wi-Fi payload or null if invalid.
     */
    const buildWifiPayload = () => {
        const ssid = ssidInput.value.trim();
        const auth = authInput.value;
        const password = passwordInput.value;
        const hidden = hiddenInput.checked;

        if (!ssid) {
            showError('Network Name (SSID) is required.');
            return null;
        }

        if (auth && !password) {
            showError('Password is required for WPA/WEP networks.');
            return null;
        }

        // Escape special characters
        const escape = (str) => str.replace(/([\\;,":])/g, '\\$1');

        let payload = `WIFI:T:${auth};S:${escape(ssid)};`;
        if (auth) {
            payload += `P:${escape(password)};`;
        }
        if (hidden) {
            payload += 'H:true;';
        }
        payload += ';';
        
        return payload;
    };

    /**
     * Generates and displays a QR code preview.
     */
    const generateQRCode = () => {
        clearError();
        const payload = buildWifiPayload();

        if (!payload) {
            return;
        }

        qrCodePreview.innerHTML = '';
        const previewSize = 256;

        const tempContainer = document.createElement('div');
        try {
            new QRCode(tempContainer, {
                text: payload,
                width: previewSize,
                height: previewSize,
                colorDark: fgColorInput.value,
                colorLight: bgColorInput.value,
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (e) {
             showError('Error generating QR Code.');
             console.error(e);
             clearPreview();
             return;
        }

        setTimeout(() => {
            const qrElement = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');

            if (!qrElement) {
                showError('Could not generate QR code element.');
                return;
            }

            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = previewSize;
            previewCanvas.height = previewSize;
            const ctx = previewCanvas.getContext('2d');
            
            ctx.drawImage(qrElement, 0, 0, previewSize, previewSize);

            if (logoImage) {
                const logoSize = previewCanvas.width * (logoSizeSlider.value / 100);
                const x = (previewCanvas.width - logoSize) / 2;
                const y = (previewCanvas.height - logoSize) / 2;
                
                const bgPadding = 4;
                ctx.fillStyle = bgColorInput.value;
                ctx.fillRect(x - bgPadding, y - bgPadding, logoSize + bgPadding * 2, logoSize + bgPadding * 2);
                ctx.drawImage(logoImage, x, y, logoSize, logoSize);
            }

            qrCodePreview.appendChild(previewCanvas);
            previewPlaceholder.style.display = 'none';
            downloadPngBtn.disabled = false;
            downloadPdfBtn.disabled = false;
            qrCodeGenerated = true;
        }, 50);
    };
    
    /**
     * Generates a high-resolution QR code and initiates a download.
     * @param {'png' | 'pdf'} format The desired download format.
     */
    const downloadAdvanced = (format) => {
        if (!qrCodeGenerated) {
            showError('Please generate a QR code first.');
            return;
        }

        if (format === 'pdf' && typeof window.jspdf === 'undefined') {
            downloadPdfBtn.textContent = 'Loading PDF Library...';
            downloadPdfBtn.disabled = true;
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                downloadPdfBtn.textContent = 'Download PDF';
                downloadPdfBtn.disabled = false;
                initiateDownload(format);
            };
            script.onerror = () => {
                showError('Failed to load PDF library.');
                downloadPdfBtn.textContent = 'Download PDF';
                downloadPdfBtn.disabled = false;
            };
            document.head.appendChild(script);
        } else {
            initiateDownload(format);
        }
    };

    /**
     * The core logic for creating the high-resolution file for download.
     * @param {'png' | 'pdf'} format 
     */
    const initiateDownload = (format) => {
        const payload = buildWifiPayload();
        if (!payload) return;

        const fgColor = fgColorInput.value;
        const bgColor = bgColorInput.value;
        const logoSizePercent = parseInt(logoSizeSlider.value);
        const highRes = 1200;
        const margin = 100;
        const canvasSize = highRes + margin * 2;
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        try {
            new QRCode(tempContainer, { text: payload, width: highRes, height: highRes, colorDark: fgColor, colorLight: bgColor, correctLevel: QRCode.CorrectLevel.H });

            setTimeout(() => {
                const highResCanvas = tempContainer.querySelector('canvas');
                if (!highResCanvas) {
                    showError('Failed to generate high-resolution QR code.');
                    document.body.removeChild(tempContainer);
                    return;
                }

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = canvasSize;
                finalCanvas.height = canvasSize;
                const ctx = finalCanvas.getContext('2d');

                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvasSize, canvasSize);
                ctx.drawImage(highResCanvas, margin, margin, highRes, highRes);

                if (logoImage) {
                    const logoWidth = highRes * (logoSizePercent / 100);
                    const x = (canvasSize - logoWidth) / 2;
                    const y = (canvasSize - logoWidth) / 2;
                    
                    const bgPadding = 10;
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(x - bgPadding, y - bgPadding, logoWidth + bgPadding * 2, logoWidth + bgPadding * 2);
                    ctx.drawImage(logoImage, x, y, logoWidth, logoWidth);
                }

                if (format === 'png') {
                    const link = document.createElement('a');
                    link.href = finalCanvas.toDataURL('image/png', 1.0);
                    link.download = 'wifi-qr-code.png';
                    link.click();
                } else if (format === 'pdf') {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvasSize, canvasSize] });
                    doc.addImage(finalCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, canvasSize, canvasSize);
                    doc.save('wifi-qr-code.pdf');
                }
                
                document.body.removeChild(tempContainer);
            }, 100);

        } catch (e) {
            showError('Error during file generation.');
            console.error(e);
            document.body.removeChild(tempContainer);
        }
    };

    /**
     * A utility function to delay execution. This prevents the QR code from regenerating
     * on every single input event, which would cause lag.
     */
    const debouncedGenerate = () => {
        clearTimeout(debounceTimeout);
        if (!qrCodeGenerated) return; // Don't auto-regenerate if one was never generated
        debounceTimeout = setTimeout(generateQRCode, 200);
    };

    // --- Event Listeners ---
    
    authInput.addEventListener('change', () => {
        const isPasswordRequired = authInput.value !== '';
        passwordInput.disabled = !isPasswordRequired;
        if (!isPasswordRequired) {
            passwordInput.value = '';
        }
    });

    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                logoImage = new Image();
                logoImage.src = event.target.result;
                logoImage.onload = () => {
                    if (qrCodeGenerated) {
                        generateQRCode();
                    }
                };
            };
            reader.readAsDataURL(file);
        }
    });
    
    logoSizeSlider.addEventListener('input', debouncedGenerate);
    fgColorInput.addEventListener('input', debouncedGenerate);
    bgColorInput.addEventListener('input', debouncedGenerate);

    generateBtn.addEventListener('click', generateQRCode);
    clearBtn.addEventListener('click', resetTool);
    downloadPngBtn.addEventListener('click', () => downloadAdvanced('png'));
    downloadPdfBtn.addEventListener('click', () => downloadAdvanced('pdf'));
});