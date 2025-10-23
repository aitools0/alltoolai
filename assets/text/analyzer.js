document.addEventListener('DOMContentLoaded', () => {
    // === Initialize Page Elements ===
    const textInput = document.getElementById('text-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const liveUpdateToggle = document.getElementById('live-update-checkbox');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const wordCountResult = document.getElementById('word-count-result');
    const charCountWithSpacesResult = document.getElementById('char-count-with-spaces-result');
    const readabilityResult = document.getElementById('readability-result');
    const keywordDensityContainer = document.getElementById('keyword-density-result');
    
    // === Setup Logic ===
    let analysisTimeout;

    // === Core Application Logic ===
    const runAllAnalyses = (text) => {
        if (!text.trim()) {
            resetResults();
            return;
        }
        // Use one consistent regex for words to ensure all stats match.
        const words = text.toLowerCase().match(/[\w'-]+/g) || [];
        
        updateWordCount(words.length);
        updateCharCount(text);
        updateReadability(text, words);
        updateKeywordDensity(words);
    };

    const handleLiveUpdate = (event) => {
        clearTimeout(analysisTimeout);
        analysisTimeout = setTimeout(() => runAllAnalyses(event.target.value), 300);
    };
    
    const downloadTextFile = () => {
        const text = textInput.value;
        if (text.trim() === '') return;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analyzed-text.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // === UI Update Functions ===
    const resetResults = () => {
        wordCountResult.textContent = '0';
        charCountWithSpacesResult.textContent = '0';
        readabilityResult.textContent = 'N/A';
        const p = keywordDensityContainer.querySelector('p');
        const table = keywordDensityContainer.querySelector('table');
        if (p) {
            p.textContent = 'Enter text to see keyword analysis.';
            p.classList.remove('hidden');
        }
        if (table) table.classList.add('hidden');
    };

    const updateWordCount = (count) => {
        wordCountResult.textContent = count.toLocaleString();
    };
    
    const updateCharCount = (text) => {
        charCountWithSpacesResult.textContent = text.length.toLocaleString();
    };

    const countSyllables = (word) => {
        if (!word) return 0;
        // word is already lowercased from the main `words` array generation
        if (word.length <= 3) return 1;
        word = word.replace(/e$/, '');
        const vowelMatches = word.match(/[aeiouy]+/g);
        return vowelMatches ? vowelMatches.length : 1;
    };
    
    const updateReadability = (text, words) => {
        const wordCount = words.length;
        if (wordCount < 10) {
            readabilityResult.textContent = 'N/A';
            return;
        }
        let sentenceCount = (text.match(/[.!?…]+/g) || []).length;
        if (sentenceCount === 0) sentenceCount = 1;

        const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
        const fkGrade = 0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59;
        readabilityResult.textContent = fkGrade > 0 ? fkGrade.toFixed(1) : 'N/A';
    };

    const updateKeywordDensity = (words) => {
        const p = keywordDensityContainer.querySelector('p');
        const table = keywordDensityContainer.querySelector('table');
        const tbody = table ? table.querySelector('tbody') : null;
        if (!p || !table || !tbody) return;

        if (words.length === 0) {
            table.classList.add('hidden');
            p.classList.remove('hidden');
            p.textContent = 'Enter text to see keyword analysis.';
            return;
        }

        const stopWords = new Set(["the","a","an","is","are","and","for","with","but","not","you","this","that","was","are","from","into","has","have","been","will","its","what","which","who","when","where", "i", "it", "of", "to", "in"]);
        
        const freqMap = {};
        for (const word of words) {
            if (word.length > 2 && !stopWords.has(word) && isNaN(word)) {
                 freqMap[word] = (freqMap[word] || 0) + 1;
            }
        }
        
        const sortedKeywords = Object.entries(freqMap).sort(([, a], [, b]) => b - a);

        if (sortedKeywords.length > 0) {
            tbody.innerHTML = '';
            const totalWords = words.length;
            sortedKeywords.slice(0, 5).forEach(([word, count]) => {
                const density = ((count / totalWords) * 100).toFixed(2);
                const row = tbody.insertRow();
                row.className = "border-b border-slate-300 dark:border-slate-600 last:border-0";
                row.innerHTML = `<td class="py-2.5 px-2 pl-0">${word}</td><td class="py-2.5 px-2">${count}</td><td class="py-2.5 px-2">${density}%</td>`;
            });
            table.classList.remove('hidden');
            p.classList.add('hidden');
        } else {
            table.classList.add('hidden');
            p.classList.remove('hidden');
            p.textContent = 'No significant keywords found. Try adding more text.';
        }
    };
    
    // === Event Listeners ===
    analyzeBtn.addEventListener('click', () => runAllAnalyses(textInput.value));
    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        resetResults();
        textInput.focus();
    });
    downloadBtn.addEventListener('click', downloadTextFile);
    liveUpdateToggle.addEventListener('change', () => {
        if (liveUpdateToggle.checked) {
            textInput.addEventListener('input', handleLiveUpdate);
            if (textInput.value) runAllAnalyses(textInput.value);
        } else {
            textInput.removeEventListener('input', handleLiveUpdate);
        }
    });

    if(textInput.value){
        runAllAnalyses(textInput.value);
    }
});