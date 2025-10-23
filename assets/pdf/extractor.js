document.addEventListener('DOMContentLoaded', () => {
    // Check if required libraries are loaded
    if (typeof PDFLib === 'undefined' || typeof pdfjsLib === 'undefined' || typeof JSZip === 'undefined') {
        alert("Error: A required library could not be loaded. Please check your internet connection and try refreshing the page.");
        return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;
    const { PDFDocument, degrees } = PDFLib;

    const getEl = id => document.getElementById(id);

    // UI Elements
    const elements = {
        uploadArea: getEl('upload-area'),
        fileInput: getEl('file-input'),
        fileInfo: getEl('file-info'),
        resetBtn: getEl('reset-btn'),
        controls: getEl('controls'),
        extractPagesInput: getEl('extract-pages'),
        processBtn: getEl('process-btn'),
        splitAllBtn: getEl('split-all-btn'),
        statusArea: getEl('status-area'),
        loader: getEl('loader'),
        progressMessage: getEl('progress-message'),
        errorMessage: getEl('error-message'),
        resultsContainer: getEl('results-container'),
        resultsList: getEl('results-list'),
        downloadCombinedBtn: getEl('download-combined-btn'),
        downloadSeparatelyBtn: getEl('download-separately-btn'),
    };
    const { uploadArea, fileInput, resetBtn, processBtn, splitAllBtn, downloadCombinedBtn, downloadSeparatelyBtn } = elements;
    
    // State variables
    let sourcePdfDoc = null;
    let originalFilename = '';

    const resetAll = () => {
        sourcePdfDoc = null;
        originalFilename = '';
        fileInput.value = '';
        elements.extractPagesInput.value = '';

        // Clean up object URLs to prevent memory leaks
        elements.resultsList.querySelectorAll('.result-card').forEach(card => {
            if (card.dataset.url) URL.revokeObjectURL(card.dataset.url);
        });
        elements.resultsList.innerHTML = '';
        
        // Reset UI visibility
        elements.fileInfo.textContent = '';
        uploadArea.classList.remove('hidden');
        resetBtn.classList.add('hidden');
        elements.controls.classList.add('hidden');
        elements.resultsContainer.classList.add('hidden');
        hideStatus();

        toggleMainControls(false);
    };
    
    // UI state functions
    const showStatus = (message, type = 'loading') => {
        elements.statusArea.classList.remove('hidden');
        elements.progressMessage.textContent = '';
        elements.errorMessage.textContent = '';
        elements.errorMessage.classList.add('hidden');
        
        if (type === 'error') {
            elements.loader.classList.add('hidden');
            elements.errorMessage.textContent = message;
            elements.errorMessage.classList.remove('hidden');
        } else {
            elements.loader.classList.remove('hidden');
            elements.progressMessage.textContent = message;
        }
    };
    
    const hideStatus = () => {
        elements.statusArea.classList.add('hidden');
        elements.errorMessage.classList.add('hidden');
    };

    const toggleMainControls = (disabled) => {
        processBtn.disabled = disabled;
        splitAllBtn.disabled = disabled;
        resetBtn.disabled = disabled;
    };
    
    const toggleResultButtons = (disabled) => {
        downloadCombinedBtn.disabled = disabled;
        downloadSeparatelyBtn.disabled = disabled;
    };

    // Event Listeners
    resetBtn.addEventListener('click', resetAll);
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });
    
    const setupDragAndDrop = () => {
        const handleDrag = (e, enter) => {
            e.preventDefault();
            e.stopPropagation();
            const label = uploadArea.querySelector('label');
            if (enter) {
                label.classList.add('border-indigo-600', 'dark:border-indigo-300');
                label.classList.remove('border-slate-400', 'dark:border-slate-500');
            } else {
                label.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                label.classList.add('border-slate-400', 'dark:border-slate-500');
            }
        };
        ['dragenter', 'dragover'].forEach(eventName => uploadArea.addEventListener(eventName, e => handleDrag(e, true)));
        ['dragleave', 'drop'].forEach(eventName => uploadArea.addEventListener(eventName, e => handleDrag(e, false)));
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrag(e, false);
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
    };
    
    processBtn.addEventListener('click', () => processRequest(handleExtractPages));
    splitAllBtn.addEventListener('click', () => processRequest(handleExtractAllPages));
    downloadCombinedBtn.addEventListener('click', handleDownloadCombined);
    downloadSeparatelyBtn.addEventListener('click', handleDownloadSeparately);

    const handleFile = async (file) => {
        if (!file || file.type !== 'application/pdf') {
            return showStatus("Please select a valid PDF file.", 'error');
        }
        resetAll(); // Full reset before processing a new file
        showStatus("Loading and analyzing PDF...");
        originalFilename = file.name.replace(/\.pdf$/i, '');
        
        try {
            const pdfBytes = await file.arrayBuffer();
            // OPTIMIZATION: Parse the document once and reuse it
            sourcePdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const pageCount = sourcePdfDoc.getPageCount();
            
            hideStatus();
            elements.fileInfo.textContent = `✓ ${file.name} (${pageCount} pages)`;
            elements.controls.classList.remove('hidden');
            resetBtn.classList.remove('hidden');
            uploadArea.classList.add('hidden');
        } catch (e) {
            console.error("File handling error:", e);
            resetAll();
            showStatus("Could not read PDF. It might be password-protected or corrupted.", 'error');
        }
    };
    
    const processRequest = async (handler) => {
        elements.resultsList.innerHTML = '';
        elements.resultsContainer.classList.add('hidden');
        hideStatus();
        toggleMainControls(true);

        try {
            await handler();
        } catch (e) {
            console.error("Processing error:", e);
            showStatus(e.message, 'error');
        } finally {
            toggleMainControls(false);
            finalizeResultsDisplay();
        }
    };
    
    const finalizeResultsDisplay = () => {
        const numCards = elements.resultsList.children.length;
        if (numCards > 0) {
            elements.resultsContainer.classList.remove('hidden');
            downloadCombinedBtn.classList.remove('hidden');
            // Show ZIP download button only if there's more than one file
            downloadSeparatelyBtn.classList.toggle('hidden', numCards <= 1);
        } else {
            if (!elements.errorMessage.classList.contains('hidden')) {
                // An error is already shown
            } else {
                showStatus("No pages were extracted. Please check your input.", 'error');
            }
        }
    };
    
    const handleExtractPages = async () => {
        const pagesToExtract = parsePageSelection(elements.extractPagesInput.value, sourcePdfDoc.getPageCount());
        if (pagesToExtract.size === 0) {
            throw new Error("Please enter valid page numbers to extract.");
        }
        
        showStatus(`Extracting ${pagesToExtract.size} page(s)...`);
        
        let count = 0;
        for (const pageNum of pagesToExtract) {
            count++;
            elements.progressMessage.textContent = `Creating file for page ${pageNum}... (${count} of ${pagesToExtract.size})`;
            const resultBytes = await createPdfFromPages([pageNum]);
            await addResultCard(resultBytes, `${originalFilename}_page_${pageNum}.pdf`, `Page ${pageNum}`);
        }
        hideStatus();
    };

    const handleExtractAllPages = async () => {
        const totalPages = sourcePdfDoc.getPageCount();
        showStatus(`Extracting all ${totalPages} pages...`);

        for (let i = 1; i <= totalPages; i++) {
            elements.progressMessage.textContent = `Creating file ${i} of ${totalPages}...`;
            const resultBytes = await createPdfFromPages([i]);
            await addResultCard(resultBytes, `${originalFilename}_page_${i}.pdf`, `Page ${i}`);
        }
        hideStatus();
    };
    
    async function handleDownloadCombined() {
        const cards = Array.from(elements.resultsList.children);
        if (cards.length === 0) return;

        // If only one file, trigger its direct download
        if (cards.length === 1) {
            cards[0].querySelector('.download-card-btn').click();
            return;
        }

        toggleResultButtons(true);
        showStatus("Combining pages into a single PDF...");

        try {
            const mergedDoc = await PDFDocument.create();
            for (const card of cards) {
                const blob = await fetch(card.dataset.url).then(res => res.blob());
                const docToMerge = await PDFDocument.load(await blob.arrayBuffer());
                const copiedPages = await mergedDoc.copyPages(docToMerge, docToMerge.getPageIndices());
                copiedPages.forEach(page => mergedDoc.addPage(page));
            }
            const mergedBytes = await mergedDoc.save();
            downloadBlob(new Blob([mergedBytes], { type: 'application/pdf' }), `${originalFilename}_extracted_pages.pdf`);
            hideStatus();
        } catch (e) {
            showStatus(`Error combining files: ${e.message}`, 'error');
        } finally {
            toggleResultButtons(false);
        }
    }

    async function handleDownloadSeparately() {
        const cards = Array.from(elements.resultsList.children);
        if (cards.length <= 1) return;

        toggleMainControls(true);
        toggleResultButtons(true);
        showStatus("Creating ZIP file...");

        try {
            const zip = new JSZip();
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                elements.progressMessage.textContent = `Adding file ${i + 1} of ${cards.length} to ZIP...`;
                const blob = await fetch(card.dataset.url).then(res => res.blob());
                zip.file(card.dataset.filename, blob);
            }

            elements.progressMessage.textContent = 'Generating ZIP...';
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            downloadBlob(zipBlob, `${originalFilename}_pages.zip`);
            hideStatus();
        } catch (error) {
            console.error('ZIP creation error:', error);
            showStatus(`Error creating ZIP: ${error.message}`, 'error');
        } finally {
            toggleMainControls(false);
            toggleResultButtons(false);
        }
    }

    const downloadBlob = (blob, filename) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    };

    const createPdfFromPages = async (pageNumbers) => {
        const newPdfDoc = await PDFDocument.create();
        const indices = pageNumbers.map(n => n - 1); // convert to 0-based index
        const copiedPages = await newPdfDoc.copyPages(sourcePdfDoc, indices);
        copiedPages.forEach(page => newPdfDoc.addPage(page));
        return newPdfDoc.save();
    };

    const addResultCard = async (bytes, filename, displayName) => {
        const card = document.createElement('div');
        card.className = 'result-card relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col shadow-sm';
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        card.dataset.url = url;
        card.dataset.filename = filename;

        card.innerHTML = `
            <div class="absolute z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="download-card-btn bg-transparent text-2xl cursor-pointer" title="Download">⬇️</button>
                <button class="rotate-card-btn bg-transparent text-2xl cursor-pointer" title="Rotate 90°">🔄</button>
                <button class="delete-card-btn bg-transparent text-xl cursor-pointer" title="Remove">❌</button>
            </div>
            <div class="w-full h-48 flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700"><canvas class="max-w-full max-h-full"></canvas></div>
            <span class="block font-semibold text-center p-2 border-t border-indigo-300 truncate" title="${displayName}">${displayName}</span>
        `;

        card.querySelector('.download-card-btn').addEventListener('click', () => downloadBlob(blob, filename));
        card.querySelector('.delete-card-btn').addEventListener('click', () => {
            URL.revokeObjectURL(url);
            card.remove();
            finalizeResultsDisplay();
        });
        card.querySelector('.rotate-card-btn').addEventListener('click', handleRotate);

        elements.resultsList.appendChild(card);
        await renderPdfPreview(card.querySelector('canvas'), bytes);
    };
    
    async function handleRotate(event) {
        const card = event.currentTarget.closest('.result-card');
        if (!card) return;

        const buttons = card.querySelectorAll('button');
        buttons.forEach(b => b.disabled = true);
        try {
            const oldUrl = card.dataset.url;
            const pdfBytes = await (await fetch(oldUrl)).arrayBuffer();
            
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const page = pdfDoc.getPage(0);
            page.setRotation(degrees((page.getRotation().angle + 90) % 360));
            
            const newPdfBytes = await pdfDoc.save();
            const newBlob = new Blob([newPdfBytes], { type: 'application/pdf' });
            const newUrl = URL.createObjectURL(newBlob);
            
            card.dataset.url = newUrl;
            URL.revokeObjectURL(oldUrl); 

            // Update download button to use the new blob
            card.querySelector('.download-card-btn').onclick = () => downloadBlob(newBlob, card.dataset.filename);
            
            await renderPdfPreview(card.querySelector('canvas'), newPdfBytes);
        } catch (e) {
            console.error("Rotation error:", e);
        } finally {
            buttons.forEach(b => b.disabled = false);
        }
    }
    
    const renderPdfPreview = async (canvas, bytes) => {
        try {
            const pdf = await pdfjsLib.getDocument({data: bytes}).promise;
            const page = await pdf.getPage(1); // Preview first page
            const viewport = page.getViewport({ scale: 1.5 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        } catch (err) {
            console.error("Preview render error:", err);
            canvas.parentElement.innerHTML = `<span class="text-xs text-slate-500 p-2">Preview failed</span>`;
        }
    };
    
    const parsePageSelection = (str, max) => {
        const pages = new Set();
        if (!str || !str.trim()) return pages;

        try {
            str.replace(/\s/g, '').split(',').forEach(part => {
                if (!part) return;
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    if (isNaN(start) || isNaN(end) || start < 1 || end > max || start > end) {
                        throw new Error(`Invalid range: ${part}`);
                    }
                    for (let i = start; i <= end; i++) pages.add(i);
                } else {
                    const num = Number(part);
                    if (isNaN(num) || num < 1 || num > max) {
                        throw new Error(`Invalid page number: ${part}`);
                    }
                    pages.add(num);
                }
            });
        } catch (e) {
            throw new Error(`Invalid format. Please use numbers and ranges (e.g., 1, 3-5) up to the max page count of ${max}.`);
        }
        return new Set([...pages].sort((a, b) => a - b));
    };

    // Initialize the app
    resetAll();
    setupDragAndDrop();
});