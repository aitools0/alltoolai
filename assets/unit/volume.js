    document.addEventListener('DOMContentLoaded', () => {
        // --- DOM Elements ---
        const selectFrom = document.getElementById('select-from');
        const inputFrom = document.getElementById('input-from');
        const selectTo = document.getElementById('select-to');
        const inputTo = document.getElementById('input-to');
        const summaryDisplay = document.getElementById('summary-display');
        const resetButton = document.getElementById('reset-button');

        // --- Conversion Data ---
        const conversionFactors = {
            'us-liquid-gallon': 3.78541,
            'us-liquid-quart': 0.946353,
            'us-liquid-pint': 0.473176,
            'us-legal-cup': 0.24,
            'us-fluid-ounce': 0.0295735,
            'us-tablespoon': 0.0147868,
            'us-teaspoon': 0.00492892,
            'cubic-meter': 1000,
            'liter': 1,
            'milliliter': 0.001,
            'imperial-gallon': 4.54609,
            'imperial-quart': 1.13652,
            'imperial-pint': 0.568261,
            'imperial-cup': 0.284131,
            'imperial-fluid-ounce': 0.0284131,
            'imperial-tablespoon': 0.0177582,
            'imperial-teaspoon': 0.00591939,
            'cubic-foot': 28.3168,
            'cubic-inch': 0.0163871,
        };

        // This variable tracks which input field is being typed in to allow for two-way conversion.
        let activeInput = inputFrom;

        // --- Core Logic ---
        function convert() {
            const fromUnit = selectFrom.value;
            const toUnit = selectTo.value;
            const fromFactor = conversionFactors[fromUnit];
            const toFactor = conversionFactors[toUnit];

            let sourceValue, result, fromDisplayValue, toDisplayValue;

            // Determine which input field is the source of the conversion
            if (activeInput === inputFrom) {
                sourceValue = parseFloat(inputFrom.value);
                if (isNaN(sourceValue)) {
                    inputTo.value = '';
                    summaryDisplay.textContent = '';
                    return;
                }
                result = (sourceValue * fromFactor) / toFactor;
                inputTo.value = result.toFixed(6);
                fromDisplayValue = sourceValue;
                toDisplayValue = result;
            } else {
                sourceValue = parseFloat(inputTo.value);
                if (isNaN(sourceValue)) {
                    inputFrom.value = '';
                    summaryDisplay.textContent = '';
                    return;
                }
                result = (sourceValue * toFactor) / fromFactor;
                inputFrom.value = result.toFixed(6);
                fromDisplayValue = result;
                toDisplayValue = sourceValue;
            }
            
            // Update the summary text with user-friendly unit names
            const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text;
            const toUnitText = selectTo.options[selectTo.selectedIndex].text;
            summaryDisplay.textContent = `${Number(fromDisplayValue).toPrecision(6)} ${fromUnitText} = ${Number(toDisplayValue).toPrecision(6)} ${toUnitText}`;
        }
        
        function reset() {
            inputFrom.value = '1';
            selectFrom.value = 'us-liquid-gallon';
            selectTo.value = 'liter';
            // On reset, always calculate from left to right.
            activeInput = inputFrom; 
            convert();
        }

        // --- Event Listeners ---
        // Listen for typing in the number inputs
        inputFrom.addEventListener('input', (e) => {
            activeInput = e.target;
            convert();
        });
        inputTo.addEventListener('input', (e) => {
            activeInput = e.target;
            convert();
        });

        // Listen for changes in the unit selection dropdowns
        selectFrom.addEventListener('change', () => {
             // When a dropdown is changed, default to calculating left-to-right.
            activeInput = inputFrom;
            convert();
        });
        selectTo.addEventListener('change', () => {
            // When a dropdown is changed, default to calculating left-to-right.
            activeInput = inputFrom;
            convert();
        });
        
        resetButton.addEventListener('click', reset);

        // --- Initial State ---
        // Perform an initial conversion when the page loads
        reset();
    });