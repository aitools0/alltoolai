document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const uploadArea = document.getElementById('upload-area');
    const uploadInput = document.getElementById('upload-input');
    const fileInfoBar = document.getElementById('file-info-bar');
    const fileCountEl = document.getElementById('file-count');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const previewGrid = document.getElementById('preview-grid');
    const controlsWrapper = document.querySelector('.controls-wrapper');
    const formatSelect = document.getElementById('format');
    const qualityControl = document.getElementById('quality-control');
    const qualityInput = document.getElementById('quality');
    const qualityValue = document.getElementById('quality-value');
    const convertBtn = document.getElementById('convert-btn');
    const progressBar = document.getElementById('progress-bar');
    const statusMessage = document.getElementById('status-message');
    const zipBtn = document.getElementById('zip-btn');

    // --- Application State ---
    let filesToProcess = [];
    let convertedFiles = [];
    let isConverting = false;

    // --- Utility Functions ---
    const preventDefaults = e => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // --- UI Update Functions ---

    const updateUIState = () => {
        const hasFiles = filesToProcess.length > 0;
        
        fileInfoBar.classList.toggle('hidden', !hasFiles);
        previewGrid.classList.toggle('hidden', !hasFiles);
        controlsWrapper.classList.toggle('hidden', !hasFiles);
        uploadArea.classList.toggle('hidden', hasFiles);

        if (hasFiles) {
            fileCountEl.textContent = `${filesToProcess.length} file(s) selected`;
        }
        
        convertBtn.disabled = !hasFiles || isConverting;
        zipBtn.classList.toggle('hidden', convertedFiles.length === 0);
    };

    const setControlsDisabled = (disabled) => {
        isConverting = disabled;
        convertBtn.disabled = disabled || filesToProcess.length === 0;
        uploadArea.style.pointerEvents = disabled ? 'none' : 'auto';
        clearAllBtn.disabled = disabled;
        formatSelect.disabled = disabled;
        qualityInput.disabled = disabled;
        
        // Disable remove buttons on previews during conversion
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.disabled = disabled;
        });
    };

    const toggleQualityControl = () => {
        const format = formatSelect.value;
        qualityControl.classList.toggle('hidden', format !== 'jpeg' && format !== 'webp');
    };

    const resetConvertedState = () => {
        convertedFiles = [];
        zipBtn.classList.add('hidden');
        progressBar.style.visibility = 'hidden';
        progressBar.value = 0;
        statusMessage.textContent = '';
        
        document.querySelectorAll('.result-overlay').forEach(el => el.remove());
        updateUIState();
    };
    
    // --- Core Logic Functions ---

    const resetAll = () => {
        filesToProcess = [];
        convertedFiles = []; // Also clear converted files
        uploadInput.value = ''; // Ensure input is cleared
        previewGrid.innerHTML = ''; 
        resetConvertedState();
    };

    const addFilesToQueue = (files) => {
        if (isConverting) return;
        
        let newFilesAdded = false;
        for (const file of files) {
            // Validate file type and check for duplicates
            if (file.type.startsWith('image/') && !filesToProcess.some(f => f.file.name === file.name)) {
                const fileData = {
                    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    file: file,
                    name: file.name
                };
                filesToProcess.push(fileData);
                
                // Create and append the preview card for the new file
                const previewCard = createPreviewCard(fileData);
                previewGrid.appendChild(previewCard);
                newFilesAdded = true;
            }
        }
        
        if (newFilesAdded) {
            resetConvertedState(); // If new files are added, previous conversion is invalid
        }
        
        // IMPORTANT: Clear the input value to allow selecting the same file again
        uploadInput.value = '';
    };

    const removeFile = (fileId) => {
        // Find the file to remove
        const fileToRemove = filesToProcess.find(f => f.id === fileId);
        if (!fileToRemove) return;

        // Remove from the main file list
        filesToProcess = filesToProcess.filter(f => f.id !== fileId);
        
        // Also remove from the converted files list to keep ZIP in sync
        convertedFiles = convertedFiles.filter(cf => cf.originalName !== fileToRemove.name);

        // Remove the preview card from the DOM
        document.getElementById(fileId)?.remove();

        if (filesToProcess.length === 0) {
            resetAll();
        } else {
            updateUIState();
        }
    };

    const convertSingleImage = (fileData) => {
        return new Promise((resolve, reject) => {
            const objectURL = URL.createObjectURL(fileData.file);
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                
                const format = formatSelect.value;
                // For formats that don't support transparency, draw a white background
                if (format === 'jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(objectURL); // Revoke URL after drawing to free memory
                
                const mimeType = `image/${format}`;
                const quality = (format === 'jpeg' || format === 'webp') ? (qualityInput.value / 100) : undefined;
                
                canvas.toBlob(blob => {
                    if (!blob) {
                        return reject(new Error('Canvas toBlob operation failed.'));
                    }
                    const baseName = fileData.name.substring(0, fileData.name.lastIndexOf('.')) || fileData.name;
                    resolve({
                        blob,
                        newName: `${baseName}.${format}`,
                        originalName: fileData.name,
                        size: formatFileSize(blob.size),
                    });
                }, mimeType, quality);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectURL);
                reject(new Error("Image failed to load."));
            };

            img.src = objectURL;
        });
    };
    
    async function processConversion() {
        if (filesToProcess.length === 0 || isConverting) return;
        
        setControlsDisabled(true);
        resetConvertedState();
        progressBar.style.visibility = 'visible';
        
        let convertedCount = 0;
        const totalFiles = filesToProcess.length;

        for (const fileData of filesToProcess) {
            try {
                const result = await convertSingleImage(fileData);
                convertedFiles.push(result);
                displayResultOnPreview(fileData.id, result.size, false);
            } catch (error) {
                console.error("Conversion error for", fileData.name, error);
                displayResultOnPreview(fileData.id, "Error", true);
            }
            
            convertedCount++;
            const progress = (convertedCount / totalFiles) * 100;
            progressBar.value = progress;
            
            // Throttle DOM updates to prevent UI lag on large batches
            if (convertedCount % 5 === 0 || convertedCount === totalFiles) {
                statusMessage.textContent = `Converting... (${convertedCount}/${totalFiles})`;
            }
        }
        
        statusMessage.textContent = "Conversion Complete!";
        setControlsDisabled(false);
        updateUIState();
    }
    
    async function downloadAllAsZip() {
        if (convertedFiles.length === 0) return;
        
        zipBtn.disabled = true;
        statusMessage.textContent = "Zipping files...";

        try {
            if (typeof JSZip === 'undefined') {
                throw new Error("Zipping library (JSZip) not found.");
            }
            const zip = new JSZip();
            convertedFiles.forEach(file => {
                zip.file(file.newName, file.blob);
            });
            
            const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `converted_images_${Date.now()}.zip`;
            document.body.appendChild(link); // Required for Firefox
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); // Clean up
            
            statusMessage.textContent = "ZIP download started.";
        } catch(error) {
            statusMessage.textContent = `Error: ${error.message}`;
            console.error("ZIP Error:", error);
        } finally {
            zipBtn.disabled = false;
        }
    }


    // --- Dynamic Element Creation ---

    function createPreviewCard(fileData) {
        const item = document.createElement('div');
        item.className = 'result-card relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col shadow-sm';
        item.id = fileData.id;
        
        const img = document.createElement('img');
        const objectUrl = URL.createObjectURL(fileData.file);
        img.src = objectUrl;
        img.alt = fileData.name;
        // Revoke the object URL once the image has loaded to free up memory
        img.onload = () => URL.revokeObjectURL(objectUrl);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn absolute z-10 flex flex-col p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer';
        removeBtn.title = "Remove file";
        removeBtn.innerHTML = '❌'; // Use HTML entity for a cleaner 'X'
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            removeFile(fileData.id);
        });
        
        item.append(img, removeBtn);
        return item;
    }
    
    function displayResultOnPreview(id, text, isError) {
        const previewItem = document.getElementById(id);
        if (!previewItem) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'result-overlay absolute bottom-0 left-0 right-0 p-1 text-center text-base text-white font-semibold';
        overlay.style.backgroundColor = isError ? 'rgba(239, 68, 68, 0.85)' : 'rgba(21, 128, 61, 0.85)';
        overlay.innerHTML = isError ? text : `✓ ${text}`;
        
        // Remove old overlay if it exists, then add the new one
        previewItem.querySelector('.result-overlay')?.remove();
        previewItem.appendChild(overlay);
    }
    
    // --- Initial Setup and Event Listeners ---
    const handleDragClass = (e, add) => {
        e.preventDefault();
        e.stopPropagation();
        if (isConverting) return;
        const label = uploadArea.firstElementChild;
        if (label) {
            label.classList.toggle('border-indigo-600', add);
            label.classList.toggle('border-slate-400', !add);
            label.classList.toggle('dark:border-indigo-300', add);
            label.classList.toggle('dark:border-slate-500', !add);
        }
    };

    // Drag & Drop event listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        uploadArea.addEventListener(evt, preventDefaults);
    });

    ['dragenter', 'dragover'].forEach(ev => {
        uploadArea.addEventListener(ev, e => handleDragClass(e, true));
    });

    ['dragleave', 'drop'].forEach(ev => {
        uploadArea.addEventListener(ev, e => handleDragClass(e, false));
    });
    
    uploadArea.addEventListener('drop', (e) => {
        addFilesToQueue(e.dataTransfer.files);
    });

    uploadInput.addEventListener('change', (e) => {
        addFilesToQueue(e.target.files);
    });
    
    clearAllBtn.addEventListener('click', resetAll);
    formatSelect.addEventListener('change', () => {
        toggleQualityControl();
        // Changing format invalidates previous conversion
        if (convertedFiles.length > 0) resetConvertedState();
    });
    
    qualityInput.addEventListener('input', e => qualityValue.textContent = `${e.target.value}%`);
    convertBtn.addEventListener('click', processConversion);
    zipBtn.addEventListener('click', downloadAllAsZip);

    // Initial UI state setup
    toggleQualityControl();
    updateUIState();
});