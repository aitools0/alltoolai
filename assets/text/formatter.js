document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE MANAGEMENT ---
    const toolState = {
        lastText: '',
        copyStatus: 'idle',
    };

    // --- DOM ELEMENT CACHING ---
    const editor = document.getElementById('textEditor');
    const copyButton = document.getElementById('copy-button');
    const copyButtonText = document.getElementById('copy-button-text');
    const downloadButton = document.getElementById('download-button');
    const undoButton = document.getElementById('undo-button');
    const resetButton = document.getElementById('reset-button');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    const converterContainer = document.getElementById('converter-container');

    // --- UTILITY FUNCTIONS ---

    // Updates button states (enabled/disabled) based on the current editor content.
    const updateButtonStates = () => {
        const isTextEmpty = editor.value.trim() === '';
        copyButton.disabled = isTextEmpty;
        downloadButton.disabled = isTextEmpty;
        undoButton.disabled = toolState.lastText.trim() === '';
    };

    // Provides brief visual feedback (a green ring) on the editor.
    const showFeedback = () => {
        editor.classList.add('ring-2', 'ring-green-500');
        setTimeout(() => {
            editor.classList.remove('ring-2', 'ring-green-500');
        }, 700);
    };

    // --- CORE LOGIC ---

    // Applies a specified text transformation.
    const applyOperation = (operation) => {
        const currentText = editor.value;
        if (currentText.trim() === '') return;

        toolState.lastText = currentText;
        let newText = '';
        const lines = currentText.split(/\r?\n/);

        switch (operation) {
            case 'toUppercase': newText = currentText.toUpperCase(); break;
            case 'toLowercase': newText = currentText.toLowerCase(); break;
            case 'toTitleCase': newText = currentText.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()); break;
            case 'toSentenceCase': newText = currentText.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase()); break;
            case 'removeLineBreaks': newText = currentText.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ').trim(); break;
            case 'removeExtraSpaces': newText = currentText.replace(/\s+/g, ' ').trim(); break;
            case 'trimLines': newText = lines.map(line => line.trim()).join('\n'); break;
            case 'removeAllSpaces': newText = currentText.replace(/\s/g, ''); break;
            case 'removeDuplicateLines': newText = [...new Set(lines.filter(line => line.trim() !== ''))].join('\n'); break;
            case 'sortAZ': newText = lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).join('\n'); break;
            case 'sortZA': newText = lines.sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' })).join('\n'); break;
            case 'sortNumAsc': newText = lines.filter(l => l.trim() !== '' && !isNaN(parseFloat(l))).sort((a, b) => parseFloat(a) - parseFloat(b)).join('\n'); break;
            case 'sortNumDesc': newText = lines.filter(l => l.trim() !== '' && !isNaN(parseFloat(l))).sort((a, b) => parseFloat(b) - parseFloat(a)).join('\n'); break;
            default: newText = currentText; break;
        }

        editor.value = newText;
        updateButtonStates();
        showFeedback();
    };
    
    // --- EVENT HANDLERS ---
    const handleUndo = () => {
        if (toolState.lastText.trim() !== '') {
            editor.value = toolState.lastText;
            toolState.lastText = '';
            updateButtonStates();
        }
    };
    
    const handleReset = () => {
        editor.value = '';
        toolState.lastText = '';
        updateButtonStates();
    };

    const handleCopy = () => {
        if (editor.value.trim() === '' || toolState.copyStatus === 'copied') return;
        
        navigator.clipboard.writeText(editor.value).then(() => {
            toolState.copyStatus = 'copied';
            copyButtonText.textContent = 'Copied!';
            copyButton.classList.add('!bg-green-600', '!hover:bg-green-700');

            setTimeout(() => {
                toolState.copyStatus = 'idle';
                copyButtonText.textContent = 'Copy';
                copyButton.classList.remove('!bg-green-600', '!hover:bg-green-700');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    const handleDownload = () => {
        if (editor.value.trim() === '') return;
        try {
            const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'cleaned-text.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download file: ', err);
        }
    };

    // --- EVENT LISTENER REGISTRATION ---

    editor.addEventListener('input', updateButtonStates);

    copyButton.addEventListener('click', handleCopy);
    downloadButton.addEventListener('click', handleDownload);
    undoButton.addEventListener('click', handleUndo);
    resetButton.addEventListener('click', handleReset);
    
    // Use event delegation on the container for all dropdown operation buttons.
    converterContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        
        const operation = target.dataset.operation;
        if (operation) {
            applyOperation(operation);
            const openMenu = document.querySelector('.dropdown-menu:not(.hidden)');
            if (openMenu) {
                openMenu.classList.add('hidden');
                openMenu.previousElementSibling.querySelector('svg')?.classList.remove('rotate-180');
            }
        }
    });
    
    // Attach listener to each dropdown toggle button.
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentMenu = toggle.nextElementSibling;
            const isHidden = currentMenu.classList.contains('hidden');

            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== currentMenu) {
                    menu.classList.add('hidden');
                    menu.previousElementSibling.querySelector('svg')?.classList.remove('rotate-180');
                }
            });

            currentMenu.classList.toggle('hidden', !isHidden);
            toggle.querySelector('svg')?.classList.toggle('rotate-180', isHidden);
        });
    });

    // A global click listener to close dropdowns when clicking outside of them.
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.add('hidden');
            menu.previousElementSibling.querySelector('svg')?.classList.remove('rotate-180');
        });
    });
    
    // Set initial button states on page load.
    updateButtonStates();
});