document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const meetingIdInput = document.getElementById('meeting-id');
    const passwordInput = document.getElementById('password-input');
    const meetingTopicInput = document.getElementById('meeting-topic');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadPngBtn = document.getElementById('download-png-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const qrCodePreview = document.getElementById('qr-code-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const errorMessage = document.getElementById('error-message');
    const fgColorInput = document.getElementById('fg-color');
    const bgColorInput = document.getElementById('bg-color');

    // State Variables
    let qrCodeGenerated = false;
    let debounceTimeout = null;
    let errorTimeout = null;

    // --- Core Functions ---

    /**
     * Displays an error message for 3 seconds. Ensures only one error message timer is active.
     * @param {string} message The error message to display.
     */
    const showError = (message) => {
        errorMessage.textContent = message;
        clearTimeout(errorTimeout); // Clear any existing timer
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
        meetingIdInput.value = '';
        passwordInput.value = '';
        meetingTopicInput.value = '';
        fgColorInput.value = '#2D8CFF';
        bgColorInput.value = '#ffffff';

        clearError();
        clearPreview();
    };

    /**
     * Generates and displays a QR code preview.
     */
    const generateQRCode = () => {
        clearError();
        const meetingId = meetingIdInput.value.trim();
        const password = passwordInput.value.trim();
        const topic = meetingTopicInput.value.trim();

        if (!meetingId) {
            showError('Meeting ID is required.');
            return;
        }

        let url = `https://zoom.us/j/${meetingId}`;
        if (password) {
            url += `?pwd=${encodeURIComponent(password)}`;
        }

        qrCodePreview.innerHTML = '';
        const previewSize = 256;

        const tempContainer = document.createElement('div');
        try {
            // Generate QR code in a temporary, non-visible element
            new QRCode(tempContainer, {
                text: url,
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

        // Use a short timeout to ensure the QRCode library has rendered the element
        setTimeout(() => {
            const qrElement = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
            if (!qrElement) {
                showError('Could not generate QR code element.');
                return;
            }

            const topicHeight = topic ? 40 : 0;
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = previewSize;
            previewCanvas.height = previewSize + topicHeight;
            const ctx = previewCanvas.getContext('2d');
            
            ctx.fillStyle = bgColorInput.value;
            ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

            if (topic) {
                ctx.font = 'bold 20px sans-serif';
                ctx.fillStyle = fgColorInput.value;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(topic, previewSize / 2, topicHeight / 2, previewSize - 20); // Add padding
            }
            
            ctx.drawImage(qrElement, 0, topicHeight, previewSize, previewSize);

            qrCodePreview.appendChild(previewCanvas);
            previewPlaceholder.style.display = 'none';
            downloadPngBtn.disabled = false;
            downloadPdfBtn.disabled = false;
            qrCodeGenerated = true;
        }, 50);
    };
    
    /**
     * Handles the download request, including dynamically loading the PDF library if needed.
     * @param {'png' | 'pdf'} format The desired download format.
     */
    const downloadHandler = (format) => {
        if (!qrCodeGenerated) {
            showError('Please generate a QR code first.');
            return;
        }

        // Dynamically load jsPDF library only when needed and if not already loaded
        if (format === 'pdf' && typeof window.jspdf === 'undefined') {
            downloadPdfBtn.textContent = 'Loading PDF Library...';
            downloadPdfBtn.disabled = true;
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                initiateDownload(format); // Proceed to download once script is loaded
                downloadPdfBtn.textContent = 'Download PDF';
                downloadPdfBtn.disabled = false;
            };
            script.onerror = () => {
                showError('Failed to load PDF library. Please try again.');
                downloadPdfBtn.textContent = 'Download PDF';
                downloadPdfBtn.disabled = false;
            };
            document.head.appendChild(script);
        } else {
            initiateDownload(format);
        }
    };

    /**
     * Creates the high-resolution file for download.
     * @param {'png' | 'pdf'} format The file format to generate.
     */
    const initiateDownload = (format) => {
        const meetingId = meetingIdInput.value.trim();
        const password = passwordInput.value.trim();
        const topic = meetingTopicInput.value.trim();

        let url = `https://zoom.us/j/${meetingId}`;
        if (password) url += `?pwd=${encodeURIComponent(password)}`;
        
        const highRes = 1200;
        const margin = 100;
        const topicHeight = topic ? 200 : 0;
        
        const canvasWidth = highRes + margin * 2;
        const canvasHeight = highRes + margin * 2 + topicHeight;
        
        // Create an off-screen container for high-resolution rendering
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        try {
            new QRCode(tempContainer, { text: url, width: highRes, height: highRes, colorDark: fgColorInput.value, colorLight: bgColorInput.value, correctLevel: QRCode.CorrectLevel.H });

            setTimeout(() => {
                const highResCanvas = tempContainer.querySelector('canvas');
                if (!highResCanvas) {
                    showError('Failed to generate high-resolution QR code.');
                    document.body.removeChild(tempContainer);
                    return;
                }

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = canvasWidth;
                finalCanvas.height = canvasHeight;
                const ctx = finalCanvas.getContext('2d');

                ctx.fillStyle = bgColorInput.value;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                if (topic) {
                    ctx.font = 'bold 80px sans-serif';
                    ctx.fillStyle = fgColorInput.value;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(topic, canvasWidth / 2, (margin + topicHeight) / 2, canvasWidth - 40);
                }
                
                ctx.drawImage(highResCanvas, margin, margin + topicHeight, highRes, highRes);

                if (format === 'png') {
                    const link = document.createElement('a');
                    link.href = finalCanvas.toDataURL('image/png', 1.0);
                    link.download = 'zoom-qr-code.png';
                    link.click();
                } else if (format === 'pdf') {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvasWidth, canvasHeight] });
                    doc.addImage(finalCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, canvasWidth, canvasHeight);
                    doc.save('zoom-qr-code.pdf');
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
     * Debounces the QR code generation to avoid excessive updates on input change.
     */
    const debouncedGenerate = () => {
        clearTimeout(debounceTimeout);
        // Only live-update if a QR code has already been generated once.
        if (!qrCodeGenerated) return; 
        debounceTimeout = setTimeout(generateQRCode, 200);
    };

    // --- Event Listeners ---
    generateBtn.addEventListener('click', generateQRCode);
    clearBtn.addEventListener('click', resetTool);
    meetingTopicInput.addEventListener('input', debouncedGenerate);
    fgColorInput.addEventListener('input', debouncedGenerate);
    bgColorInput.addEventListener('input', debouncedGenerate);
    downloadPngBtn.addEventListener('click', () => downloadHandler('png'));
    downloadPdfBtn.addEventListener('click', () => downloadHandler('pdf'));
});