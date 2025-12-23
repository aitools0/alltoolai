document.addEventListener('DOMContentLoaded', () => {

// I’m keeping the worker inline so this stays fully client-side.
// Not the prettiest approach, but it avoids extra files.
const workerSource = `
    self.importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');

    self.onmessage = function (evt) {
        try {
            const { channelData, sampleRate, channels } = evt.data;

            // Standard bitrate — could be configurable later
            const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);

            // Convert Float32 audio into Int16 PCM
            const pcmTracks = channelData.map(track => {
                const pcm = new Int16Array(track.length);
                for (let i = 0; i < track.length; i++) {
                    const sample = Math.max(-1, Math.min(1, track[i]));
                    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                }
                return pcm;
            });

            const left = pcmTracks[0];
            const right = channels > 1 ? pcmTracks[1] : null;

            const frameSize = 1152; // LAME frame size
            const mp3Chunks = [];

            for (let i = 0; i < left.length; i += frameSize) {
                const leftChunk = left.subarray(i, i + frameSize);
                const rightChunk = right ? right.subarray(i, i + frameSize) : null;

                const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
                if (mp3buf.length) {
                    mp3Chunks.push(mp3buf);
                }

                // send progress back — not super precise, but good enough
                self.postMessage({
                    status: 'progress',
                    value: (i / left.length) * 100
                });
            }

            const endBuf = encoder.flush();
            if (endBuf.length) {
                mp3Chunks.push(endBuf);
            }

            self.postMessage({
                status: 'complete',
                blob: new Blob(mp3Chunks, { type: 'audio/mp3' })
            });

        } catch (err) {
            self.postMessage({
                status: 'error',
                message: err.message
            });
        }
    };
`;

const workerBlob = new Blob([workerSource], { type: 'application/javascript' });
const workerURL = URL.createObjectURL(workerBlob);
let workerRef = null;

// Quick helper — shorter names save sanity
const byId = id => document.getElementById(id);

const uploadArea = byId('upload-area');
const fileInput = byId('file-input');
const processingArea = byId('processing-area');
const fileDetails = byId('file-details');
const playerContainer = byId('player-container');
const audioPlayer = byId('audio-player');
const statusMessage = byId('status-message');
const progressBarContainer = byId('progress-bar-container');
const progressBar = byId('progress-bar');

const convertBtn = byId('convert-btn');
const downloadBtn = byId('download-btn');
const resetBtn = byId('reset-btn');

let activeFile = null;
let audioURL = null;

// AudioContext is annoyingly prefixed in some browsers
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

const setStatus = (msg, type = 'info') => {
    statusMessage.textContent = msg;

    // simple styling switch — could be cleaner but works
    if (type === 'error') {
        statusMessage.className = 'text-lg font-medium text-red-600 dark:text-red-500';
    } else if (type === 'success') {
        statusMessage.className = 'text-lg font-medium text-indigo-600 dark:text-indigo-400';
    } else {
        statusMessage.className = 'text-lg font-medium text-slate-600 dark:text-slate-400';
    }
};

const resetUI = (isError) => {
    if (workerRef) {
        workerRef.terminate();
        workerRef = null;
    }

    if (audioURL) {
        URL.revokeObjectURL(audioURL);
        audioURL = null;
    }

    activeFile = null;
    fileInput.value = '';

    uploadArea.classList.remove('hidden');
    processingArea.classList.add('hidden');
    playerContainer.classList.add('hidden');

    convertBtn.disabled = true;
    downloadBtn.disabled = true;
    resetBtn.disabled = true;

    convertBtn.classList.remove('hidden');
    downloadBtn.classList.add('hidden');

    progressBarContainer.classList.add('hidden');
    progressBar.style.width = '0%';

    if (!isError) {
        setStatus('Select a video file to begin.');
    }
};

const handleFile = (file) => {
    resetUI();

    if (!file || !file.type.startsWith('video/')) {
        setStatus('Please select a valid video file.', 'error');
        return;
    }

    activeFile = file;

    fileDetails.innerHTML =
        '<p class="font-bold truncate">' + file.name + '</p>' +
        '<p>' + formatBytes(file.size) + '</p>';

    processingArea.classList.remove('hidden');
    uploadArea.classList.add('hidden');

    convertBtn.disabled = false;
    resetBtn.disabled = false;

    setStatus('File loaded. Ready to extract audio.', 'success');
};

const startProcessing = async () => {
    if (!activeFile) return;

    try {
        setStatus('Decoding audio…');
        progressBarContainer.classList.remove('hidden');
        progressBar.style.width = '5%';

        const buffer = await activeFile.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buffer);

        workerRef = new Worker(workerURL);

        const channelData = [];
        for (let i = 0; i < decoded.numberOfChannels; i++) {
            channelData.push(decoded.getChannelData(i));
        }

        workerRef.postMessage({
            channelData,
            sampleRate: decoded.sampleRate,
            channels: decoded.numberOfChannels
        }, channelData.map(c => c.buffer));

        workerRef.onmessage = (e) => {
            if (e.data.status === 'progress') {
                progressBar.style.width = (10 + e.data.value * 0.9) + '%';
            }

            if (e.data.status === 'complete') {
                audioURL = URL.createObjectURL(e.data.blob);
                audioPlayer.src = audioURL;

                playerContainer.classList.remove('hidden');
                convertBtn.classList.add('hidden');
                downloadBtn.classList.remove('hidden');
                downloadBtn.disabled = false;
                resetBtn.disabled = false;

                setStatus('Extraction complete!', 'success');
                workerRef.terminate();
            }

            if (e.data.status === 'error') {
                setStatus('Encoding failed: ' + e.data.message, 'error');
                resetUI(true);
            }
        };

    } catch (err) {
        // Usually codec-related or browser limitations
        setStatus('This video format may not be supported.', 'error');
        resetUI(true);
    }
};

uploadArea.addEventListener('dragover', e => e.preventDefault());
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
    handleFile(fileInput.files[0]);
});

convertBtn.addEventListener('click', startProcessing);
resetBtn.addEventListener('click', () => resetUI());

downloadBtn.addEventListener('click', () => {
    if (!audioURL) return;

    const a = document.createElement('a');
    a.href = audioURL;
    a.download =
        (activeFile.name.split('.').slice(0, -1).join('.') || 'audio') + '.mp3';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Initial state
resetUI();


});