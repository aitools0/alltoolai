document.addEventListener('DOMContentLoaded', function () {

const ui = {
    uploadBox: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    processingArea: document.getElementById('processing-area'),
    fileInfo: document.getElementById('file-info-area'),
    statusText: document.getElementById('status-message'),
    progressWrap: document.getElementById('progress-bar-container'),
    progressBar: document.getElementById('progress-bar'),
    convertBtn: document.getElementById('convert-btn'),
    downloadBtn: document.getElementById('download-btn'),
    resetBtn: document.getElementById('reset-btn'),
    playerWrap: document.getElementById('player-container'),
    audio: document.getElementById('audio-player')
};

// app-level state (kept simple on purpose)
let selectedFile = null;
let mp3BlobUrl = null;
let worker = null;

// converts bytes to something readable (probably copy-pasted years ago)
function prettySize(bytes) {
    if (!bytes) return '0 Bytes';

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const idx = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, idx)).toFixed(2) + ' ' + units[idx];
}

function setStatus(msg, type) {
    ui.statusText.textContent = msg;

    // quick and dirty status coloring
    if (type === 'error') {
        ui.statusText.className = 'text-lg font-medium text-red-600 dark:text-red-500';
    } else if (type === 'success') {
        ui.statusText.className = 'text-lg font-medium text-indigo-600 dark:text-indigo-400';
    } else {
        ui.statusText.className = 'text-lg font-medium text-slate-600 dark:text-slate-400';
    }
}

function resetUI() {
    ui.uploadBox.classList.remove('hidden');
    ui.processingArea.classList.add('hidden');
    ui.playerWrap.classList.add('hidden');

    ui.fileInfo.innerHTML = '';

    ui.convertBtn.disabled = true;
    ui.downloadBtn.disabled = true;
    ui.resetBtn.disabled = true;

    ui.downloadBtn.classList.add('hidden');
    ui.convertBtn.classList.remove('hidden');

    ui.progressWrap.classList.add('hidden');
    ui.progressBar.style.width = '0%';

    // cleanup old stuff
    if (mp3BlobUrl) {
        URL.revokeObjectURL(mp3BlobUrl);
        mp3BlobUrl = null;
    }

    if (worker) {
        worker.terminate();
        worker = null;
    }

    selectedFile = null;
    ui.fileInput.value = '';

    setStatus('Please select a WAV file to begin.');
}

function handleFile(file) {
    resetUI();

    if (!file) return;

    // basic validation — nothing fancy
    if (!file.name.toLowerCase().endsWith('.wav')) {
        setStatus('Only WAV files are supported.', 'error');
        return;
    }

    selectedFile = file;

    ui.uploadBox.classList.add('hidden');
    ui.processingArea.classList.remove('hidden');

    ui.convertBtn.disabled = false;
    ui.resetBtn.disabled = false;

    ui.fileInfo.innerHTML = `
        <h2 class="text-xl font-bold text-center">Selected File</h2>
        <p class="text-center font-semibold truncate">${file.name}</p>
        <p class="text-center">Size: ${prettySize(file.size)}</p>
    `;

    setStatus('File loaded. Ready to convert.', 'success');
}

async function convertToMp3() {
    if (!selectedFile) return;

    ui.convertBtn.disabled = true;
    ui.resetBtn.disabled = true;
    ui.progressWrap.classList.remove('hidden');

    setStatus('Converting… please wait.');

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();

        const buffer = await selectedFile.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buffer);

        const floatSamples = decoded.getChannelData(0);

        // convert Float32 → Int16 (required by lamejs)
        const pcmSamples = new Int16Array(floatSamples.length);
        for (let i = 0; i < floatSamples.length; i++) {
            const s = Math.max(-1, Math.min(1, floatSamples[i]));
            pcmSamples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // worker code lives inline — not ideal, but very practical
        const workerCode = `
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.0/lame.min.js');

            onmessage = function (e) {
                const encoder = new lamejs.Mp3Encoder(1, e.data.rate, 128);
                const chunkSize = 1152 * 20;
                const mp3Chunks = [];

                for (let i = 0; i < e.data.samples.length; i += chunkSize) {
                    const chunk = e.data.samples.subarray(i, i + chunkSize);
                    const encoded = encoder.encodeBuffer(chunk);

                    if (encoded.length) {
                        mp3Chunks.push(encoded);
                    }

                    postMessage({ progress: (i / e.data.samples.length) * 100 });
                }

                const end = encoder.flush();
                if (end.length) mp3Chunks.push(end);

                postMessage({
                    done: true,
                    blob: new Blob(mp3Chunks, { type: 'audio/mpeg' })
                });
            };
        `;

        worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
        worker.onmessage = function (e) {
            if (e.data.progress != null) {
                ui.progressBar.style.width = e.data.progress + '%';
            }

            if (e.data.done) {
                mp3BlobUrl = URL.createObjectURL(e.data.blob);

                ui.audio.src = mp3BlobUrl;
                ui.playerWrap.classList.remove('hidden');

                ui.downloadBtn.classList.remove('hidden');
                ui.downloadBtn.disabled = false;
                ui.resetBtn.disabled = false;

                ui.progressBar.style.width = '100%';
                setStatus('Conversion complete!', 'success');
            }
        };

        worker.postMessage(
            { samples: pcmSamples, rate: decoded.sampleRate },
            [pcmSamples.buffer]
        );

    } catch (err) {
        console.error(err);
        setStatus('Something went wrong during conversion.', 'error');
        ui.resetBtn.disabled = false;
    }
}

// event wiring
ui.fileInput.addEventListener('change', function () {
    handleFile(ui.fileInput.files[0]);
});

ui.convertBtn.addEventListener('click', convertToMp3);
ui.resetBtn.addEventListener('click', resetUI);

ui.downloadBtn.addEventListener('click', function () {
    if (!mp3BlobUrl || !selectedFile) return;

    const a = document.createElement('a');
    a.href = mp3BlobUrl;
    a.download = selectedFile.name.replace(/\.wav$/i, '.mp3');
    a.click();
});

// initial state
resetUI();


});