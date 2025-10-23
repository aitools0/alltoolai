    document.addEventListener('DOMContentLoaded', () => {
        // --- DOM Elements ---
        const selectFrom = document.getElementById('select-from');
        const selectTo = document.getElementById('select-to');
        const inputFrom = document.getElementById('input-from');
        const inputTo = document.getElementById('input-to');
        const summaryDisplay = document.getElementById('summary-display');
        const resetButton = document.getElementById('reset-button');

        // --- Constants ---
        const conversionFactors = {
            'bar': 100000,
            'pascal': 1,
            'pound-per-square-inch': 6894.757,
            'standard-atmosphere': 101325,
            'torr': 133.322
        };

        // --- Core Functions ---

        /**
         * Centralized calculation function.
         * @param {number} value - The input value to convert.
         * @param {string} fromUnit - The starting unit.
         * @param {string} toUnit - The target unit.
         * @returns {number|null} The converted value or null if input is invalid.
         */
        function calculate(value, fromUnit, toUnit) {
            if (isNaN(value) || !fromUnit || !toUnit) {
                return null;
            }
            const valueInPascals = value * conversionFactors[fromUnit];
            return valueInPascals / conversionFactors[toUnit];
        }

        /**
         * Updates the summary text based on current input values.
         */
        function updateSummary() {
            const fromValue = parseFloat(inputFrom.value);
            const toValue = parseFloat(inputTo.value);

            if (isNaN(fromValue) || isNaN(toValue)) {
                summaryDisplay.textContent = '';
                return;
            }

            const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text;
            const toUnitText = selectTo.options[selectTo.selectedIndex].text;
            summaryDisplay.textContent = `${fromValue} ${fromUnitText} = ${toValue.toFixed(6)} ${toUnitText}`;
        }

        /**
         * Calculates and updates the 'to' input field based on the 'from' field.
         */
        function convertFromTo() {
            const fromValue = parseFloat(inputFrom.value);
            const result = calculate(fromValue, selectFrom.value, selectTo.value);
            
            inputTo.value = (result === null) ? '' : result.toFixed(6);
            updateSummary();
        }
        
        /**
         * Calculates and updates the 'from' input field based on the 'to' field.
         */
        function convertToFrom() {
            const toValue = parseFloat(inputTo.value);
            const result = calculate(toValue, selectTo.value, selectFrom.value);
            
            inputFrom.value = (result === null) ? '' : result.toFixed(6);
            updateSummary();
        }

        /**
         * Resets the converter to its default state.
         */
        function resetConverter() {
            inputFrom.value = '1';
            selectFrom.value = 'bar';
            selectTo.value = 'pascal';
            convertFromTo();
        }

        // --- Event Listeners ---
        inputFrom.addEventListener('input', convertFromTo);
        selectFrom.addEventListener('change', convertFromTo);
        selectTo.addEventListener('change', convertFromTo);
        
        inputTo.addEventListener('input', convertToFrom);

        resetButton.addEventListener('click', resetConverter);

        // --- Initial State ---
        resetConverter();
    });