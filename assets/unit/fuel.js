    document.addEventListener('DOMContentLoaded', function () {
        const selectFrom = document.getElementById('select-from');
        const inputFrom = document.getElementById('input-from');
        const selectTo = document.getElementById('select-to');
        const inputTo = document.getElementById('input-to');
        const summaryDisplay = document.getElementById('summary-display');
        const resetButton = document.getElementById('reset-button');
        
        let isUpdating = false; // Flag to prevent event feedback loops

        const CONVERSION_FACTORS_TO_KML = {
            'mile-per-us-gallon': 0.425144,
            'mile-per-gallon': 0.354006,
            'kilometer-per-liter': 1,
        };

        function formatNumber(num) {
            if (!isFinite(num) || isNaN(num) || num === null) return '';
            if (num === 0) return '0';
            // Use toPrecision for significant figures and parseFloat to remove trailing zeros
            return parseFloat(num.toPrecision(6));
        }

        function calculate(value, fromUnit, toUnit) {
            if (isNaN(value) || value === null) return null;
            
            // Convert input to the base unit (Kilometer per Liter)
            let valueInKML;
            if (fromUnit === 'litre-per-100-kilometres') {
                valueInKML = value === 0 ? Infinity : 100 / value;
            } else {
                valueInKML = value * CONVERSION_FACTORS_TO_KML[fromUnit];
            }

            // Convert from the base unit to the target unit
            let result;
            if (toUnit === 'litre-per-100-kilometres') {
                result = valueInKML === 0 ? Infinity : 100 / valueInKML;
            } else {
                result = valueInKML / CONVERSION_FACTORS_TO_KML[toUnit];
            }
            
            return result;
        }

        function updateSummary() {
            const fromValue = parseFloat(inputFrom.value) || 0;
            const toValue = parseFloat(inputTo.value) || 0;
            const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text.split(' (')[0].trim();
            const toUnitText = selectTo.options[selectTo.selectedIndex].text.split(' (')[0].trim();
            
            summaryDisplay.textContent = `${formatNumber(fromValue)} ${fromUnitText} = ${formatNumber(toValue)} ${toUnitText}`;
        }
        
        function update(source) {
            if (isUpdating) return; // Prevent recursive updates

            const sourceIsFrom = source === inputFrom;
            const sourceInput = sourceIsFrom ? inputFrom : inputTo;
            const targetInput = sourceIsFrom ? inputTo : inputFrom;
            const sourceSelect = sourceIsFrom ? selectFrom : selectTo;
            const targetSelect = sourceIsFrom ? selectTo : selectFrom;

            const sourceValue = parseFloat(sourceInput.value);
            const result = calculate(sourceValue, sourceSelect.value, targetSelect.value);

            isUpdating = true;
            targetInput.value = formatNumber(result);
            isUpdating = false;

            updateSummary();
        }

        function reset() {
            isUpdating = true;
            inputFrom.value = '1';
            selectFrom.selectedIndex = 0;
            selectTo.selectedIndex = 1;
            isUpdating = false;
            update(inputFrom); // Trigger a calculation based on the 'from' input
        }

        // Attach event listeners
        inputFrom.addEventListener('input', () => update(inputFrom));
        selectFrom.addEventListener('change', () => update(inputFrom));
        inputTo.addEventListener('input', () => update(inputTo));
        selectTo.addEventListener('change', () => update(inputFrom));
        resetButton.addEventListener('click', reset);
        
        // Perform initial conversion on page load
        update(inputFrom);
    });