document.addEventListener('DOMContentLoaded', () => {
    // === DOM Element Selectors ===
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const processingArea = document.getElementById('processing-area');
    const fileInfoArea = document.getElementById('file-info-area');
    const statusMessage = document.getElementById('status-message');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');
    const convertBtn = document.getElementById('convert-btn');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');
    const playerContainer = document.getElementById('player-container');
    const audioPlayer = document.getElementById('audio-player');

    // === App State ===
    let currentFile = null;
    let wavBlob = null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext;

    // === Helper Functions ===

    /** Formats file size in bytes to a human-readable string (KB, MB). */
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    /** Displays a status message to the user with appropriate color coding. */
    const showStatus = (message, type = 'info') => {
        statusMessage.textContent = message;
        const baseClasses = 'text-base font-medium transition-colors ';
        if (type === 'error') statusMessage.className = baseClasses + 'text-red-600 dark:text-red-500';
        else if (type === 'success') statusMessage.className = baseClasses + 'text-indigo-600 dark:text-indigo-400';
        else statusMessage.className = baseClasses + 'text-slate-600 dark:text-slate-400';
    };

    // === UI Update Functions ===

    /** Resets the entire UI to its initial state. */
    const resetUI = () => {
        currentFile = null;
        wavBlob = null;
        fileInput.value = ''; 
        if (audioPlayer.src) {
            URL.revokeObjectURL(audioPlayer.src); // Clean up memory from old audio blob
            audioPlayer.src = '';
        }
        
        uploadArea.classList.remove('hidden');
        processingArea.classList.add('hidden');
        playerContainer.classList.add('hidden');
        
        showStatus('Please select an MP3 file to begin.');
        
        convertBtn.disabled = true;
        convertBtn.classList.remove('hidden'); 
        downloadBtn.disabled = true;
        downloadBtn.classList.add('hidden');
        resetBtn.disabled = true;

        progressBarContainer.classList.add('hidden');
        progressBar.style.width = '0%';
    };

    /** Displays information about the selected file. */
    const displayFileInfo = (file) => {
        // FIX: Changed "Selected Video File" to "Selected MP3 File"
        fileInfoArea.innerHTML = `
            <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Selected MP3 File</h2>
            <div class="text-center text-base text-slate-600 dark:text-slate-400">
            <p class="font-bold text-slate-700 dark:text-slate-200 truncate">${file.name}</p>
            <p>${formatBytes(file.size)}</p>
            </div>`;
    };

    /** Handles the logic when a file is selected or dropped. */
    const handleFileSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('audio/mpeg') && !file.name.endsWith('.mp3')) {
            showStatus('Error: Invalid file type. Please select an MP3 file.', 'error');
            resetUI();
            return;
        }
        
        resetUI(); // Reset previous state before handling the new file

        currentFile = file;
        processingArea.classList.remove('hidden');
        displayFileInfo(file);
        uploadArea.classList.add('hidden');
        showStatus('File ready. Click "Convert to WAV".', 'success');
        
        convertBtn.disabled = false;
        resetBtn.disabled = false;
    };
    
    // === Event Listeners ===
    fileInput.addEventListener('change', () => handleFileSelect(fileInput.files[0]));
    resetBtn.addEventListener('click', resetUI);

    // Drag and Drop listeners
    const highlight = (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('border-indigo-600', 'dark:border-indigo-300');
        uploadArea.classList.remove('border-slate-400', 'dark:border-slate-500');
    };
    const unhighlight = (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('border-slate-400', 'dark:border-slate-500');
        uploadArea.classList.remove('border-indigo-600', 'dark:border-indigo-300');
    };
    ['dragenter', 'dragover'].forEach(e => uploadArea.addEventListener(e, highlight, false));
    ['dragleave', 'drop'].forEach(e => uploadArea.addEventListener(e, unhighlight, false));
    uploadArea.addEventListener('drop', e => handleFileSelect(e.dataTransfer.files[0]), false);

    // === Core Conversion Logic ===
    convertBtn.addEventListener('click', async () => {
        if (!currentFile || !AudioContext) return;
        try {
            audioContext = audioContext || new AudioContext();
            showStatus('Converting... Please wait.');
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressBarContainer.classList.remove('hidden');
            
            // NOTE: The conversion process can briefly lag the browser on large files.
            // This is expected, as it's a CPU-intensive task happening locally.
            progressBar.style.width = '25%';
            const arrayBuffer = await currentFile.arrayBuffer();
            
            progressBar.style.width = '50%';
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            progressBar.style.width = '75%';
            wavBlob = bufferToWave(audioBuffer);
            
            progressBar.style.width = '100%';
            
            const audioUrl = URL.createObjectURL(wavBlob);
            audioPlayer.src = audioUrl;
            playerContainer.classList.remove('hidden');

            showStatus('Conversion successful! You can now preview or download the file.', 'success');
            
            convertBtn.classList.add('hidden');
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('hidden'); 
            resetBtn.disabled = false;
        } catch (error) {
            console.error('Conversion Error:', error);
            showStatus('Conversion failed. The file may be corrupt or unsupported.', 'error');
            resetBtn.disabled = false;
            convertBtn.disabled = false; // Re-enable on failure
            progressBarContainer.classList.add('hidden');
        }
    });

    /** Handles the download of the converted WAV file. */
    downloadBtn.addEventListener('click', () => {
        if (!wavBlob) return;
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // Create a new filename ending in .wav
        const newName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
        a.download = `${newName}.wav`;
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up the created URL and anchor element
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });

/**
 * Converts an AudioBuffer object to a WAV file Blob using the standard RIFF format.
 * @param {AudioBuffer} ab The decoded audio data.
 * @returns {Blob} A Blob object representing the WAV file.
 */
function bufferToWave(ab) {
    const numChannels = ab.numberOfChannels;
    const sampleRate = ab.sampleRate;
    const length = ab.length;
    const buffer = new ArrayBuffer(44 + length * numChannels * 2); // 44 bytes for the header
    const view = new DataView(buffer);
    let pos = 0;

    const writeString = (s) => { 
        for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i)); 
        pos += s.length; 
    };
    
    // RIFF chunk descriptor
    writeString('RIFF');
    view.setUint32(pos, 36 + length * numChannels * 2, true); pos += 4;
    writeString('WAVE');
    
    // "fmt " sub-chunk
    writeString('fmt ');
    view.setUint32(pos, 16, true); pos += 4; // Sub-chunk size
    view.setUint16(pos, 1, true); pos += 2;  // PCM format
    view.setUint16(pos, numChannels, true); pos += 2;
    view.setUint32(pos, sampleRate, true); pos += 4;
    view.setUint32(pos, sampleRate * 2 * numChannels, true); pos += 4; // Byte rate
    view.setUint16(pos, numChannels * 2, true); pos += 2; // Block align
    view.setUint16(pos, 16, true); pos += 2; // 16 bits per sample
    
    // "data" sub-chunk
    writeString('data');
    view.setUint32(pos, length * numChannels * 2, true); pos += 4;

    // Write the PCM audio data
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, ab.getChannelData(channel)[i]));
            // Convert float to 16-bit signed integer
            view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            pos += 2;
        }
    }

    return new Blob([view], { type: 'audio/wav' });
};

// === Initialize App ===
resetUI();
});