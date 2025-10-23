    document.addEventListener('DOMContentLoaded', () => {
        // --- DOM Elements ---
        const inputFrom = document.getElementById('input-from');
        const selectFrom = document.getElementById('select-from');
        const inputTo = document.getElementById('input-to');
        const selectTo = document.getElementById('select-to');
        const summaryDisplay = document.getElementById('summary-display');
        const resetButton = document.getElementById('reset-button');

        // --- Conversion Factors (base unit: seconds) ---
        const factors = {
            'nanosecond': 1e-9, 'microsecond': 1e-6, 'millisecond': 0.001, 'second': 1,
            'minute': 60, 'hour': 3600, 'day': 86400, 'week': 604800,
            'month': 2629800, 'calendar-year': 31557600, 'decade': 315576000, 'century': 3155760000,
        };
        
        // --- State flag to prevent calculation loops ---
        let isUpdating = false;

        // --- Generic calculation function ---
        function updateConversion(direction) {
            if (isUpdating) return; // Prevent recursive calls
            isUpdating = true;

            const sourceInput = (direction === 'from') ? inputFrom : inputTo;
            const sourceSelect = (direction === 'from') ? selectFrom : selectTo;
            const targetInput = (direction === 'from') ? inputTo : inputFrom;
            const targetSelect = (direction === 'from') ? selectTo : selectFrom;

            const sourceValue = parseFloat(sourceInput.value);

            if (isNaN(sourceValue) || sourceValue < 0) {
                targetInput.value = '';
                summaryDisplay.textContent = '';
                isUpdating = false;
                return;
            }

            const valueInSeconds = sourceValue * factors[sourceSelect.value];
            const result = valueInSeconds / factors[targetSelect.value];
            
            // Format number for display (scientific notation for small numbers)
            const formattedResult = (result < 1e-6 && result > 0) 
                ? result.toExponential(4) 
                : parseFloat(result.toPrecision(10));

            targetInput.value = formattedResult;
            
            // Update summary text
            const fromText = `${inputFrom.value} ${selectFrom.options[selectFrom.selectedIndex].text}`;
            const toText = `${inputTo.value} ${selectTo.options[selectTo.selectedIndex].text}`;
            summaryDisplay.textContent = `${fromText} = ${toText}`;
            
            isUpdating = false;
        }
        
        // --- Reset function ---
        function resetConverter() {
            inputFrom.value = '1';
            selectFrom.value = 'second';
            selectTo.value = 'minute';
            updateConversion('from');
        }

        // --- Event Listeners ---
        inputFrom.addEventListener('input', () => updateConversion('from'));
        selectFrom.addEventListener('change', () => updateConversion('from'));
        
        inputTo.addEventListener('input', () => updateConversion('to'));
        selectTo.addEventListener('change', () => updateConversion('from')); // Always convert from left on dropdown change for consistency

        resetButton.addEventListener('click', resetConverter);
        
        // --- Initial conversion on page load ---
        resetConverter();
    });