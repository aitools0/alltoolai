document.addEventListener('DOMContentLoaded', () => {
    
    // Get references to all necessary HTML elements
    const inputFrom = document.getElementById('input-from');
    const selectFrom = document.getElementById('select-from');
    const inputTo = document.getElementById('input-to');
    const selectTo = document.getElementById('select-to');
    const summaryDisplay = document.getElementById('summary-display');
    const resetButton = document.getElementById('reset-button');
    
    // A state variable to track the last input field actively edited by the user
    let lastActiveInput = inputFrom;

    // Define conversion factors relative to the base unit: bits-per-second
    const conversionFactors = {
        'bit-per-second': 1,
        'kilobit-per-second': 1000,
        'kilobyte-per-second': 8000,       // 1000 * 8
        'kibibit-per-second': 1024,
        'megabit-per-second': 1e6,
        'megabyte-per-second': 8e6,       // 1e6 * 8
        'mebibit-per-second': 1024 ** 2,
        'gigabit-per-second': 1e9,
        'gigabyte-per-second': 8e9,       // 1e9 * 8
        'gibibit-per-second': 1024 ** 3,
        'terabit-per-second': 1e12,
        'terabyte-per-second': 8e12,      // 1e12 * 8
        'tebibit-per-second': 1024 ** 4,
    };

    // Helper function to format numbers cleanly for display
    function formatNumber(num) {
        if (!isFinite(num)) return '';
        if (num === 0) return '0';
        const formatted = num.toPrecision(15);
        // Remove trailing zeros and a trailing decimal point
        return formatted.includes('.') ? formatted.replace(/\.?0+$/, '') : formatted;
    }
    
    // Main conversion logic
    function handleConversion() {
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;
        let valueToConvert;

        if (lastActiveInput === inputFrom) {
            valueToConvert = parseFloat(inputFrom.value);
            const valueInBits = valueToConvert * conversionFactors[fromUnit];
            inputTo.value = formatNumber(valueInBits / conversionFactors[toUnit]);
        } else {
            valueToConvert = parseFloat(inputTo.value);
            const valueInBits = valueToConvert * conversionFactors[toUnit];
            inputFrom.value = formatNumber(valueInBits / conversionFactors[fromUnit]);
        }
        
        updateSummary();
    }

    // Update the summary text (e.g., "1 Mbit/s = 0.125 MB/s")
    function updateSummary() {
        const fromValue = parseFloat(inputFrom.value);
        
        if (isNaN(fromValue) || fromValue < 0) {
            summaryDisplay.textContent = '';
            return;
        }

        const toValue = parseFloat(inputTo.value);
        const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text;
        const toUnitText = selectTo.options[selectTo.selectedIndex].text;
        summaryDisplay.textContent = `${formatNumber(fromValue)} ${fromUnitText} = ${formatNumber(toValue)} ${toUnitText}`;
    }

    // Function to reset the converter to its default state
    function resetConverter() {
        inputFrom.value = '1';
        selectFrom.value = 'megabit-per-second';
        selectTo.value = 'megabyte-per-second';
        lastActiveInput = inputFrom; // Reset active input to default
        handleConversion();
    }

    // --- Event Listeners ---
    
    // When the user types in the "from" input field
    inputFrom.addEventListener('input', () => {
        lastActiveInput = inputFrom;
        handleConversion();
    });

    // When the user types in the "to" input field
    inputTo.addEventListener('input', () => {
        lastActiveInput = inputTo;
        handleConversion();
    });

    // When the user changes a unit in either dropdown
    selectFrom.addEventListener('change', handleConversion);
    selectTo.addEventListener('change', handleConversion);
    
    // When the user clicks the reset button
    resetButton.addEventListener('click', resetConverter);

    // Perform an initial conversion when the page loads
    resetConverter();
});