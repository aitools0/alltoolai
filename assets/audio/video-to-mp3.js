document.addEventListener('DOMContentLoaded', () => {
    // --- Create a self-contained Web Worker ---
    const workerCode = `
        // Load the LAME MP3 encoder library
        self.importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');

        self.onmessage = function(e) {
            try {
                const { channelData, sampleRate, channels } = e.data;
                const kbps = 128; // Standard MP3 bitrate
                const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
                
                const pcmData = channelData.map(cd => {
                    const output = new Int16Array(cd.length);
                    for (let i = 0; i < cd.length; i++) {
                        const s = Math.max(-1, Math.min(1, cd[i]));
                        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    return output;
                });
                
                const samplesLeft = pcmData[0];
                const samplesRight = channels > 1 ? pcmData[1] : null;

                let remaining = samplesLeft.length;
                const maxSamples = 1152; // Max samples per LAME frame
                const mp3Data = [];

                for (let i = 0; remaining >= 0; i += maxSamples) {
                    const leftChunk = samplesLeft.subarray(i, i + maxSamples);
                    let rightChunk = null;
                    if (channels > 1) {
                        rightChunk = samplesRight.subarray(i, i + maxSamples);
                    }

                    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                    
                    // Post progress back to the main thread
                    const progress = (i / samplesLeft.length) * 100;
                    self.postMessage({ status: 'progress', value: progress });

                    remaining -= maxSamples;
                }

                const finalMp3buf = mp3encoder.flush();
                if (finalMp3buf.length > 0) {
                    mp3Data.push(finalMp3buf);
                }

                const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
                self.postMessage({ status: 'complete', blob: mp3Blob });
            } catch (error) {
                self.postMessage({ status: 'error', message: error.message });
            }
        };
    `;
    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    let converterWorker = null;


    // --- Element Selectors ---
    const getEl = id => document.getElementById(id);
    const uploadArea = getEl('upload-area'), fileInput = getEl('file-input'),
        processingArea = getEl('processing-area'), fileDetails = getEl('file-details'),
        playerContainer = getEl('player-container'), audioPlayer = getEl('audio-player'),
        statusMessage = getEl('status-message'), progressBarContainer = getEl('progress-bar-container'),
        progressBar = getEl('progress-bar'), convertBtn = getEl('convert-btn'),
        downloadBtn = getEl('download-btn'), resetBtn = getEl('reset-btn');

    // --- State Variables ---
    let currentFile = null;
    let objectUrl = null;
    const audioContext = new(window.AudioContext || window.webkitAudioContext)();

    // --- Helper Functions ---
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const updateStatus = (message, type = 'info') => {
        statusMessage.textContent = message;
        const colors = {
            'error': 'text-red-600 dark:text-red-500',
            'success': 'text-indigo-600 dark:text-indigo-400',
            'info': 'text-slate-600 dark:text-slate-400'
        };
        statusMessage.className = `text-base font-medium transition-colors ${colors[type]}`;
    };

    const updateProgress = (percentage) => { progressBar.style.width = `${percentage}%`; };

    // --- UI Logic ---
    const resetUI = (isError = false) => {
        if (converterWorker) converterWorker.terminate();
        converterWorker = null;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = currentFile = null;
        fileInput.value = '';
        if (!isError) updateStatus('Please select a video file to begin.');
        
        uploadArea.classList.remove('hidden', 'drag-over');
        processingArea.classList.add('hidden');
        playerContainer.classList.add('hidden');
        audioPlayer.src = '';
        audioPlayer.removeAttribute('src');

        convertBtn.disabled = true;
        downloadBtn.disabled = true;
        convertBtn.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        resetBtn.disabled = true;

        progressBarContainer.classList.add('hidden');
        updateProgress(0);
    };

    const handleFile = (file) => {
        resetUI();
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            updateStatus('Invalid file type. Please select a video file.', 'error');
            return;
        }

        currentFile = file;
        fileDetails.innerHTML = `<p class="font-bold text-slate-700 dark:text-slate-200 truncate">${file.name}</p><p>${formatBytes(file.size)}</p>`;
        processingArea.classList.remove('hidden');
        uploadArea.classList.add('hidden');
        updateStatus('File ready. Click "Extract MP3 Audio" to begin.', 'success');
        convertBtn.disabled = false;
        resetBtn.disabled = false;
    };

    const processFile = async (file) => {
        updateStatus('Initializing...', 'info');
        progressBarContainer.classList.remove('hidden');
        updateProgress(0);
        convertBtn.disabled = true;
        resetBtn.disabled = true;

        try {
            const arrayBuffer = await file.arrayBuffer();
            updateStatus('Decoding audio track...', 'info');
            updateProgress(5); 

            const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            updateStatus('Starting MP3 encoding...', 'info');
            updateProgress(10); 
            
            converterWorker = new Worker(workerUrl);
            
            const channelData = Array.from({ length: decodedAudioBuffer.numberOfChannels }, (_, i) => decodedAudioBuffer.getChannelData(i));
            
            converterWorker.postMessage({
                channelData: channelData,
                sampleRate: decodedAudioBuffer.sampleRate,
                channels: decodedAudioBuffer.numberOfChannels
            }, channelData.map(buffer => buffer.buffer));

            converterWorker.onmessage = (e) => {
                const { status, value, blob, message } = e.data;
                if (status === 'progress') {
                    updateStatus('Encoding... Please wait.', 'info');
                    updateProgress(10 + (value * 0.9)); // Scale progress from 10% to 100%
                } else if (status === 'complete') {
                    updateStatus('Extraction Complete!', 'success');
                    updateProgress(100);
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                    objectUrl = URL.createObjectURL(blob);
                    audioPlayer.src = objectUrl;

                    playerContainer.classList.remove('hidden');
                    convertBtn.classList.add('hidden');
                    downloadBtn.classList.remove('hidden');
                    downloadBtn.disabled = false;
                    resetBtn.disabled = false;
                    converterWorker.terminate();
                } else if (status === 'error') {
                    updateStatus(`Encoding failed: ${message}`, 'error');
                    resetUI(true);
                }
            };
            converterWorker.onerror = (e) => {
                updateStatus(`An unexpected worker error occurred: ${e.message}`, 'error');
                resetUI(true);
            };

        } catch (err) {
            updateStatus('Extraction Failed: The video file or its audio codec may not be supported.', 'error');
            resetUI(true);
        }
    };

    // --- Event Listeners ---
    const highlight = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-slate-400', 'dark:border-slate-500');
        uploadArea.classList.add('border-indigo-600', 'dark:border-indigo-300');
    };

    const unhighlight = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-indigo-600', 'dark:border-indigo-300');
        uploadArea.classList.add('border-slate-400', 'dark:border-slate-500');
    };

    ['dragenter', 'dragover'].forEach(eventName => uploadArea.addEventListener(eventName, highlight));
    ['dragleave', 'drop'].forEach(eventName => uploadArea.addEventListener(eventName, unhighlight));
    
    uploadArea.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
    fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
    resetBtn.addEventListener('click', () => resetUI());
    convertBtn.addEventListener('click', () => { if (currentFile) processFile(currentFile); });
    downloadBtn.addEventListener('click', () => {
        if (!objectUrl) return;
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    // --- Initial State ---
    resetUI();
});