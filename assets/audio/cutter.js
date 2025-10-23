document.addEventListener('DOMContentLoaded', () => {
    // === DOM Element Selectors ===
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const processingArea = document.getElementById('processing-area');
    const fileInfoArea = document.getElementById('file-info-area');
    const statusMessage = document.getElementById('status-message');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');
    const cutBtn = document.getElementById('cut-btn');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');
    const playerContainer = document.getElementById('player-container');
    const audioPlayer = document.getElementById('audio-player');
    const cuttingControls = document.getElementById('cutting-controls');
    const audioTimeline = document.getElementById('audio-timeline');
    const audioProgress = document.getElementById('audio-progress');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');
    const startSlider = document.getElementById('start-slider');
    const endSlider = document.getElementById('end-slider');
    const startValue = document.getElementById('start-value');
    const endValue = document.getElementById('end-value');
    const setStartBtn = document.getElementById('set-start-btn');
    const setEndBtn = document.getElementById('set-end-btn');

    // === App State ===
    let currentFile = null;
    let cutBlob = null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;
    let audioBuffer = null;
    let duration = 0;
    let startTime = 0;
    let endTime = 0;
    let isUpdatingSlider = false;
    let audioWorker = null;

    // === Helper Functions ===
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1); // Keep one decimal place
        return `${mins.toString().padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };
    
    const parseTime = (timeStr) => {
        const parts = timeStr.match(/^(\d+):(\d+(\.\d+)?)$/);
        if (!parts) return null;
        const minutes = parseInt(parts[1], 10);
        const seconds = parseFloat(parts[2]);
        if (isNaN(minutes) || isNaN(seconds)) return null;
        const totalSeconds = minutes * 60 + seconds;
        return Math.max(0, Math.min(totalSeconds, duration));
    };

    const showStatus = (message, type = 'info') => {
        statusMessage.textContent = message;
        const baseClasses = 'text-base font-medium transition-colors ';
        if (type === 'error') statusMessage.className = baseClasses + 'text-red-600 dark:text-red-500';
        else if (type === 'success') statusMessage.className = baseClasses + 'text-indigo-600 dark:text-indigo-400';
        else statusMessage.className = baseClasses + 'text-slate-600 dark:text-slate-400';
    };

    // === UI Update Functions ===
    const resetUI = () => {
        currentFile = null;
        cutBlob = null;
        audioBuffer = null;
        duration = 0;
        startTime = 0;
        endTime = 0;
        
        fileInput.value = ''; 
        if (audioPlayer.src) {
            URL.revokeObjectURL(audioPlayer.src);
            audioPlayer.src = '';
        }
        
        uploadArea.classList.remove('hidden');
        processingArea.classList.add('hidden');
        playerContainer.classList.add('hidden');
        cuttingControls.classList.add('hidden');
        
        showStatus('Please select an audio file to begin.');
        
        cutBtn.disabled = true;
        cutBtn.classList.remove('hidden'); 
        downloadBtn.disabled = true;
        downloadBtn.classList.add('hidden');
        resetBtn.disabled = true;

        progressBarContainer.classList.add('hidden');
        progressBar.style.width = '0%';
        
        startSlider.value = 0;
        endSlider.value = 0;
        startValue.value = '00:00.0';
        endValue.value = '00:00.0';
    };

    const displayFileInfo = (file) => {
        fileInfoArea.innerHTML = `
            <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Selected Audio File</h2>
            <div class="text-center text-base text-slate-600 dark:text-slate-400">
            <p class="font-bold text-slate-700 dark:text-slate-200 truncate">${file.name}</p>
            <p>${formatBytes(file.size)}</p>
            </div>`;
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('audio/')) {
            showStatus('Error: Invalid file type. Please select an audio file.', 'error');
            resetUI();
            return;
        }
        
        resetUI();

        currentFile = file;
        processingArea.classList.remove('hidden');
        displayFileInfo(file);
        uploadArea.classList.add('hidden');
        showStatus('Loading audio file...', 'info');
        resetBtn.disabled = false;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!audioContext) audioContext = new AudioContext();
                if (audioContext.state === 'suspended') await audioContext.resume();
                
                const arrayBuffer = e.target.result;
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                duration = audioBuffer.duration;
                
                startTime = 0;
                endTime = duration;
                startSlider.max = duration;
                endSlider.max = duration;
                startSlider.value = 0;
                endSlider.value = duration;
                startValue.value = formatTime(0);
                durationDisplay.textContent = formatTime(duration);
                endValue.value = formatTime(duration);
                
                const audioUrl = URL.createObjectURL(currentFile);
                audioPlayer.src = audioUrl;
                playerContainer.classList.remove('hidden');
                cuttingControls.classList.remove('hidden');
                
                cutBtn.disabled = false;
                showStatus('File loaded. Preview and set cut points.', 'success');
            } catch (error) {
                console.error('Error decoding audio:', error);
                showStatus('Error: Could not load this audio file. It may be corrupt.', 'error');
                resetUI();
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    // === Event Listeners ===
    fileInput.addEventListener('change', () => handleFileSelect(fileInput.files[0]));
    resetBtn.addEventListener('click', resetUI);

    const highlight = (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-indigo-600', 'dark:border-indigo-300');
    };
    const unhighlight = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-indigo-600', 'dark:border-indigo-300');
    };
    ['dragenter', 'dragover'].forEach(e => uploadArea.addEventListener(e, highlight));
    ['dragleave', 'drop'].forEach(e => uploadArea.addEventListener(e, unhighlight));
    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files[0]);
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (isUpdatingSlider) return;
        const currentTime = audioPlayer.currentTime;
        audioProgress.style.width = `${(currentTime / duration) * 100}%`;
        currentTimeDisplay.textContent = formatTime(currentTime);
    });

    audioTimeline.addEventListener('click', (e) => {
        const rect = audioTimeline.getBoundingClientRect();
        audioPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    });

    const handleTimeInputChange = (e) => {
        const input = e.target;
        const time = parseTime(input.value);
        if (time !== null) {
            if (input.id === 'start-value') {
                if (time <= endTime) {
                    startTime = time;
                    startSlider.value = time;
                }
            } else {
                if (time >= startTime) {
                    endTime = time;
                    endSlider.value = time;
                }
            }
        }
        // Snap back to valid formatted time
        startValue.value = formatTime(startTime);
        endValue.value = formatTime(endTime);
    };
    startValue.addEventListener('change', handleTimeInputChange);
    endValue.addEventListener('change', handleTimeInputChange);

    const updateSlider = (e) => {
        const value = parseFloat(e.target.value);
        if (e.target.id === 'start-slider') {
            startTime = value;
            if (startTime > endTime) {
                endTime = startTime;
                endSlider.value = endTime;
            }
        } else {
            endTime = value;
            if (endTime < startTime) {
                startTime = endTime;
                startSlider.value = startTime;
            }
        }
        startValue.value = formatTime(startTime);
        endValue.value = formatTime(endTime);
    };
    startSlider.addEventListener('input', updateSlider);
    endSlider.addEventListener('input', updateSlider);

    setStartBtn.addEventListener('click', () => {
        startTime = audioPlayer.currentTime;
        if (startTime > endTime) endTime = startTime;
        startSlider.value = startTime;
        endSlider.value = endTime;
        startValue.value = formatTime(startTime);
        endValue.value = formatTime(endTime);
    });

    setEndBtn.addEventListener('click', () => {
        endTime = audioPlayer.currentTime;
        if (endTime < startTime) startTime = endTime;
        endSlider.value = endTime;
        startSlider.value = startTime;
        endValue.value = formatTime(endTime);
        startValue.value = formatTime(startTime);
    });

    // === Core Cutting Logic ===
    cutBtn.addEventListener('click', async () => {
        if (!audioBuffer) return;
        
        if (endTime <= startTime) {
            showStatus('Error: End time must be after start time.', 'error');
            return;
        }

        showStatus('Encoding to MP3... Please wait.');
        cutBtn.disabled = true;
        resetBtn.disabled = true;
        progressBarContainer.classList.remove('hidden');
        progressBar.style.width = '0%';

        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);
        
        const cutPcmData = [];
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            cutPcmData.push(audioBuffer.getChannelData(i).subarray(startSample, endSample));
        }

        audioWorker.postMessage({
            pcmData: cutPcmData,
            numChannels: audioBuffer.numberOfChannels,
            sampleRate: sampleRate,
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (!cutBlob) return;
        const url = URL.createObjectURL(cutBlob);
        const a = document.createElement('a');
        const newName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
        a.href = url;
        a.download = `${newName}_cut.mp3`;
        document.body.appendChild(a);
        a.click();
        
        // FIX: Delay cleanup to ensure the download has time to start.
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
    });

    const initializeWorker = () => {
        const workerCode = `
            importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');

            function floatTo16BitPCM(input) {
                const output = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                let s = Math.max(-1, Math.min(1, input[i]));
                output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                return output;
            }

            self.onmessage = function(e) {
                const { pcmData, numChannels, sampleRate } = e.data;

                const leftF32 = pcmData[0];
                const rightF32 = numChannels > 1 ? pcmData[1] : null;

                const left = floatTo16BitPCM(leftF32);
                const right = rightF32 ? floatTo16BitPCM(rightF32) : null;

                const kbps = 128;
                const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
                const blockSize = 1152;
                const mp3Data = [];

                const total = left.length;
                for (let i = 0; i < total; i += blockSize) {
                const leftChunk = left.subarray(i, i + blockSize);
                let mp3buf;
                if (numChannels === 2 && right) {
                    const rightChunk = right.subarray(i, i + blockSize);
                    mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                } else {
                    mp3buf = mp3encoder.encodeBuffer(leftChunk);
                }
                if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));

                // Progress up to ~95%
                if (i > 0 && i % (Math.floor(total / 20) || 1) === 0) {
                    self.postMessage({ type: 'progress', progress: Math.min(95, Math.round((i / total) * 95)) });
                }
                }

                const end = mp3encoder.flush();
                if (end.length > 0) mp3Data.push(new Int8Array(end));

                const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
                self.postMessage({ type: 'progress', progress: 100 });
                self.postMessage({ type: 'result', blob: mp3Blob });
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        audioWorker = new Worker(URL.createObjectURL(blob));

        audioWorker.onmessage = (e) => {
            const { type, progress, blob } = e.data;
            if (type === 'progress') {
                progressBar.style.width = `${progress}%`;
            } else if (type === 'result') {
                cutBlob = blob;
                const audioUrl = URL.createObjectURL(cutBlob);
                audioPlayer.src = audioUrl;
                audioPlayer.currentTime = 0;
                
                showStatus(`Cut successful! MP3 created from ${formatTime(startTime)} to ${formatTime(endTime)}.`, 'success');
                
                cutBtn.classList.add('hidden');
                downloadBtn.disabled = false;
                downloadBtn.classList.remove('hidden'); 
                resetBtn.disabled = false;
            }
        };

        audioWorker.onerror = (error) => {
             console.error('Worker Error:', error);
             showStatus('Cutting failed due to an unexpected error. Please try again.', 'error');
             resetBtn.disabled = false;
             cutBtn.disabled = false;
             progressBarContainer.classList.add('hidden');
        }
    };

    // === Initialize App ===
    initializeWorker();
    resetUI();
});