    document.addEventListener('DOMContentLoaded', () => {
        const ui = {};
        document.querySelectorAll('[id]').forEach(el => {
            const camelCaseId = el.id.replace(/-([a-z])/g, g => g[1].toUpperCase());
            ui[camelCaseId] = el;
        });

        const state = {
            originalImage: null, currentImage: null, isCropping: false,
            cropBox: {}, dragInfo: {}, fixedAspectRatio: null,
            isDragUpdatePending: false
        };

        const CROP_PRESETS = [
             { group: "Official Document Photos", presets: [ { name: "Passport (1:1)", w: 1, h: 1 }, { name: "Stamp Size (9:11)", w: 9, h: 11 }, { name: "ID Card (2:3)", w: 2, h: 3 } ] },
            { group: "Print Sizes", presets: [ { name: "Wallet (2.5:3.5)", w: 2.5, h: 3.5 }, { name: "4R - 4x6 in (2:3)", w: 2, h: 3 }, { name: "5R - 5x7 in (5:7)", w: 5, h: 7 } ] },
            { group: "Social Media", presets: [ { name: "Square (1:1)", w: 1, h: 1 }, { name: "Portrait (4:5)", w: 4, h: 5 }, { name: "Landscape (16:9)", w: 16, h: 9 }, { name: "Story/Reels (9:16)", w: 9, h: 16 } ] }
        ];

        // --- Utility Functions ---
        const getEventCoords = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

        const debounce = (func, delay) => {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        };

        // --- State Management ---
        const setReadyState = () => {
            ui.uploadSection.classList.remove('hidden'); ui.editorSection.classList.add('hidden');
            ui.fileName.textContent = ''; ui.fileUpload.value = '';
            if (state.originalImage) URL.revokeObjectURL(state.originalImage.src);
            Object.assign(state, { originalImage: null, currentImage: null, isCropping: false, cropBox: {}, dragInfo: {}, fixedAspectRatio: null });
            exitCropMode();
        };
        const setFileLoadedState = (file) => {
            ui.uploadSection.classList.add('hidden'); ui.editorSection.classList.remove('hidden');
            ui.fileName.textContent = `File: ${file.name}`;
        };

        // --- Image and Canvas Handling ---
        const handleImageUpload = (file) => {
            if (!file || !file.type.startsWith("image/")) { alert("Please upload a valid image file."); return; }
            const image = new Image();
            image.src = URL.createObjectURL(file);
            image.onload = () => {
                state.originalImage = image; state.currentImage = image;
                setFileLoadedState(file);
                requestAnimationFrame(drawImage);
            };
        };

        const drawImage = () => {
            if (!state.currentImage) return;
            const canvas = ui.editorCanvas; 
            const container = ui.previewContainer;
            const wrapper = ui.canvasWrapper;
            
            const containerRect = container.getBoundingClientRect();
            if (containerRect.width === 0 || containerRect.height === 0) return; // Don't draw if not visible
            
            const imageRatio = state.currentImage.width / state.currentImage.height;
            const containerRatio = containerRect.width / containerRect.height;
            
            if (containerRatio > imageRatio) {
                canvas.height = containerRect.height; canvas.width = canvas.height * imageRatio;
            } else {
                canvas.width = containerRect.width; canvas.height = canvas.width / imageRatio;
            }

            wrapper.style.width = `${canvas.width}px`;
            wrapper.style.height = `${canvas.height}px`;

            canvas.getContext('2d').drawImage(state.currentImage, 0, 0, canvas.width, canvas.height);
            if (state.isCropping) updateCropper();
        };

        const downloadImage = () => {
            if (!state.currentImage) return;
            const format = ui.formatSelect.value; const extension = format.split('/')[1];
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.currentImage.width; tempCanvas.height = state.currentImage.height;
            tempCanvas.getContext('2d').drawImage(state.currentImage, 0, 0);
            const link = document.createElement('a');
            link.href = tempCanvas.toDataURL(format, 0.95);
            link.download = `cropped-image.${extension}`; link.click();
        };

        // --- Cropping Logic ---
        const enterCropMode = (isFreeform = true) => {
            if (isFreeform) { state.fixedAspectRatio = null; ui.resizePresetSelect.value = ""; }
            state.isCropping = true;
            ui.cropper.classList.remove('hidden'); ui.cropActionsDefault.classList.add('hidden'); ui.cropActions.classList.remove('hidden');
            
            const canvas = ui.editorCanvas;
            const initialWidth = canvas.width * 0.8;
            let initialHeight = canvas.height * 0.8;
            
            state.cropBox = {
                width: initialWidth, height: initialHeight,
                left: (canvas.width - initialWidth) / 2, top: (canvas.height - initialHeight) / 2
            };
            
            if (state.fixedAspectRatio) {
                const aspectHeight = state.cropBox.width / state.fixedAspectRatio;
                if(aspectHeight <= canvas.height) {
                    state.cropBox.height = aspectHeight;
                } else {
                    state.cropBox.width = state.cropBox.height * state.fixedAspectRatio;
                }
                state.cropBox.left = (canvas.width - state.cropBox.width) / 2;
                state.cropBox.top = (canvas.height - state.cropBox.height) / 2;
            }
            updateCropper();
        };
        const exitCropMode = () => {
            state.isCropping = false;
            ui.cropper.classList.add('hidden'); ui.cropActionsDefault.classList.remove('hidden'); ui.cropActions.classList.add('hidden');
            stopDrag();
        };
        const updateCropper = () => { Object.assign(ui.cropper.style, { left: `${state.cropBox.left}px`, top: `${state.cropBox.top}px`, width: `${state.cropBox.width}px`, height: `${state.cropBox.height}px` }); };

        const applyCrop = () => {
            const canvas = ui.editorCanvas;
            const scaleX = state.currentImage.width / canvas.width; const scaleY = state.currentImage.height / canvas.height;
            const sourceX = state.cropBox.left * scaleX; const sourceY = state.cropBox.top * scaleY;
            const sourceWidth = state.cropBox.width * scaleX; const sourceHeight = state.cropBox.height * scaleY;
            
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = Math.round(sourceWidth); finalCanvas.height = Math.round(sourceHeight);
            finalCanvas.getContext('2d').drawImage(state.currentImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, finalCanvas.width, finalCanvas.height);
            
            const newImage = new Image();
            newImage.onload = () => { 
                state.currentImage = newImage; 
                exitCropMode(); 
                drawImage(); 
            };
            newImage.src = finalCanvas.toDataURL();
        };
        
        // --- Drag/Resize Handlers (Optimized with requestAnimationFrame) ---
        const startDrag = (e) => {
            e.stopPropagation(); e.preventDefault();
            const coords = getEventCoords(e);
            state.dragInfo = {
                startX: coords.x, startY: coords.y, initial: { ...state.cropBox },
                type: e.target.classList.contains('cropper-point') ? 'resize' : 'move',
                handle: e.target.classList[1] || ''
            };
            window.addEventListener('mousemove', handleDrag); window.addEventListener('mouseup', stopDrag);
            window.addEventListener('touchmove', handleDrag, { passive: false }); window.addEventListener('touchend', stopDrag);
        };
        
        const handleDrag = (e) => {
            if (!state.dragInfo.type) return;
            e.preventDefault();
            const coords = getEventCoords(e); const dx = coords.x - state.dragInfo.startX; const dy = coords.y - state.dragInfo.startY;
            let { left, top, width, height } = state.dragInfo.initial; const canvas = ui.editorCanvas;

            if (state.dragInfo.type === 'move') {
                left = Math.max(0, Math.min(left + dx, canvas.width - width));
                top = Math.max(0, Math.min(top + dy, canvas.height - height));
            } else {
                const MIN_SIZE = 20; let newLeft = left, newTop = top, newWidth = width, newHeight = height;
                if (state.dragInfo.handle.includes('e')) newWidth = Math.max(MIN_SIZE, Math.min(width + dx, canvas.width - left));
                if (state.dragInfo.handle.includes('w')) {
                    const w = Math.max(MIN_SIZE, width - dx); if (left + width - w >= 0) { newLeft = left + width - w; newWidth = w; }
                }
                if (state.dragInfo.handle.includes('s')) newHeight = Math.max(MIN_SIZE, Math.min(height + dy, canvas.height - top));
                if (state.dragInfo.handle.includes('n')) {
                    const h = Math.max(MIN_SIZE, height - dy); if (top + height - h >= 0) { newTop = top + height - h; newHeight = h; }
                }
                
                if (state.fixedAspectRatio) {
                    const handle = state.dragInfo.handle;
                    if (handle.includes('n') || handle.includes('s')) { const oldWidth = newWidth; newWidth = newHeight * state.fixedAspectRatio; newLeft -= (newWidth - oldWidth) / 2; } 
                    else if (handle.includes('e') || handle.includes('w')) { const oldHeight = newHeight; newHeight = newWidth / state.fixedAspectRatio; newTop -= (newHeight - oldHeight) / 2; }
                }

                if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
                if (newTop < 0) { newHeight += newTop; newTop = 0; }
                if (newLeft + newWidth > canvas.width) { newWidth = canvas.width - newLeft; }
                if (newTop + newHeight > canvas.height) { newHeight = canvas.height - newTop; }

                if (state.fixedAspectRatio) {
                     if (state.dragInfo.handle.includes('n') || state.dragInfo.handle.includes('s')) { newHeight = newWidth / state.fixedAspectRatio; }
                     else { newWidth = newHeight * state.fixedAspectRatio; }
                }

                left = newLeft; top = newTop; width = newWidth; height = newHeight;
            }

            state.cropBox = { left, top, width, height };
            if (!state.isDragUpdatePending) {
                state.isDragUpdatePending = true;
                requestAnimationFrame(() => {
                    updateCropper();
                    state.isDragUpdatePending = false;
                });
            }
        };

        const stopDrag = () => {
            state.dragInfo = {};
            window.removeEventListener('mousemove', handleDrag); window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchmove', handleDrag); window.removeEventListener('touchend', stopDrag);
        };
        
        // --- Setup and Initialization ---
        function setupEventListeners() {
            window.addEventListener('resize', debounce(drawImage, 150));
            const dropZone = ui.dropZone;
            dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-indigo-600', 'dark:border-indigo-300'); dropZone.classList.remove('border-slate-400', 'dark:border-slate-500'); });
            ['dragleave', 'dragend'].forEach(type => dropZone.addEventListener(type, () => dropZone.classList.remove('border-indigo-600', 'dark:border-indigo-300')));
            dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('border-indigo-600', 'dark:border-indigo-300'); if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]); });
            ui.fileUpload.addEventListener("change", e => { if (e.target.files.length) handleImageUpload(e.target.files[0]); });
            ui.downloadBtn.addEventListener('click', downloadImage); ui.resetBtn.addEventListener('click', setReadyState);
            ui.startCropBtn.addEventListener('click', () => enterCropMode(true));
            ui.applyCropBtn.addEventListener('click', applyCrop); ui.cancelCropBtn.addEventListener('click', exitCropMode);
            ui.cropper.addEventListener('mousedown', startDrag); ui.cropper.addEventListener('touchstart', startDrag, { passive: false });
            ui.resizePresetSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value) {
                    const [w, h] = value.split(':').map(Number);
                    state.fixedAspectRatio = h ? w / h : null;
                } else {
                    state.fixedAspectRatio = null;
                }
                
                if (!state.isCropping) enterCropMode(false);
                else {
                    const canvas = ui.editorCanvas;
                    const newHeight = Math.min(state.cropBox.width / state.fixedAspectRatio, canvas.height);
                    const newWidth = newHeight * state.fixedAspectRatio;

                    state.cropBox.top = Math.max(0, state.cropBox.top + (state.cropBox.height - newHeight) / 2);
                    state.cropBox.left = Math.max(0, state.cropBox.left + (state.cropBox.width - newWidth) / 2);
                    state.cropBox.height = newHeight;
                    state.cropBox.width = newWidth;

                    if (state.cropBox.top + state.cropBox.height > canvas.height) {
                        state.cropBox.top = canvas.height - state.cropBox.height;
                    }
                     if (state.cropBox.left + state.cropBox.width > canvas.width) {
                        state.cropBox.left = canvas.width - state.cropBox.width;
                    }

                    updateCropper();
                }
            });
        }
        
        const populateCropPresets = () => {
            let html = `<option value="">Freeform</option>`;
            CROP_PRESETS.forEach(group => {
                html += `<optgroup label="${group.group}">`;
                group.presets.forEach(preset => { html += `<option value="${preset.w}:${preset.h}">${preset.name}</option>`; });
                html += `</optgroup>`;
            });
            ui.resizePresetSelect.innerHTML = html;
        };
        setReadyState(); populateCropPresets(); setupEventListeners();
    });