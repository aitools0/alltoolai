  document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const selectFrom = document.getElementById('select-from');
    const inputFrom = document.getElementById('input-from');
    const selectTo = document.getElementById('select-to');
    const inputTo = document.getElementById('input-to');
    const summaryDisplay = document.getElementById('summary-display');
    const resetButton = document.getElementById('reset-button');

    // Conversion factors to base unit: metre per second (m/s)
    const factors = {
      'mile-per-hour': 0.44704,
      'foot-per-second': 0.3048,
      'metre-per-second': 1,
      'kilometre-per-hour': 0.2777777778, // slightly more precise
      'knot': 0.5144444444,               // slightly more precise
    };

    const unitSymbols = {
      'mile-per-hour': 'mi/h',
      'foot-per-second': 'ft/s',
      'metre-per-second': 'm/s',
      'kilometre-per-hour': 'km/h',
      'knot': 'kn',
    };

    let isConverting = false;

    function convert(sourceInputElement) {
      if (isConverting) return;
      isConverting = true;

      const isFromSource = sourceInputElement.id === 'input-from';
      const sourceValue = parseFloat(sourceInputElement.value);
      const fromUnit = selectFrom.value;
      const toUnit = selectTo.value;

      if (isNaN(sourceValue)) {
        const targetInput = isFromSource ? inputTo : inputFrom;
        targetInput.value = '';
      } else {
        if (isFromSource) {
          const valueInBaseUnit = sourceValue * factors[fromUnit];
          const result = valueInBaseUnit / factors[toUnit];
          inputTo.value = result.toFixed(5);
        } else {
          const valueInBaseUnit = sourceValue * factors[toUnit];
          const result = valueInBaseUnit / factors[fromUnit];
          inputFrom.value = result.toFixed(5);
        }
      }

      updateSummary();
      isConverting = false;
    }

    function updateSummary() {
      const fromValue = parseFloat(inputFrom.value);
      const toValue = parseFloat(inputTo.value);

      if (isNaN(fromValue) || isNaN(toValue)) {
        summaryDisplay.textContent = '';
        return;
      }

      const fromSymbol = unitSymbols[selectFrom.value];
      const toSymbol = unitSymbols[selectTo.value]; // FIXED: .value instead of .log

      summaryDisplay.textContent = `${fromValue.toFixed(2)} ${fromSymbol} = ${toValue.toFixed(5)} ${toSymbol}`;
    }

    function resetConverter() {
      selectFrom.value = 'mile-per-hour';
      selectTo.value = 'foot-per-second';
      inputFrom.value = '1';
      convert(inputFrom);
    }

    // Event listeners
    selectFrom.addEventListener('change', () => convert(inputFrom));
    selectTo.addEventListener('change', () => convert(inputFrom));
    inputFrom.addEventListener('input', () => convert(inputFrom));
    inputTo.addEventListener('input', () => convert(inputTo));
    resetButton.addEventListener('click', resetConverter);

    // Initial conversion
    convert(inputFrom);
  });