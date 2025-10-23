    document.addEventListener('DOMContentLoaded', () => {
        // Get references to all interactive elements
        const inputFrom = document.getElementById('input-from');
        const selectFrom = document.getElementById('select-from');
        const inputTo = document.getElementById('input-to');
        const selectTo = document.getElementById('select-to');
        const resetButton = document.getElementById('reset-button');
        const summaryDisplay = document.getElementById('summary-display');

        // Define conversion factors relative to a base unit (meter)
        const conversionFactors = {
            'kilometre': 1000,
            'metre': 1,
            'centimetre': 0.01,
            'millimetre': 0.001,
            'micrometre': 1e-6,
            'nanometre': 1e-9,
            'mile': 1609.34,
            'yard': 0.9144,
            'foot': 0.3048,
            'inch': 0.0254,
            'nautical-mile': 1852
        };

        let isUpdating = false; // Flag to prevent infinite conversion loops

        // Function to round numbers to a reasonable precision
        const round = (num) => {
            if (num === 0) return 0;
            return Math.abs(num) < 1e-6 ? parseFloat(num.toExponential(6)) : parseFloat(num.toFixed(6));
        }

        /**
         * Updates the summary text display.
         */
        function updateSummary(fromValue, toValue) {
            const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text;
            const toUnitText = selectTo.options[selectTo.selectedIndex].text;
            summaryDisplay.textContent = `${fromValue} ${fromUnitText} = ${toValue} ${toUnitText}`;
        }

        // Main conversion logic from left ('From') to right ('To')
        const convertFrom = () => {
            if (isUpdating) return;
            isUpdating = true;

            const fromValue = parseFloat(inputFrom.value);
            const fromUnit = selectFrom.value;
            const toUnit = selectTo.value;

            if (!isNaN(fromValue) && fromValue >= 0) {
                const valueInMeters = fromValue * conversionFactors[fromUnit];
                const result = valueInMeters / conversionFactors[toUnit];
                const roundedResult = round(result);
                inputTo.value = roundedResult;
                updateSummary(fromValue, roundedResult);
            } else {
                inputTo.value = '';
                summaryDisplay.textContent = '';
            }
            isUpdating = false;
        };

        // Main conversion logic from right ('To') to left ('From')
        const convertTo = () => {
            if (isUpdating) return;
            isUpdating = true;

            const toValue = parseFloat(inputTo.value);
            const fromUnit = selectFrom.value;
            const toUnit = selectTo.value;

            if (!isNaN(toValue) && toValue >= 0) {
                const valueInMeters = toValue * conversionFactors[toUnit];
                const result = valueInMeters / conversionFactors[fromUnit];
                const roundedResult = round(result);
                inputFrom.value = roundedResult;
                updateSummary(roundedResult, toValue);
            } else {
                inputFrom.value = '';
                summaryDisplay.textContent = '';
            }
            isUpdating = false;
        };
        
        // Reset function to clear inputs and set to default
        const resetConverter = () => {
            isUpdating = true; // Prevent updates while resetting
            selectFrom.value = 'foot';
            selectTo.value = 'inch';
            inputFrom.value = '1';
            isUpdating = false; // Allow update after reset
            convertFrom(); // Recalculate based on default values
            inputFrom.focus();
        };

        // Add event listeners to all inputs and selects
        inputFrom.addEventListener('input', convertFrom);
        selectFrom.addEventListener('change', convertFrom);
        inputTo.addEventListener('input', convertTo);
        // CORRECTED: When a user changes the 'To' unit, it should recalculate
        // based on the 'From' value for an intuitive experience.
        selectTo.addEventListener('change', convertFrom);
        resetButton.addEventListener('click', resetConverter);

        // Perform an initial conversion on page load
        convertFrom();
    });