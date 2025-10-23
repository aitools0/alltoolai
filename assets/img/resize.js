document.addEventListener('DOMContentLoaded', () => {
    // --- Data Definitions ---
    const SIZE_PRESETS = [
        { label: "Official Document Photos", sizes: [ { name: "Passport (600×600)", value: [600, 600] }, { name: "US Visa (600×600)", value: [600, 600] }, { name: "Stamp Size (270×330)", value: [270, 330] }, { name: "ID Card (300×450)", value: [300, 450] }, { name: "Driving License (BD) (354×472)", value: [354, 472] }, { name: "PAN Card (India) (638×238)", value: [638, 238] }, { name: "Aadhar Card (India) (354×472)", value: [354, 472] } ] },
        { label: "Print Photo Sizes", sizes: [ { name: "Wallet (750×1050)", value: [750, 1050] }, { name: "4R - 4×6 in (1200×1800)", value: [1200, 1800] }, { name: "5R - 5×7 in (1500×2100)", value: [1500, 2100] }, { name: "6R - 6×8 in (1800×2400)", value: [1800, 2400] } ] },
        { label: "Facebook", sizes: [ { name: "Profile (180×180)", value: [180, 180] }, { name: "Cover (820×312)", value: [820, 312] }, { name: "Post (1200×630)", value: [1200, 630] }, { name: "Story (1080×1920)", value: [1080, 1920] } ] },
        { label: "Instagram", sizes: [ { name: "Profile (320×320)", value: [320, 320] }, { name: "Post - Square (1080×1080)", value: [1080, 1080] }, { name: "Post - Portrait (1080×1350)", value: [1080, 1350] }, { name: "Post - Landscape (1080×566)", value: [1080, 566] }, { name: "Story / Reels (1080×1920)", value: [1080, 1920] } ] }
    ];
    
    // --- UI Elements & State ---
    const ui = {};
    document.querySelectorAll('[id]').forEach(el => {
        const camelCaseId = el.id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        ui[camelCaseId] = el;
    });

    const state = {
        originalImage: null,
        currentImage: null,
        isAdjustingResize: false,
    };

    // --- Utility Functions ---
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- Core Functions ---
    const setReadyState = () => {
        ui.uploadSection.classList.remove('hidden');
        ui.editorSection.classList.add('hidden');
        ui.fileName.textContent = '';
        ui.fileUpload.value = '';
        if (state.originalImage) {
            URL.revokeObjectURL(state.originalImage.src);
        }
        Object.assign(state, {
            originalImage: null,
            currentImage: null,
        });
    };

    const setFileLoadedState = (file) => {
        ui.uploadSection.classList.add('hidden');
        ui.editorSection.classList.remove('hidden');
        ui.fileName.textContent = `File: ${file.name}`;
    };

    const handleImageUpload = (file) => {
        if (!file || !file.type.startsWith("image/")) {
            alert("Please upload a valid image file.");
            return;
        }
        const image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = () => {
            state.originalImage = image;
            state.currentImage = image;
            setFileLoadedState(file);
            updateResizeInputs();
            requestAnimationFrame(drawImage);
        };
        image.onerror = () => {
            alert("The selected file could not be loaded. It may be corrupted or in an unsupported format.");
            setReadyState();
        };
    };

    const drawImage = () => {
        if (!state.currentImage) return;
        const canvas = ui.editorCanvas;
        const container = ui.previewContainer;
        const wrapper = ui.canvasWrapper;
        
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) return;

        const imageRatio = state.currentImage.width / state.currentImage.height;
        const containerRatio = containerRect.width / containerRect.height;
        
        let canvasWidth, canvasHeight;
        if (containerRatio > imageRatio) {
            canvasHeight = containerRect.height;
            canvasWidth = canvasHeight * imageRatio;
        } else {
            canvasWidth = containerRect.width;
            canvasHeight = canvasWidth / imageRatio;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        wrapper.style.width = `${canvasWidth}px`;
        wrapper.style.height = `${canvasHeight}px`;

        canvas.getContext('2d').drawImage(state.currentImage, 0, 0, canvasWidth, canvasHeight);
    };

    const downloadImage = () => {
        if (!state.currentImage) return;
        const format = ui.formatSelect.value;
        const extension = format.split('/')[1];
        const link = document.createElement('a');
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = state.currentImage.width;
        tempCanvas.height = state.currentImage.height;
        tempCanvas.getContext('2d').drawImage(state.currentImage, 0, 0, state.currentImage.width, state.currentImage.height);

        link.href = tempCanvas.toDataURL(format, 0.95);
        link.download = `resized-image.${extension}`;
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link);
    };
    
    const populateSizePresets = () => {
        if (!ui.sizePresets) return;
        const optionsHtml = [`<option value="">Select a preset...</option>`];
        SIZE_PRESETS.forEach(category => {
            optionsHtml.push(`<optgroup label="${category.label}">`);
            category.sizes.forEach(size => {
                optionsHtml.push(`<option value="${size.value.join(',')}">${size.name}</option>`);
            });
            optionsHtml.push(`</optgroup>`);
        });
        ui.sizePresets.innerHTML = optionsHtml.join('');
    };

    const updateResizeInputs = () => {
        if (state.currentImage) {
            ui.resizeWidth.value = state.currentImage.width;
            ui.resizeHeight.value = state.currentImage.height;
        }
    };
    
    const applyResize = () => {
        if (!state.originalImage) {
            alert("No image loaded to resize.");
            return;
        }
        const width = parseInt(ui.resizeWidth.value, 10);
        const height = parseInt(ui.resizeHeight.value, 10);
        if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
            alert("Please enter valid positive numbers for width and height.");
            return;
        }

        const offscreenCanvas = new OffscreenCanvas(width, height);
        const ctx = offscreenCanvas.getContext('2d');
        ctx.drawImage(state.originalImage, 0, 0, width, height);
        
        offscreenCanvas.convertToBlob({ type: 'image/png' }).then(blob => {
            const newImage = new Image();
            newImage.onload = () => {
                URL.revokeObjectURL(newImage.src); // Clean up blob URL to prevent memory leaks
                state.currentImage = newImage;
                drawImage();
            };
            newImage.src = URL.createObjectURL(blob);
        });
    };

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        window.addEventListener('resize', debounce(drawImage, 150));
        
        const dropZone = ui.dropZone;
        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('border-indigo-600', 'dark:border-indigo-300');
            dropZone.classList.remove('border-slate-400', 'dark:border-slate-500');
        });
        ['dragleave', 'dragend', 'drop'].forEach(type => {
            dropZone.addEventListener(type, (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-indigo-600', 'dark:border-indigo-300');
            });
        });
        dropZone.addEventListener('drop', e => {
            if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]);
        });
        
        ui.fileUpload.addEventListener("change", e => {
            if (e.target.files.length) handleImageUpload(e.target.files[0]);
        });
        
        ui.downloadBtn.addEventListener('click', downloadImage);
        ui.resetBtn.addEventListener('click', setReadyState);
        ui.resizeBtn.addEventListener('click', applyResize);

        ui.sizePresets.addEventListener('change', (e) => {
            const value = e.target.value;
            if (!value) return;
            const [width, height] = value.split(',');
            state.isAdjustingResize = true;
            ui.resizeWidth.value = width;
            ui.resizeHeight.value = height;
            state.isAdjustingResize = false;
        });

        const handleManualResizeInput = (e) => {
            if (ui.sizePresets.value) ui.sizePresets.value = '';
            if (state.isAdjustingResize || !ui.aspectRatioLock.checked || !state.originalImage) return;
            
            state.isAdjustingResize = true;
            const sourceInput = e.target;
            const aspectRatio = state.originalImage.width / state.originalImage.height;
            
            if (sourceInput === ui.resizeWidth) {
                const newHeight = Math.round(parseInt(sourceInput.value, 10) / aspectRatio);
                ui.resizeHeight.value = isNaN(newHeight) ? '' : newHeight;
            } else {
                const newWidth = Math.round(parseInt(sourceInput.value, 10) * aspectRatio);
                ui.resizeWidth.value = isNaN(newWidth) ? '' : newWidth;
            }
            state.isAdjustingResize = false;
        };
        
        ui.resizeWidth.addEventListener('input', handleManualResizeInput);
        ui.resizeHeight.addEventListener('input', handleManualResizeInput);
    }
    
    // --- Initialisation ---
    setReadyState();
    populateSizePresets();
    setupEventListeners();
});