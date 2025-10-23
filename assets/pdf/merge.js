        document.addEventListener('DOMContentLoaded', () => {
            // Wait for PDFLib to be ready
            if (typeof PDFLib === 'undefined') {
                alert('Critical component "pdf-lib" could not be loaded. Please check your internet connection or ad-blocker.');
                return;
            }

            const { PDFDocument } = PDFLib;

            // DOM elements
            const fileInput = document.getElementById('file-input');
            const uploadArea = document.getElementById('upload-area');
            const uploadLabel = document.getElementById('upload-label');
            const fileListWrapper = document.getElementById('file-list-wrapper');
            const fileList = document.getElementById('file-list');
            const outputFilenameInput = document.getElementById('output-filename');
            
            const actionSection = document.getElementById('action-section');
            const mergeBtn = document.getElementById('merge-btn');
            const downloadBtn = document.getElementById('download-btn');
            const loader = document.getElementById('loader');
            const loaderText = document.getElementById('loader-text');

            let uploadedFiles = []; // Array to store File objects

            // --- Event Listeners Setup ---
            fileInput.addEventListener('change', (event) => {
                processFiles(event.target.files);
                setTimeout(() => { fileInput.value = ''; }, 0);
            });

            document.getElementById('add-more-btn').addEventListener('click', () => fileInput.click());
            document.getElementById('reset-btn').addEventListener('click', resetAll);

            // Drag and Drop
            uploadLabel.addEventListener('drop', (event) => {
                handleDrag(event, false);
                processFiles(event.dataTransfer.files);
            });
            ['dragenter', 'dragover'].forEach(eventName => uploadLabel.addEventListener(eventName, e => handleDrag(e, true)));
            uploadLabel.addEventListener('dragleave', e => handleDrag(e, false));
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadLabel.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
            });
            
            const handleDrag = (e, enter) => {
                uploadLabel.classList.toggle('border-indigo-600', enter);
                uploadLabel.classList.toggle('dark:border-indigo-300', enter);
                uploadLabel.classList.toggle('border-slate-400', !enter);
                uploadLabel.classList.toggle('dark:border-slate-500', !enter);
            };

            // Actions
            mergeBtn.addEventListener('click', mergePdfs);
            fileList.addEventListener('click', handleListActions);
            
            function processFiles(files) {
                const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
                if (pdfFiles.length === 0) return;

                const uniqueNewFiles = pdfFiles.filter(newFile => 
                    !uploadedFiles.some(f => f.name === newFile.name && f.size === newFile.size)
                );
                
                uploadedFiles.push(...uniqueNewFiles);
                renderFileList();
                updateUIState();
            }
            
            function handleListActions(e) {
                const button = e.target.closest('button[data-action]');
                if (!button) return;

                const listItem = button.closest('li');
                const index = parseInt(listItem.dataset.index, 10);
                const action = button.dataset.action;

                if (action === 'remove') removeFile(index);
                if (action === 'move-up') moveFile(index, 'up');
                if (action === 'move-down') moveFile(index, 'down');
            }

            // MODIFICATION: Rewrote this function to be faster and more efficient, avoiding `innerHTML` to prevent UI lag.
            function renderFileList() {
                fileList.innerHTML = ''; // Clear existing list
                const fragment = document.createDocumentFragment();

                uploadedFiles.forEach((file, index) => {
                    const listItem = document.createElement('li');
                    listItem.className = 'p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between';
                    listItem.dataset.index = index;

                    const fileInfo = document.createElement('div');
                    fileInfo.className = 'flex-grow overflow-hidden mr-4';
                    
                    const fileName = document.createElement('p');
                    fileName.className = 'font-medium text-slate-800 dark:text-slate-200 truncate';
                    fileName.title = file.name;
                    fileName.textContent = file.name;

                    const fileSize = document.createElement('p');
                    fileSize.className = 'text-sm text-slate-500 dark:text-slate-400';
                    fileSize.textContent = formatBytes(file.size);

                    fileInfo.append(fileName, fileSize);

                    const controls = document.createElement('div');
                    controls.className = 'flex items-center gap-2 flex-shrink-0';
                    
                    const moveUpBtn = createButton('move-up', '▲', 'Move Up', index === 0);
                    const moveDownBtn = createButton('move-down', '▼', 'Move Down', index === uploadedFiles.length - 1);
                    const removeBtn = createButton('remove', '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>', 'Remove File');
                    
                    controls.append(moveUpBtn, moveDownBtn, removeBtn);
                    listItem.append(fileInfo, controls);
                    fragment.appendChild(listItem);
                });

                fileList.appendChild(fragment);
            }
            
            function createButton(action, content, title, disabled = false) {
                const btn = document.createElement('button');
                btn.dataset.action = action;
                btn.title = title;
                btn.disabled = disabled;
                
                let baseClasses = 'text-white transition-colors';
                if (action === 'remove') {
                    btn.className = `${baseClasses} p-2 cursor-pointer rounded-full bg-red-500 hover:bg-red-600`;
                } else {
                    btn.className = `${baseClasses} p-1 cursor-pointer w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700`;
                }
                
                btn.innerHTML = content;
                return btn;
            }

            function updateUIState() {
                const hasFiles = uploadedFiles.length > 0;
                uploadArea.classList.toggle('hidden', hasFiles);
                fileListWrapper.classList.toggle('hidden', !hasFiles);
                actionSection.classList.toggle('hidden', !hasFiles);
                showActionButton('merge');
                mergeBtn.disabled = uploadedFiles.length < 2;
            }

            async function mergePdfs() {
                if (uploadedFiles.length < 2) return;
                
                // MODIFICATION: Sanitize filename to remove invalid characters
                const sanitizedFilename = (outputFilenameInput.value.trim() || 'merged-document').replace(/[/\\?%*:|"<>]/g, '-');
                const outputFilename = sanitizedFilename.replace(/\.pdf$/i, '') + '.pdf';


                showActionButton('loader', 'Initializing merge...');
                
                try {
                    const mergedPdf = await PDFDocument.create();

                    for (let i = 0; i < uploadedFiles.length; i++) {
                        const file = uploadedFiles[i];
                        showActionButton('loader', `Processing ${i + 1}/${uploadedFiles.length}: ${file.name}`);
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                        copiedPages.forEach(page => mergedPdf.addPage(page));
                    }
                    
                    showActionButton('loader', 'Finalizing document...');
                    const mergedPdfBytes = await mergedPdf.save();
                    displayDownloadLink(mergedPdfBytes, outputFilename);

                } catch (error) {
                    console.error('Error during PDF merging:', error);
                    alert(`An error occurred: ${error.message}. One or more PDFs may be corrupted or encrypted.`);
                    resetAll();
                }
            }
            
            function showActionButton(type, text = 'Merging...') {
                 mergeBtn.classList.toggle('hidden', type !== 'merge');
                 downloadBtn.classList.toggle('hidden', type !== 'download');
                 loader.classList.toggle('hidden', type !== 'loader');
                 if (type === 'loader') {
                    loaderText.textContent = text;
                 }
            }

            function displayDownloadLink(pdfBytes, filename) {
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                downloadBtn.download = filename;
                showActionButton('download');
            }

            function resetAll() {
                if (downloadBtn.href) {
                    URL.revokeObjectURL(downloadBtn.href);
                }
                uploadedFiles = [];
                outputFilenameInput.value = 'merged-document.pdf';
                renderFileList();
                updateUIState();
            }

            function removeFile(index) {
                uploadedFiles.splice(index, 1);
                renderFileList();
                updateUIState();
            }

            function moveFile(index, direction) {
                if (direction === 'up' && index > 0) {
                    [uploadedFiles[index - 1], uploadedFiles[index]] = [uploadedFiles[index], uploadedFiles[index - 1]];
                } else if (direction === 'down' && index < uploadedFiles.length - 1) {
                    [uploadedFiles[index + 1], uploadedFiles[index]] = [uploadedFiles[index], uploadedFiles[index + 1]];
                }
                renderFileList();
            }

            function formatBytes(bytes, decimals = 2) {
                if (!+bytes) return '0 Bytes';
                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
            }
            
            updateUIState(); // Initialize the UI on first load
        });