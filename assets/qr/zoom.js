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

    // --- Helpers ---

    const showError = (message) => {
        errorMessage.textContent = message;
        clearTimeout(errorTimeout);
        errorTimeout = setTimeout(clearError, 3000);
    };

    const clearError = () => {
        errorMessage.textContent = '';
    };

    const clearPreview = () => {
        qrCodePreview.innerHTML = '';
        previewPlaceholder.style.display = 'block';
        downloadPngBtn.disabled = true;
        downloadPdfBtn.disabled = true;
        qrCodeGenerated = false;
    };

    const resetTool = () => {
        meetingIdInput.value = '';
        passwordInput.value = '';
        meetingTopicInput.value = '';
        fgColorInput.value = '#2D8CFF';
        bgColorInput.value = '#ffffff';
        clearError();
        clearPreview();
    };

    // Determine if a string looks like a Zoom hashed pwd (base64url-like)
    const isLikelyHashedPwd = (pwd) => /^[A-Za-z0-9_-]{16,}$/.test(pwd);

    // Try to build the best Zoom URL based on input
    // - Accepts plain Meeting ID (with spaces/dashes), full Zoom https links, or zoommtg:// deep links.
    // - If a plain passcode is provided without a hashed pwd, we auto-use the zoommtg:// scheme so it works in the Zoom app.
    const buildZoomURL = (rawMeetingInput, rawPasscode) => {
        const value = (rawMeetingInput || '').trim();
        const pass = (rawPasscode || '').trim();
        let note = '';

        // If zoommtg deep link is provided, respect it and add pwd if needed
        if (/^zoommtg:\/\//i.test(value)) {
            if (pass && !/[\?&]pwd=/.test(value)) {
                const sep = value.includes('?') ? '&' : '?';
                return { url: `${value}${sep}pwd=${encodeURIComponent(pass)}`, note };
            }
            return { url: value, note };
        }

        // If a full HTTPS Zoom URL is provided, extract meeting and pwd
        if (/^https?:\/\//i.test(value) && /zoom\.us/i.test(value)) {
            try {
                const u = new URL(value);
                const pwdFromUrl = u.searchParams.get('pwd') || '';
                const idMatch = u.pathname.match(/\/j\/(\d+)/);
                const meetingIdFromUrl = idMatch ? idMatch[1] : '';

                if (!meetingIdFromUrl) {
                    return { url: '', note: 'Could not find a meeting ID in the provided URL.' };
                }

                // If user typed a plain passcode but URL has no hashed pwd, prefer deep link so passcode works
                if (!pwdFromUrl && pass && !isLikelyHashedPwd(pass)) {
                    note = 'Using Zoom app link so your passcode works without hashing.';
                    return { url: `zoommtg://zoom.us/join?confno=${meetingIdFromUrl}&pwd=${encodeURIComponent(pass)}`, note };
                }

                // Otherwise keep the same domain and include either existing hashed pwd or a user-provided hashed pwd
                const finalPwd = pwdFromUrl || (pass && isLikelyHashedPwd(pass) ? pass : '');
                const q = finalPwd ? `?pwd=${finalPwd}` : '';
                return { url: `${u.origin}/j/${meetingIdFromUrl}${q}`, note };
            } catch (e) {
                return { url: '', note: 'Invalid Zoom URL.' };
            }
        }

        // Otherwise treat as Meeting ID (sanitize to digits)
        const meetingId = value.replace(/\D/g, '');
        if (!meetingId) {
            return { url: '', note: 'Meeting ID is required.' };
        }

        if (pass) {
            if (isLikelyHashedPwd(pass)) {
                return { url: `https://zoom.us/j/${meetingId}?pwd=${encodeURIComponent(pass)}`, note };
            }
            // Plain passcode -> use Zoom app deep link
            note = 'Using Zoom app link so your passcode works without hashing.';
            return { url: `zoommtg://zoom.us/join?confno=${meetingId}&pwd=${encodeURIComponent(pass)}`, note };
        }

        return { url: `https://zoom.us/j/${meetingId}`, note };
    };

    // --- Core Functions ---

    const generateQRCode = () => {
        clearError();

        const meetingInput = meetingIdInput.value;
        const password = passwordInput.value;
        const topic = meetingTopicInput.value.trim();

        const { url, note } = buildZoomURL(meetingInput, password);
        if (!url) {
            showError('Meeting ID or URL is required.');
            return;
        }

        if (note) showError(note); // show helpful notice if we switched to deep link

        qrCodePreview.innerHTML = '';
        const previewSize = 256;

        const tempContainer = document.createElement('div');
        try {
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
                ctx.fillText(topic, previewSize / 2, topicHeight / 2, previewSize - 20);
            }

            // drawImage works for both canvas and img elements
            ctx.drawImage(qrElement, 0, topicHeight, previewSize, previewSize);

            qrCodePreview.appendChild(previewCanvas);
            previewPlaceholder.style.display = 'none';
            downloadPngBtn.disabled = false;
            downloadPdfBtn.disabled = false;
            qrCodeGenerated = true;
        }, 50);
    };

    const downloadHandler = (format) => {
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
                initiateDownload(format);
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

    const initiateDownload = (format) => {
        const meetingInput = meetingIdInput.value;
        const password = passwordInput.value;
        const topic = meetingTopicInput.value.trim();

        const { url } = buildZoomURL(meetingInput, password);
        if (!url) {
            showError('Invalid meeting info. Regenerate the QR code.');
            return;
        }

        const highRes = 1200;
        const margin = 100;
        const topicHeight = topic ? 200 : 0;

        const canvasWidth = highRes + margin * 2;
        const canvasHeight = highRes + margin * 2 + topicHeight;

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        try {
            new QRCode(tempContainer, {
                text: url,
                width: highRes,
                height: highRes,
                colorDark: fgColorInput.value,
                colorLight: bgColorInput.value,
                correctLevel: QRCode.CorrectLevel.H
            });

            setTimeout(() => {
                const srcEl = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
                if (!srcEl) {
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

                ctx.drawImage(srcEl, margin, margin + topicHeight, highRes, highRes);

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

    const debouncedGenerate = () => {
        clearTimeout(debounceTimeout);
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
