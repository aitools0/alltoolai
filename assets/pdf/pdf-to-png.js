    document.addEventListener('DOMContentLoaded', () => {
        // --- DOM Elements ---
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const fileInfoContainer = document.getElementById('file-info-container');
        const fileInfo = document.getElementById('file-info');
        const resetBtn = document.getElementById('reset-btn');
        const controlsSection = document.getElementById('controls');
        const convertBtn = document.getElementById('convert-btn');
        const statusArea = document.getElementById('status-area');
        const progressBarContainer = document.getElementById('progress-bar-container');
        const progressBar = document.getElementById('progress-bar');
        const progressMessage = document.getElementById('progress-message');
        const errorMessage = document.getElementById('error-message');
        const resultsContainer = document.getElementById('results-container');
        const downloadZipBtn = document.getElementById('download-zip-btn');
        const resultsList = document.getElementById('results-list');

        // --- State ---
        let state = {
            file: null,
            fileName: '',
            isConverting: false,
            resultsVisible: false,
            progressText: '',
            errorText: '',
            convertedImages: [],
        };
        
        // --- UI Update Function ---
        function render() {
            // Section visibility
            uploadArea.classList.toggle('hidden', !!state.file);
            fileInfoContainer.classList.toggle('hidden', !state.file);
            controlsSection.classList.toggle('hidden', !(state.file && !state.isConverting && !state.resultsVisible));
            statusArea.classList.toggle('hidden', !state.progressText && !state.isConverting);
            resultsContainer.classList.toggle('hidden', !state.resultsVisible);
            errorMessage.classList.toggle('hidden', !state.errorText);

            // Text content
            fileInfo.textContent = state.fileName;
            progressMessage.textContent = state.progressText;
            errorMessage.textContent = state.errorText;

            // Render image results
            if (state.resultsVisible) {
                resultsList.innerHTML = ''; // Clear previous
                const fragment = document.createDocumentFragment();
                state.convertedImages.forEach((image, index) => {
                    const card = document.createElement('div');
                    card.className = 'result-card relative group bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col shadow-sm';
                    card.innerHTML = `
                        <div class="absolute z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="download-card-btn bg-transparent text-2xl cursor-pointer" title="Download">⬇️</button>
                            <button class="delete-card-btn bg-transparent text-xl cursor-pointer" title="Remove">❌</button>
                        </div>
                        <div class="w-full h-48 flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700">
                           <img src="${image.data}" alt="Preview for Page ${image.pageNum}" class="max-w-full max-h-full object-contain">
                        </div>
                        <div class="p-2 border-t border-indigo-300 text-center">
                           <span class="block font-semibold truncate">Page ${image.pageNum}</span>
                        </div>
                    `;
                    
                    card.querySelector('.download-card-btn').addEventListener('click', () => {
                        const link = document.createElement('a');
                        link.href = image.data;
                        link.download = `Page_${image.pageNum}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    });

                    card.querySelector('.delete-card-btn').addEventListener('click', () => {
                        state.convertedImages.splice(index, 1);
                        render();
                    });
                    fragment.appendChild(card);
                });
                resultsList.appendChild(fragment);
            }
        }

        // --- Event Handlers ---
        function handleFileSelect(event) {
            const selectedFile = event.target.files[0];
            if (!selectedFile) return;

            resetState();

            if (selectedFile.type !== "application/pdf") {
                return showError("Please select a valid PDF file.");
            }
            if (selectedFile.size > 2000 * 1024 * 1024) { 
                return showError("File is too large (Max 2000MB).");
            }
            
            state.file = selectedFile;
            state.fileName = `✓ ${selectedFile.name}`;
            hideError();
            render();
        }
        
        // Helper function to allow the browser to repaint between tasks.
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        async function processPDF() {
            if (!state.file) return;

            state.isConverting = true;
            state.progressText = "Preparing to convert...";
            progressBarContainer.classList.remove('hidden'); 
            progressBar.style.width = '0%';
            hideError();
            render();

            try {
                const fileData = await state.file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileData), useSystemFonts: true }).promise;
                const numPages = pdf.numPages;

                for (let i = 1; i <= numPages; i++) {
                    state.progressText = `Converting page ${i} of ${numPages}...`;
                    const progress = ((i / numPages) * 100);
                    progressBar.style.width = `${progress}%`; 
                    render();
                    
                    await sleep(10);

                    const page = await pdf.getPage(i);
                    const scale = 2.0;
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport }).promise;
                    state.convertedImages.push({ pageNum: i, data: canvas.toDataURL("image/png") });
                }
                
                state.isConverting = false;
                state.resultsVisible = true;
                state.progressText = "Conversion Complete!";
                render();

            } catch (err) {
                console.error("PDF Processing Error:", err);
                showError("Could not process PDF. It may be encrypted or corrupted.");
                resetState();
            } finally {
               state.isConverting = false;
               progressBarContainer.classList.add('hidden');
               render();
            }
        }
        
        async function downloadZip() {
            if (state.convertedImages.length === 0) return;

            downloadZipBtn.disabled = true;
            state.isConverting = true; 
            progressBarContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            
            try {
                const zip = new JSZip();
                const totalFiles = state.convertedImages.length;
                
                for (let i = 0; i < totalFiles; i++) {
                    const image = state.convertedImages[i];
                    state.progressText = `Zipping image ${i + 1} of ${totalFiles}...`;
                    
                    const base64Data = image.data.split(",")[1];
                    zip.file(`Page_${image.pageNum}.png`, base64Data, { base64: true });
                    
                    const progress = ((i + 1) / totalFiles) * 100;
                    progressBar.style.width = progress + '%';
                    render();
                    
                    await sleep(10);
                }
                
                state.progressText = 'Generating compressed ZIP file, please wait...';
                progressBar.style.width = '100%';
                render();

                const content = await zip.generateAsync({
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                });

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const filename = `archive_${timestamp}.zip`;

                const link = document.createElement("a");
                link.href = URL.createObjectURL(content);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

            } catch (error) {
                console.error('ZIP creation error:', error);
                showError('Error creating ZIP file: ' + error.message);
            } finally {
                state.isConverting = false;
                progressBarContainer.classList.add('hidden');
                progressBar.style.width = '0%';
                state.progressText = '';
                downloadZipBtn.disabled = false;
                render();
            }
        }
        
        // --- Helper Functions ---
        function showError(message) {
            state.errorText = message;
            render();
        }
            
        function hideError() {
            state.errorText = '';
            render();
        }
        
        function resetState() {
            state.file = null;
            state.fileName = '';
            state.isConverting = false;
            state.resultsVisible = false;
            state.progressText = '';
            state.convertedImages = [];
            progressBarContainer.classList.add('hidden');
            progressBar.style.width = '0%';
            hideError();
            fileInput.value = ""; 
            resultsList.innerHTML = ''; 
            render();
        }

        // --- Initialization ---
        function init() {
            if (typeof pdfjsLib === 'undefined' || typeof JSZip === 'undefined') {
                showError("Required libraries could not be loaded. Please check your internet connection.");
                return;
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

            // Add Event Listeners
            fileInput.addEventListener('change', handleFileSelect);
            resetBtn.addEventListener('click', resetState);
            convertBtn.addEventListener('click', processPDF);
            downloadZipBtn.addEventListener('click', downloadZip);
            
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
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const droppedFile = e.dataTransfer.files[0];
                if(droppedFile){
                    fileInput.files = e.dataTransfer.files;
                    handleFileSelect({target: fileInput});
                }
            });

            render();
        }
        
        init();
    });