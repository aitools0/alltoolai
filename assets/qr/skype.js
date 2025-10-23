document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const skypeIdInput = document.getElementById('skype-id');
    const actionInput = document.getElementById('action');
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
    let errorTimeout = null;

    // --- Core Functions ---

    /**
     * Displays an error message for 3 seconds.
     * @param {string} message The error message to display.
     */
    const showError = (message) => {
        errorMessage.textContent = message;
        clearTimeout(errorTimeout);
        errorTimeout = setTimeout(clearError, 3000);
    };

    /**
     * Clears the error message.
     */
    const clearError = () => {
        errorMessage.textContent = '';
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
        skypeIdInput.value = '';
        actionInput.value = 'add';
        fgColorInput.value = '#00aff0';
        bgColorInput.value = '#ffffff';
        logoUpload.value = '';
        logoSizeSlider.value = '20';
        logoImage = null;
        clearError();
        clearPreview();
    };
    
    /**
     * *** IMPROVEMENT: Refactored URI generation to avoid code duplication. ***
     * Constructs the Skype URI based on the input fields.
     * @returns {string|null} The URI string, or null if the Skype ID is missing.
     */
    const getSkypeUri = () => {
        const skypeId = skypeIdInput.value.trim();
        if (!skypeId) {
            showError('Skype ID or email is required.');
            return null;
        }
        const action = actionInput.value;
        switch(action) {
            case 'chat':      return `skype:${skypeId}?chat`;
            case 'call':      return `skype:${skypeId}?call`;
            case 'videocall': return `skype:${skypeId}?call&video=true`;
            case 'add':       
            default:          return `skype:${skypeId}?add`;
        }
    };


    /**
     * Generates and displays a QR code preview.
     */
    const generateQRCode = () => {
        clearError();
        const uri = getSkypeUri();
        if (!uri) return;

        qrCodePreview.innerHTML = '';
        previewPlaceholder.style.display = 'block'; // Show placeholder initially
        
        const previewSize = 256;

        // Use a temporary off-screen container for reliable generation.
        const tempContainer = document.createElement('div');
        try {
            new QRCode(tempContainer, {
                text: uri,
                width: previewSize,
                height: previewSize,
                colorDark: fgColorInput.value,
                colorLight: bgColorInput.value,
                correctLevel: QRCode.CorrectLevel.H // High correction for logo
            });
        } catch (e) {
             showError('Error generating QR Code.');
             console.error(e);
             clearPreview();
             return;
        }
        
        // Wait for the QR code to render before drawing it to the final canvas.
        setTimeout(() => {
            const qrElement = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');

            if (!qrElement) {
                showError('Could not generate QR code element.');
                return;
            }
            
            // Create a visible canvas for the preview.
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = previewSize;
            previewCanvas.height = previewSize;
            const ctx = previewCanvas.getContext('2d');

            ctx.drawImage(qrElement, 0, 0, previewSize, previewSize);

            // Add logo overlay if one exists.
            if (logoImage) {
                const logoSize = previewCanvas.width * (logoSizeSlider.value / 100);
                const x = (previewCanvas.width - logoSize) / 2;
                const y = (previewCanvas.height - logoSize) / 2;
                const bgPadding = 4;
                
                ctx.fillStyle = bgColorInput.value;
                ctx.fillRect(x - bgPadding, y - bgPadding, logoSize + bgPadding * 2, logoSize + bgPadding * 2);
                ctx.drawImage(logoImage, x, y, logoSize, logoSize);
            }

            qrCodePreview.innerHTML = ''; // Clear again before appending
            qrCodePreview.appendChild(previewCanvas);
            previewPlaceholder.style.display = 'none';
            downloadPngBtn.disabled = false;
            downloadPdfBtn.disabled = false;
            qrCodeGenerated = true;
        }, 50); // A short delay allows the QRCode library to draw.
    };
    
    /**
     * Initiates a download of a high-resolution QR code.
     * @param {'png' | 'pdf'} format The desired download format.
     */
    const downloadQrCode = (format) => {
        if (!qrCodeGenerated) {
            showError('Please generate a QR code first.');
            return;
        }

        const uri = getSkypeUri();
        if (!uri) return;

        const fgColor = fgColorInput.value;
        const bgColor = bgColorInput.value;
        const highRes = 1024; // High resolution for download
        const margin = 80;    // Margin around QR code
        const canvasSize = highRes + margin * 2;
        
        // Use an off-screen container for high-res generation.
        const tempContainer = document.createElement('div');
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.position = 'absolute';
        document.body.appendChild(tempContainer);

        try {
            new QRCode(tempContainer, {
                text: uri,
                width: highRes,
                height: highRes,
                colorDark: fgColor,
                colorLight: bgColor,
                correctLevel: QRCode.CorrectLevel.H
            });

            setTimeout(() => {
                const highResQrElement = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
                if (!highResQrElement) {
                    showError('Failed to generate high-resolution QR code.');
                    document.body.removeChild(tempContainer);
                    return;
                }
                
                // Create the final canvas with margins.
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = canvasSize;
                finalCanvas.height = canvasSize;
                const ctx = finalCanvas.getContext('2d');
                
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvasSize, canvasSize);
                ctx.drawImage(highResQrElement, margin, margin, highRes, highRes);

                // Draw logo if it exists.
                if (logoImage) {
                    const logoWidth = highRes * (logoSizeSlider.value / 100);
                    const x = (canvasSize - logoWidth) / 2;
                    const y = (canvasSize - logoWidth) / 2;
                    const bgPadding = 10;
                    
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(x - bgPadding, y - bgPadding, logoWidth + bgPadding * 2, logoWidth + bgPadding * 2);
                    ctx.drawImage(logoImage, x, y, logoWidth, logoWidth);
                }

                // Trigger the download based on format.
                if (format === 'png') {
                    const link = document.createElement('a');
                    link.href = finalCanvas.toDataURL('image/png', 1.0);
                    link.download = 'skype-qr-code.png';
                    link.click();
                } else if (format === 'pdf') {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({ orientation: 'p', unit: 'px', format: [canvasSize, canvasSize] });
                    doc.addImage(finalCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, canvasSize, canvasSize);
                    doc.save('skype-qr-code.pdf');
                }
                
                document.body.removeChild(tempContainer); // Cleanup
            }, 100);

        } catch (e) {
            showError('Error during file generation.');
            console.error(e);
            document.body.removeChild(tempContainer); // Cleanup
        }
    };
    
    /**
     * *** PERFORMANCE: This is a key function to prevent lagging. ***
     * It delays QR code regeneration to avoid running it on every tiny change,
     * ensuring a smooth user experience.
     */
    const debouncedGenerate = () => {
        clearTimeout(debounceTimeout);
        if (qrCodeGenerated) { // Only auto-regenerate if a QR code is already visible
             debounceTimeout = setTimeout(generateQRCode, 250);
        }
    };

    // --- Event Listeners ---

    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                logoImage = new Image();
                logoImage.src = event.target.result;
                logoImage.onload = debouncedGenerate; // Regenerate after logo loads
            };
            reader.onerror = () => showError('Failed to read logo file.');
            reader.readAsDataURL(file);
        }
    });
    
    // Use the debounced function for instant feedback without lag
    logoSizeSlider.addEventListener('input', debouncedGenerate);
    fgColorInput.addEventListener('input', debouncedGenerate);
    bgColorInput.addEventListener('input', debouncedGenerate);
    actionInput.addEventListener('change', debouncedGenerate);

    // Main action buttons
    generateBtn.addEventListener('click', generateQRCode);
    clearBtn.addEventListener('click', resetTool);
    downloadPngBtn.addEventListener('click', () => downloadQrCode('png'));
    downloadPdfBtn.addEventListener('click', () => downloadQrCode('pdf'));
});