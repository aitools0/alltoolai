document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const generateBtn = document.getElementById('generate');
    const clearBtn = document.getElementById('reset');
    const downloadPngBtn = document.getElementById('download-png-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const qrCodePreview = document.getElementById('qr-code-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const errorMessage = document.getElementById('error-message');
    const fgColorInput = document.getElementById('fg-color');
    const bgColorInput = document.getElementById('bg-color');
    const logoUpload = document.getElementById('logo-upload');
    const logoSizeSlider = document.getElementById('logo-size');
    const addSocialLinkBtn = document.getElementById('add-social-link');
    const socialLinksContainer = document.getElementById('social-links-container');

    // VCard Fields
    const vCardFields = {
        firstName: document.getElementById('first-name'),
        lastName: document.getElementById('last-name'),
        organization: document.getElementById('organization'),
        title: document.getElementById('title'),
        email: document.getElementById('email'),
        phone: document.getElementById('phone'),
        website: document.getElementById('website'),
        street: document.getElementById('street'),
        city: document.getElementById('city'),
        state: document.getElementById('state'),
        zip: document.getElementById('zip'),
        country: document.getElementById('country'),
    };

    const errorFields = {
        firstNameError: document.getElementById('first-name-error'),
        lastNameError: document.getElementById('last-name-error'),
        emailError: document.getElementById('email-error'),
    };

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
        // Clear all input fields
        Object.values(vCardFields).forEach(input => input.value = '');
        socialLinksContainer.innerHTML = '';

        // Reset colors and logo
        fgColorInput.value = '#000000';
        bgColorInput.value = '#ffffff';
        logoUpload.value = '';
        logoSizeSlider.value = '20';
        logoImage = null;

        // Clear errors and preview
        clearError();
        Object.values(errorFields).forEach(error => error.classList.add('hidden'));
        clearPreview();
    };

    /**
     * Validates the VCard form.
     */
    const validateForm = () => {
        let isValid = true;
        Object.values(errorFields).forEach(error => error.classList.add('hidden'));

        if (!vCardFields.firstName.value.trim()) {
            errorFields.firstNameError.classList.remove('hidden');
            isValid = false;
        }
        if (!vCardFields.lastName.value.trim()) {
            errorFields.lastNameError.classList.remove('hidden');
            isValid = false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(vCardFields.email.value.trim())) {
            errorFields.emailError.classList.remove('hidden');
            isValid = false;
        }
        return isValid;
    };

    /**
     * Builds the VCard data string.
     */
    const buildVCardData = () => {
        if (!validateForm()) return null;

        const vCard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${vCardFields.firstName.value.trim()} ${vCardFields.lastName.value.trim()}`
        ];

        const fieldMap = {
            ORG: vCardFields.organization,
            TITLE: vCardFields.title,
            'EMAIL;TYPE=INTERNET,PREF': vCardFields.email,
            'TEL;TYPE=WORK,VOICE': vCardFields.phone,
            URL: vCardFields.website,
        };

        for (const key in fieldMap) {
            const value = fieldMap[key].value.trim();
            if (value) vCard.push(`${key}:${value}`);
        }

        const address = [
            vCardFields.street.value.trim(),
            vCardFields.city.value.trim(),
            vCardFields.state.value.trim(),
            vCardFields.zip.value.trim(),
            vCardFields.country.value.trim()
        ].join(';').replace(/^;+|;+$/g, ''); // Clean up separators

        if (address) vCard.push(`ADR;TYPE=WORK,PREF:;;${address}`);

        document.querySelectorAll('.social-link-input').forEach(input => {
            const url = input.value.trim();
            if (url) vCard.push(`URL:${url}`);
        });

        vCard.push('END:VCARD');
        return vCard.join('\n');
    };

    /**
     * Adds a new social link input field.
     */
    const addSocialLinkInput = () => {
        const socialLinkDiv = document.createElement('div');
        socialLinkDiv.className = 'flex items-center gap-2 mt-2';
        socialLinkDiv.innerHTML = `
            <input type="url" class="social-link-input w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" placeholder="https://social-media-profile.com">
            <button type="button" class="remove-social-link text-white bg-red-500 hover:bg-red-600 font-semibold rounded-lg text-lg px-4 py-2 transition-all">&times;</button>
        `;
        socialLinksContainer.appendChild(socialLinkDiv);
        socialLinkDiv.querySelector('.remove-social-link').addEventListener('click', () => socialLinkDiv.remove());
    };

    /**
     * Generates and displays a QR code preview.
     */
    const generateQRCode = () => {
        clearError();
        const vCardData = buildVCardData();

        if (!vCardData) {
            showError('Please fill in all required fields correctly.');
            return;
        }

        qrCodePreview.innerHTML = '';
        const previewSize = 256;

        const tempContainer = document.createElement('div');
        try {
            new QRCode(tempContainer, {
                text: vCardData,
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
        const vCardData = buildVCardData();
        if (!vCardData) {
            showError('Cannot download, form data is invalid.');
            return;
        }

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
            new QRCode(tempContainer, { text: vCardData, width: highRes, height: highRes, colorDark: fgColor, colorLight: bgColor, correctLevel: QRCode.CorrectLevel.H });

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

                const name = `${vCardFields.firstName.value.trim()}_${vCardFields.lastName.value.trim()}` || 'vcard';

                if (format === 'png') {
                    const link = document.createElement('a');
                    link.href = finalCanvas.toDataURL('image/png', 1.0);
                    link.download = `${name}-qr-code.png`;
                    link.click();
                } else if (format === 'pdf') {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvasSize, canvasSize] });
                    doc.addImage(finalCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, canvasSize, canvasSize);
                    doc.save(`${name}-qr-code.pdf`);
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
     * A utility function to delay execution.
     */
    const debouncedGenerate = () => {
        clearTimeout(debounceTimeout);
        if (!qrCodeGenerated) return;
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
    addSocialLinkBtn.addEventListener('click', addSocialLinkInput);
});