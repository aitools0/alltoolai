document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const inputFrom = document.getElementById('input-from');
    const selectFrom = document.getElementById('select-from');
    const inputTo = document.getElementById('input-to');
    const selectTo = document.getElementById('select-to');
    const summaryDisplay = document.getElementById('summary-display');
    const resetButton = document.getElementById('reset-button');

    // --- State to prevent calculation loops ---
    let lastActiveInput = inputFrom;

    // --- Core Conversion Logic ---
    const tempConverter = {
        'degree-celsius': {
            toFahrenheit: (c) => (c * 9/5) + 32,
            toKelvin: (c) => c + 273.15,
        },
        'fahrenheit': {
            toCelsius: (f) => (f - 32) * 5/9,
            toKelvin: (f) => (f - 32) * 5/9 + 273.15,
        },
        'kelvin': {
            toCelsius: (k) => k - 273.15,
            toFahrenheit: (k) => (k - 273.15) * 9/5 + 32,
        },
    };
    
    // --- Main Calculation Function ---
    const calculate = () => {
        const sourceInput = lastActiveInput;
        const targetInput = (sourceInput === inputFrom) ? inputTo : inputFrom;

        const sourceSelect = (sourceInput === inputFrom) ? selectFrom : selectTo;
        const targetSelect = (sourceInput === inputFrom) ? selectTo : selectFrom;

        const sourceValue = parseFloat(sourceInput.value);
        const fromUnit = sourceSelect.value;
        const toUnit = targetSelect.value;
        
        // If input is not a number, clear the other field and stop.
        if (isNaN(sourceValue)) {
            targetInput.value = '';
            summaryDisplay.textContent = '';
            return;
        }

        let result;

        // --- Direct Conversion ---
        if (fromUnit === toUnit) {
            result = sourceValue;
        } else if (fromUnit === 'degree-celsius' && toUnit === 'fahrenheit') {
            result = tempConverter["degree-celsius"].toFahrenheit(sourceValue);
        } else if (fromUnit === 'degree-celsius' && toUnit === 'kelvin') {
            result = tempConverter["degree-celsius"].toKelvin(sourceValue);
        } else if (fromUnit === 'fahrenheit' && toUnit === 'degree-celsius') {
            result = tempConverter.fahrenheit.toCelsius(sourceValue);
        } else if (fromUnit === 'fahrenheit' && toUnit === 'kelvin') {
            result = tempConverter.fahrenheit.toKelvin(sourceValue);
        } else if (fromUnit === 'kelvin' && toUnit === 'degree-celsius') {
            result = tempConverter.kelvin.toCelsius(sourceValue);
        } else if (fromUnit === 'kelvin' && toUnit === 'fahrenheit') {
            result = tempConverter.kelvin.toFahrenheit(sourceValue);
        }
        
        const finalResult = parseFloat(result.toFixed(2));
        targetInput.value = finalResult;

        updateSummary();
    };
    
    // --- UI Update Function ---
    const updateSummary = () => {
        const fromValue = inputFrom.value;
        const toValue = inputTo.value;

        if (fromValue && toValue) {
            const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text;
            const toUnitText = selectTo.options[selectTo.selectedIndex].text;
            summaryDisplay.textContent = `${fromValue} ${fromUnitText} = ${toValue} ${toUnitText}`;
        } else {
            summaryDisplay.textContent = '';
        }
    };

    // --- Reset Function ---
    const reset = () => {
        inputFrom.value = '1';
        selectFrom.value = 'degree-celsius';
        selectTo.value = 'fahrenheit';
        lastActiveInput = inputFrom; // Reset active input to the 'from' field
        calculate();
    };

    // --- Event Listeners ---
    [inputFrom, inputTo].forEach(input => {
        // Track which input was last used to determine conversion direction.
        input.addEventListener('focus', () => {
            lastActiveInput = input;
        });
        // Calculate on any numeric input.
        input.addEventListener('input', calculate);
    });

    [selectFrom, selectTo].forEach(select => {
        // Recalculate when the unit is changed.
        select.addEventListener('change', calculate);
    });
    
    resetButton.addEventListener('click', reset);

    // --- Initial Calculation on Load ---
    calculate();
});