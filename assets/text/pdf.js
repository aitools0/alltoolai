document.addEventListener('DOMContentLoaded', () => {
    /**
     * Waits until the PDFLib library is fully loaded before initializing the converter.
     */
    function waitForPdfLib() {
        if (typeof PDFLib !== 'undefined') {
            initializePdfConverter();
        } else {
            setTimeout(waitForPdfLib, 50);
        }
    }

    /**
     * A helper function to yield to the main thread, preventing UI blocking.
     */
    function yieldToMain() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * Initializes the PDF converter's UI elements and event listeners.
     */
    function initializePdfConverter() {
        const textInput = document.getElementById('textInput');
        const generatePdfBtn = document.getElementById('generatePdfBtn');
        const clearTextBtn = document.getElementById('clearTextBtn');
        const titleInput = document.getElementById('titleInput');
        const pageSizeSelect = document.getElementById('pageSize');
        const orientationSelect = document.getElementById('orientation');
        const fontSizeSelect = document.getElementById('fontSize');

        if (!textInput || !generatePdfBtn || !clearTextBtn) {
            console.error("One or more essential HTML elements could not be found.");
            return;
        }

        const { PDFDocument, rgb, StandardFonts, PageSizes } = PDFLib;

        generatePdfBtn.addEventListener('click', handleGeneratePdf);
        clearTextBtn.addEventListener('click', () => {
            textInput.value = '';
            titleInput.value = '';
            textInput.focus();
        });
        
        /**
         * The main async function that handles the PDF generation process non-blockingly.
         */
        async function handleGeneratePdf() {
            const text = textInput.value;
            if (!text.trim()) {
                alert('Please enter some text to generate a PDF.');
                textInput.focus();
                return;
            }

            const customTitle = titleInput.value.trim();
            const pageSizeValue = pageSizeSelect.value;
            const orientationValue = orientationSelect.value;
            const fontSize = parseInt(fontSizeSelect.value, 10);

            setButtonState(true, 'Initializing...');

            try {
                // Yield to allow the UI to update to "Initializing..."
                await yieldToMain();

                // 1. Setup the PDF Document
                const pdfDoc = await PDFDocument.create();
                pdfDoc.setAuthor('Ai Multiple Tools');
                pdfDoc.setCreator('Ai Multiple Tools - Text to PDF Converter');
                if (customTitle) {
                   pdfDoc.setTitle(customTitle);
                }
                
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const margin = 50;
                const lineHeight = fontSize * 1.2;

                let page, pageWidth, pageHeight, currentY;

                const addNewPage = () => {
                    let dimensions = PageSizes[pageSizeValue];
                    if (orientationValue === 'landscape') {
                        dimensions = [dimensions[1], dimensions[0]];
                    }
                    [pageWidth, pageHeight] = dimensions;
                    page = pdfDoc.addPage(dimensions);
                    currentY = pageHeight - margin;
                };

                // 2. Add content to the PDF using chunked, non-blocking processing
                addNewPage();
                const maxWidth = pageWidth - (2 * margin);
                const paragraphs = text.split('\n');
                const totalParagraphs = paragraphs.length;
                const CHUNK_SIZE = 25; // Process 25 paragraphs at a time

                for (let i = 0; i < totalParagraphs; i++) {
                    const paragraph = paragraphs[i];

                    // Process a paragraph's words
                    const words = paragraph.split(' ');
                    let currentLine = '';

                    for (const word of words) {
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
                            currentLine = testLine;
                        } else {
                            if (currentY - lineHeight < margin) addNewPage();
                            page.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font, color: rgb(0, 0, 0) });
                            currentY -= lineHeight;
                            currentLine = word;
                        }
                    }

                    if (currentLine || paragraph.trim() === '') {
                        if (currentY - lineHeight < margin) addNewPage();
                        if (currentLine) {
                            page.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font, color: rgb(0, 0, 0) });
                        }
                        currentY -= lineHeight;
                    }

                    // After a chunk of work, yield to the main thread to keep UI responsive
                    if ((i + 1) % CHUNK_SIZE === 0) {
                        const progress = Math.round(((i + 1) / totalParagraphs) * 100);
                        setButtonState(true, `Generating... ${progress}%`);
                        await yieldToMain();
                    }
                }
                
                // 3. Save the PDF and trigger the download
                setButtonState(true, 'Saving PDF...');
                await yieldToMain(); // Allow UI to update before final save

                const pdfBytes = await pdfDoc.save();
                const safeFileName = (customTitle.replace(/[^a-z0-9_.\s-]/gi, '') || 'converted-text').replace(/[\s_]+/g, '-');
                downloadPdf(pdfBytes, `${safeFileName}.pdf`);

            } catch (error) {
                console.error('PDF Generation Error:', error);
                alert('An error occurred while generating the PDF. Please check the console for details.');
            } finally {
                setButtonState(false, 'Generate PDF');
            }
        }
        
        function setButtonState(isLoading, text) {
            generatePdfBtn.disabled = isLoading;
            generatePdfBtn.textContent = text;
        }

        function downloadPdf(bytes, filename) {
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }
    }

    // Start the process
    waitForPdfLib();
});
