document.addEventListener('DOMContentLoaded', () => {
    // Graceful failure if the PDF library doesn't load
    if (typeof window.jspdf === 'undefined') {
        const toolEl = document.getElementById('converter-tool');
        if (toolEl) {
            toolEl.innerHTML = '<div class="p-4 rounded-md text-sm bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"><strong>Critical Error:</strong> Could not load the PDF generation library. This might be due to a network issue. Please check your connection and refresh the page.</div>';
        }
        return;
    }
    
    class ImageToPdfApp {
        constructor() {
            this.imageItems = [];
            this.draggedIndex = null;
            this.cacheDOMElements();
            this.createPreviewPlaceholder();
            this.addEventListeners();
            this.updateUIState();
        }
        
        cacheDOMElements() {
            this.elements = {
                uploadSection: document.getElementById('upload-section'),
                uploadArea: document.getElementById('upload-area'),
                fileInput: document.getElementById('file-input'),
                pagesContainer: document.getElementById('pages-container'),
                previewSection: document.getElementById('preview-section'),
                settingsArea: document.getElementById('settings-area'),
                actionSection: document.getElementById('action-section'),
                addMoreImgBtn: document.getElementById('add-more-img'),
                convertBtn: document.getElementById('convert-btn'),
                resetBtn: document.getElementById('reset-btn'),
                btnText: document.querySelector('#convert-btn .btn-text'),
                spinner: document.querySelector('#convert-btn .spinner'),
                resetModal: document.getElementById('reset-modal'),
                modalCancelBtn: document.getElementById('modal-cancel-btn'),
                modalConfirmResetBtn: document.getElementById('modal-confirm-reset-btn'),
            };
        }

        createPreviewPlaceholder() {
            const el = document.createElement('div');
            el.className = 'col-span-full flex items-center justify-center text-center py-8 text-slate-500 dark:text-slate-400';
            el.textContent = 'Your selected images will appear here. Drag to reorder them.';
            this.elements.previewPlaceholder = el;
        }
        
        addEventListeners() {
            const { uploadArea, fileInput, addMoreImgBtn, convertBtn, resetBtn, modalCancelBtn, modalConfirmResetBtn } = this.elements;
            
            addMoreImgBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));

            const handleDragClass = (e, add) => {
                e.preventDefault();
                e.stopPropagation();
                const label = uploadArea.firstElementChild;
                label.classList.toggle('border-indigo-600', add);
                label.classList.toggle('border-slate-400', !add);
                label.classList.toggle('dark:border-indigo-300', add);
                label.classList.toggle('dark:border-slate-500', !add);
            };
            ['dragenter', 'dragover'].forEach(ev => uploadArea.addEventListener(ev, e => handleDragClass(e, true)));
            ['dragleave', 'drop'].forEach(ev => uploadArea.addEventListener(ev, e => handleDragClass(e, false)));
            uploadArea.addEventListener('drop', this.handleFileDrop.bind(this));
            
            convertBtn.addEventListener('click', this.convertToPdf.bind(this));
            resetBtn.addEventListener('click', this.showResetModal.bind(this));
            modalCancelBtn.addEventListener('click', this.hideResetModal.bind(this));
            modalConfirmResetBtn.addEventListener('click', this.performReset.bind(this));
        }

        handleFileSelect(event) {
            this.addFiles([...event.target.files]);
            event.target.value = '';
        }

        handleFileDrop(event) {
            this.addFiles([...event.dataTransfer.files]);
        }

        preventDefaults(event) {
             event.preventDefault();
             event.stopPropagation();
        }
        
        showResetModal() {
            if (this.imageItems.length > 0) this.elements.resetModal.classList.remove('hidden');
        }

        hideResetModal() {
            this.elements.resetModal.classList.add('hidden');
        }
        
        performReset() {
            this.hideResetModal();
            this.imageItems.forEach(item => URL.revokeObjectURL(item.objectURL));
            this.imageItems = [];
            
            document.getElementById('page-size').value = 'a4';
            document.getElementById('orientation').value = 'p';
            document.getElementById('margin').value = '10';
            document.getElementById('image-fit').value = 'contain';
            document.getElementById('image-quality').value = 'NONE';
            document.getElementById('author').value = '';
            document.getElementById('filename').value = 'converted-images.pdf';

            this.renderPreview();
        }

        addFiles(files) {
            const imageFiles = files.filter(f => f.type.startsWith('image/'));
            if (imageFiles.length === 0) return;

            for (const file of imageFiles) {
                this.imageItems.push({ file, objectURL: URL.createObjectURL(file) });
            }
            this.renderPreview();
        }

        removeFile(indexToRemove) {
            URL.revokeObjectURL(this.imageItems[indexToRemove].objectURL);
            this.imageItems.splice(indexToRemove, 1);
            this.renderPreview();
        }

        handleRotate(pageElement) {
            const img = pageElement.querySelector('img');
            const currentRotation = parseInt(pageElement.dataset.rotation || '0', 10);
            const newRotation = (currentRotation + 90) % 360;
            pageElement.dataset.rotation = newRotation;
            img.style.transform = `rotate(${newRotation}deg)`;
        }
        
        renderPreview() {
            const { pagesContainer, previewPlaceholder } = this.elements;
            pagesContainer.innerHTML = '';
            
            if (this.imageItems.length === 0) {
                pagesContainer.appendChild(previewPlaceholder);
            } else {
                // PERFORMANCE OPTIMIZATION: Use a document fragment to batch DOM appends, reducing layout reflows.
                const fragment = document.createDocumentFragment();
                this.imageItems.forEach((item, index) => {
                    fragment.appendChild(this.createPreviewItem(item.objectURL, index));
                });
                pagesContainer.appendChild(fragment);
            }
            this.updateUIState();
        }
        
        createPreviewItem(src, index) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col cursor-move';
            pageDiv.draggable = true;
            pageDiv.dataset.index = index;
            pageDiv.dataset.rotation = '0';

            pageDiv.innerHTML = `
                <div class="absolute z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="rotate-btn bg-transparent text-2xl cursor-pointer" title="Rotate 90°">🔄</button>
                    <button class="remove-btn bg-transparent text-xl cursor-pointer" title="Delete Page">❌</button>
                </div>
                <div class="w-full h-48 flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-900">
                    <img src="${src}" alt="Page ${index + 1}" loading="lazy" class="max-w-full max-h-full transition-transform duration-300">
                </div>
                <span class="block font-semibold text-center p-2 border-t border-indigo-300 truncate" title="Page ${index + 1}">Page ${index + 1}</span>
            `;

            pageDiv.querySelector('.remove-btn').onclick = (e) => { e.stopPropagation(); this.removeFile(index); };
            pageDiv.querySelector('.rotate-btn').onclick = (e) => { e.stopPropagation(); this.handleRotate(pageDiv); };

            pageDiv.addEventListener('dragstart', this.handleDragStart.bind(this));
            pageDiv.addEventListener('dragend', this.handleDragEnd.bind(this));
            pageDiv.addEventListener('dragover', this.preventDefaults);
            pageDiv.addEventListener('drop', this.handleDrop.bind(this));

            return pageDiv;
        }

        handleDragStart(e) {
            this.draggedIndex = parseInt(e.currentTarget.dataset.index, 10);
            e.currentTarget.classList.add('dragging');
        }

        handleDragEnd(e) {
            e.currentTarget.classList.remove('dragging');
        }

        handleDrop(e) {
            this.preventDefaults(e);
            if (this.draggedIndex === null) return;
            const dropIndex = parseInt(e.currentTarget.dataset.index, 10);
            if (this.draggedIndex === dropIndex) return;

            const movedItem = this.imageItems.splice(this.draggedIndex, 1)[0];
            this.imageItems.splice(dropIndex, 0, movedItem);

            this.renderPreview();
            this.draggedIndex = null;
        }
        
        toggleLoadingState(isLoading) {
            const { btnText, spinner, convertBtn, resetBtn } = this.elements;
            btnText.textContent = isLoading ? 'Creating PDF...' : 'Create PDF';
            spinner.classList.toggle('hidden', !isLoading);
            convertBtn.disabled = isLoading;
            resetBtn.disabled = isLoading;
        }

        updateUIState() {
            const hasFiles = this.imageItems.length > 0;
            const { uploadSection, previewSection, settingsArea, actionSection, convertBtn, resetBtn } = this.elements;

            uploadSection.classList.toggle('hidden', hasFiles);
            previewSection.classList.toggle('hidden', !hasFiles);
            settingsArea.classList.toggle('hidden', !hasFiles);
            actionSection.classList.toggle('hidden', !hasFiles);
            convertBtn.disabled = !hasFiles;
            resetBtn.disabled = !hasFiles;
        }
        
        async convertToPdf() {
            if (this.imageItems.length === 0) return;
            this.toggleLoadingState(true);

            // PERFORMANCE OPTIMIZATION: Read all settings from the DOM once before the loop begins.
            const pdfSettings = {
                orientation: document.getElementById('orientation').value,
                format: document.getElementById('page-size').value,
                author: document.getElementById('author').value.trim(),
                margin: parseFloat(document.getElementById('margin').value) || 0,
                imageFit: document.getElementById('image-fit').value,
                quality: document.getElementById('image-quality').value,
            };

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ 
                    orientation: pdfSettings.orientation, 
                    unit: 'mm', 
                    format: pdfSettings.format 
                });
                
                if (pdfSettings.author) doc.setProperties({ author: pdfSettings.author });

                for (const [index, item] of this.imageItems.entries()) {
                     if (index > 0) doc.addPage();
                     const imgData = await this.getImageData(item.file);
                     this.addImageToPdfPage(doc, imgData, item, pdfSettings);
                }
                const filenameInput = document.getElementById('filename').value.trim() || 'converted-images';
                const filename = filenameInput.toLowerCase().endsWith('.pdf') ? filenameInput : `${filenameInput}.pdf`;
                doc.save(filename);
            } catch (error) {
                console.error("Failed to create PDF:", error);
                alert(`Error creating PDF: ${error.message || 'An unknown error occurred.'}`);
            } finally {
                this.toggleLoadingState(false);
            }
        }

        getImageData(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = new Image();
                    img.onload = () => resolve({ src: e.target.result, width: img.width, height: img.height, type: file.type });
                    img.onerror = () => reject(new Error('Could not load image data.'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('Could not read file.'));
                reader.readAsDataURL(file);
            });
        }
        
        addImageToPdfPage(doc, img, item, settings) {
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const { margin, imageFit, quality } = settings;

            const availableW = pageW - margin * 2;
            const availableH = pageH - margin * 2;
            if (availableW <= 0 || availableH <= 0) {
                throw new Error('Page margins are larger than the page itself and no space is left for the image.');
            }

            const pageElement = this.elements.pagesContainer.querySelector(`[data-index="${this.imageItems.indexOf(item)}"]`);
            const rotation = pageElement ? parseInt(pageElement.dataset.rotation || '0', 10) : 0;
            
            const imgRatio = img.width / img.height;
            let finalW, finalH;

            if (imageFit === 'cover') {
                const pageRatio = availableW / availableH;
                finalW = (imgRatio > pageRatio) ? availableH * imgRatio : availableW;
                finalH = (imgRatio > pageRatio) ? availableH : availableW / imgRatio;
            } else { // 'contain'
                const ratio = Math.min(availableW / img.width, availableH / img.height);
                finalW = img.width * ratio;
                finalH = img.height * ratio;
            }

            let rotatedW = finalW, rotatedH = finalH;
            if (rotation === 90 || rotation === 270) [rotatedW, rotatedH] = [rotatedH, rotatedW];
            
            const imgX = margin + (availableW - rotatedW) / 2;
            const imgY = margin + (availableH - rotatedH) / 2;

            const imgType = img.type.toUpperCase().replace('IMAGE/', '');
            const finalImgType = ['JPEG', 'JPG', 'PNG'].includes(imgType) ? imgType : 'JPEG';
            const compression = (finalImgType === 'JPEG' && quality !== 'NONE') ? quality : 'NONE';
            
            doc.addImage(img.src, finalImgType, imgX, imgY, finalW, finalH, null, compression, rotation);
        }
    }
    
    new ImageToPdfApp();
});