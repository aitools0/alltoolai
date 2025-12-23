document.addEventListener('DOMContentLoaded', () => {

/* ============================
   DOM references (grab once)
   ============================ */

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');

const processingArea = document.getElementById('processing-area');
const fileInfoBox = document.getElementById('file-info-area');

const playerWrap = document.getElementById('player-container');
const audioEl = document.getElementById('audio-player');

const controlsWrap = document.getElementById('cutting-controls');
const timeline = document.getElementById('audio-timeline');
const timelineFill = document.getElementById('audio-progress');

const currentTimeLabel = document.getElementById('current-time');
const durationLabel = document.getElementById('duration');

const startSlider = document.getElementById('start-slider');
const endSlider = document.getElementById('end-slider');
const startInput = document.getElementById('start-value');
const endInput = document.getElementById('end-value');

const setStartBtn = document.getElementById('set-start-btn');
const setEndBtn = document.getElementById('set-end-btn');

const cutBtn = document.getElementById('cut-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

const statusText = document.getElementById('status-message');
const progressWrap = document.getElementById('progress-bar-container');
const progressBar = document.getElementById('progress-bar');

/* ============================
   App state (kept simple)
   ============================ */

let selectedFile = null;
let outputBlob = null;

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let decodedAudio = null;

let totalDuration = 0;
let startTime = 0;
let endTime = 0;

let worker = null;

/* ============================
   Small helpers
   ============================ */

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${String(mins).padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
}

function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function parseTimeInput(val) {
    const match = val.match(/^(\d+):(\d+(\.\d+)?)$/);
    if (!match) return null;

    const secs = (+match[1] * 60) + parseFloat(match[2]);
    return Math.max(0, Math.min(secs, totalDuration));
}

function setStatus(message, type = 'info') {
    statusText.textContent = message;

    if (type === 'error') {
        statusText.className = 'text-lg font-medium text-red-600 dark:text-red-500';
    } else if (type === 'success') {
        statusText.className = 'text-lg font-medium text-indigo-600 dark:text-indigo-400';
    } else {
        statusText.className = 'text-lg font-medium text-slate-600 dark:text-slate-400';
    }
}

/* ============================
   Reset everything
   ============================ */

function resetUI() {
    selectedFile = null;
    outputBlob = null;
    decodedAudio = null;

    startTime = 0;
    endTime = 0;
    totalDuration = 0;

    fileInput.value = '';

    if (audioEl.src) {
        URL.revokeObjectURL(audioEl.src);
        audioEl.src = '';
    }

    uploadArea.classList.remove('hidden');
    processingArea.classList.add('hidden');
    playerWrap.classList.add('hidden');
    controlsWrap.classList.add('hidden');

    cutBtn.disabled = true;
    resetBtn.disabled = true;

    downloadBtn.disabled = true;
    downloadBtn.classList.add('hidden');
    cutBtn.classList.remove('hidden');

    progressWrap.classList.add('hidden');
    progressBar.style.width = '0%';

    startInput.value = '00:00.0';
    endInput.value = '00:00.0';

    setStatus('Please select an audio file to begin.');
}

/* ============================
   File handling
   ============================ */

function showFileInfo(file) {
    fileInfoBox.innerHTML = `
        <h2 class="text-xl font-bold text-center">Selected Audio File</h2>
        <div class="text-center opacity-80">
            <p class="font-bold truncate">${file.name}</p>
            <p>${formatBytes(file.size)}</p>
        </div>
    `;
}

async function loadFile(file) {
    if (!file || !file.type.startsWith('audio/')) {
        setStatus('Invalid audio file.', 'error');
        resetUI();
        return;
    }

    resetUI();
    selectedFile = file;

    uploadArea.classList.add('hidden');
    processingArea.classList.remove('hidden');
    resetBtn.disabled = false;

    showFileInfo(file);
    setStatus('Loading audio…');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            if (!audioCtx) audioCtx = new AudioCtx();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            decodedAudio = await audioCtx.decodeAudioData(e.target.result);
            totalDuration = decodedAudio.duration;

            startTime = 0;
            endTime = totalDuration;

            startSlider.max = totalDuration;
            endSlider.max = totalDuration;

            startSlider.value = 0;
            endSlider.value = totalDuration;

            startInput.value = formatTime(0);
            endInput.value = formatTime(totalDuration);
            durationLabel.textContent = formatTime(totalDuration);

            audioEl.src = URL.createObjectURL(file);

            playerWrap.classList.remove('hidden');
            controlsWrap.classList.remove('hidden');

            cutBtn.disabled = false;
            setStatus('File loaded. Set your cut points.', 'success');

        } catch (err) {
            console.error(err);
            setStatus('Failed to decode audio.', 'error');
            resetUI();
        }
    };

    reader.readAsArrayBuffer(file);
}

/* ============================
   Event listeners
   ============================ */

fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
resetBtn.addEventListener('click', resetUI);

['dragenter', 'dragover'].forEach(evt => {
    uploadArea.addEventListener(evt, e => {
        e.preventDefault();
        uploadArea.classList.add('border-indigo-600');
    });
});

['dragleave', 'drop'].forEach(evt => {
    uploadArea.addEventListener(evt, e => {
        e.preventDefault();
        uploadArea.classList.remove('border-indigo-600');
    });
});

uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    loadFile(e.dataTransfer.files[0]);
});

