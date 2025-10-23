document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const uploadArea = document.getElementById('upload-area');
    const uploadInput = document.getElementById('upload-input');
    const fileInfoBar = document.getElementById('file-info-bar');
    const fileCountEl = document.getElementById('file-count');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const previewGrid = document.getElementById('preview-grid');
    const controlsWrapper = document.querySelector('.controls-wrapper');
    const targetSizeControls = document.getElementById('target-size-controls');
    const targetSizeInput = document.getElementById('target-size');
    const sizeUnitSelect = document.getElementById('size-unit');
    const qualityControl = document.getElementById('quality-control');
    const qualityInput = document.getElementById('quality');
    const qualityValue = document.getElementById('quality-value');
    const compressBtn = document.getElementById('compress-btn');
    const progressBar = document.getElementById('progress-bar');
    const statusMessage = document.getElementById('status-message');
    const zipBtn = document.getElementById('zip-btn');
    const modeRadios = document.querySelectorAll('input[name="mode"]');

    // --- Application State ---
    let filesToProcess = [];
    let compressedFiles = [];
    let isCompressing = false;
    let currentMode = 'manualQuality'; // Set default mode to Manual Quality

    // --- Utility Functions ---
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
    };
    // Helper to promisify the canvas.toBlob method for async/await usage
    const canvasToBlobAsync = (canvas, mimeType, quality) => {
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), mimeType, quality);
        });
    };
    
    // --- UI Update Functions ---
    const updateUIState = () => {
        const hasFiles = filesToProcess.length > 0;
        fileInfoBar.classList.toggle('hidden', !hasFiles);
        previewGrid.classList.toggle('hidden', !hasFiles);
        controlsWrapper.classList.toggle('hidden', !hasFiles);
        uploadArea.classList.toggle('hidden', hasFiles);
        if (hasFiles) fileCountEl.textContent = `${filesToProcess.length} file(s) selected`;
        compressBtn.disabled = !hasFiles || isCompressing;
        zipBtn.classList.toggle('hidden', compressedFiles.length === 0);
    };

    const setControlsDisabled = (disabled) => {
        isCompressing = disabled;
        compressBtn.disabled = disabled || filesToProcess.length === 0;
        uploadArea.style.pointerEvents = disabled ? 'none' : 'auto';
        clearAllBtn.disabled = disabled;
        targetSizeInput.disabled = disabled;
        sizeUnitSelect.disabled = disabled;
        qualityInput.disabled = disabled;
        modeRadios.forEach(radio => radio.disabled = disabled);
        document.querySelectorAll('.remove-btn').forEach(btn => btn.disabled = disabled);
    };

    const resetCompressedState = () => {
        compressedFiles = [];
        progressBar.style.visibility = 'hidden';
        progressBar.value = 0;
        statusMessage.textContent = '';
        filesToProcess.forEach(fileData => {
            const previewItem = document.getElementById(fileData.id);
            const overlay = previewItem?.querySelector('.result-overlay');
            if(overlay) {
                overlay.innerHTML = `<span>${formatFileSize(fileData.file.size)}</span>`;
                overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)'; // Default color
            }
        });
        updateUIState();
    };
    
    // --- Core Logic ---
    const resetAll = () => {
        filesToProcess = [];
        compressedFiles = [];
        uploadInput.value = '';
        previewGrid.innerHTML = ''; 
        resetCompressedState();
    };

    const addFilesToQueue = (files) => {
        if (isCompressing) return;
        let newFilesAdded = false;
        for (const file of files) {
            if (file.type.startsWith('image/') && !filesToProcess.some(f => f.file.name === file.name)) {
                const fileData = { id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, file, name: file.name };
                filesToProcess.push(fileData);
                previewGrid.appendChild(createPreviewCard(fileData));
                newFilesAdded = true;
            }
        }
        if (newFilesAdded) resetCompressedState();
        uploadInput.value = '';
    };

    const removeFile = (fileId) => {
        const fileToRemove = filesToProcess.find(f => f.id === fileId);
        if (!fileToRemove) return;
        filesToProcess = filesToProcess.filter(f => f.id !== fileId);
        compressedFiles = compressedFiles.filter(cf => cf.originalName !== fileToRemove.name);
        document.getElementById(fileId)?.remove();
        if (filesToProcess.length === 0) {
            resetAll();
        } else {
            updateUIState();
        }
    };
    
    // Main compression function using async/await to handle promises correctly
    const compressSingleImage = async (fileData) => {
        const img = await createImageBitmap(fileData.file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const baseName = fileData.name.substring(0, fileData.name.lastIndexOf('.')) || fileData.name;
        const newName = `${baseName}.jpg`; // Always export as JPG for best compression
        const mimeType = 'image/jpeg';
        let resultBlob;

        if (currentMode === 'targetSize') {
            const sizeValue = parseFloat(targetSizeInput.value);
            const targetBytes = sizeValue * (sizeUnitSelect.value === 'MB' ? 1048576 : 1024);
            if (fileData.file.size <= targetBytes) {
                return { blob: fileData.file, newName, originalName: fileData.name, finalSize: fileData.file.size, skipped: true };
            }
            
            // Perform binary search to find optimal quality
            let min = 0, max = 1.0, bestBlob = null;
            // More iterations for better accuracy
            for (let i = 0; i < 8; i++) { 
                const quality = (min + max) / 2;
                const blob = await canvasToBlobAsync(canvas, mimeType, quality);
                if (!blob) continue;

                if (blob.size > targetBytes) {
                    max = quality;
                } else {
                    bestBlob = blob;
                    min = quality;
                }
            }
            resultBlob = bestBlob || await canvasToBlobAsync(canvas, mimeType, 0.1); // Fallback
        } else { // Manual Quality mode
            const quality = parseInt(qualityInput.value) / 100;
            resultBlob = await canvasToBlobAsync(canvas, mimeType, quality);
        }
        return { blob: resultBlob, newName, originalName: fileData.name, finalSize: resultBlob.size };
    };
    
    async function processCompression() {
        if (filesToProcess.length === 0 || isCompressing) return;
        setControlsDisabled(true);
        resetCompressedState();
        progressBar.style.visibility = 'visible';
        
        const totalFiles = filesToProcess.length;
        for (let i = 0; i < totalFiles; i++) {
            const fileData = filesToProcess[i];
            try {
                const result = await compressSingleImage(fileData);
                compressedFiles.push(result);
                displayResultOnPreview(fileData.id, result, false);
            } catch (error) {
                console.error("Compression error:", error);
                displayResultOnPreview(fileData.id, null, true);
            }
            // Performance: Throttle UI updates to prevent lag
            if (i % 5 === 0 || i === totalFiles - 1) {
                progressBar.value = ((i + 1) / totalFiles) * 100;
                statusMessage.textContent = `Compressing... (${i + 1}/${totalFiles})`;
            }
        }
        
        statusMessage.textContent = "Compression Complete!";
        setControlsDisabled(false);
        updateUIState();
    }
    
    /**
     * --- UPGRADED ZIP FUNCTION ---
     * Creates a ZIP archive of all compressed files and initiates a download.
     * This version includes more robust error handling, uses DEFLATE compression 
     * for smaller file sizes, and has a more descriptive download filename.
     */
    async function downloadAllAsZip() {
        if (compressedFiles.length === 0) return;

        zipBtn.disabled = true;
        statusMessage.textContent = "Zipping files...";

        try {
            // Check if the JSZip library is available
            if (typeof JSZip === 'undefined') {
                throw new Error("Zipping library (JSZip) not found.");
            }
            const zip = new JSZip();

            // Add each compressed file to the zip object
            compressedFiles.forEach(file => {
                zip.file(file.newName, file.blob);
            });
            
            // UPGRADE: Generate the zip file using DEFLATE compression for better results
            const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
            
            // Create a temporary link element to trigger the browser download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            // UPGRADE: More descriptive filename
            link.download = `compressed_images_${Date.now()}.zip`;
            document.body.appendChild(link); // Required for Firefox compatibility
            link.click();
            document.body.removeChild(link); // Clean up the DOM by removing the link
            URL.revokeObjectURL(link.href); // Release the object URL from memory
            
            statusMessage.textContent = "ZIP download started.";
        } catch(error) {
            // Display any errors to the user and log them to the console
            statusMessage.textContent = `Error: ${error.message}`;
            console.error("ZIP Error:", error);
        } finally {
            // Re-enable the button whether the process succeeded or failed
            zipBtn.disabled = false;
        }
    }

    // --- Dynamic Element Creation ---
    function createPreviewCard(fileData) {
        const item = document.createElement('div');
        item.id = fileData.id;
        item.className = 'result-card relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col';
        
        const img = document.createElement('img');
        const objectUrl = URL.createObjectURL(fileData.file);
        img.src = objectUrl;
        img.alt = fileData.name;
        img.className = "w-full h-auto aspect-square object-cover";
        img.onload = () => URL.revokeObjectURL(objectUrl);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn absolute z-10 flex flex-col p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer';
        removeBtn.title = "Remove file";
        removeBtn.innerHTML = '❌';
        removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeFile(fileData.id); });
        
        const overlay = document.createElement('div');
        overlay.className = 'result-overlay absolute bottom-0 left-0 right-0 p-1 text-center text-base text-white font-semibold';
        overlay.innerHTML = `<span>${formatFileSize(fileData.file.size)}</span>`;

        item.append(img, removeBtn, overlay);
        return item;
    }
    
    function displayResultOnPreview(id, result, isError) {
        const previewItem = document.getElementById(id);
        const overlay = previewItem?.querySelector('.result-overlay');
        if (!overlay) return;

        if(isError) {
            overlay.innerHTML = `<span>Error</span>`;
            overlay.style.backgroundColor = 'rgba(220, 38, 38, 0.85)';
        } else {
            const originalSize = filesToProcess.find(f => f.id === id).file.size;
            if(result.skipped) {
                overlay.innerHTML = `<span>${formatFileSize(originalSize)} (Kept)</span>`;
                overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.85)'; // Blue for skipped/kept
            } else {
                const reduction = originalSize > 0 ? Math.round(100 * (originalSize - result.finalSize) / originalSize) : 0;
                overlay.innerHTML = `<span>${formatFileSize(result.finalSize)} (${reduction}% smaller)</span>`;
                overlay.style.backgroundColor = 'rgba(21, 128, 61, 0.85)'; // Green for success
            }
        }
    }
    
    // --- Event Listeners Setup ---
    const handleDragClass = (e, add) => {
        e.preventDefault();
        e.stopPropagation();
        const label = uploadArea.firstElementChild;
        if (label) {
            label.classList.toggle('border-indigo-600', add);
            label.classList.toggle('border-slate-400', !add);
            label.classList.toggle('dark:border-indigo-300', add);
            label.classList.toggle('dark:border-slate-500', !add);
        }
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        uploadArea.addEventListener(evt, preventDefaults);
    });

    ['dragenter', 'dragover'].forEach(ev => {
        uploadArea.addEventListener(ev, e => handleDragClass(e, true));
    });

    ['dragleave', 'drop'].forEach(ev => {
        uploadArea.addEventListener(ev, e => handleDragClass(e, false));
    });
    
    uploadArea.addEventListener('drop', (e) => addFilesToQueue(e.dataTransfer.files));
    uploadInput.addEventListener('change', (e) => addFilesToQueue(e.target.files));
    clearAllBtn.addEventListener('click', resetAll);
    compressBtn.addEventListener('click', processCompression);
    zipBtn.addEventListener('click', downloadAllAsZip);
    
    modeRadios.forEach(radio => radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        targetSizeControls.classList.toggle('hidden', currentMode !== 'targetSize');
        qualityControl.classList.toggle('hidden', currentMode !== 'manualQuality');
        if (compressedFiles.length > 0) resetCompressedState();
    }));
    
    qualityInput.addEventListener('input', e => {
        qualityValue.textContent = `${e.target.value}%`;
    });

    [targetSizeInput, sizeUnitSelect, qualityInput].forEach(el => {
        el.addEventListener('input', () => {
            if(compressedFiles.length > 0) {
                resetCompressedState();
            }
        });
    });

    // Initialize the UI on first load
    updateUIState();
});