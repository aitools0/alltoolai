        document.addEventListener('DOMContentLoaded', () => {
            
            const MAX_FILE_SIZE_MB = 10; 

            // --- DOM Element References ---
            const uploadSection = document.getElementById('upload-section');
            const dropZone = document.getElementById('drop-zone');
            const fileUpload = document.getElementById('file-upload');
            const fileNameDisplay = document.getElementById('file-name-display');
            const loadingOverlay = document.getElementById('loading-overlay');
            const errorMessageDisplay = document.getElementById('error-message');
            
            const outputSection = document.getElementById('output-section');
            const imagePreviewThumb = document.getElementById('image-preview-thumb');
            const fileNameInfo = document.getElementById('file-name');
            const imageDimensionsDisplay = document.getElementById('image-dimensions');
            const mimeTypeDisplay = document.getElementById('mime-type');
            const charLengthDisplay = document.getElementById('char-length');
            const formatSelect = document.getElementById('format-select');
            const base64ResultTextarea = document.getElementById('base64-result');
            const copyBtn = document.getElementById('copy-btn');
            const downloadBtn = document.getElementById('download-btn');
            const clearBtn = document.getElementById('clear-btn');

            /**
             * Centralized state object to hold all relevant data for the current conversion.
             */
            const conversionState = {
                dataURI: null,
                base64: null,
                mimeType: null,
                fileName: 'download',
                width: 0,
                height: 0
            };

            // --- CONTROLLERS ---

            const UploadController = {
                init() {
                    fileUpload.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

                    dropZone.addEventListener('dragover', e => {
                        e.preventDefault();
                        dropZone.classList.add('border-indigo-600', 'dark:border-indigo-300');
                        dropZone.classList.remove('border-slate-400', 'dark:border-slate-500');
                    });
                    ['dragleave', 'dragend', 'drop'].forEach(type => {
                        dropZone.addEventListener(type, (e) => {
                            e.preventDefault();
                            dropZone.classList.remove('border-indigo-600', 'dark:border-indigo-300');
                        });
                    });
                    dropZone.addEventListener('drop', e => {
                        this.handleFileSelect(e.dataTransfer.files)
                    });
                },

                handleFileSelect(files) {
                    UIController.clearError();
                    
                    if (files.length === 0) return;
                    const file = files[0];
                    
                    if (!file.type.startsWith('image/')) {
                        UIController.showError('Error: The selected file is not a valid image.');
                        return;
                    }
                    
                    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                        UIController.showError(`Error: File is too large. Please select an image under ${MAX_FILE_SIZE_MB}MB.`);
                        return;
                    }

                    UIController.showLoading();
                    Base64ConverterController.process(file);
                }
            };

            const Base64ConverterController = {
                process(file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const dataURI = e.target.result;

                        const img = new Image();
                        img.onload = () => {
                            // **FIXED**: More robust method to get filename without extension
                            const name = file.name;
                            const lastDotIndex = name.lastIndexOf('.');
                            const fileNameWithoutExt = (lastDotIndex === -1) ? name : name.substring(0, lastDotIndex);

                            Object.assign(conversionState, {
                                dataURI: dataURI,
                                base64: dataURI.split(',')[1],
                                mimeType: file.type,
                                fileName: fileNameWithoutExt,
                                width: img.naturalWidth,
                                height: img.naturalHeight
                            });
                            UIController.displayResult(file.name);
                            UIController.hideLoading();
                        };
                        img.onerror = () => {
                            UIController.showError("Error: Couldn't load the image. It might be corrupted.");
                            UIController.reset();
                            UIController.hideLoading();
                        }
                        img.src = dataURI;
                    };
                    reader.onerror = () => {
                        UIController.showError('Error: An error occurred while reading the file.');
                        UIController.reset();
                        UIController.hideLoading();
                    };
                    reader.readAsDataURL(file);
                }
            };

            const FormatController = {
                format() {
                    if (!conversionState.dataURI) return;
                    
                    const { dataURI, base64, mimeType, fileName, width, height } = conversionState;
                    const selectedFormat = formatSelect.value;
                    let formattedText = '';
                    let fileExtension = 'txt';

                    switch (selectedFormat) {
                        case 'datauri':       formattedText = dataURI; break;
                        case 'css':           formattedText = `background-image: url("${dataURI}");`; fileExtension = 'css'; break;
                        case 'htmlimg':       formattedText = `<img src="${dataURI}" width="${width}" height="${height}" alt="${fileName}" />`; fileExtension = 'html'; break;
                        case 'favicon':       formattedText = `<link rel="icon" type="${mimeType}" href="${dataURI}">`; fileExtension = 'html'; break;
                        case 'hyperlink':     formattedText = `<a href="${dataURI}" download="${fileName}">Download Image</a>`; fileExtension = 'html'; break;
                        case 'iframe':        formattedText = `<iframe src="${dataURI}" width="${width}" height="${height}" frameBorder="0"></iframe>`; fileExtension = 'html'; break;
                        case 'jsimage':       formattedText = `const image = new Image(${width}, ${height});\nimage.src = "${dataURI}";`; fileExtension = 'js'; break;
                        case 'json':          formattedText = JSON.stringify({ image: { name: fileName, mime: mimeType, data: base64 } }, null, 2); fileExtension = 'json'; break;
                        case 'xml':           formattedText = `<image name="${fileName}">\n  <mime>${mimeType}</mime>\n  <data>${base64}</data>\n</image>`; fileExtension = 'xml'; break;
                        case 'plaintext': default: formattedText = base64; break;
                    }
                    base64ResultTextarea.value = formattedText;
                    downloadBtn.setAttribute('data-extension', fileExtension);
                    charLengthDisplay.textContent = `${formattedText.length.toLocaleString()} characters`;
                }
            };
            
            const UIController = {
                init() {
                    copyBtn.addEventListener('click', this.copyToClipboard.bind(this));
                    downloadBtn.addEventListener('click', this.downloadAsFile);
                    clearBtn.addEventListener('click', this.reset.bind(this));
                    formatSelect.addEventListener('change', FormatController.format);
                    base64ResultTextarea.addEventListener('click', () => base64ResultTextarea.select());
                },
                
                showLoading() {
                     loadingOverlay.classList.remove('hidden');
                },
                hideLoading() {
                     loadingOverlay.classList.add('hidden');
                },
                 showError(message) {
                     errorMessageDisplay.textContent = message;
                     errorMessageDisplay.classList.remove('hidden');
                 },
                 clearError() {
                      errorMessageDisplay.classList.add('hidden');
                      errorMessageDisplay.textContent = '';
                 },
                displayResult(originalFilename) {
                    imagePreviewThumb.src = conversionState.dataURI;
                    imagePreviewThumb.alt = `Preview of ${conversionState.fileName}`;
                    fileNameInfo.textContent = `File: ${originalFilename}`;
                    imageDimensionsDisplay.textContent = `Dimensions: ${conversionState.width} x ${conversionState.height}px`;
                    mimeTypeDisplay.textContent = `Type: ${conversionState.mimeType}`;
                    
                    FormatController.format();

                    uploadSection.classList.add('hidden');
                    outputSection.classList.remove('hidden');
                    fileNameDisplay.textContent = `File: ${originalFilename}`;
                },
                copyToClipboard() {
                    if (!base64ResultTextarea.value) return;
                    navigator.clipboard.writeText(base64ResultTextarea.value).then(
                        () => this.showFeedback(copyBtn, 'Copied!', true),
                        () => alert('Failed to copy to clipboard.')
                    );
                },
                downloadAsFile() {
                    const text = base64ResultTextarea.value;
                    if (!text) return;
                    
                    const extension = downloadBtn.getAttribute('data-extension') || 'txt';
                    const downloadFilename = `${conversionState.fileName}.${extension}`;
                    
                    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = downloadFilename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                },
                reset() {
                    Object.keys(conversionState).forEach(key => conversionState[key] = null);
                    conversionState.fileName = 'download';

                    fileUpload.value = '';
                    imagePreviewThumb.src = '#';
                    formatSelect.value = 'datauri';
                    this.clearError();
                    
                    outputSection.classList.add('hidden');
                    uploadSection.classList.remove('hidden');
                    fileNameDisplay.textContent = '';
                },
                
                showFeedback(element, message, isSuccess = false) {
                    const originalText = element.textContent;
                    const originalClasses = element.className;

                    element.textContent = message;
                    element.disabled = true;
                    
                    if (isSuccess) {
                        element.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'dark:bg-indigo-500', 'dark:hover:bg-indigo-600');
                        element.classList.add('bg-green-600', 'dark:bg-green-500');
                    }

                    setTimeout(() => {
                        element.textContent = originalText;
                        element.disabled = false;
                        element.className = originalClasses;
                    }, 2000);
                }
            };

            // --- APPLICATION INITIALIZATION ---
            UploadController.init();
            UIController.init();
        });