    window.onload = () => {
        if (typeof PDFLib === 'undefined') {
            console.error("Required PDF libraries not loaded. Please check script tags.");
            alert("Error: Could not load required libraries. Please refresh the page.");
            return;
        }

        const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;

        // --- DOM Element References ---
        const uploadSection = document.getElementById('upload-section');
        const editorSection = document.getElementById('editor-section');
        const pdfUpload = document.getElementById('pdf-upload');
        const imageUpload = document.getElementById('image-upload');
        const typeTextBtn = document.getElementById('type-text-btn');
        const typeImageBtn = document.getElementById('type-image-btn');
        const textControls = document.getElementById('text-controls');
        const imageControls = document.getElementById('image-controls');
        const textInput = document.getElementById('text-input');
        const fontFamily = document.getElementById('font-family');
        const fontColor = document.getElementById('font-color');
        const fontSize = document.getElementById('font-size');
        const opacity = document.getElementById('opacity');
        const rotation = document.getElementById('rotation');
        const pages = document.getElementById('pages');
        const downloadBtn = document.getElementById('download-btn');
        const resetBtn = document.getElementById('reset-btn');
        const preview = document.getElementById('preview');
        const positionGrid = document.querySelector('.position-grid');
        const imagePreview = document.getElementById('image-preview');

        // --- State Variables ---
        let pdfDoc = null;
        let originalPdfBytes = null;
        let currentFile = null;
        let currentPreviewUrl = null;
        let watermarkType = 'text';
        let imageBytes = null;
        let imageType = null;
        let position = 'center';

        const debounce = (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        };
        const debouncedUpdatePreview = debounce(updatePreview, 300);

        // --- Event Listeners ---
        fontSize.addEventListener('input', e => document.getElementById('font-size-value').textContent = `${e.target.value}pt`);
        opacity.addEventListener('input', e => document.getElementById('opacity-value').textContent = e.target.value);
        rotation.addEventListener('input', e => document.getElementById('rotation-value').textContent = `${e.target.value}°`);

        pdfUpload.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });
        
        imageUpload.addEventListener('change', handleImageUpload);

        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadSection.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                const target = uploadSection.querySelector('label');
                if (eventName === 'dragover') {
                    target.classList.add('border-indigo-600', 'dark:border-indigo-300');
                    target.classList.remove('border-slate-400', 'dark:border-slate-500');
                } else {
                    target.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                    target.classList.add('border-slate-400', 'dark:border-slate-500');
                }
                if (eventName === 'drop' && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
            });
        });

        document.getElementById('controls-area').addEventListener('input', debouncedUpdatePreview);
        
        typeTextBtn.addEventListener('click', () => switchWatermarkType('text'));
        typeImageBtn.addEventListener('click', () => switchWatermarkType('image'));

        positionGrid.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                positionGrid.querySelector('.active')?.classList.remove('active');
                e.target.classList.add('active');
                position = e.target.dataset.position;
                debouncedUpdatePreview();
            }
        });

        resetBtn.addEventListener('click', () => {
            if (confirm("Are you sure? This will discard your current changes and allow you to upload a new file.")) {
                resetApplication();
            }
        });

        downloadBtn.addEventListener('click', generatePdfForDownload);

        // --- Core Functions ---
        async function handleFile(file) {
            if (!file || file.type !== 'application/pdf') {
                alert('Please select a valid PDF file.');
                return;
            }
            currentFile = file;
            setLoadingState(true, 'Loading PDF...');
            try {
                originalPdfBytes = await file.arrayBuffer();
                pdfDoc = await PDFDocument.load(originalPdfBytes);
                
                uploadSection.classList.add('hidden');
                editorSection.classList.remove('hidden');
                editorSection.classList.add('block', 'lg:grid', 'lg:grid-cols-2', 'lg:gap-8');
                
                await debouncedUpdatePreview();
            } catch (error) {
                alert('Could not load the PDF. It may be corrupted or password-protected.');
                resetApplication();
            } finally {
                setLoadingState(false);
            }
        }
        
        function handleImageUpload(e) {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = e => {
                imageBytes = e.target.result;
                imageType = file.type;
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.classList.remove('hidden');
                debouncedUpdatePreview();
            };
            reader.readAsArrayBuffer(file);
        }

        async function updatePreview() {
            if (!pdfDoc) return;
            setPreviewMessage('Generating Preview...');
            try {
                const previewDoc = await PDFDocument.create();
                const pageIndices = Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i);
                const copiedPages = await previewDoc.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach(page => previewDoc.addPage(page));

                const modifiedPreviewDoc = await addWatermark(previewDoc);
                const pdfBytes = await modifiedPreviewDoc.save();

                if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                currentPreviewUrl = URL.createObjectURL(blob);

                preview.innerHTML = `<iframe src="${currentPreviewUrl}" type="application/pdf" frameBorder="0" class="w-full h-full" style="min-height: 80vh;"></iframe>`;
            } catch (e) {
                setPreviewMessage("Could not generate preview. Please check settings.");
                console.error(e);
            }
        }

        async function addWatermark(docInstance) {
            const fontMap = { 'Helvetica': StandardFonts.Helvetica, 'TimesRoman': StandardFonts.TimesRoman, 'Courier': StandardFonts.Courier };
            const font = await docInstance.embedFont(fontMap[fontFamily.value] || StandardFonts.Helvetica);
            let image = null;
            if (watermarkType === 'image' && imageBytes) {
               image = imageType === 'image/png' ? await docInstance.embedPng(imageBytes) : await docInstance.embedJpg(imageBytes);
            }
            const textColor = rgb(parseInt(fontColor.value.substring(1, 3), 16) / 255, parseInt(fontColor.value.substring(3, 5), 16) / 255, parseInt(fontColor.value.substring(5, 7), 16) / 255);
            const targetPageIndices = parsePageRanges(pages.value, docInstance.getPageCount());

            for (const pageIndex of targetPageIndices) {
                const page = docInstance.getPages()[pageIndex];
                const { width, height } = page.getSize();
                let itemWidth = 0, itemHeight = 0;

                if (watermarkType === 'text') {
                    itemWidth = font.widthOfTextAtSize(textInput.value || ' ', Number(fontSize.value));
                    itemHeight = font.heightAtSize(Number(fontSize.value));
                } else if (image) {
                    const desiredWidth = width * 0.5;
                    itemWidth = desiredWidth;
                    itemHeight = (desiredWidth / image.width) * image.height;
                }
                
                if(itemWidth <= 0) continue;

                const rotationDegrees = -Number(rotation.value);
                const rotationRads = rotationDegrees * (Math.PI / 180);
                const absSin = Math.abs(Math.sin(rotationRads));
                const absCos = Math.abs(Math.cos(rotationRads));
                const rotatedWidth = itemWidth * absCos + itemHeight * absSin;
                const rotatedHeight = itemWidth * absSin + itemHeight * absCos;

                const [vPos, hPos] = position.split('-');
                const margin = 50;
                let centerX, centerY;
                
                if (vPos === 'top') centerY = height - rotatedHeight / 2 - margin;
                else if (vPos === 'bottom') centerY = rotatedHeight / 2 + margin;
                else centerY = height / 2;

                if (hPos === 'left') centerX = rotatedWidth / 2 + margin;
                else if (hPos === 'right') centerX = width - rotatedWidth / 2 - margin;
                else centerX = width / 2;
                
                const cos = Math.cos(rotationRads);
                const sin = Math.sin(rotationRads);
                const finalX = centerX - (itemWidth / 2) * cos + (itemHeight / 2) * sin;
                const finalY = centerY - (itemWidth / 2) * sin - (itemHeight / 2) * cos;
                
                const commonOptions = {
                    rotate: degrees(rotationDegrees),
                    opacity: Number(opacity.value),
                };

                if (watermarkType === 'text') {
                     page.drawText(textInput.value, { 
                        ...commonOptions, 
                        x: finalX, 
                        y: finalY,
                        font, 
                        size: Number(fontSize.value), 
                        color: textColor 
                    });
                } else if (image) {
                    page.drawImage(image, { 
                       ...commonOptions, 
                       x: finalX,
                       y: finalY,
                       width: itemWidth, 
                       height: itemHeight
                    });
                }
            }
            return docInstance;
        }

        async function generatePdfForDownload() {
            if (!originalPdfBytes) return;
            setLoadingState(true, 'Finalizing PDF...');
            try {
                const finalDoc = await PDFDocument.load(originalPdfBytes);
                const modifiedPdf = await addWatermark(finalDoc);
                const pdfBytes = await modifiedPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `watermarked_${currentFile.name}`;
                document.body.appendChild(a);
                a.click();
                
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                alert("An error occurred while generating the PDF. Please try again.");
                console.error(error);
            } finally {
                setLoadingState(false);
            }
        }

        // --- Helper & State Functions ---
        function resetApplication() {
            if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
            pdfUpload.value = ''; // Reset file input
            editorSection.classList.add('hidden');
            editorSection.classList.remove('block', 'lg:grid', 'lg:grid-cols-2', 'lg:gap-8');
            uploadSection.classList.remove('hidden');
            setPreviewMessage('Upload a PDF to get started.');
            pdfDoc = null; originalPdfBytes = null; currentFile = null; currentPreviewUrl = null;
        }

        function setLoadingState(isLoading, message = '') {
            downloadBtn.disabled = isLoading;
            resetBtn.disabled = isLoading;
            if (isLoading) {
                downloadBtn.textContent = message;
            } else {
                downloadBtn.textContent = 'Apply & Download';
            }
        }

        function setPreviewMessage(message) { preview.innerHTML = `<p>${message}</p>`; }
        
        function switchWatermarkType(type) {
            watermarkType = type;
            const isText = type === 'text';

            if (isText) {
                typeTextBtn.classList.add('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                typeTextBtn.classList.remove('text-slate-900', 'dark:text-slate-200', 'bg-slate-200', 'dark:bg-slate-900');
                typeImageBtn.classList.remove('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                typeImageBtn.classList.add('text-slate-900', 'dark:text-slate-200', 'bg-slate-200', 'dark:bg-slate-900');
            } else {
                typeImageBtn.classList.add('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                typeImageBtn.classList.remove('text-slate-900', 'dark:text-slate-200', 'bg-slate-200', 'dark:bg-slate-900');
                typeTextBtn.classList.remove('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
                typeTextBtn.classList.add('text-slate-900', 'dark:text-slate-200', 'bg-slate-200', 'dark:bg-slate-900');
            }

            textControls.classList.toggle('hidden', !isText);
            imageControls.classList.toggle('hidden', isText);
            debouncedUpdatePreview();
        }
        
        function parsePageRanges(pagesStr, totalPages) {
            if (pagesStr.trim().toLowerCase() === 'all') {
                return Array.from({ length: totalPages }, (_, i) => i);
            }
            const pages = new Set();
            for (const part of pagesStr.replace(/\s/g, "").split(',')) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                            if (i > 0 && i <= totalPages) pages.add(i - 1);
                        }
                    }
                } else {
                    const pageNum = Number(part);
                    if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) pages.add(pageNum - 1);
                }
            }
            return [...pages];
        }
        
        // --- Init ---
        switchWatermarkType('text');
        setLoadingState(false);
        resetApplication();
    };