document.addEventListener('DOMContentLoaded', () => {
    // --- Create a self-contained Web Worker ---
    const workerCode = `
        self.onmessage = function(e) {
            try {
                const { channelData, sampleRate, channels } = e.data;
                self.postMessage({ status: 'progress', value: 25 });
                
                // --- WAV Encoding Functions ---
                function interleave(channels) {
                    const frameCount = channels[0].length;
                    const numChannels = channels.length;
                    const interleaved = new Float32Array(frameCount * numChannels);
                    let offset = 0;
                    for (let i = 0; i < frameCount; i++) {
                        for (let j = 0; j < numChannels; j++) {
                            interleaved[offset++] = channels[j][i];
                        }
                    }
                    return interleaved;
                }

                function floatTo16BitPCM(output, input) {
                    for (let i = 0; i < input.length; i++) {
                        const s = Math.max(-1, Math.min(1, input[i]));
                        output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                    }
                }

                function writeWavHeader(view, length, sampleRate, numChannels, bitsPerSample) {
                    /* RIFF identifier */
                    view.setUint8(0, 82); view.setUint8(1, 73); view.setUint8(2, 70); view.setUint8(3, 70);
                    /* file length */
                    view.setUint32(4, 36 + length, true);
                    /* WAVE identifier */
                    view.setUint8(8, 87); view.setUint8(9, 65); view.setUint8(10, 86); view.setUint8(11, 69);
                    /* fmt chunk identifier */
                    view.setUint8(12, 102); view.setUint8(13, 109); view.setUint8(14, 116); view.setUint8(15, 32);
                    /* fmt chunk length */
                    view.setUint32(16, 16, true);
                    /* sample format (raw) */
                    view.setUint16(20, 1, true);
                    /* channel count */
                    view.setUint16(22, numChannels, true);
                    /* sample rate */
                    view.setUint32(24, sampleRate, true);
                    /* byte rate (sample rate * block align) */
                    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
                    /* block align (channel count * bytes per sample) */
                    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
                    /* bits per sample */
                    view.setUint16(34, bitsPerSample, true);
                    /* data chunk identifier */
                    view.setUint8(36, 100); view.setUint8(37, 97); view.setUint8(38, 116); view.setUint8(39, 97);
                    /* data chunk length */
                    view.setUint32(40, length, true);
                }

                // --- Main Worker Logic ---
                self.postMessage({ status: 'progress', value: 50 });
                const interleavedData = interleave(channelData);
                const dataView = new DataView(new ArrayBuffer(44 + interleavedData.length * 2));
                
                self.postMessage({ status: 'progress', value: 75 });
                floatTo16BitPCM(dataView, interleavedData);
                writeWavHeader(dataView, interleavedData.length * 2, sampleRate, channels, 16);
                
                const wavBlob = new Blob([dataView], { type: 'audio/wav' });
                self.postMessage({ status: 'complete', blob: wavBlob });
                
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
        if (converterWorker) {
            converterWorker.terminate();
            converterWorker = null;
        }
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
        }
        currentFile = null;
        fileInput.value = '';
        if (!isError) {
            updateStatus('Please select a video file to begin.');
        }
        
        uploadArea.classList.remove('hidden', 'drag-over');
        processingArea.classList.add('hidden');
        playerContainer.classList.add('hidden');
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
        updateStatus('File ready. Click "Extract WAV Audio" to begin.', 'success');
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
            updateStatus('Starting WAV encoding...', 'info');
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
            updateStatus(`Extraction Failed: ${err.message}. The video file or its audio codec may not be supported.`, 'error');
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
        a.download = `${currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    // --- Initial State ---
    resetUI();
});