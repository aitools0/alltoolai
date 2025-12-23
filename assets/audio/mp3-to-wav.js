document.addEventListener('DOMContentLoaded', () => {

// Grab everything we’ll need up front.
// I prefer doing this once instead of querying later.
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const processingArea = document.getElementById('processing-area');
const fileInfoArea = document.getElementById('file-info-area');
const statusMsg = document.getElementById('status-message');
const progressWrap = document.getElementById('progress-bar-container');
const progressBar = document.getElementById('progress-bar');
const convertBtn = document.getElementById('convert-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const playerBox = document.getElementById('player-container');
const audioPlayer = document.getElementById('audio-player');

// App state (kept intentionally simple)
let selectedFile = null;
let wavResultBlob = null;

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx; // lazy init later

/* ============================
   Small helper utilities
   ============================ */

function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const idx = Math.floor(Math.log(bytes) / Math.log(1024));

    return (bytes / Math.pow(1024, idx)).toFixed(2) + ' ' + units[idx];
}

function setStatus(text, type = 'info') {
    statusMsg.textContent = text;

    let base = 'text-lg font-medium transition-colors ';
    if (type === 'error') {
        base += 'text-red-600 dark:text-red-500';
    } else if (type === 'success') {
        base += 'text-indigo-600 dark:text-indigo-400';
    } else {
        base += 'text-slate-600 dark:text-slate-400';
    }

    statusMsg.className = base;
}

/* ============================
   UI reset & updates
   ============================ */

function resetUI() {
    selectedFile = null;
    wavResultBlob = null;

    fileInput.value = '';

    if (audioPlayer.src) {
        URL.revokeObjectURL(audioPlayer.src); // avoid leaking blobs
        audioPlayer.src = '';
    }

    uploadArea.classList.remove('hidden');
    processingArea.classList.add('hidden');
    playerBox.classList.add('hidden');

    convertBtn.disabled = true;
    convertBtn.classList.remove('hidden');

    downloadBtn.disabled = true;
    downloadBtn.classList.add('hidden');

    resetBtn.disabled = true;

    progressWrap.classList.add('hidden');
    progressBar.style.width = '0%';

    setStatus('Please select an MP3 file to begin.');
}

function showFileInfo(file) {
    fileInfoArea.innerHTML = `
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">
            Selected MP3 File
        </h2>
        <div class="text-center text-base text-slate-600 dark:text-slate-400">
            <p class="font-bold text-slate-700 dark:text-slate-200 truncate">${file.name}</p>
            <p>${formatFileSize(file.size)}</p>
        </div>
    `;
}

function handleFile(file) {
    if (!file) return;

    // Extra guard — users drag weird stuff sometimes
    if (!file.type.startsWith('audio/mpeg') && !file.name.endsWith('.mp3')) {
        setStatus('Invalid file type. Please choose an MP3.', 'error');
        resetUI();
        return;
    }

    resetUI(); // clear any previous state

    selectedFile = file;
    uploadArea.classList.add('hidden');
    processingArea.classList.remove('hidden');

    showFileInfo(file);
    setStatus('File ready. Click “Convert to WAV”.', 'success');

    convertBtn.disabled = false;
    resetBtn.disabled = false;
}

/* ============================
   Event wiring
   ============================ */

fileInput.addEventListener('change', () => {
    handleFile(fileInput.files[0]);
});

resetBtn.addEventListener('click', resetUI);

// Drag & drop styling
function highlight(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('border-indigo-600', 'dark:border-indigo-300');
    uploadArea.classList.remove('border-slate-400', 'dark:border-slate-500');
}

function unhighlight(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('border-slate-400', 'dark:border-slate-500');
    uploadArea.classList.remove('border-indigo-600', 'dark:border-indigo-300');
}

['dragenter', 'dragover'].forEach(evt => {
    uploadArea.addEventListener(evt, highlight, false);
});

['dragleave', 'drop'].forEach(evt => {
    uploadArea.addEventListener(evt, unhighlight, false);
});

uploadArea.addEventListener('drop', (e) => {
    handleFile(e.dataTransfer.files[0]);
});

/* ============================
   Conversion logic
   ============================ */

convertBtn.addEventListener('click', async () => {
    if (!selectedFile || !AudioCtx) return;

    try {
        audioCtx = audioCtx || new AudioCtx();

        setStatus('Converting… this may take a moment.');
        convertBtn.disabled = true;
        resetBtn.disabled = true;

        progressWrap.classList.remove('hidden');
        progressBar.style.width = '25%';

        const buffer = await selectedFile.arrayBuffer();

        progressBar.style.width = '50%';
        const decodedAudio = await audioCtx.decodeAudioData(buffer);

        progressBar.style.width = '75%';
        wavResultBlob = audioBufferToWav(decodedAudio);

        progressBar.style.width = '100%';

        audioPlayer.src = URL.createObjectURL(wavResultBlob);
        playerBox.classList.remove('hidden');

        setStatus('Conversion successful! You can preview or download.', 'success');

        convertBtn.classList.add('hidden');
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('hidden');
        resetBtn.disabled = false;

    } catch (err) {
        console.error('WAV conversion failed:', err);
        setStatus('Conversion failed. The file may be corrupt.', 'error');

        convertBtn.disabled = false;
        resetBtn.disabled = false;
        progressWrap.classList.add('hidden');
    }
});

downloadBtn.addEventListener('click', () => {
    if (!wavResultBlob) return;

    const url = URL.createObjectURL(wavResultBlob);
    const a = document.createElement('a');

    const baseName =
        selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) ||
        selectedFile.name;

    a.href = url;
    a.download = baseName + '.wav';
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(a);
});

/* ============================
   WAV encoding (low-level)
   ============================ */

function audioBufferToWav(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    const buffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(buffer);
    let offset = 0;

    function writeString(str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset++, str.charCodeAt(i));
        }
    }

    writeString('RIFF');
    view.setUint32(offset, 36 + length * channels * 2, true);
    offset += 4;

    writeString('WAVE');

    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2; // PCM
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * channels * 2, true); offset += 4;
    view.setUint16(offset, channels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;

    writeString('data');
    view.setUint32(offset, length * channels * 2, true);
    offset += 4;

    for (let i = 0; i < length; i++) {
        for (let c = 0; c < channels; c++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(c)[i]));
            view.setInt16(
                offset,
                sample < 0 ? sample * 0x8000 : sample * 0x7FFF,
                true
            );
            offset += 2;
        }
    }

    return new Blob([view], { type: 'audio/wav' });
}

// Initial boot
resetUI();


});