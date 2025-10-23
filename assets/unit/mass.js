    document.addEventListener('DOMContentLoaded', () => {
        const inputFrom = document.getElementById('input-from');
        const selectFrom = document.getElementById('select-from');
        const inputTo = document.getElementById('input-to');
        const selectTo = document.getElementById('select-to');
        const summaryDisplay = document.getElementById('summary-display');
        const resetButton = document.getElementById('reset-button');

        const conversionFactors = {
            'tonne': 1000,
            'kilogram': 1,
            'gram': 0.001,
            'milligram': 1e-6,
            'microgram': 1e-9,
            'imperial-ton': 1016.05,
            'us-ton': 907.185,
            'stone': 6.35029,
            'pound': 0.453592,
            'ounce': 0.0283495
        };

        function calculate(sourceInput, sourceSelect, targetInput, targetSelect) {
            const sourceValue = parseFloat(sourceInput.value);
            const sourceUnit = sourceSelect.value;
            const targetUnit = targetSelect.value;

            if (isNaN(sourceValue)) {
                targetInput.value = '';
                summaryDisplay.textContent = '';
                return;
            }

            const valueInKg = sourceValue * conversionFactors[sourceUnit];
            const result = valueInKg / conversionFactors[targetUnit];
            
            // Use toPrecision to avoid floating point issues and keep the result clean
            targetInput.value = parseFloat(result.toPrecision(12));

            updateSummary();
        }

        function updateSummary() {
            const fromValue = parseFloat(inputFrom.value);
            const toValue = parseFloat(inputTo.value);

            if (isNaN(fromValue) || isNaN(toValue)) {
                summaryDisplay.textContent = '';
                return;
            }
            
            // Get the full text of the selected option (e.g., "Kilogram (kg)")
            const fromUnitText = selectFrom.selectedOptions[0].textContent;
            const toUnitText = selectTo.selectedOptions[0].textContent;
            
            summaryDisplay.textContent = `${fromValue.toLocaleString()} ${fromUnitText} = ${toValue.toLocaleString()} ${toUnitText}`;
        }
        
        // --- Event Listeners ---
        
        inputFrom.addEventListener('input', () => calculate(inputFrom, selectFrom, inputTo, selectTo));
        inputTo.addEventListener('input', () => calculate(inputTo, selectTo, inputFrom, selectFrom));
        
        selectFrom.addEventListener('change', () => calculate(inputFrom, selectFrom, inputTo, selectTo));
        selectTo.addEventListener('change', () => calculate(inputFrom, selectFrom, inputTo, selectTo));

        resetButton.addEventListener('click', () => {
            inputFrom.value = '1';
            selectFrom.value = 'tonne';
            selectTo.value = 'kilogram';
            calculate(inputFrom, selectFrom, inputTo, selectTo);
        });

        // Initial conversion on page load to populate the fields
        calculate(inputFrom, selectFrom, inputTo, selectTo);
    });