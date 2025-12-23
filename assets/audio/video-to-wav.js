document.addEventListener('DOMContentLoaded', () => {

const workerScript = `
    self.onmessage = function (evt) {
        try {
            const payload = evt.data;
            const channelData = payload.channelData;
            const sampleRate = payload.sampleRate;
            const channelCount = payload.channels;

            self.postMessage({ status: 'progress', value: 25 });

            // Combine channels into one stream
            function mergeChannels(channels) {
                const frames = channels[0].length;
                const merged = new Float32Array(frames * channels.length);
                let pointer = 0;

                for (let i = 0; i < frames; i++) {
                    for (let c = 0; c < channels.length; c++) {
                        merged[pointer++] = channels[c][i];
                    }
                }
                return merged;
            }

            function floatToPCM(view, samples) {
                for (let i = 0; i < samples.length; i++) {
                    let s = Math.max(-1, Math.min(1, samples[i]));
                    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
                }
            }

            function writeWavHeader(view, dataLen, rate, channels, bits) {
                // RIFF
                view.setUint8(0, 82); view.setUint8(1, 73);
                view.setUint8(2, 70); view.setUint8(3, 70);

                view.setUint32(4, 36 + dataLen, true);

                // WAVE
                view.setUint8(8, 87); view.setUint8(9, 65);
                view.setUint8(10, 86); view.setUint8(11, 69);

                // fmt
                view.setUint8(12, 102); view.setUint8(13, 109);
                view.setUint8(14, 116); view.setUint8(15, 32);

                view.setUint32(16, 16, true);
                view.setUint16(20, 1, true);
                view.setUint16(22, channels, true);
                view.setUint32(24, rate, true);
                view.setUint32(28, rate * channels * (bits / 8), true);
                view.setUint16(32, channels * (bits / 8), true);
                view.setUint16(34, bits, true);

                // data
                view.setUint8(36, 100); view.setUint8(37, 97);
                view.setUint8(38, 116); view.setUint8(39, 97);
                view.setUint32(40, dataLen, true);
            }

            self.postMessage({ status: 'progress', value: 50 });

            const mergedData = mergeChannels(channelData);
            const buffer = new ArrayBuffer(44 + mergedData.length * 2);
            const view = new DataView(buffer);

            self.postMessage({ status: 'progress', value: 75 });

            floatToPCM(view, mergedData);
            writeWavHeader(view, mergedData.length * 2, sampleRate, channelCount, 16);

            const wavBlob = new Blob([view], { type: 'audio/wav' });

            self.postMessage({ status: 'complete', blob: wavBlob });

        } catch (err) {
            self.postMessage({ status: 'error', message: err.message });
        }
    };
`;

const workerURL = URL.createObjectURL(
    new Blob([workerScript], { type: 'application/javascript' })
);

// Shortcut for grabbing DOM nodes
const el = (id) => document.getElementById(id);

const uploadArea = el('upload-area');
const fileInput = el('file-input');
const processingArea = el('processing-area');
const fileDetails = el('file-details');
const playerWrap = el('player-container');
const audioEl = el('audio-player');
const statusText = el('status-message');
const progressWrap = el('progress-bar-container');
const progressBar = el('progress-bar');

const convertBtn = el('convert-btn');
const downloadBtn = el('download-btn');
const resetBtn = el('reset-btn');

// App state (kept simple)
let selectedFile = null;
let audioUrl = null;
let wavWorker = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function readableSize(bytes) {
    if (!bytes) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const idx = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, idx)).toFixed(2) + ' ' + units[idx];
}

function setStatus(text, type = 'info') {
    const colors = {
        info: 'text-slate-600 dark:text-slate-400',
        success: 'text-indigo-600 dark:text-indigo-400',
        error: 'text-red-600 dark:text-red-500'
    };

    statusText.textContent = text;
    statusText.className = 'text-lg font-medium ' + colors[type];
}

function setProgress(percent) {
    progressBar.style.width = percent + '%';
}

function resetUI(isError = false) {
    if (wavWorker) {
        wavWorker.terminate();
        wavWorker = null;
    }

    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
    }

    selectedFile = null;
    fileInput.value = '';

    uploadArea.classList.remove('hidden');
    processingArea.classList.add('hidden');
    playerWrap.classList.add('hidden');

    audioEl.removeAttribute('src');

    convertBtn.disabled = true;
    downloadBtn.disabled = true;
    resetBtn.disabled = true;

    convertBtn.classList.remove('hidden');
    downloadBtn.classList.add('hidden');

    progressWrap.classList.add('hidden');
    setProgress(0);

    if (!isError) {
        setStatus('Please select a video file to begin.');
    }
}

function handleFile(file) {
    resetUI();

    if (!file || !file.type.startsWith('video/')) {
        setStatus('That doesn’t look like a video file.', 'error');
        return;
    }

    selectedFile = file;

    fileDetails.innerHTML =
        '<p class="font-bold truncate">' + file.name + '</p>' +
        '<p>' + readableSize(file.size) + '</p>';

    uploadArea.classList.add('hidden');
    processingArea.classList.remove('hidden');

    convertBtn.disabled = false;
    resetBtn.disabled = false;

    setStatus('File ready. Click “Extract WAV Audio” to start.', 'success');
}

async function convertToWav(file) {
    try {
        setStatus('Decoding audio…');
        progressWrap.classList.remove('hidden');
        setProgress(5);

        const buffer = await file.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buffer);

        setStatus('Encoding WAV…');
        setProgress(10);

        wavWorker = new Worker(workerURL);

        const channels = [];
        for (let i = 0; i < decoded.numberOfChannels; i++) {
            channels.push(decoded.getChannelData(i));
        }

        wavWorker.postMessage(
            {
                channelData: channels,
                sampleRate: decoded.sampleRate,
                channels: decoded.numberOfChannels
            },
            channels.map(ch => ch.buffer)
        );

        wavWorker.onmessage = (e) => {
            const data = e.data;

            if (data.status === 'progress') {
                setProgress(10 + data.value * 0.9);
            }

            if (data.status === 'complete') {
                setProgress(100);
                setStatus('Extraction complete!', 'success');

                audioUrl = URL.createObjectURL(data.blob);
                audioEl.src = audioUrl;

                playerWrap.classList.remove('hidden');
                convertBtn.classList.add('hidden');
                downloadBtn.classList.remove('hidden');
                downloadBtn.disabled = false;
                resetBtn.disabled = false;

                wavWorker.terminate();
            }

            if (data.status === 'error') {
                setStatus('Encoding failed: ' + data.message, 'error');
                resetUI(true);
            }
        };

    } catch (err) {
        setStatus('Extraction failed: ' + err.message, 'error');
        resetUI(true);
    }
}

// Drag & drop visuals (kept intentionally basic)
function highlight(e) {
    e.preventDefault();
    uploadArea.classList.add('border-indigo-600');
}

function unhighlight(e) {
    e.preventDefault();
    uploadArea.classList.remove('border-indigo-600');
}

['dragenter', 'dragover'].forEach(evt =>
    uploadArea.addEventListener(evt, highlight)
);

['dragleave', 'drop'].forEach(evt =>
    uploadArea.addEventListener(evt, unhighlight)
);

uploadArea.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

resetBtn.addEventListener('click', () => resetUI());
convertBtn.addEventListener('click', () => selectedFile && convertToWav(selectedFile));

downloadBtn.addEventListener('click', () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = selectedFile.name.replace(/\.[^/.]+$/, '') + '.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Initial state
resetUI();


});