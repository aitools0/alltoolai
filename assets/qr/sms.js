document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const messageInput = document.getElementById('message-input');
    const phoneInput = document.getElementById('phone-input');
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
    let sliderTimeout = null;
    let debounceTimeout = null;
    const PHONE_REGEX = /^[+\d\s-]+$/;

    // --- Core Functions ---

    /**
     * Displays an error message for 3 seconds.
     * @param {string} message The error message to display.
     */
    const showError = (message) => {
        errorMessage.textContent = message;
        setTimeout(() => {
            if (errorMessage.textContent === message) errorMessage.textContent = '';
        }, 3000);
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
        messageInput.value = '';
        phoneInput.value = '';
        fgColorInput.value = '#000000';
        bgColorInput.value = '#ffffff';
        logoUpload.value = '';
        logoSizeSlider.value = '20';
        logoImage = null;
        errorMessage.textContent = '';
        clearPreview();
    };

    /**
     * Validates inputs and returns the appropriate QR code text (smsto).
     * @returns {string|null} The text to be encoded, or null if input is invalid.
     */
    const getQrText = () => {
        const phone = phoneInput.value.trim();
        const message = messageInput.value.trim();

        if (!phone) {
            showError('Phone number is required.');
            return null;
        }

        if (!PHONE_REGEX.test(phone)) {
            showError('Invalid phone number format.');
            return null;
        }

        return `smsto:${phone.replace(/\s|-/g, '')}:${message}`;
    };

    /**
     * Draws the uploaded logo onto a given canvas context.
     * @param {CanvasRenderingContext2D} ctx The canvas rendering context.
     * @param {number} canvasSize The total size of the canvas.
     */
    const drawLogo = (ctx, canvasSize) => {
        if (!logoImage) return;
        const logoSizePercent = parseInt(logoSizeSlider.value, 10) / 100;
        const logoSize = canvasSize * logoSizePercent;
        const x = (canvasSize - logoSize) / 2;
        const y = (canvasSize - logoSize) / 2;
        const bgPadding = canvasSize * 0.01; // Scalable padding
        
        ctx.fillStyle = bgColorInput.value;
        ctx.fillRect(x - bgPadding, y - bgPadding, logoSize + bgPadding * 2, logoSize + bgPadding * 2);
        ctx.drawImage(logoImage, x, y, logoSize, logoSize);
    };

    /**
     * Generates and displays a QR code preview.
     */
    const generateQRCode = () => {
        const qrText = getQrText();
        if (!qrText) return;

        qrCodePreview.innerHTML = '';
        const previewSize = 256;

        const tempContainer = document.createElement('div');
        try {
            new QRCode(tempContainer, {
                text: qrText,
                width: previewSize,
                height: previewSize,
                colorDark: fgColorInput.value,
                colorLight: bgColorInput.value,
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (e) {
             showError('Error generating QR Code.');
             console.error(e);
             return;
        }

        setTimeout(() => {
            const qrElement = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
            if (!qrElement) {
                showError('Could not render QR code element.');
                return;
            }

            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = previewSize;
            previewCanvas.height = previewSize;
            const ctx = previewCanvas.getContext('2d');
            
            // Draw the QR code (from either canvas or image source) onto our preview canvas
            ctx.drawImage(qrElement, 0, 0, previewSize, previewSize);
            
            drawLogo(ctx, previewSize);

            qrCodePreview.innerHTML = '';
            qrCodePreview.appendChild(previewCanvas);
            previewPlaceholder.style.display = 'none';
            downloadPngBtn.disabled = false;
            downloadPdfBtn.disabled = false;
            qrCodeGenerated = true;
        }, 50);
    };
    
    /**
     * Creates a high-resolution canvas of the QR code for download.
     * @returns {Promise<HTMLCanvasElement|null>} A canvas element or null on failure.
     */
    const createHighResCanvas = () => {
        return new Promise((resolve, reject) => {
            const qrText = getQrText();
            if (!qrText) return reject(new Error("Invalid input for QR code."));

            const highRes = 1200, margin = 100, canvasSize = highRes + margin * 2;
            const fgColor = fgColorInput.value, bgColor = bgColorInput.value;
            
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = 'position:absolute; left:-9999px;';
            document.body.appendChild(tempContainer);

            try {
                new QRCode(tempContainer, { text: qrText, width: highRes, height: highRes, colorDark: fgColor, colorLight: bgColor, correctLevel: QRCode.CorrectLevel.H });

                setTimeout(() => {
                    // Important: Check for both canvas and img, same as in preview.
                    const qrElement = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
                    if (!qrElement) {
                        document.body.removeChild(tempContainer);
                        return reject(new Error('Failed to generate high-resolution QR code.'));
                    }

                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = canvasSize;
                    finalCanvas.height = canvasSize;
                    const ctx = finalCanvas.getContext('2d');
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, canvasSize, canvasSize);
                    ctx.drawImage(qrElement, margin, margin, highRes, highRes);

                    drawLogo(ctx, canvasSize);
                    
                    document.body.removeChild(tempContainer);
                    resolve(finalCanvas);
                }, 100);

            } catch (e) {
                document.body.removeChild(tempContainer);
                reject(e);
            }
        });
    };

    /**
     * Handles the file download logic for both PNG and PDF.
     * @param {'png' | 'pdf'} format
     */
    const downloadFile = async (format) => {
        if (!qrCodeGenerated) {
            showError('Please generate a QR code first.');
            return;
        }

        try {
            const canvas = await createHighResCanvas();
            if (!canvas) return;

            if (format === 'png') {
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png', 1.0);
                link.download = 'sms-qrcode.png';
                link.click();
            } else if (format === 'pdf') {
                if (typeof window.jspdf === 'undefined') {
                    showError('PDF library is still loading. Please try again in a moment.');
                    return;
                }
                const { jsPDF } = window.jspdf;
                const canvasSize = canvas.width;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvasSize, canvasSize] });
                doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, canvasSize, canvasSize);
                doc.save('sms-qrcode.pdf');
            }
        } catch (error) {
            showError(`Error during ${format.toUpperCase()} generation.`);
            console.error(error);
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

    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                logoImage = new Image();
                logoImage.src = event.target.result;
                logoImage.onload = () => { if (qrCodeGenerated) generateQRCode(); };
                logoImage.onerror = () => { showError('Failed to load image.'); logoImage = null; };
            };
            reader.readAsDataURL(file);
        }
    });
    
    logoSizeSlider.addEventListener('input', () => {
        clearTimeout(sliderTimeout);
        sliderTimeout = setTimeout(() => {
            if (qrCodeGenerated && logoImage) generateQRCode();
        }, 150); // Debounce to prevent lag
    });

    fgColorInput.addEventListener('input', debouncedGenerate);
    bgColorInput.addEventListener('input', debouncedGenerate);

    generateBtn.addEventListener('click', generateQRCode);
    clearBtn.addEventListener('click', resetTool);
    downloadPngBtn.addEventListener('click', () => downloadFile('png'));
    downloadPdfBtn.addEventListener('click', () => downloadFile('pdf'));
});