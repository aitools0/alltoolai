document.addEventListener('DOMContentLoaded', () => {
    // Check if all required libraries are loaded
    if (typeof PDFLib === 'undefined' || typeof pdfjsLib === 'undefined' || typeof JSZip === 'undefined') {
        alert("Error: A required library (PDF-LIB, PDF.js, or JSZip) could not be loaded. Please check your internet connection and try refreshing the page.");
        return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

    const { PDFDocument, degrees } = PDFLib;
    const getEl = (id) => document.getElementById(id);

    // Get references to all necessary DOM elements
    const uploadArea = getEl('upload-area');
    const fileInput = getEl('file-input');
    const fileInfo = getEl('file-info');
    const controls = getEl('controls');
    const processBtn = getEl('process-btn');
    const extractAllBtn = getEl('extract-all-btn');
    const resetBtn = getEl('reset-btn');
    const downloadCombinedBtn = getEl('download-combined-btn');
    const downloadSeparatelyBtn = getEl('download-separately-btn');
    const statusArea = getEl('status-area');
    const loader = getEl('loader');
    const progressMessage = getEl('progress-message');
    const errorMessage = getEl('error-message');
    const resultsContainer = getEl('results-container');
    const resultsList = getEl('results-list');
    const uploadSection = getEl('upload-section');

    let pdfBytes = null, pageCount = 0, originalFilename = '';

    // Resets the entire application to its initial state
    function resetAll() {
        pdfBytes = null; pageCount = 0; originalFilename = '';
        fileInput.value = ''; fileInfo.textContent = '';
        getEl('delete-pages').value = '';

        // *** FIX: Revoke object URLs to prevent memory leaks ***
        // Before clearing the list, iterate through each result card and revoke its URL
        // This releases the memory used by the generated PDF blobs.
        const cards = resultsList.querySelectorAll('.result-card');
        cards.forEach(card => {
            if (card.dataset.url) {
                URL.revokeObjectURL(card.dataset.url);
            }
        });
        resultsList.innerHTML = '';

        // Hide and show the relevant sections
        controls.classList.add('hidden');
        resetBtn.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        statusArea.classList.add('hidden');
        errorMessage.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        uploadArea.classList.remove('hidden');

        // Re-enable all buttons
        [processBtn, extractAllBtn, resetBtn, downloadCombinedBtn, downloadSeparatelyBtn].forEach(b => {
            b.disabled = false;
        });
    }
    resetAll();

    // Event listeners setup
    fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });

    const uploadLabel = uploadArea.querySelector('label');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => {
        uploadArea.addEventListener(eName, e => {
            e.preventDefault();
            e.stopPropagation();
            if (eName === 'dragenter' || eName === 'dragover') {
                uploadLabel.classList.add('border-indigo-600', 'dark:border-indigo-300');
                uploadLabel.classList.remove('border-slate-400', 'dark:border-slate-500');
            } else {
                uploadLabel.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                uploadLabel.classList.add('border-slate-400', 'dark:border-slate-500');
            }
            if (eName === 'drop' && e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFile(e.dataTransfer.files[0]);
            }
        });
    });

    processBtn.addEventListener('click', () => processRequest(handleDeletePages));
    extractAllBtn.addEventListener('click', () => processRequest(handleExtractAllPages));
    resetBtn.addEventListener('click', resetAll);
    downloadCombinedBtn.addEventListener('click', handleDownloadCombined);
    downloadSeparatelyBtn.addEventListener('click', handleDownloadSeparately);

    // Handles the uploaded PDF file
    async function handleFile(file) {
        if (!file || file.type !== 'application/pdf') {
            showStatus("Please upload a valid PDF file.", 'error');
            return;
        }

        resetAll(); // Reset previous state before loading a new file
        showStatus("Loading PDF...");
        originalFilename = file.name.replace(/\.pdf$/i, '');
        try {
            pdfBytes = new Uint8Array(await file.arrayBuffer());
            const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            pageCount = pdfDoc.getPageCount();

            statusArea.classList.add('hidden');
            fileInfo.textContent = `✓ ${file.name} (${pageCount} pages)`;
            controls.classList.remove('hidden');
            resetBtn.classList.remove('hidden');
            uploadArea.classList.add('hidden');
        } catch (e) {
            console.error("File handling error:", e);
            resetAll();
            showStatus(`Could not read the PDF. It may be corrupt or encrypted.`, 'error');
        }
    }

    // Displays status messages (loading, progress, or error)
    function showStatus(message, type = 'loading') {
        statusArea.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        progressMessage.classList.add('hidden');
        loader.classList.add('hidden');

        if (type === 'error') {
            errorMessage.classList.remove('hidden'); errorMessage.textContent = message;
        } else {
            progressMessage.classList.remove('hidden'); progressMessage.textContent = message;
            loader.classList.remove('hidden');
        }
    }

    // A wrapper to handle the processing logic, including button disabling and error handling
    async function processRequest(handler) {
        resultsList.innerHTML = '';
        resultsContainer.classList.add('hidden');
        [processBtn, extractAllBtn, resetBtn].forEach(btn => btn.disabled = true);
        try {
            await handler();
        } catch (e) {
            console.error("Processing error:", e);
            showStatus(e.message, 'error');
        } finally {
            [processBtn, extractAllBtn, resetBtn].forEach(btn => btn.disabled = false);
            finalizeResults();
        }
    }

    // Shows the results container and download buttons if any files were generated
    function finalizeResults() {
        const numCards = resultsList.children.length;
        if (errorMessage.classList.contains('hidden')) statusArea.classList.add('hidden');

        if (numCards > 0) {
            resultsContainer.classList.remove('hidden');
            downloadCombinedBtn.classList.toggle('hidden', numCards <= 1);
            downloadSeparatelyBtn.classList.toggle('hidden', numCards <= 1);
        } else {
            resultsContainer.classList.add('hidden');
            if (errorMessage.classList.contains('hidden')) {
               showStatus("No files were generated. Please check your page input.", 'error');
            }
        }
    }

    // Handles the "Delete & Save" operation
    async function handleDeletePages() {
        const pagesToDeleteStr = getEl('delete-pages').value;
        const pagesToDelete = parsePageList(pagesToDeleteStr, pageCount);
        if (!pagesToDelete) throw new Error("Please enter valid page numbers to delete.");

        const pagesToKeep = Array.from({ length: pageCount }, (_, i) => i + 1).filter(p => !pagesToDelete.has(p));
        if (pagesToKeep.length === pageCount) throw new Error("None of the specified pages were found in the PDF.");
        if (pagesToKeep.length === 0) throw new Error("This operation would result in an empty PDF. At least one page must be kept.");

        showStatus(`Preparing ${pagesToKeep.length} remaining pages...`);
        const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

        for (const [index, pageNum] of pagesToKeep.entries()) {
            progressMessage.textContent = `Creating file for page ${pageNum}... (${index + 1} of ${pagesToKeep.length})`;
            const resultBytes = await createPdfFromPages(sourceDoc, [pageNum]);
            await addDownloadCard(resultBytes, `${originalFilename}_page_${pageNum}.pdf`, `Page ${pageNum}`);
        }
    }

    // Handles the "Extract Every Page" operation
    async function handleExtractAllPages() {
        showStatus(`Extracting all ${pageCount} pages...`);
        const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        for (let i = 1; i <= pageCount; i++) {
            progressMessage.textContent = `Creating file for page ${i} of ${pageCount}...`;
            const resultBytes = await createPdfFromPages(sourceDoc, [i]);
            await addDownloadCard(resultBytes, `${originalFilename}_page_${i}.pdf`, `Page ${i}`);
        }
    }
    
    // Merges all generated single-page PDFs into one file
    async function handleDownloadCombined() {
        const cards = Array.from(resultsList.children);
        if (cards.length <= 1) return;

        [downloadCombinedBtn, downloadSeparatelyBtn, resetBtn].forEach(b => b.disabled = true);
        showStatus("Merging files into a single PDF...");
        try {
            const blobs = await Promise.all(cards.map(card => fetch(card.dataset.url).then(res => res.blob())));
            const mergedDoc = await PDFDocument.create();
            for (const blob of blobs) {
                const pdfToMerge = await PDFDocument.load(await blob.arrayBuffer());
                const copiedPages = await mergedDoc.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
                copiedPages.forEach(page => mergedDoc.addPage(page));
            }
            const mergedBytes = await mergedDoc.save();
            downloadBlob(new Blob([mergedBytes], { type: 'application/pdf' }), `${originalFilename}_combined.pdf`);
            statusArea.classList.add('hidden');
        } catch (e) {
            showStatus(`Error merging files: ${e.message}`, 'error');
        } finally {
            [downloadCombinedBtn, downloadSeparatelyBtn, resetBtn].forEach(b => b.disabled = false);
        }
    }

    // Compresses all generated single-page PDFs into a single ZIP file
    async function handleDownloadSeparately() {
        const cards = Array.from(resultsList.children);
        if (cards.length <= 1) return;

        [downloadCombinedBtn, downloadSeparatelyBtn, resetBtn].forEach(b => b.disabled = true);
        showStatus(`Creating ZIP file...`);

        try {
            const zip = new JSZip();

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const progress = ((i + 1) / cards.length) * 100;
                progressMessage.textContent = `Adding file ${i + 1} of ${cards.length} to ZIP... (${progress.toFixed(0)}%)`;

                const blob = await fetch(card.dataset.url).then(res => res.blob());
                zip.file(card.dataset.filename, blob);
            }

            progressMessage.textContent = 'Generating ZIP file...';
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            downloadBlob(content, `${originalFilename}_pages.zip`);
            statusArea.classList.add('hidden');
        } catch (error) {
             console.error('ZIP creation error:', error);
             showStatus(`Error creating ZIP file: ${error.message}`, 'error');
        } finally {
             [downloadCombinedBtn, downloadSeparatelyBtn, resetBtn].forEach(b => b.disabled = false);
        }
    }

    // Rotates a single generated PDF page by 90 degrees
    async function handleRotate(event) {
        const card = event.currentTarget.closest('.result-card');
        if (!card) return;

        card.querySelectorAll('button').forEach(b => b.disabled = true);
        try {
            const oldUrl = card.dataset.url;
            const pdfBytes = new Uint8Array(await (await fetch(oldUrl)).arrayBuffer());
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const page = pdfDoc.getPage(0);
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + 90) % 360));
            const newPdfBytes = await pdfDoc.save();
            
            const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
            const newUrl = URL.createObjectURL(blob);
            
            card.dataset.url = newUrl;
            URL.revokeObjectURL(oldUrl); // Clean up the old, un-rotated blob URL

            await renderPdfPreview(card.querySelector('canvas'), newPdfBytes);
        } catch (e) {
            console.error("Rotation error:", e);
        } finally {
            card.querySelectorAll('button').forEach(b => b.disabled = false);
        }
    }

    // Triggers the download of a blob
    function downloadBlob(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 100); // Clean up download URL
    }

    // Creates a new PDF document from a subset of pages from a source document
    async function createPdfFromPages(sourceDoc, pageNumbers) {
        const newPdfDoc = await PDFDocument.create();
        const indices = pageNumbers.map(n => n - 1);
        const copiedPages = await newPdfDoc.copyPages(sourceDoc, indices);
        copiedPages.forEach(page => newPdfDoc.addPage(page));
        return newPdfDoc.save();
    }

    // Creates and appends a result card with a preview and action buttons
    async function addDownloadCard(bytes, filename, displayName) {
        const card = document.createElement('div');
        card.className = 'result-card relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col';

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
        card.querySelector('.delete-card-btn').addEventListener('click', () => { URL.revokeObjectURL(url); card.remove(); finalizeResults(); });
        card.querySelector('.rotate-card-btn').addEventListener('click', handleRotate);

        resultsList.appendChild(card);
        await renderPdfPreview(card.querySelector('canvas'), bytes);
    }
    
    // Renders a preview of the first page of a PDF onto a canvas element
    async function renderPdfPreview(canvas, bytes) {
        try {
            const pdf = await pdfjsLib.getDocument({data: new Uint8Array(bytes)}).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        } catch (err) {
            console.error("Preview render error:", err);
            canvas.parentElement.innerHTML = `<span class="text-xs text-slate-500">Preview failed</span>`;
        }
    }

    // Parses a string of page numbers (e.g., "1, 3-5, 8") into a Set of numbers
    function parsePageList(str, max) {
        if (!str?.trim()) return null;
        const pages = new Set();
        try {
            str.replace(/\s/g, '').split(',').forEach(part => {
                if (!part) return;
                if (part.includes('-')) {
                    let [start, end] = part.split('-').map(Number);
                    if (isNaN(start) || isNaN(end) || start < 1 || start > end || end > max) throw new Error();
                    for (let i = start; i <= end; i++) pages.add(i);
                } else {
                    const num = Number(part);
                    if (isNaN(num) || num < 1 || num > max) throw new Error();
                    pages.add(num);
                }
            });
        } catch (e) {
            throw new Error(`Invalid page format. Please use numbers and ranges (e.g., 1, 3-5) within the page limit of ${max}.`);
        }
        return pages.size > 0 ? pages : null;
    }
});