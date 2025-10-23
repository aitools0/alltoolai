document.addEventListener('DOMContentLoaded', () => {
  // Shorthand selector
  const $ = id => document.getElementById(id);

  // Elements
  const textInput = $('text-input');
  const codeInput = $('code-input');
  const modeToggle = $('mode-toggle');
  const modeLabel = $('mode-label');
  const delimiterInput = $('delimiter-input');
  const codeError = $('code-error');
  const formatRadios = document.querySelectorAll('input[name="format"]');
  const buttons = document.querySelectorAll('.btn-tool');

  // Containers for ordering
  const textInputArea = $('text-input-area');
  const codeInputArea = $('code-input-area');
  const modeToggleArea = $('mode-toggle-area');

  // State
  let currentFormat = 'decimal';
  let isTextToCode = true;

  // Initial order
  textInputArea.style.order = '1';
  modeToggleArea.style.order = '2';
  codeInputArea.style.order = '3';

  // Helpers
  const baseFrom = (format) =>
    format === 'binary' ? 2 :
    format === 'hex'    ? 16 :
    format === 'octal'  ? 8  : 10;

  // Support simple escape sequences in delimiter input (\n, \t, \r)
  const normalizeDelimiter = (s) => {
    if (s == null) return ' ';
    return s
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');
  };

  const stripPrefix = (s, format) => {
    const t = s.trim();
    if (format === 'hex') return t.replace(/^0x/i, '');
    if (format === 'binary') return t.replace(/^0b/i, '');
    if (format === 'octal') return t.replace(/^0o/i, '');
    return t;
  };

  // Unicode-safe text -> code
  function textToCode(text, format, delimiter) {
    if (!text) return '';
    const base = baseFrom(format);
    const out = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      out.push(cp.toString(base));
    }
    return out.join(delimiter);
  }

  // Unicode-safe code -> text
  function codeToText(code, format, delimiter) {
    if (!code) {
      codeError.classList.add('hidden');
      return '';
    }
    const base = baseFrom(format);
    // If delimiter is empty, fall back to whitespace splitting
    const parts = delimiter
      ? code.split(delimiter)
      : code.trim().split(/\s+/);

    const cps = [];
    for (let raw of parts) {
      if (!raw || !raw.trim()) continue;
      const n = parseInt(stripPrefix(raw, format), base);
      if (Number.isNaN(n) || n < 0 || n > 0x10FFFF) {
        codeError.textContent = 'Invalid code for selected format.';
        codeError.classList.remove('hidden');
        return textInput.value; // keep previous valid text
      }
      cps.push(n);
    }

    try {
      const result = String.fromCodePoint(...cps);
      codeError.classList.add('hidden');
      return result;
    } catch {
      codeError.textContent = 'Invalid Unicode code point sequence.';
      codeError.classList.remove('hidden');
      return textInput.value;
    }
  }

  // The update function you can call anytime
  function updateConversion() {
    const delimiter = normalizeDelimiter(delimiterInput.value);
    if (isTextToCode) {
      codeInput.value = textToCode(textInput.value, currentFormat, delimiter);
    } else {
      textInput.value = codeToText(codeInput.value, currentFormat, delimiter);
    }
  }

  // Events
  textInput.addEventListener('input', () => {
    if (isTextToCode) updateConversion();
  });

  codeInput.addEventListener('input', () => {
    if (!isTextToCode) updateConversion();
  });

  modeToggle.addEventListener('change', () => {
    isTextToCode = !modeToggle.checked;
    modeLabel.textContent = isTextToCode ? 'Text to Code' : 'Code to Text';

    // Reorder areas
    if (isTextToCode) {
      textInputArea.style.order = '1';
      codeInputArea.style.order = '3';
    } else {
      textInputArea.style.order = '3';
      codeInputArea.style.order = '1';
    }

    // Reset values
    textInput.value = '';
    codeInput.value = '';
    codeError.classList.add('hidden');
    updateConversion();
  });

  formatRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        currentFormat = radio.value;
        updateConversion();
      }
    });
  });

  delimiterInput.addEventListener('input', updateConversion);

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const targetId = button.dataset.target;
      const target = $(targetId);
      if (!target) return;

      switch (action) {
        case 'download': {
          const blob = new Blob([target.value || ''], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${targetId}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          break;
        }
        case 'clear': {
          target.value = '';
          // Clear the paired field too for consistency
          if (targetId === 'text-input') codeInput.value = '';
          if (targetId === 'code-input') textInput.value = '';
          codeError.classList.add('hidden');
          break;
        }
        case 'copy': {
          const originalText = button.textContent;
          navigator.clipboard.writeText(target.value || '')
            .then(() => {
              button.textContent = 'Copied!';
              button.disabled = true;
              setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
              }, 2000);
            })
            .catch(err => {
              console.error('Could not copy text:', err);
            });
          break;
        }
      }
    });
  });

  // Sync initial format from checked radio (if markup changes)
  const checked = document.querySelector('input[name="format"]:checked');
  if (checked) currentFormat = checked.value;

  // Initial render
  updateConversion();
});