    window.onload = () => {
        if (typeof PDFLib === 'undefined') {
            alert("Error: Could not load required libraries. Please refresh the page.");
            return;
        }

        const { PDFDocument, rgb, StandardFonts } = PDFLib;

        // --- State ---
        const state = {
            pdfFile: null,
            pdfDoc: null,
            totalPages: 0,
            isBold: false,
            isItalic: false,
            horizontalAlignment: 'middle',
            currentPreviewUrl: null
        };
        
        // --- UI Elements ---
        const ui = {};
        document.querySelectorAll('[id]').forEach(el => {
            const camelCaseId = el.id.replace(/-([a-z])/g, g => g[1].toUpperCase());
            ui[camelCaseId] = el;
        });

        const debounce = (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        };
        const debouncedUpdatePreview = debounce(updatePreview, 300);

        const setPreviewMessage = (message) => {
            ui.preview.innerHTML = `<p>${message}</p>`;
        };

        // --- UI State Management ---
        const setReadyState = () => {
            ui.uploadSection.classList.remove('hidden');
            ui.editorSection.classList.add('hidden');
            ui.editorSection.classList.remove('block');
            ui.fileName.textContent = '';
            ui.pdfUpload.value = '';
            ui.downloadBtn.disabled = true;
            ui.resetBtn.disabled = true;
            if (state.currentPreviewUrl) {
                URL.revokeObjectURL(state.currentPreviewUrl);
            }
            setPreviewMessage('Upload a PDF to get started.');
            Object.assign(state, { pdfFile: null, pdfDoc: null, totalPages: 0, currentPreviewUrl: null, horizontalAlignment: 'middle' });
            handleHorizontalMarginChange(ui.marginHorizontalMiddle);
        };

        const setFileLoadedState = (file) => {
            ui.uploadSection.classList.add('hidden');
            ui.editorSection.classList.remove('hidden');
            ui.editorSection.classList.add('block');
            ui.fileName.textContent = `File: ${file.name}`;
            ui.downloadBtn.disabled = false;
            ui.resetBtn.disabled = false;
        };
        
        // --- Event Listeners ---
        function setupEventListeners() {
            const handleDrag = (e, enter) => {
                e.preventDefault();
                e.stopPropagation();
                const target = ui.uploadSection.querySelector('label');
                if (enter) {
                    target.classList.add('border-indigo-600', 'dark:border-indigo-300');
                    target.classList.remove('border-slate-400', 'dark:border-slate-500');
                } else {
                    target.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                    target.classList.add('border-slate-400', 'dark:border-slate-500');
                }
            };
            ui.uploadSection.addEventListener("dragenter", e => handleDrag(e, true));
            ui.uploadSection.addEventListener("dragover", e => handleDrag(e, true));
            ui.uploadSection.addEventListener("dragleave", e => handleDrag(e, false));
            ui.uploadSection.addEventListener("drop", handleFileDrop);

            ui.pdfUpload.addEventListener("change", e => { if (e.target.files.length) handlePdfUpload(e.target.files[0]); });
            
            ui.controlsArea.addEventListener('input', debouncedUpdatePreview);
            
            ui.controlsArea.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (!button) return;
                const { id } = button;

                if (id === 'download-btn') applyAndDownload();
                else if (id === 'reset-btn') setReadyState();
                else if (id === 'bold-btn' || id === 'italic-btn') {
                    handleStyleToggle(button);
                    debouncedUpdatePreview();
                } else if (id.startsWith('margin-horizontal-')) {
                    handleHorizontalMarginChange(button);
                    debouncedUpdatePreview();
                }
            });
        }
        
        // --- Handlers ---
        async function handlePdfUpload(file) {
            if (file.type !== "application/pdf") {
                alert("Please upload a valid PDF file.");
                return;
            }
            state.pdfFile = file;
            setFileLoadedState(file);

            try {
                const fileBuffer = await file.arrayBuffer();
                state.pdfDoc = await PDFDocument.load(fileBuffer);
                state.totalPages = state.pdfDoc.getPageCount();

                // Reset controls
                ui.pageFrom.value = 1;
                ui.pageTo.value = state.totalPages;
                ui.pageFrom.max = state.totalPages;
                ui.pageTo.max = state.totalPages;
                debouncedUpdatePreview();
                
            } catch (error) {
                console.error("Error loading PDF:", error);
                alert("Could not load PDF. It may be corrupt or protected.");
                setReadyState();
            }
        }

        function handleFileDrop(e) {
            e.preventDefault(); e.stopPropagation();
            const target = ui.uploadSection.querySelector('label');
            target.classList.remove('border-indigo-600', 'dark:border-indigo-300');
            target.classList.add('border-slate-400', 'dark:border-slate-500');
            const file = e.dataTransfer.files?.[0];
            if (file && file.type === "application/pdf") handlePdfUpload(file);
            else alert("Please drop a valid PDF file.");
        }
        
        function handleStyleToggle(button) {
            button.classList.toggle('active');
            const isActive = button.classList.contains('active');
            if(isActive) {
                button.classList.add('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                button.classList.remove('text-slate-900', 'dark:text-slate-200', 'bg-white', 'dark:bg-slate-600');
            } else {
                 button.classList.remove('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                button.classList.add('text-slate-900', 'dark:text-slate-200', 'bg-white', 'dark:bg-slate-600');
            }
            state.isBold = ui.boldBtn.classList.contains('active');
            state.isItalic = ui.italicBtn.classList.contains('active');
        }

        function handleHorizontalMarginChange(clickedButton) {
            const buttons = [ui.marginHorizontalLeft, ui.marginHorizontalMiddle, ui.marginHorizontalRight];
            buttons.forEach(button => {
                const isActive = button === clickedButton;
                button.classList.toggle('active', isActive);
                 if (isActive) {
                    button.classList.add('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                    button.classList.remove('text-slate-900', 'dark:text-slate-200', 'bg-white', 'dark:bg-slate-600');
                } else {
                    button.classList.remove('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                    button.classList.add('text-slate-900', 'dark:text-slate-200', 'bg-white', 'dark:bg-slate-600');
                }
            });

            if (clickedButton.id === 'margin-horizontal-left') {
                state.horizontalAlignment = 'left';
            } else if (clickedButton.id === 'margin-horizontal-middle') {
                state.horizontalAlignment = 'middle';
            } else if (clickedButton.id === 'margin-horizontal-right') {
                state.horizontalAlignment = 'right';
            }
        }

        async function addPageNumbers(pdfDoc) {
            const from = Math.max(1, parseInt(ui.pageFrom.value) || 1);
            const to = Math.min(state.totalPages, parseInt(ui.pageTo.value) || state.totalPages);
            const fontSize = parseInt(ui.fontSize.value) || 12;
            const color = hexToRgb(ui.fontColor.value);

            const getFontKey = (family, bold, italic) => {
                    if (family === 'Times-Roman') {
                    if (bold && italic) return StandardFonts.TimesRomanBoldItalic; if (bold) return StandardFonts.TimesRomanBold; if (italic) return StandardFonts.TimesRomanItalic; return StandardFonts.TimesRoman;
                } if (family === 'Courier') {
                    if (bold && italic) return StandardFonts.CourierBoldOblique; if (bold) return StandardFonts.CourierBold; if (italic) return StandardFonts.CourierOblique; return StandardFonts.Courier;
                }
                if (bold && italic) return StandardFonts.HelveticaBoldOblique; if (bold) return StandardFonts.HelveticaBold; if (italic) return StandardFonts.HelveticaOblique; return StandardFonts.Helvetica;
            };
            const font = await pdfDoc.embedFont(getFontKey(ui.fontFamily.value, state.isBold, state.isItalic));

            for (let i = from - 1; i < to && i < pdfDoc.getPageCount(); i++) {
                const page = pdfDoc.getPage(i);
                const { width, height } = page.getSize();
                const text = ui.format.value.replace(/{page}/g, i + 1).replace(/{total}/g, state.totalPages);
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const marginV = parseFloat(ui.marginVertical.value) || 20;
                
                let x;
                const marginH = parseFloat(ui.marginVertical.value) || 20; 
                switch (state.horizontalAlignment) {
                    case 'left':
                        x = marginH;
                        break;
                    case 'right':
                        x = width - textWidth - marginH;
                        break;
                    case 'middle':
                    default:
                        x = (width - textWidth) / 2;
                        break;
                }
                
                const y = marginV;
                
                page.drawText(text, { x, y, font, size: fontSize, color: rgb(color.r, color.g, color.b) });
            }
            return pdfDoc;
        }

        async function updatePreview() {
            if (!state.pdfDoc) return;
            setPreviewMessage('Generating Preview...');

            try {
                const previewDoc = await PDFDocument.create();
                const pageIndices = Array.from({ length: state.pdfDoc.getPageCount() }, (_, i) => i);
                const copiedPages = await previewDoc.copyPages(state.pdfDoc, pageIndices);
                copiedPages.forEach(page => previewDoc.addPage(page));

                const modifiedPreviewDoc = await addPageNumbers(previewDoc);
                const pdfBytes = await modifiedPreviewDoc.save();

                if (state.currentPreviewUrl) URL.revokeObjectURL(state.currentPreviewUrl);
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                state.currentPreviewUrl = URL.createObjectURL(blob);

                ui.preview.innerHTML = `<iframe src="${state.currentPreviewUrl}" type="application/pdf" frameBorder="0" class="w-full h-full" style="min-height: 80vh;"></iframe>`;
            } catch (e) {
                setPreviewMessage("Could not generate preview. Please check settings.");
                console.error(e);
            }
        }

        // --- Core Logic ---
        async function applyAndDownload() {
            if (!state.pdfFile) { alert('Please upload a PDF file.'); return; }
            ui.downloadBtn.disabled = true;
            ui.downloadBtn.textContent = 'Processing...';

            try {
                const existingPdfBytes = await state.pdfFile.arrayBuffer();
                const pdfDoc = await PDFDocument.load(existingPdfBytes);

                const modifiedPdf = await addPageNumbers(pdfDoc);

                const pdfBytes = await modifiedPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `numbered-${state.pdfFile.name}`;
                document.body.appendChild(link);
                link.click();
                
                requestAnimationFrame(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                });

            } catch (error) {
                console.error("Failed to apply page numbers:", error);
                alert(`An error occurred: ${error.message}`);
            } finally {
                ui.downloadBtn.disabled = false;
                ui.downloadBtn.textContent = 'Apply & Download';
            }
        }
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : { r: 0, g: 0, b: 0 };
        };

        // --- Init ---
        setupEventListeners();
        setReadyState();
    };