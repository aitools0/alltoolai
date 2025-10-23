        document.addEventListener('DOMContentLoaded', () => {

            // --- PERFORMANCE: Debounce function to prevent lag on slider ---
            function debounce(func, delay) {
                let timeoutId;
                return function(...args) {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        func.apply(this, args);
                    }, delay);
                };
            }

            // --- DOM Elements ---
            const uploadSection = document.getElementById('upload-section');
            const editorSection = document.getElementById('editor-section');
            const fileUpload = document.getElementById('file-upload');
            const dropZone = document.getElementById('drop-zone');
            const fileNameDisplay = document.getElementById('file-name');
            
            const canvas = document.getElementById('editor-canvas');
            const ctx = canvas.getContext('2d');
            const previewContainer = document.getElementById('preview-container');
            
            const rotateLeftBtn = document.getElementById('rotate-left-btn');
            const rotateRightBtn = document.getElementById('rotate-right-btn');
            const flipHorizontalBtn = document.getElementById('flip-horizontal-btn');
            const flipVerticalBtn = document.getElementById('flip-vertical-btn');
            
            const straightenSlider = document.getElementById('straighten-slider');
            const straightenValue = document.getElementById('straighten-value');
            
            const resetBtn = document.getElementById('reset-btn');
            const formatSelect = document.getElementById('format-select');
            const downloadBtn = document.getElementById('download-btn');
            
            // --- State ---
            let image = new Image();
            let originalFileName = '';
            let rotation = 0; // in degrees
            let flipHorizontal = false;
            let flipVertical = false;
            
            // --- Handlers ---
            
            // File Upload
            fileUpload.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            
            function handleFileSelect(e) {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    processFile(file);
                }
            }
            
            function handleDragOver(e) {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('border-indigo-600');
            }
            
            function handleDragLeave(e) {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-indigo-600');
            }
            
            function handleDrop(e) {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-indigo-600');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    processFile(file);
                }
            }
            
            function processFile(file) {
                originalFileName = file.name;
                const reader = new FileReader();
                reader.onload = (e) => {
                    image.src = e.target.result;
                    image.onload = () => {
                        setupEditor();
                        applyTransformations();
                    }
                };
                reader.readAsDataURL(file);
                fileNameDisplay.textContent = file.name;
            }

            function setupEditor() {
                uploadSection.classList.add('hidden');
                editorSection.classList.remove('hidden');
                resetState();
            }

            // --- Transformations ---
            rotateLeftBtn.addEventListener('click', () => {
                rotation = (rotation - 90) % 360;
                applyTransformations();
            });

            rotateRightBtn.addEventListener('click', () => {
                rotation = (rotation + 90) % 360;
                applyTransformations();
            });

            flipHorizontalBtn.addEventListener('click', () => {
                flipHorizontal = !flipHorizontal;
                applyTransformations();
            });

            flipVerticalBtn.addEventListener('click', () => {
                flipVertical = !flipVertical;
                applyTransformations();
            });
            
            const debouncedApplyTransformations = debounce(applyTransformations, 50);

            straightenSlider.addEventListener('input', () => {
                // Update the text value instantly for good UX
                straightenValue.textContent = `${straightenSlider.value}°`;
                // Apply the heavy transformation with a delay to prevent lag
                debouncedApplyTransformations();
            });
            
            // This function updates the on-screen preview canvas
            function applyTransformations() {
                if (!image.src) return;

                const straightenAngle = parseFloat(straightenSlider.value);
                
                // Calculate bounding box after full rotation to fit the canvas correctly
                const rad = Math.abs(straightenAngle) * Math.PI / 180;
                const sin = Math.sin(rad);
                const cos = Math.cos(rad);
                
                const newWidth = Math.abs(image.width * cos) + Math.abs(image.height * sin);
                const newHeight = Math.abs(image.width * sin) + Math.abs(image.height * cos);

                // Determine scaling factor to fit inside the preview container
                const containerWidth = previewContainer.clientWidth - 32; // some padding
                const containerHeight = previewContainer.clientHeight - 32;

                const scale = Math.min(containerWidth / newWidth, containerHeight / newHeight, 1);
                
                canvas.width = newWidth * scale;
                canvas.height = newHeight * scale;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.rotate(straightenAngle * Math.PI / 180);
                ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
                ctx.drawImage(image, (-image.width * scale) / 2, (-image.height * scale) / 2, image.width * scale, image.height * scale);
                ctx.restore();
            }
            
            // --- Controls ---
            resetBtn.addEventListener('click', () => {
                uploadSection.classList.remove('hidden');
                editorSection.classList.add('hidden');
                fileUpload.value = '';
                fileNameDisplay.textContent = '';
                image = new Image();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                resetState();
            });

            function resetState() {
                 rotation = 0;
                 flipHorizontal = false;
                 flipVertical = false;
                 straightenSlider.value = 0;
                 straightenValue.textContent = '0°';
            }

            // --- HIGH QUALITY DOWNLOAD FUNCTION ---
            downloadBtn.addEventListener('click', async () => {
                if (!image.src) return;

                const originalButtonText = downloadBtn.innerHTML;
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = 'Processing...';

                // Yield to the main thread to allow the UI to update before heavy processing
                await new Promise(resolve => setTimeout(resolve, 0));

                try {
                    const format = formatSelect.value;
                    let filename = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || 'transformed-image';
                    const extension = format.split('/')[1];

                    const downloadCanvas = document.createElement('canvas');
                    const downloadCtx = downloadCanvas.getContext('2d');
                    const straightenAngle = parseFloat(straightenSlider.value);
                    
                    // --- Accurately calculate final image dimensions ---
                    // 1. Account for 90-degree rotations
                    let w = (rotation % 180 === 0) ? image.width : image.height;
                    let h = (rotation % 180 === 0) ? image.height : image.width;
                    
                    // 2. Account for straighten rotation on the new dimensions
                    const rad = Math.abs(straightenAngle) * (Math.PI / 180);
                    const sin = Math.sin(rad);
                    const cos = Math.cos(rad);
                    const finalWidth = Math.ceil(Math.abs(w * cos) + Math.abs(h * sin));
                    const finalHeight = Math.ceil(Math.abs(w * sin) + Math.abs(h * cos));
                    
                    downloadCanvas.width = finalWidth;
                    downloadCanvas.height = finalHeight;

                    if (format === 'image/jpeg') {
                        downloadCtx.fillStyle = '#FFFFFF';
                        downloadCtx.fillRect(0, 0, finalWidth, finalHeight);
                    }
                    
                    // Apply all transformations at full resolution
                    downloadCtx.translate(finalWidth / 2, finalHeight / 2);
                    downloadCtx.rotate(rotation * Math.PI / 180);
                    downloadCtx.rotate(straightenAngle * Math.PI / 180);
                    downloadCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
                    
                    // Draw original image centered, letting transformations handle placement
                    downloadCtx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
                    
                    // Trigger the download
                    const dataUrl = downloadCanvas.toDataURL(format, 1.0); // 1.0 is max quality
                    triggerDownload(dataUrl, `${filename}.${extension}`);
                } finally {
                    // Restore the button state whether the download succeeds or fails
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = originalButtonText;
                }
            });

            function triggerDownload(dataUrl, filename) {
                 const link = document.createElement('a');
                 link.href = dataUrl;
                 link.download = filename;
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
            }

            // Handle window resize to re-apply transformations and fit the preview canvas
            window.addEventListener('resize', applyTransformations);
        });