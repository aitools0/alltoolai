    document.addEventListener('DOMContentLoaded', () => {
        // --- LIBRARY & UI SETUP ---
        // This check ensures required libraries are loaded before the app runs.
        if (typeof PDFLib === 'undefined' || typeof pdfjsLib === 'undefined') {
             console.error("Error: A required library (PDFLib or pdf.js) could not be loaded.");
             alert("Error: A required library could not be loaded. Please check your internet connection and try refreshing the page.");
             return;
        }

        const { PDFDocument, degrees } = PDFLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;

        const ui = {
            uploadSection: document.getElementById('upload-section'),
            mainApp: document.getElementById('main-app'),
            fileInput: document.getElementById('file-input'),
            uploadArea: document.getElementById('upload-area'),
            pagesContainer: document.getElementById('pages-container'),
            downloadBtn: document.getElementById('download-pdf'),
            resetBtn: document.getElementById('reset-order'),
            uploadNewBtn: document.getElementById('upload-new'),
            pdfNameEl: document.getElementById('pdf-name'),
            loadingOverlay: document.getElementById('loading-overlay'),
        };

        // --- STATE MANAGEMENT ---
        let pdfDoc = null; // The loaded PDF document object from pdf.js
        let initialPageElements = []; // Stores the originally rendered page elements for efficient reset
        let pdfData = null; // Stores the raw ArrayBuffer of the uploaded PDF file
        let draggedItem = null; // The page element currently being dragged
        let originalFilename = 'document.pdf';
        
        // --- EVENT LISTENERS ---
        function setupEventListeners() {
            // Drag and drop listeners for reordering pages
            ui.pagesContainer.addEventListener('dragstart', e => { 
                const page = e.target.closest('.page');
                if (page) { 
                    draggedItem = page;
                    setTimeout(() => draggedItem.classList.add('dragging'), 0); 
                } 
            });

            ui.pagesContainer.addEventListener('dragend', () => { 
                if (draggedItem) { 
                    draggedItem.classList.remove('dragging'); 
                    draggedItem = null; 
                } 
            });

            ui.pagesContainer.addEventListener('dragover', e => {
                e.preventDefault();
                if (!draggedItem) return;

                const overElement = e.target.closest('.page:not(.dragging)');
                if (overElement) {
                    const rect = overElement.getBoundingClientRect();
                    const midpoint = rect.left + rect.width / 2;
                    // Insert before or after depending on cursor position
                    if (e.clientX < midpoint) {
                        ui.pagesContainer.insertBefore(draggedItem, overElement); 
                    } else {
                        ui.pagesContainer.insertBefore(draggedItem, overElement.nextSibling);
                    }
                }
            });

            // Click listener for page actions (rotate, delete)
            ui.pagesContainer.addEventListener('click', e => {
                const pageElement = e.target.closest('.page');
                if (!pageElement) return;

                if (e.target.closest('.rotate-btn')) handleRotate(pageElement);
                else if (e.target.closest('.delete-btn')) handleDelete(pageElement);
            });
            
            // Listeners for file input
            ui.fileInput.addEventListener('change', e => processFile(e.target.files[0]));

            // Listeners for drag-and-drop file upload area
            const handleDragClass = (e, add) => { 
                e.preventDefault(); 
                e.stopPropagation();
                const label = ui.uploadArea.firstElementChild;
                label.classList.toggle('border-indigo-600', add);
                label.classList.toggle('border-slate-400', !add);
                label.classList.toggle('dark:border-indigo-300', add);
                label.classList.toggle('dark:border-slate-500', !add);
            };
            ['dragenter', 'dragover'].forEach(ev => ui.uploadArea.addEventListener(ev, e => handleDragClass(e, true)));
            ['dragleave', 'drop'].forEach(ev => ui.uploadArea.addEventListener(ev, e => handleDragClass(e, false)));
            ui.uploadArea.addEventListener('drop', e => processFile(e.dataTransfer.files[0]));

            // Button listeners
            ui.downloadBtn.addEventListener('click', handleDownload);
            ui.resetBtn.addEventListener('click', resetAllChanges);
            ui.uploadNewBtn.addEventListener('click', resetApplication);
        }

        // --- CORE ACTIONS ---
        function handleDelete(pageElement) {
            pageElement.classList.add('deleted');
        }

        function handleRotate(pageElement) {
            const canvas = pageElement.querySelector('canvas');
            const currentRotation = parseInt(pageElement.dataset.rotation || '0', 10);
            const newRotation = (currentRotation + 90) % 360;
            pageElement.dataset.rotation = newRotation;
            // The scale is a nice touch to prevent rotated pages from clipping their container
            canvas.style.transform = `rotate(${newRotation}deg)`;
        }

        async function handleDownload() {
            if (!pdfData) return;
            showLoading(true);

            try {
                // Load the original PDF data into pdf-lib
                const sourcePdfDoc = await PDFDocument.load(pdfData);
                const newPdfDoc = await PDFDocument.create();

                // Get the current order of pages from the DOM, excluding deleted ones
                const visiblePages = [...ui.pagesContainer.querySelectorAll('.page:not(.deleted)')];

                if (visiblePages.length === 0) {
                    alert("Cannot download an empty PDF. Please un-delete some pages or reset.");
                    showLoading(false);
                    return;
                }

                // Create a map of page numbers and their final rotations
                const pageData = visiblePages.map(p => ({
                    num: parseInt(p.dataset.originalPageNum, 10),
                    rotation: parseInt(p.dataset.rotation || '0', 10)
                }));

                // Copy the required pages from the source doc to the new doc
                const pageIndices = pageData.map(p => p.num - 1);
                const copiedPages = await newPdfDoc.copyPages(sourcePdfDoc, pageIndices);
                
                // Apply rotations and add pages to the new document
                copiedPages.forEach((page, index) => {
                    const { rotation } = pageData[index];
                    if (rotation !== 0) {
                        const existingRotation = page.getRotation().angle;
                        page.setRotation(degrees(existingRotation + rotation));
                    }
                    newPdfDoc.addPage(page);
                });
                
                const pdfBytes = await newPdfDoc.save();
                downloadBlob(pdfBytes, `edited-${originalFilename}`, 'application/pdf');

            } catch (error) {
                console.error('Error on download:', error);
                alert('An error occurred while preparing the PDF for download.');
            } finally {
                showLoading(false);
            }
        }

        // --- SETUP AND UTILITIES ---
        async function processFile(file) {
            if (!file || file.type !== 'application/pdf') {
                alert('Please select a valid PDF file.');
                return;
            }
            showLoading(true);
            originalFilename = file.name;
            ui.pdfNameEl.textContent = originalFilename;
            ui.pdfNameEl.title = originalFilename; // Show full name on hover

            try {
                pdfData = await file.arrayBuffer(); // Read the file into memory
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
                pdfDoc = await loadingTask.promise;
                
                await renderAllPages();
                
                ui.uploadSection.classList.add('hidden');
                ui.mainApp.classList.remove('hidden');
            } catch (error) {
                console.error('Error processing PDF:', error);
                resetApplication();
                alert('Could not load PDF. The file might be corrupted or password-protected.');
            } finally {
                showLoading(false);
            }
        }

        async function renderAllPages() {
            ui.pagesContainer.innerHTML = '';
            const pagePromises = [];
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                pagePromises.push(renderPage(i));
            }
            // Promise.all efficiently renders multiple pages concurrently
            initialPageElements = await Promise.all(pagePromises);
            initialPageElements.forEach(el => ui.pagesContainer.appendChild(el));
        }

        async function renderPage(pageNum) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col cursor-move';
            pageDiv.setAttribute('draggable', 'true');
            pageDiv.dataset.originalPageNum = pageNum;
            pageDiv.dataset.rotation = '0';
            pageDiv.innerHTML = `
                <div class="absolute z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="rotate-btn bg-transparent text-2xl cursor-pointer" title="Rotate 90°">🔄</button>
                    <button class="delete-btn bg-transparent text-xl cursor-pointer" title="Delete Page">❌</button>
                </div>
                <div class="w-full h-48 flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-900">
                    <canvas class="max-w-full max-h-full transition-transform duration-300"></canvas>
                </div>
                <span class="block font-semibold text-center p-2 border-t border-indigo-300 truncate" title="Page ${pageNum}">Page ${pageNum}</span>
            `;
            
            const canvas = pageDiv.querySelector('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            return pageDiv;
        }

        function resetAllChanges() {
            ui.pagesContainer.innerHTML = ''; // Clear current layout
            // Restore pages from the stored initial elements, resetting their state
            initialPageElements.forEach(pageEl => {
                pageEl.classList.remove('deleted');
                pageEl.dataset.rotation = '0';
                pageEl.querySelector('canvas').style.transform = 'rotate(0deg)';
                ui.pagesContainer.appendChild(pageEl);
            });
        }

        function resetApplication() {
            // Nullify all state variables
            pdfDoc = null; 
            initialPageElements = []; 
            pdfData = null; 
            ui.pagesContainer.innerHTML = '';

            if (ui.fileInput) ui.fileInput.value = ''; // Reset file input
            // Switch UI visibility back to the initial state
            ui.mainApp.classList.add('hidden');
            ui.uploadSection.classList.remove('hidden');
        }

        function showLoading(isLoading) {
            ui.loadingOverlay.classList.toggle('hidden', !isLoading);
        }

        function downloadBlob(data, filename, type) {
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        
        // --- INITIALIZE ---
        setupEventListeners();
    });