audioEl.addEventListener('timeupdate', () => {
    if (!totalDuration) return;
    timelineFill.style.width = `${(audioEl.currentTime / totalDuration) * 100}%`;
    currentTimeLabel.textContent = formatTime(audioEl.currentTime);
});

timeline.addEventListener('click', e => {
    const rect = timeline.getBoundingClientRect();
    audioEl.currentTime = ((e.clientX - rect.left) / rect.width) * totalDuration;
});

function syncTimeInputs(e) {
    const parsed = parseTimeInput(e.target.value);
    if (parsed === null) return;

    if (e.target === startInput && parsed <= endTime) {
        startTime = parsed;
        startSlider.value = parsed;
    }

    if (e.target === endInput && parsed >= startTime) {
        endTime = parsed;
        endSlider.value = parsed;
    }

    startInput.value = formatTime(startTime);
    endInput.value = formatTime(endTime);
}

startInput.addEventListener('change', syncTimeInputs);
endInput.addEventListener('change', syncTimeInputs);

startSlider.addEventListener('input', e => {
    startTime = +e.target.value;
    if (startTime > endTime) {
        endTime = startTime;
        endSlider.value = endTime;
    }
    startInput.value = formatTime(startTime);
    endInput.value = formatTime(endTime);
});

endSlider.addEventListener('input', e => {
    endTime = +e.target.value;
    if (endTime < startTime) {
        startTime = endTime;
        startSlider.value = startTime;
    }
    startInput.value = formatTime(startTime);
    endInput.value = formatTime(endTime);
});

setStartBtn.addEventListener('click', () => {
    startTime = audioEl.currentTime;
    if (startTime > endTime) endTime = startTime;
    startSlider.value = startTime;
    endSlider.value = endTime;
    startInput.value = formatTime(startTime);
    endInput.value = formatTime(endTime);
});

setEndBtn.addEventListener('click', () => {
    endTime = audioEl.currentTime;
    if (endTime < startTime) startTime = endTime;
    endSlider.value = endTime;
    startSlider.value = startTime;
    startInput.value = formatTime(startTime);
    endInput.value = formatTime(endTime);
});

/* ============================
   Worker + cutting logic
   ============================ */

function initWorker() {
    const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');

        function floatToPCM(input) {
            const out = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                let s = Math.max(-1, Math.min(1, input[i]));
                out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            return out;
        }

        self.onmessage = e => {
            const { pcmData, sampleRate, numChannels } = e.data;

            const left = floatToPCM(pcmData[0]);
            const right = pcmData[1] ? floatToPCM(pcmData[1]) : null;

            const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
            const blockSize = 1152;
            const mp3Chunks = [];

            for (let i = 0; i < left.length; i += blockSize) {
                const l = left.subarray(i, i + blockSize);
                const r = right ? right.subarray(i, i + blockSize) : null;
                const buf = r ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
                if (buf.length) mp3Chunks.push(new Int8Array(buf));

                if (i % Math.floor(left.length / 20 || 1) === 0) {
                    self.postMessage({ type: 'progress', progress: Math.min(95, (i / left.length) * 95) });
                }
            }

            const end = encoder.flush();
            if (end.length) mp3Chunks.push(new Int8Array(end));

            self.postMessage({ type: 'progress', progress: 100 });
            self.postMessage({ type: 'done', blob: new Blob(mp3Chunks, { type: 'audio/mpeg' }) });
        };
    `;

    worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
    worker.onmessage = e => {
        if (e.data.type === 'progress') {
            progressBar.style.width = `${e.data.progress}%`;
        }

        if (e.data.type === 'done') {
            outputBlob = e.data.blob;
            audioEl.src = URL.createObjectURL(outputBlob);

            cutBtn.classList.add('hidden');
            downloadBtn.classList.remove('hidden');
            downloadBtn.disabled = false;
            resetBtn.disabled = false;

            setStatus(`Cut complete (${formatTime(startTime)} → ${formatTime(endTime)})`, 'success');
        }
    };
}

cutBtn.addEventListener('click', () => {
    if (!decodedAudio || endTime <= startTime) {
        setStatus('Invalid cut range.', 'error');
        return;
    }

    setStatus('Encoding MP3…');
    progressWrap.classList.remove('hidden');
    cutBtn.disabled = true;
    resetBtn.disabled = true;

    const sr = decodedAudio.sampleRate;
    const startSample = Math.floor(startTime * sr);
    const endSample = Math.floor(endTime * sr);

    const pcm = [];
    for (let i = 0; i < decodedAudio.numberOfChannels; i++) {
        pcm.push(decodedAudio.getChannelData(i).subarray(startSample, endSample));
    }

    worker.postMessage({
        pcmData: pcm,
        sampleRate: sr,
        numChannels: decodedAudio.numberOfChannels
    });
});

downloadBtn.addEventListener('click', () => {
    if (!outputBlob) return;

    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    const baseName = selectedFile.name.split('.').slice(0, -1).join('.') || 'audio';

    a.href = url;
    a.download = `${baseName}_cut.mp3`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 100);
});

/* ============================
   Init
   ============================ */

initWorker();
resetUI();


});