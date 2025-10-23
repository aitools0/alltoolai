        document.addEventListener('DOMContentLoaded', () => {
            // Check if PDFLib is loaded
            if (typeof PDFLib === 'undefined') {
                alert("Error: Could not load required PDF library. Please check your internet connection and refresh the page.");
                return;
            }
            const { PDFDocument } = PDFLib;

            // DOM Element References
            const DOMElements = {
                uploadSection: document.getElementById('upload-section'),
                uploadLabel: document.getElementById('upload-label'),
                pdfUpload: document.getElementById('pdf-upload'),
                fileNameSpan: document.getElementById('file-name'),
                settingsPanel: document.getElementById('settings-panel'),
                actionPanelContainer: document.getElementById('action-panel-container'),
                presetSizeSelect: document.getElementById('preset-size'),
                widthInput: document.getElementById('width'),
                heightInput: document.getElementById('height'),
                unitSelect: document.getElementById('unit'),
                aspectRatioToggle: document.getElementById('aspect-ratio-toggle'),
                pagesInput: document.getElementById('pages'), // UPGRADE
                resizeBtn: document.getElementById('resize-btn'),
                resetBtn: document.getElementById('reset-btn'),
                statusMessage: document.getElementById('status-message'),
            };

            // Application State
            let state = {
                originalPdfBytes: null,
                resizedPdfBytes: null,
                originalFileName: '',
                originalAspectRatio: 1,
            };

            const PRESET_SIZES_MM = {
                A4: [210, 297], A5: [148, 210], Letter: [215.9, 279.4], Legal: [215.9, 355.6]
            };

            // --- UI State Management ---
            const setReadyState = () => {
                DOMElements.uploadSection.classList.remove('hidden');
                DOMElements.pdfUpload.value = '';
                DOMElements.fileNameSpan.textContent = '';
                DOMElements.settingsPanel.classList.add('hidden');
                DOMElements.actionPanelContainer.classList.add('hidden');
                DOMElements.pagesInput.value = ''; // UPGRADE
                DOMElements.resizeBtn.disabled = true;
                DOMElements.resetBtn.disabled = true;
                state.originalPdfBytes = null;
                state.resizedPdfBytes = null;
                state.originalFileName = '';
                state.originalAspectRatio = 1;
                updateStatus('', 'clear');
            };

            const setFileLoadedState = () => {
                DOMElements.uploadSection.classList.add('hidden');
                DOMElements.settingsPanel.classList.remove('hidden');
                DOMElements.actionPanelContainer.classList.remove('hidden');
                DOMElements.resizeBtn.disabled = false;
                DOMElements.resetBtn.disabled = false;
            };

            // Event Listeners
            DOMElements.pdfUpload.addEventListener('change', handleFileSelect);
            DOMElements.presetSizeSelect.addEventListener('change', handlePresetChange);
            [DOMElements.widthInput, DOMElements.heightInput, DOMElements.unitSelect].forEach(el => {
                el.addEventListener('input', handleDimensionChange);
            });
            DOMElements.resizeBtn.addEventListener('click', applyResizeAndDownload);
            DOMElements.resetBtn.addEventListener('click', setReadyState);

            // --- Drag and Drop Event Listeners ---
            const dropZone = DOMElements.uploadLabel;
            const handleDrag = (e, enter) => {
                e.preventDefault();
                e.stopPropagation();
                if (enter) {
                    dropZone.classList.add('border-indigo-600', 'dark:border-indigo-300');
                    dropZone.classList.remove('border-slate-400', 'dark:border-slate-500');
                } else {
                    dropZone.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                    dropZone.classList.add('border-slate-400', 'dark:border-slate-500');
                }
            };
            dropZone.addEventListener("dragenter", e => handleDrag(e, true));
            dropZone.addEventListener("dragover", e => handleDrag(e, true));
            dropZone.addEventListener("dragleave", e => handleDrag(e, false));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDrag(e, false);
                const files = e.dataTransfer.files;
                if (files.length > 0) processFile(files[0]);
            });

            // --- Core Functions ---
            async function loadOriginalPdfDimensions() {
                if (!state.originalPdfBytes) return;
                try {
                    const pdfDoc = await PDFDocument.load(state.originalPdfBytes);
                    const { width, height } = pdfDoc.getPages()[0].getSize();
                    state.originalAspectRatio = width / height;
                    updateDimensionsUI(width, height);
                    updateStatus(`PDF loaded: ${pdfDoc.getPageCount()} pages found.`, 'success');
                } catch (error) {
                    console.error('Error loading PDF dimensions:', error);
                    updateStatus('Could not read PDF dimensions.', 'error');
                }
            }

            async function processFile(file) {
                 if (!file || file.type !== 'application/pdf') {
                    if(file) updateStatus('Invalid file type. Please select a PDF.', 'error');
                    return;
                }
                state.originalFileName = file.name.replace(/\.pdf$/i, '');
                DOMElements.fileNameSpan.textContent = `File: ${file.name}`;
                updateStatus('Loading PDF info...', 'loading');
                try {
                    state.originalPdfBytes = await file.arrayBuffer();
                    await loadOriginalPdfDimensions();
                    setFileLoadedState();
                } catch (e) {
                     updateStatus('Could not read the file.', 'error');
                     console.error(e);
                }
            }

            function handleFileSelect(event) {
                const file = event.target.files[0];
                if (file) processFile(file);
            }

            function handlePresetChange() {
                const preset = DOMElements.presetSizeSelect.value;
                if (preset === 'custom') return;
                if (preset === 'source') {
                    loadOriginalPdfDimensions();
                } else if (PRESET_SIZES_MM[preset]) {
                    const [w_mm, h_mm] = PRESET_SIZES_MM[preset];
                    DOMElements.unitSelect.value = 'mm';
                    DOMElements.widthInput.value = w_mm.toFixed(1);
                    DOMElements.heightInput.value = h_mm.toFixed(1);
                }
            }

            function handleDimensionChange(event) {
                if (!DOMElements.aspectRatioToggle.checked || !state.originalAspectRatio) return;
                const { widthInput, heightInput, unitSelect } = DOMElements;
                const activeInput = event.target;
                let w = parseFloat(widthInput.value);
                let h = parseFloat(heightInput.value);
                if (activeInput === unitSelect) {
                    const isToInches = unitSelect.value === 'in';
                    const newWidth = isToInches ? w / 25.4 : w * 25.4;
                    widthInput.value = newWidth.toFixed(1);
                    heightInput.value = (newWidth / state.originalAspectRatio).toFixed(1);
                } else if (w > 0 && h > 0) {
                    if (activeInput === widthInput) {
                        heightInput.value = (w / state.originalAspectRatio).toFixed(1);
                    } else if (activeInput === heightInput) {
                        widthInput.value = (h * state.originalAspectRatio).toFixed(1);
                    }
                }
                DOMElements.presetSizeSelect.value = 'custom';
            }

            // UPGRADE: New function to parse user input for page ranges
            function parsePageRanges(input) {
                if (!input || input.trim() === '') return null; // Null means all pages
                const pageSet = new Set();
                const parts = input.split(',');
                for (const part of parts) {
                    const trimmedPart = part.trim();
                    if (trimmedPart.includes('-')) {
                        const [start, end] = trimmedPart.split('-').map(Number);
                        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
                            for (let i = start; i <= end; i++) pageSet.add(i);
                        }
                    } else {
                        const pageNum = Number(trimmedPart);
                        if (!isNaN(pageNum) && pageNum > 0) pageSet.add(pageNum);
                    }
                }
                return Array.from(pageSet);
            }

            async function applyResizeAndDownload() {
                if (!state.originalPdfBytes) return;
                updateStatus('Processing PDF...', 'loading');
                DOMElements.resizeBtn.textContent = 'Processing...';

                try {
                    let w = parseFloat(DOMElements.widthInput.value), h = parseFloat(DOMElements.heightInput.value);
                    if (DOMElements.unitSelect.value === 'mm') { w /= 25.4; h /= 25.4; }
                    const targetWidth = w * 72, targetHeight = h * 72;

                    if (isNaN(targetWidth) || targetWidth <= 0 || isNaN(targetHeight) || targetHeight <= 0) {
                        updateStatus('Invalid width or height.', 'error'); return;
                    }

                    const pagesToResize = parsePageRanges(DOMElements.pagesInput.value);
                    const pdfDoc = await PDFDocument.load(state.originalPdfBytes);
                    const resizedPdf = await PDFDocument.create();
                    const pages = pdfDoc.getPages();
                    
                    for (let i = 0; i < pages.length; i++) {
                        const pageNumber = i + 1;
                        const originalPage = pages[i];
                        const { width, height } = originalPage.getSize();

                        // UPGRADE: Check if the current page should be resized or copied directly
                        if (pagesToResize === null || pagesToResize.includes(pageNumber)) {
                            // Resize this page
                            const embeddedPage = await resizedPdf.embedPage(originalPage);
                            const scale = Math.min(targetWidth / embeddedPage.width, targetHeight / embeddedPage.height);
                            const scaledWidth = embeddedPage.width * scale;
                            const scaledHeight = embeddedPage.height * scale;

                            const newPage = resizedPdf.addPage([targetWidth, targetHeight]);
                            newPage.drawPage(embeddedPage, {
                                x: (targetWidth - scaledWidth) / 2, y: (targetHeight - scaledHeight) / 2,
                                width: scaledWidth, height: scaledHeight
                            });
                        } else {
                            // Copy this page without resizing
                            const embeddedPage = await resizedPdf.embedPage(originalPage);
                            const newPage = resizedPdf.addPage([width, height]);
                            newPage.drawPage(embeddedPage, { x: 0, y: 0, width: width, height: height });
                        }
                    }

                    const resizedPdfBytes = await resizedPdf.save();
                    downloadPdf(resizedPdfBytes);
                    updateStatus(`Resizing complete!`, 'success');
                } catch (error) {
                    console.error('Error processing PDF:', error);
                    updateStatus('An error occurred during resizing.', 'error');
                } finally {
                    DOMElements.resizeBtn.textContent = 'Apply & Resize';
                }
            }

            function downloadPdf(pdfBytes) {
                if (!pdfBytes) return;
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${state.originalFileName}_resized.pdf`;
                document.body.appendChild(a); a.click();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url); document.body.removeChild(a);
                }, 100);
            }

            function updateDimensionsUI(widthInPoints, heightInPoints) {
                const conv = DOMElements.unitSelect.value === 'mm' ? 25.4 : 1;
                DOMElements.widthInput.value = (widthInPoints / 72 * conv).toFixed(1);
                DOMElements.heightInput.value = (heightInPoints / 72 * conv).toFixed(1);
            }

            function updateStatus(message, type) {
                const { statusMessage, resizeBtn } = DOMElements;
                statusMessage.textContent = message;
                statusMessage.className = 'font-medium';
                if (type === 'success') statusMessage.classList.add('text-green-500');
                else if (type === 'error') statusMessage.classList.add('text-red-500');
                else if (type === 'clear') statusMessage.textContent = '';
                else statusMessage.classList.add('text-slate-500');
                resizeBtn.disabled = (type === 'loading');
            }

            setReadyState();
        });