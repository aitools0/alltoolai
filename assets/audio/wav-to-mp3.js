document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const app = {
        uploadArea: document.getElementById('upload-area'),
        fileInput: document.getElementById('file-input'),
        processingArea: document.getElementById('processing-area'),
        fileInfoArea: document.getElementById('file-info-area'),
        statusMessage: document.getElementById('status-message'),
        progressBarContainer: document.getElementById('progress-bar-container'),
        progressBar: document.getElementById('progress-bar'),
        convertBtn: document.getElementById('convert-btn'),
        downloadBtn: document.getElementById('download-btn'),
        resetBtn: document.getElementById('reset-btn'),
        playerContainer: document.getElementById('player-container'),
        audioPlayer: document.getElementById('audio-player'),
    };

    // --- State Management ---
    let currentFile = null;
    let convertedFileBlobUrl = null;
    let conversionWorker = null;

    // --- Utility Functions ---
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const showStatus = (message, type = 'info') => {
        app.statusMessage.textContent = message;
        const colorClasses = {
            error: 'text-red-600 dark:text-red-500',
            success: 'text-indigo-600 dark:text-indigo-400',
            info: 'text-slate-600 dark:text-slate-400'
        };
        app.statusMessage.className = `text-base font-medium transition-colors ${colorClasses[type] || colorClasses.info}`;
    };

    // --- UI State Transitions ---
    const setReadyState = () => {
        app.uploadArea.classList.remove('hidden');
        app.processingArea.classList.add('hidden');
        app.playerContainer.classList.add('hidden');
        app.fileInfoArea.innerHTML = '';
        app.convertBtn.classList.remove('hidden');
        app.downloadBtn.classList.add('hidden');
        app.progressBarContainer.classList.add('hidden');
        app.progressBar.style.width = '0%';
        
        showStatus('Please select a WAV file to begin.', 'info');
        app.convertBtn.disabled = true;
        app.downloadBtn.disabled = true;
        app.resetBtn.disabled = true;

        if (convertedFileBlobUrl) {
            URL.revokeObjectURL(convertedFileBlobUrl);
            convertedFileBlobUrl = null;
        }
        if (conversionWorker) {
            conversionWorker.terminate();
            conversionWorker = null;
        }
        currentFile = null;
        if (app.fileInput) app.fileInput.value = '';
    };

    const setFileLoadedState = (file) => {
        app.uploadArea.classList.add('hidden');
        app.processingArea.classList.remove('hidden');
        app.fileInfoArea.innerHTML = `
            <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Selected WAV File</h2>
            <div class="text-center text-base text-slate-600 dark:text-slate-400">
                <p class="font-bold text-slate-700 dark:text-slate-200 truncate" title="${file.name}">${file.name}</p>
                <p>Size: ${formatBytes(file.size)}</p>
            </div>`;
        
        showStatus('File ready. Click "Convert to MP3" to begin.', 'success');
        app.convertBtn.disabled = false;
        app.resetBtn.disabled = false;
    };
    
    const setConversionCompleteState = (newFileSize) => {
        showStatus('Conversion successful! Your MP3 is ready.', 'success');
        app.convertBtn.classList.add('hidden');
        app.downloadBtn.classList.remove('hidden');
        app.downloadBtn.disabled = false;
        app.resetBtn.disabled = false;

        const originalInfo = app.fileInfoArea.innerHTML;
        app.fileInfoArea.innerHTML = originalInfo + `
            <div class="text-center text-base text-green-600 dark:text-green-400 pt-2">
                <p class="font-bold">New MP3 Size: ${formatBytes(newFileSize)}</p>
            </div>`;
        
        app.audioPlayer.src = convertedFileBlobUrl;
        app.audioPlayer.load();
        app.playerContainer.classList.remove('hidden');
    };

    // --- Core Conversion Logic ---
    const handleFileSelect = (file) => {
        setReadyState(); 
        if (!file) return;

        if (!file.type.startsWith('audio/wav') && !file.name.toLowerCase().endsWith('.wav')) {
            showStatus('Error: Invalid file type. Please select a .WAV file.', 'error');
            return;
        }
        currentFile = file;
        setFileLoadedState(file);
    };

    // =================================================================
    // == FIXED AND ROBUST, HIGH-PERFORMANCE CONVERSION FUNCTION
    // =================================================================
    const performConversion = async () => {
        showStatus('Initializing converter...', 'info');
        app.convertBtn.disabled = true;
        app.resetBtn.disabled = true;
        app.progressBarContainer.classList.remove('hidden');
        app.progressBar.style.width = '0%';

        try {
            // Step 1: Decode the WAV file on the main thread
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const fileBuffer = await currentFile.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(fileBuffer);

            // Step 2: Define the worker code. It will load its own dependencies.
            // This is more robust than fetching/embedding the library from the main thread.
            const workerCode = `
                // Use the standard way to import scripts into a worker
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.0/lame.min.js');

                self.onmessage = (e) => {
                    const { samples, sampleRate } = e.data;
                    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // lamejs is now available
                    const sampleBlockSize = 1152 * 20; // Process in larger chunks
                    const mp3Data = [];

                    for (let i = 0; i < samples.length; i += sampleBlockSize) {
                        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
                        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
                        if (mp3buf.length > 0) {
                            mp3Data.push(mp3buf);
                        }
                        // Post progress back to the main thread
                        self.postMessage({ type: 'progress', progress: (i / samples.length) * 100 });
                    }
                    const mp3buf = mp3encoder.flush();
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }

                    const blob = new Blob(mp3Data, { type: 'audio/mpeg' });
                    self.postMessage({ type: 'complete', blob: blob });
                    self.close(); // Clean up the worker
                };
            `;
            
            // Step 3: Create and manage the worker from the code above
            const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
            conversionWorker = new Worker(URL.createObjectURL(workerBlob));

            conversionWorker.onmessage = (e) => {
                const { type, progress, blob } = e.data;
                if (type === 'progress') {
                    app.progressBar.style.width = `${progress}%`;
                } else if (type === 'complete') {
                    convertedFileBlobUrl = URL.createObjectURL(blob);
                    app.progressBar.style.width = '100%';
                    setConversionCompleteState(blob.size);
                    if (conversionWorker) conversionWorker.terminate(); // Final cleanup
                }
            };

            conversionWorker.onerror = (e) => {
                console.error('Error from worker:', e.message);
                showStatus('An unexpected error occurred during conversion.', 'error');
                app.resetBtn.disabled = false;
                if (conversionWorker) conversionWorker.terminate();
            };
            
            // Step 4: Offload the heavy encoding work to the worker
            showStatus('Converting in background...', 'info');
            const samples = audioBuffer.getChannelData(0); // Get data from the first channel (mono)
            const samplesAsInt16 = ((float32Array) => {
                const int16Array = new Int16Array(float32Array.length);
                for (let i = 0; i < float32Array.length; i++) {
                    const val = Math.max(-1, Math.min(1, float32Array[i]));
                    int16Array[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
                }
                return int16Array;
            })(samples);
            
            // Post the data to the worker, transferring the buffer for maximum performance
            conversionWorker.postMessage({
                samples: samplesAsInt16,
                sampleRate: audioBuffer.sampleRate,
            }, [samplesAsInt16.buffer]);

        } catch (error) {
            console.error('Conversion Error:', error);
            showStatus(`Error: ${error.message}. Please ensure the file is a valid WAV.`, 'error');
            app.resetBtn.disabled = false;
            app.convertBtn.disabled = true;
            app.progressBarContainer.classList.add('hidden');
        }
    };

    // --- Event Listeners Setup ---
    app.fileInput.addEventListener('change', () => handleFileSelect(app.fileInput.files[0]));
    app.resetBtn.addEventListener('click', setReadyState);
    app.convertBtn.addEventListener('click', () => { if (currentFile) performConversion(); });
    app.downloadBtn.addEventListener('click', () => {
        if (!convertedFileBlobUrl || !currentFile) return;
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = convertedFileBlobUrl;
        const mp3FileName = `${currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name}.mp3`;
        a.download = mp3FileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    const highlight = (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.uploadArea.classList.add('border-indigo-600', 'dark:border-indigo-300');
        app.uploadArea.classList.remove('border-slate-400', 'dark:border-slate-500');
    };
    const unhighlight = (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.uploadArea.classList.add('border-slate-400', 'dark:border-slate-500');
        app.uploadArea.classList.remove('border-indigo-600', 'dark:border-indigo-300');
    };
    ['dragenter', 'dragover'].forEach(e => app.uploadArea.addEventListener(e, highlight, false));
    ['dragleave', 'drop'].forEach(e => app.uploadArea.addEventListener(e, unhighlight, false));
    app.uploadArea.addEventListener('drop', e => handleFileSelect(e.dataTransfer.files[0]), false);

    // --- Initial State ---
    setReadyState();
});