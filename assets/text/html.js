document.addEventListener('DOMContentLoaded', () => {
  // --- Element Selection ---
  const htmlInput = document.getElementById('htmlInput');
  const textOutput = document.getElementById('textOutput');
  const convertBtn = document.getElementById('convertBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  // Optional toggles (only used if present in DOM)
  const preserveBreaksToggle = document.getElementById('preserveBreaksToggle');
  const keepLinksToggle = document.getElementById('keepLinksToggle');

  const DEFAULT_OPTIONS = {
    preserveLineBreaks: true,
    keepLinks: false,
    listItemBullet: '•',
    condenseNewlines: true,
    collapseWhitespace: true,
    maxConsecutiveNewlines: 2,
    trim: true
  };

  // Debounce helper
  const debounce = (fn, delay = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  // Core conversion: safely convert HTML to readable plain text
  const convertHtmlToText = (html, opts = DEFAULT_OPTIONS) => {
    if (!html || !html.trim()) return '';

    // 1) Strip dangerous/noise content quickly
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Remove heavy non-text containers entirely
    cleaned = cleaned.replace(/<(?:iframe|object|embed|canvas|svg|math)[\s\S]*?<\/(?:iframe|object|embed|canvas|svg|math)>/gi, '');

    // 2) Parse safely
    const doc = new DOMParser().parseFromString(cleaned, 'text/html');
    const root = doc.body;

    const res = [];
    const skipTags = new Set(['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'canvas', 'svg', 'math']);
    const doubleBreakAfter = new Set(['p','div','section','article','header','footer','main','nav','figure','figcaption','h1','h2','h3','h4','h5','h6','address','blockquote']);
    const listContainers = new Set(['ul', 'ol']);
    const tableRow = 'tr';
    const tableCell = new Set(['td', 'th']);

    const walk = (node) => {
      if (!node) return;

      if (node.nodeType === Node.TEXT_NODE) {
        res.push(node.nodeValue || '');
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const tag = node.tagName.toLowerCase();
      if (skipTags.has(tag)) return;

      // Handle specific elements
      if (tag === 'br') {
        res.push('\n');
        return;
      }

      if (tag === 'pre') {
        // Preserve preformatted text
        res.push('\n');
        res.push(node.textContent || '');
        res.push('\n');
        return;
      }

      if (tag === 'li') {
        if (DEFAULT_OPTIONS.listItemBullet) res.push(DEFAULT_OPTIONS.listItemBullet + ' ');
        node.childNodes.forEach(walk);
        res.push('\n');
        return;
      }

      if (tag === 'a') {
        const text = (node.textContent || '').trim();
        if (!text) return;
        if ((keepLinksToggle && keepLinksToggle.checked) || opts.keepLinks) {
          const href = node.getAttribute('href') || '';
          if (href) res.push(`${text} (${href})`);
          else res.push(text);
        } else {
          res.push(text);
        }
        return;
      }

      if (listContainers.has(tag)) {
        node.childNodes.forEach(walk);
        res.push('\n');
        return;
      }

      if (tableCell.has(tag)) {
        node.childNodes.forEach(walk);
        res.push('\t'); // separate cells
        return;
      }

      if (tag === tableRow) {
        node.childNodes.forEach(walk);
        res.push('\n'); // end row
        return;
      }

      if (doubleBreakAfter.has(tag)) {
        node.childNodes.forEach(walk);
        res.push('\n\n');
        return;
      }

      // Default: traverse children (inline or unknown tags)
      node.childNodes.forEach(walk);
    };

    walk(root);

    // 3) Post-process text
    let out = res.join('');

    // Remove trailing tabs at line end (from table cells)
    out = out.replace(/\t+\n/g, '\n');

    // Convert NBSP to space
    out = out.replace(/\u00A0/g, ' ');

    // Collapse spaces and tabs but keep newlines
    if (opts.collapseWhitespace) {
      out = out.replace(/[ \t\f\v]+/g, ' ');
      out = out.replace(/[ \t]+\n/g, '\n'); // trim end-of-line spaces
    }

    // Condense excessive newlines
    if (opts.condenseNewlines) {
      const maxN = Math.max(1, opts.maxConsecutiveNewlines || 2);
      const re = new RegExp(`\\n{${maxN + 1},}`, 'g');
      out = out.replace(re, '\n'.repeat(maxN));
    }

    // If not preserving line breaks, flatten to a single space
    const preserve = (preserveBreaksToggle && preserveBreaksToggle.checked) || opts.preserveLineBreaks;
    if (!preserve) {
      out = out.replace(/\n+/g, ' ');
      out = out.replace(/\s{2,}/g, ' ');
    }

    if (opts.trim) out = out.trim();

    return out;
  };

  // Enable/disable buttons based on content
  const setButtonsState = () => {
    const hasInput = !!htmlInput?.value.trim();
    const hasOutput = !!textOutput?.value.trim();

    if (convertBtn) convertBtn.disabled = !hasInput;
    if (copyBtn) copyBtn.disabled = !hasOutput;
    if (downloadBtn) downloadBtn.disabled = !hasOutput;
    if (clearBtn) clearBtn.disabled = !hasInput && !hasOutput;
  };

  // Full update function: convert + UI state updates
  const updateOutput = (manual = false) => {
    if (!htmlInput || !textOutput) return;

    const options = {
      ...DEFAULT_OPTIONS,
      preserveLineBreaks: preserveBreaksToggle ? preserveBreaksToggle.checked : DEFAULT_OPTIONS.preserveLineBreaks,
      keepLinks: keepLinksToggle ? keepLinksToggle.checked : DEFAULT_OPTIONS.keepLinks
    };

    // Optional visual feedback on manual conversion
    if (manual && convertBtn) {
      convertBtn.setAttribute('aria-busy', 'true');
      convertBtn.style.transform = 'scale(0.98)';
    }

    try {
      textOutput.value = convertHtmlToText(htmlInput.value, options);
    } catch (e) {
      console.error('Conversion error:', e);
      textOutput.value = '';
    } finally {
      setButtonsState();
      if (manual && convertBtn) {
        convertBtn.removeAttribute('aria-busy');
        convertBtn.style.transform = '';
      }
    }
  };

  // Expose update function globally (optional)
  window.updateHtmlToText = updateOutput;

  // Copy
  const handleCopy = () => {
    if (!textOutput || !textOutput.value.trim()) return;
    const original = copyBtn.textContent;
    navigator.clipboard.writeText(textOutput.value).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.disabled = true;
      setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.disabled = false;
      }, 1600);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy text. Please try again.');
    });
  };

  // Download
  const handleDownload = () => {
    if (!textOutput || !textOutput.value.trim()) return;
    const blob = new Blob([textOutput.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear
  const handleClear = () => {
    if (htmlInput) htmlInput.value = '';
    if (textOutput) textOutput.value = '';
    setButtonsState();
    htmlInput?.focus();
  };

  // --- Event Listeners ---
  if (convertBtn) convertBtn.addEventListener('click', () => updateOutput(true));
  if (clearBtn) clearBtn.addEventListener('click', handleClear);
  if (copyBtn) copyBtn.addEventListener('click', handleCopy);
  if (downloadBtn) downloadBtn.addEventListener('click', handleDownload);

  // Live update on input (debounced)
  if (htmlInput) htmlInput.addEventListener('input', debounce(() => updateOutput(false), 150));

  // Optional toggles live effect
  preserveBreaksToggle?.addEventListener('change', () => updateOutput(true));
  keepLinksToggle?.addEventListener('change', () => updateOutput(true));

  // Convert on Ctrl/Cmd+Enter
  htmlInput?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      updateOutput(true);
    }
  });

  // Initial state
  setButtonsState();
});