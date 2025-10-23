document.addEventListener('DOMContentLoaded', () => {
    const base64Input = document.getElementById('base64-input');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');
    const fileUpload = document.getElementById('file-upload');
    const imagePreview = document.getElementById('image-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const errorMessage = document.getElementById('error-message');
    const filenameInput = document.getElementById('filename-input');

    let imageType = 'png';
    let debounceTimer;

    const showError = (message) => {
        errorMessage.textContent = message;
        base64Input.classList.add('border-red-500');
    };

    const clearError = () => {
        if (errorMessage.textContent) {
            errorMessage.textContent = '';
            base64Input.classList.remove('border-red-500');
        }
    };
    
    const clearPreview = () => {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
        previewPlaceholder.style.display = 'block';
        downloadBtn.disabled = true;
    };

    const resetTool = () => {
        base64Input.value = '';
        clearError();
        clearPreview();
        filenameInput.value = '';
    };

    const processConversion = (base64String) => {
        clearError();

        if (!base64String) {
            clearPreview();
            return;
        }

        const match = base64String.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        
        if (!match) {
            clearPreview();
            showError('Invalid Format: String must start with "data:image/...;base64,"');
            return;
        }
        
        const mimeType = match[1];
        const base64Data = match[2];

        try {
            // This is the most reliable way to validate Base64 data.
            atob(base64Data); 
            
            const extMap = { 'jpeg': 'jpg', 'svg+xml': 'svg' };
            imageType = extMap[mimeType] || mimeType.replace('+xml', '');
            imagePreview.src = base64String;
            imagePreview.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            downloadBtn.disabled = false;

            if (!filenameInput.value) {
                filenameInput.value = `image-${Date.now()}`;
            }
        } catch (e) {
            clearPreview();
            showError('Invalid Base64 Data: The string appears to be corrupted.');
        }
    };
    
    const downloadImage = () => {
        if (!imagePreview.src || downloadBtn.disabled) return;
        
        // Sanitize the filename to remove illegal characters
        const sanitizedFilename = (filenameInput.value || 'download').replace(/[<>:"/\\|?*]+/g, '_');
        const finalFilename = `${sanitizedFilename}.${imageType}`;
        
        const link = document.createElement('a');
        link.href = imagePreview.src;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const readFile = (file) => {
        if (!file) {
            showError('No file selected.');
            return;
        }
        if (file.type !== 'text/plain') {
            showError('Invalid File: Please upload a .txt file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            base64Input.value = e.target.result;
            processConversion(e.target.result); // Process content immediately after read
        };
        reader.onerror = () => {
            showError('Error reading the file.');
        };
        reader.readAsText(file);
    };
    
    // --- Event Listeners ---
    convertBtn.addEventListener('click', () => {
        const base64String = base64Input.value.trim();
        if (!base64String) {
            showError('Input is empty.');
            return;
        }
        processConversion(base64String);
    });
    
    clearBtn.addEventListener('click', resetTool);
    downloadBtn.addEventListener('click', downloadImage);
    
    copyBtn.addEventListener('click', () => {
        const textToCopy = base64Input.value;
        if (!textToCopy) return;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
    });

    base64Input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        // Debounce prevents lag by only running the conversion after the user stops typing.
        debounceTimer = setTimeout(() => {
            processConversion(base64Input.value.trim());
        }, 300);
    });

    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            readFile(e.target.files[0]);
        }
        // Reset the input value to allow uploading the same file again
        e.target.value = null;
    });
    
    // --- Drag and Drop Listeners ---
    const dropZone = base64Input; // Using the textarea as the drop zone
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-indigo-600');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-indigo-600');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) {
            readFile(e.dataTransfer.files[0]);
        }
    });
});