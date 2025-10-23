document.addEventListener('DOMContentLoaded', () => {
    // Wait for deferred scripts to load
    const checkLibs = setInterval(() => {
        if (typeof PDFLib !== 'undefined' && typeof pdfjsLib !== 'undefined') {
            clearInterval(checkLibs);
            main(); // Run main application logic
        }
    }, 100);

    function main() {
        const { PDFDocument, degrees } = PDFLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

        // UI Element Getters
        const getEl = id => document.getElementById(id);

        const fileInput = getEl('file-input');
        const uploadArea = getEl('upload-area');
        const uploadSection = getEl('upload-section');
        const fileInfo = getEl('file-info');
        const fileInfoContainer = getEl('file-info-container');
        const pdfControls = getEl('pdf-controls');
        const thumbnailContainer = getEl('thumbnail-container');
        const resultsContainer = getEl('results-container');
        const downloadBtn = getEl('download-btn');
        const rotateAll90Btn = getEl('rotate-all-90');
        const resetAllBtn = getEl('reset-all');
        const resetBtn = getEl('reset-btn');

        const statusArea = getEl('status-area');
        const loader = getEl('loader');
        const progressMessage = getEl('progress-message');

        let pdfFile = null;
        let pageStates = []; // Unified state: { rotation: 0, deleted: false }
        let sourcePdfDoc = null;

        // --- Event Listeners ---
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        resetBtn.addEventListener('click', () => {
            location.reload();
        });

        const setupDragAndDrop = () => {
             const label = uploadArea.querySelector('label');
             ['dragenter', 'dragover'].forEach(eventName => uploadArea.addEventListener(eventName, e => {
                e.preventDefault(); e.stopPropagation();
                label.classList.add('border-indigo-600', 'dark:border-indigo-300');
                label.classList.remove('border-slate-400', 'dark:border-slate-500');
            }));
            ['dragleave', 'drop'].forEach(eventName => uploadArea.addEventListener(eventName, e => {
                 e.preventDefault(); e.stopPropagation();
                label.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                label.classList.add('border-slate-400', 'dark:border-slate-500');
            }));
            uploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type === 'application/pdf') handleFile(files[0]);
                else showError("Please drop a valid PDF file.");
            });
        };
        setupDragAndDrop();

        const showStatus = (message) => {
            statusArea.classList.remove('hidden');
            loader.classList.remove('hidden');
            progressMessage.textContent = message;
        };

        const showError = (message) => {
            hideStatus();
            alert(message); // Simple alert for errors as per original
        };

        const hideStatus = () => statusArea.classList.add('hidden');

        const downloadBlob = (blob, filename) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        };

        async function handleFile(file) {
            pdfFile = file;
            uploadSection.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
            fileInfoContainer.classList.remove('hidden'); // This will now work correctly
            thumbnailContainer.innerHTML = '';
            showStatus("Loading and rendering PDF pages...");

            try {
                const arrayBuffer = await file.arrayBuffer();
                sourcePdfDoc = await PDFDocument.load(arrayBuffer);
                await renderPdf(arrayBuffer);
                hideStatus();
                fileInfo.textContent = `✓ ${file.name}`;
            } catch (error) {
                console.error('Error handling file:', error);
                showError('Could not process PDF file. It might be corrupted or password-protected.');
                location.reload();
            }
        }

        async function renderPdf(arrayBuffer) {
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            pageStates = Array.from({ length: pdf.numPages }, () => ({ rotation: 0, deleted: false }));

            for (let i = 1; i <= pdf.numPages; i++) {
                progressMessage.textContent = `Rendering page ${i} of ${pdf.numPages}...`;
                const page = await pdf.getPage(i);
                const canvas = document.createElement('canvas');
                const viewport = page.getViewport({ scale: 1 });
                const scale = 180 / viewport.width;
                const scaledViewport = page.getViewport({ scale });
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                canvas.className = "max-w-full max-h-full transition-transform duration-300";

                await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;
                thumbnailContainer.appendChild(createThumbnailItem(canvas, i));
            }
        }

        function createThumbnailItem(canvas, pageNum) {
            const item = document.createElement('div');
            item.className = 'thumbnail-item result-card relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col';
            item.dataset.page = pageNum;
            const displayName = `Page ${pageNum}`;

            item.innerHTML = `
                <div class="absolute z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="download-card-btn bg-transparent text-2xl cursor-pointer" title="Download">⬇️</button>
                    <button class="rotate-card-btn bg-transparent text-2xl cursor-pointer" title="Rotate 90°">🔄</button>
                    <button class="delete-card-btn bg-transparent text-xl cursor-pointer" title="Remove">❌</button>
                </div>
                <div class="w-full h-48 flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700"><canvas class="max-w-full max-h-full"></canvas></div>
                <span class="block font-semibold text-center p-2 border-t border-indigo-300 truncate" title="${displayName}">${displayName}</span>
            `;

            item.querySelector('.rotate-card-btn').addEventListener('click', () => rotatePage(pageNum, 90));
            item.querySelector('.delete-card-btn').addEventListener('click', () => {
                item.remove();
                pageStates[pageNum - 1].deleted = true;
            });
            item.querySelector('.download-card-btn').addEventListener('click', async () => {
                const newPdfDoc = await PDFDocument.create();
                const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [pageNum - 1]);
                const state = pageStates[pageNum - 1];
                const originalRotation = copiedPage.getRotation().angle;
                copiedPage.setRotation(degrees((originalRotation + state.rotation) % 360));
                newPdfDoc.addPage(copiedPage);
                const pdfBytes = await newPdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                downloadBlob(blob, `${pdfFile.name.replace(/\.pdf$/i, '')}_page_${pageNum}.pdf`);
            });

            const canvasContainer = item.querySelector('div[class~="h-48"]');
            const placeholderCanvas = canvasContainer.querySelector('canvas');
            canvasContainer.replaceChild(canvas, placeholderCanvas);

            return item;
        }

        // --- Page Action Logic ---
        function rotatePage(pageNum, angle) {
            const i = pageNum - 1;
            if (pageStates[i].deleted) return;
            pageStates[i].rotation = (pageStates[i].rotation + angle + 360) % 360;
            updateThumbnailAppearance(pageNum);
        }

        function updateThumbnailAppearance(pageNum) {
            const i = pageNum - 1;
            const item = thumbnailContainer.querySelector(`[data-page='${pageNum}']`);
            if (!item) return;

            item.querySelector('canvas').style.transform = `rotate(${pageStates[i].rotation}deg)`;
        }

        // --- Global Controls Logic ---
        rotateAll90Btn.addEventListener('click', () => rotateAll(90));

        function rotateAll(angle) {
            pageStates.forEach((state, i) => {
                // Only rotate pages that are not marked as deleted
                if (!state.deleted) {
                    rotatePage(i + 1, angle);
                }
            });
        }

        resetAllBtn.addEventListener('click', () => {
            pageStates.forEach((state, i) => {
                state.rotation = 0;
                state.deleted = false;
                updateThumbnailAppearance(i + 1);
            });
        });

        // --- PDF Generation and Download Logic ---
        downloadBtn.addEventListener('click', async () => {
            if (!pdfFile) return;

            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Processing...';
            downloadBtn.disabled = true;

            try {
                const pageIndicesToKeep = pageStates.map((s, i) => s.deleted ? -1 : i).filter(i => i !== -1);

                if (pageIndicesToKeep.length === 0) {
                    showError("Cannot create an empty PDF. Please undelete at least one page.");
                    throw new Error("No pages left");
                }

                const originalPdf = await PDFDocument.load(await pdfFile.arrayBuffer());
                const newPdf = await PDFDocument.create();

                const copiedPages = await newPdf.copyPages(originalPdf, pageIndicesToKeep);

                copiedPages.forEach((page, i) => {
                    const originalIndex = pageIndicesToKeep[i];
                    const state = pageStates[originalIndex];
                    const originalRotation = page.getRotation().angle;

                    page.setRotation(degrees((originalRotation + state.rotation) % 360));
                    newPdf.addPage(page);
                });

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${pdfFile.name.replace(/\.pdf$/i, '')}-edited.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } catch(error) {
                if (error.message !== "No pages left") {
                   showError("An unexpected error occurred while creating the PDF.");
                   console.error("Error during PDF saving:", error);
                }
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }
        });
    }
});