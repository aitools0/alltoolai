document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const emailInput = document.getElementById('email');
    const subjectInput = document.getElementById('subject');
    const bodyInput = document.getElementById('body');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadPngBtn = document.getElementById('download-png-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const qrCodePreview = document.getElementById('qr-code-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const errorMessage = document.getElementById('email-error');
    const fgColorInput = document.getElementById('fg-color');
    const bgColorInput = document.getElementById('bg-color');
    const logoUpload = document.getElementById('logo-upload');
    const logoSizeSlider = document.getElementById('logo-size');

    // State Variables
    let qrCodeGenerated = false;
    let logoImage = null;
    let debounceTimeout = null;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
     * Resets the entire tool to its default state.
     */
    const resetTool = () => {
        emailInput.value = '';
        subjectInput.value = '';
        bodyInput.value = '';
        fgColorInput.value = '#000000';
        bgColorInput.value = '#ffffff';
        logoUpload.value = '';
        logoSizeSlider.value = '20';
        logoImage = null;
        errorMessage.textContent = '';
        
        qrCodePreview.innerHTML = '';
        previewPlaceholder.style.display = 'block';
        downloadPngBtn.disabled = true;
        downloadPdfBtn.disabled = true;
        qrCodeGenerated = false;
    };

    /**
     * Validates inputs and returns the appropriate QR code text (mailto link).
     * @returns {string|null} The text to be encoded, or null if input is invalid.
     */
    const getQrText = () => {
        const email = emailInput.value.trim();
        if (!email) {
            showError('Email address is required.');
            return null;
        }
        if (!EMAIL_REGEX.test(email)) {
            showError('Invalid email address format.');
            return null;
        }

        const subject = subjectInput.value.trim();
        const body = bodyInput.value.trim();
        const params = new URLSearchParams();
        if (subject) params.append('subject', subject);
        if (body) params.append('body', body);

        const paramsString = params.toString();
        return `mailto:${email}${paramsString ? `?${paramsString}` : ''}`;
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
        
        // Add a small padding around the logo's background for better visual separation.
        const bgPadding = canvasSize * 0.01;
        
        ctx.fillStyle = bgColorInput.value;
        ctx.fillRect(x - bgPadding, y - bgPadding, logoSize + bgPadding * 2, logoSize + bgPadding * 2);
        ctx.drawImage(logoImage, x, y, logoSize, logoSize);
    };

    /**
     * Generates and displays a QR code preview. This function creates a final canvas
     * combining the QR code and the logo.
     */
    const generateQRCode = () => {
        const qrText = getQrText();
        if (!qrText) return;

        qrCodePreview.innerHTML = '';
        const previewSize = 256;

        // Use a temporary, off-screen div to generate the base QR code.
        const tempContainer = document.createElement('div');
        try {
            new QRCode(tempContainer, {
                text: qrText,
                width: previewSize,
                height: previewSize,
                colorDark: fgColorInput.value,
                colorLight: bgColorInput.value,
                correctLevel: QRCode.CorrectLevel.H // High correction level is best for logos
            });
        } catch (e) {
             showError('Error generating QR Code.');
             console.error(e);
             return;
        }

        // The QRCode library needs a moment to render. We use a short timeout
        // to ensure the canvas/img element is ready to be used.
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
            
            ctx.drawImage(qrElement, 0, 0, previewSize, previewSize);
            drawLogo(ctx, previewSize);

            qrCodePreview.appendChild(previewCanvas);
            previewPlaceholder.style.display = 'none';
            downloadPngBtn.disabled = false;
            downloadPdfBtn.disabled = false;
            qrCodeGenerated = true;
        }, 50);
    };
    
    /**
     * Creates a high-resolution canvas of the QR code for downloading.
     * @returns {Promise<HTMLCanvasElement|null>} A canvas element or null on failure.
     */
    const createHighResCanvas = () => {
        return new Promise((resolve, reject) => {
            const qrText = getQrText();
            if (!qrText) {
                return reject(new Error("Invalid input for QR code."));
            }

            const highRes = 1024, margin = 80, canvasSize = highRes + margin * 2;
            const tempContainer = document.createElement('div');
            // Hide the temporary element
            tempContainer.style.cssText = 'position:absolute; top:-9999px; left:-9999px;';
            document.body.appendChild(tempContainer);

            try {
                new QRCode(tempContainer, { 
                    text: qrText, 
                    width: highRes, 
                    height: highRes, 
                    colorDark: fgColorInput.value, 
                    colorLight: bgColorInput.value, 
                    correctLevel: QRCode.CorrectLevel.H 
                });

                setTimeout(() => {
                    const qrElement = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
                    if (!qrElement) {
                        document.body.removeChild(tempContainer);
                        return reject(new Error('Failed to generate high-resolution QR element.'));
                    }

                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = canvasSize;
                    finalCanvas.height = canvasSize;
                    const ctx = finalCanvas.getContext('2d');

                    // Create the background and margin
                    ctx.fillStyle = bgColorInput.value;
                    ctx.fillRect(0, 0, canvasSize, canvasSize);
                    
                    ctx.drawImage(qrElement, margin, margin, highRes, highRes);
                    drawLogo(ctx, canvasSize);
                    
                    document.body.removeChild(tempContainer); // Clean up the DOM
                    resolve(finalCanvas);
                }, 100);

            } catch (e) {
                document.body.removeChild(tempContainer); // Ensure cleanup on error
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
            if (!canvas) return; // createHighResCanvas will have shown an error.

            const link = document.createElement('a');
            const filename = 'email-qrcode';

            if (format === 'png') {
                link.href = canvas.toDataURL('image/png', 1.0);
                link.download = `${filename}.png`;
                link.click();
            } else if (format === 'pdf') {
                // Check if the jspdf library has loaded
                if (typeof window.jspdf === 'undefined') {
                    showError('PDF library is still loading. Please try again in a moment.');
                    return;
                }
                const { jsPDF } = window.jspdf;
                const canvasSize = canvas.width;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvasSize, canvasSize] });
                doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, canvasSize, canvasSize);
                doc.save(`${filename}.pdf`);
            }
        } catch (error) {
            showError(`Could not create the QR code for download.`);
            console.error('Download error:', error);
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
        if (!file) {
            logoImage = null; // Clear logo if user cancels selection
            debouncedGenerate(); // Re-render without logo
            return;
        };

        const reader = new FileReader();
        reader.onload = (event) => {
            logoImage = new Image();
            logoImage.src = event.target.result;
            logoImage.onload = () => { if (qrCodeGenerated) generateQRCode(); };
            logoImage.onerror = () => { showError('Failed to load image file.'); logoImage = null; };
        };
        reader.onerror = () => { showError('Error reading file.'); logoImage = null; }
        reader.readAsDataURL(file);
    });
    
    logoSizeSlider.addEventListener('input', debouncedGenerate);
    fgColorInput.addEventListener('input', debouncedGenerate);
    bgColorInput.addEventListener('input', debouncedGenerate);
    
    generateBtn.addEventListener('click', generateQRCode);
    clearBtn.addEventListener('click', resetTool);
    downloadPngBtn.addEventListener('click', () => downloadFile('png'));
    downloadPdfBtn.addEventListener('click', () => downloadFile('pdf'));
});