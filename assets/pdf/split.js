    document.addEventListener('DOMContentLoaded', () => {
        const checkLibraries = () => {
            if (typeof PDFLib === 'undefined' || typeof pdfjsLib === 'undefined' || typeof JSZip === 'undefined') {
                alert("Error: A required library (PDF-LIB, PDF.js, or JSZip) could not be loaded. Please check your internet connection and try refreshing the page.");
                return false;
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
            return true;
        };

        const { PDFDocument, degrees } = PDFLib;
        const getEl = (id) => document.getElementById(id);

        const uploadArea = getEl('upload-area');
        const fileInput = getEl('file-input');
        const fileInfo = getEl('file-info');
        const controls = getEl('controls');
        const processBtn = getEl('process-btn');
        const splitAllBtn = getEl('split-all-btn');
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
        const uploadLabel = uploadArea.querySelector('label');
        const modeTabs = document.querySelectorAll('.mode-tab');
        const modePanels = document.querySelectorAll('.mode-panel');

        const activeTabClasses = ['text-white', 'bg-indigo-600', 'hover:bg-indigo-700', 'dark:bg-indigo-500', 'dark:hover:bg-indigo-600'];
        const inactiveTabClasses = ['bg-slate-200', 'hover:bg-slate-300', 'text-slate-800', 'dark:bg-slate-600', 'dark:hover:bg-slate-500', 'dark:text-slate-200'];

        let pdfBytes = null;
        let pageCount = 0;
        let originalFilename = '';
        let currentMode = 'range';
        
        const resetAll = () => {
            pdfBytes = pageCount = 0;
            originalFilename = '';
            fileInput.value = '';
            fileInfo.textContent = '';
            getEl('page-ranges').value = '';
            getEl('interval-pages').value = '';
            
            resultsList.querySelectorAll('.result-card').forEach(card => {
                if (card.dataset.url) URL.revokeObjectURL(card.dataset.url);
            });
            resultsList.innerHTML = '';
            
            controls.classList.add('hidden');
            resetBtn.classList.add('hidden');
            resultsContainer.classList.add('hidden');
            statusArea.classList.add('hidden');
            errorMessage.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            uploadArea.classList.remove('hidden');

            setActiveMode('range');

            [processBtn, splitAllBtn, resetBtn, downloadCombinedBtn, downloadSeparatelyBtn].forEach(b => b.disabled = false);
        };
        
        const setActiveMode = (mode) => {
            currentMode = mode;
            modeTabs.forEach(tab => {
                const isActive = tab.dataset.mode === mode;
                tab.classList.toggle('active', isActive);
                tab.classList.remove(...(isActive ? inactiveTabClasses : activeTabClasses));
                tab.classList.add(...(isActive ? activeTabClasses : inactiveTabClasses));
            });
            modePanels.forEach(panel => panel.classList.toggle('hidden', panel.id !== `panel-${mode}`));
        };

        if (checkLibraries()) {
            resetAll();

            fileInput.addEventListener('change', () => fileInput.files.length && handleFile(fileInput.files[0]));

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

            modeTabs.forEach(tab => tab.addEventListener('click', () => setActiveMode(tab.dataset.mode)));

            processBtn.addEventListener('click', () => processRequest(currentMode === 'range' ? handleSplitByRanges : handleSplitByInterval));
            splitAllBtn.addEventListener('click', () => processRequest(handleSplitAllPages));
            resetBtn.addEventListener('click', resetAll);
            downloadCombinedBtn.addEventListener('click', handleDownloadCombined);
            downloadSeparatelyBtn.addEventListener('click', handleDownloadSeparately);
        }

        async function handleFile(file) {
            if (!file || file.type !== 'application/pdf') {
                showStatus("Please upload a valid PDF file.", true);
                return;
            }
            resetAll();
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
                showStatus(`Could not read the PDF. It may be corrupt or encrypted.`, true);
            }
        }
        
        function showStatus(message, isError = false) {
            statusArea.classList.remove('hidden');
            errorMessage.textContent = isError ? message : '';
            errorMessage.classList.toggle('hidden', !isError);
            progressMessage.textContent = isError ? '' : message;
            progressMessage.classList.toggle('hidden', isError);
            loader.classList.toggle('hidden', isError);
        }

        async function processRequest(handler) {
            resultsList.innerHTML = '';
            resultsContainer.classList.add('hidden');
            [processBtn, splitAllBtn, resetBtn].forEach(btn => btn.disabled = true);
            try {
                await handler();
            } catch (e) {
                console.error("Processing error:", e);
                showStatus(`Operation Failed: ${e.message}`, true);
            } finally {
                [processBtn, splitAllBtn, resetBtn].forEach(btn => btn.disabled = false);
                finalizeResults();
            }
        }
        
        function finalizeResults() {
            const numCards = resultsList.children.length;
            if (numCards > 0) {
                resultsContainer.classList.remove('hidden');
                statusArea.classList.add('hidden');
            } else if (errorMessage.classList.contains('hidden')) {
                showStatus("No files were generated. Please check your input.", true);
            }
            downloadCombinedBtn.classList.toggle('hidden', numCards <= 1);
            downloadSeparatelyBtn.classList.toggle('hidden', numCards <= 1);
        }
        
        async function handleSplitByRanges() {
            const pageGroups = parsePageRanges(getEl('page-ranges').value, pageCount);
            if (!pageGroups?.length) throw new Error("Please enter valid page ranges.");
            showStatus(`Processing ${pageGroups.length} file(s)...`);
            const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            for (const [i, group] of pageGroups.entries()) {
                progressMessage.textContent = `Creating file ${i + 1} of ${pageGroups.length}...`;
                const name = `pages_${group[0]}-${group[group.length - 1]}`;
                const displayName = `Pages ${group[0]}-${group[group.length-1]}`;
                const resultBytes = await createPdfFromPages(sourceDoc, group);
                await addDownloadCard(resultBytes, `${originalFilename}_${name}.pdf`, displayName);
            }
        }

        async function handleSplitByInterval() {
            const interval = parseInt(getEl('interval-pages').value, 10);
            if (isNaN(interval) || interval < 1) throw new Error("Interval must be a positive number.");
            
            const numFiles = Math.ceil(pageCount / interval);
            showStatus(`Splitting into ${numFiles} file(s)...`);
            const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

            for (let i = 0; i < numFiles; i++) {
                progressMessage.textContent = `Creating file ${i + 1} of ${numFiles}...`;
                const startPage = i * interval + 1;
                const endPage = Math.min(startPage + interval - 1, pageCount);
                const pageNumbers = Array.from({length: endPage - startPage + 1}, (_, k) => startPage + k);
                const displayName = `Pages ${startPage}-${endPage}`;
                const resultBytes = await createPdfFromPages(sourceDoc, pageNumbers);
                await addDownloadCard(resultBytes, `${originalFilename}_${displayName.replace(/\s/g, '_')}.pdf`, displayName);
            }
        }
    
        async function handleSplitAllPages() {
            showStatus(`Splitting all ${pageCount} pages...`);
            const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            for (let i = 1; i <= pageCount; i++) {
                progressMessage.textContent = `Creating file ${i} of ${pageCount}...`;
                const resultBytes = await createPdfFromPages(sourceDoc, [i]);
                await addDownloadCard(resultBytes, `${originalFilename}_page_${i}.pdf`, `Page ${i}`);
            }
        }
        
        async function handleDownloadCombined() {
            const cards = [...resultsList.children];
            if (cards.length <= 1) return;
            
            [downloadCombinedBtn, downloadSeparatelyBtn].forEach(b => b.disabled = true);
            showStatus("Merging files...");
            try {
                const mergedDoc = await PDFDocument.create();
                for (const card of cards) {
                    const blob = await fetch(card.dataset.url).then(res => res.blob());
                    const pdfToMerge = await PDFDocument.load(await blob.arrayBuffer());
                    const copiedPages = await mergedDoc.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
                    copiedPages.forEach(page => mergedDoc.addPage(page));
                }
                const mergedBytes = await mergedDoc.save();
                downloadBlob(new Blob([mergedBytes], { type: 'application/pdf' }), `${originalFilename}_combined.pdf`);
            } catch (e) {
                showStatus(`Error merging files: ${e.message}`, true);
            } finally {
                [downloadCombinedBtn, downloadSeparatelyBtn].forEach(b => b.disabled = false);
                statusArea.classList.add('hidden');
            }
        }
        
        async function handleDownloadSeparately() {
            const cards = [...resultsList.children];
            if (cards.length <= 1) return;

            [downloadCombinedBtn, downloadSeparatelyBtn, resetBtn].forEach(b => b.disabled = true);
            showStatus(`Creating ZIP file...`);

            try {
                const zip = new JSZip();
                for (const [i, card] of cards.entries()) {
                    progressMessage.textContent = `Adding file ${i + 1} of ${cards.length} to ZIP...`;
                    const blob = await fetch(card.dataset.url).then(res => res.blob());
                    zip.file(card.dataset.filename, blob);
                }
                progressMessage.textContent = 'Generating ZIP file...';
                const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
                downloadBlob(content, `${originalFilename}_pages.zip`);
            } catch (error) {
                 console.error('ZIP creation error:', error);
                 showStatus(`Error creating ZIP file: ${error.message}`, true);
            } finally {
                 [downloadCombinedBtn, downloadSeparatelyBtn, resetBtn].forEach(b => b.disabled = false);
                 statusArea.classList.add('hidden');
            }
        }
        
        function downloadBlob(blob, filename) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        }
        
        async function createPdfFromPages(sourceDoc, pageNumbers) {
            const newPdfDoc = await PDFDocument.create();
            const indices = pageNumbers.map(n => n - 1);
            const copiedPages = await newPdfDoc.copyPages(sourceDoc, indices);
            copiedPages.forEach(page => newPdfDoc.addPage(page));
            return newPdfDoc.save();
        }
        
        async function addDownloadCard(bytes, filename, displayName) {
            const card = document.createElement('div');
            card.className = 'result-card relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col shadow-sm';
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            card.dataset.url = url; 
            card.dataset.filename = filename; 

            card.innerHTML = `
                <div class="absolute z-10 top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="download-card-btn bg-transparent text-2xl cursor-pointer" title="Download">⬇️</button>
                    <button class="delete-card-btn bg-transparent text-xl cursor-pointer" title="Remove">❌</button>
                </div>
                <div class="w-full h-48 flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700"><canvas class="max-w-full max-h-full"></canvas></div>
                <span class="block font-semibold text-center p-2 border-t border-indigo-300 truncate" title="${displayName}">${displayName}</span>`;
            
            card.querySelector('.download-card-btn').addEventListener('click', () => downloadBlob(blob, filename));
            card.querySelector('.delete-card-btn').addEventListener('click', () => {
                URL.revokeObjectURL(url);
                card.remove();
                finalizeResults();
            });

            resultsList.appendChild(card);
            await renderPdfPreview(card.querySelector('canvas'), bytes);
        }
        
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

        function parsePageRanges(str, max) {
            if (!str?.trim()) return null;
            try {
                return str.split(',').map(part => {
                    const pages = new Set();
                    if (part.includes('-')) {
                        const [start, end] = part.split('-').map(Number);
                        if (start >= 1 && end <= max && start <= end) {
                            for (let i = start; i <= end; i++) pages.add(i);
                        }
                    } else {
                        const num = Number(part);
                        if (num >= 1 && num <= max) pages.add(num);
                    }
                    return [...pages].sort((a, b) => a - b);
                }).filter(group => group.length > 0);
            } catch (e) {
                 throw new Error(`Invalid page range format.`);
            }
        }
    });