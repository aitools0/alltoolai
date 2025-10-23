    document.addEventListener('DOMContentLoaded', () => {
        // --- Element References ---
        const inputFrom = document.getElementById('input-from');
        const selectFrom = document.getElementById('select-from');
        const inputTo = document.getElementById('input-to');
        const selectTo = document.getElementById('select-to');
        const summaryDisplay = document.getElementById('summary-display');
        const resetButton = document.getElementById('reset-button');

        // --- State and Constants ---
        // Conversion factors to radians (our base unit)
        const factors = {
            arcsecond: Math.PI / 648000,
            degree: Math.PI / 180,
            gradian: Math.PI / 200,
            milliradian: 0.001,
            'minute-of-arc': Math.PI / 10800,
            radian: 1,
        };

        // Prevents recursive event firing which causes lagging
        let isUpdating = false;

        // --- Core Logic ---
        function calculateConversion(sourceInput, sourceSelect, targetInput, targetSelect) {
            if (isUpdating) return; // Prevent infinite loops
            
            isUpdating = true; // Set lock to prevent re-triggering
            
            const sourceValue = parseFloat(sourceInput.value);
            
            if (isNaN(sourceValue)) {
                targetInput.value = ''; // Clear target if source is not a number
            } else {
                const sourceUnit = sourceSelect.value;
                const targetUnit = targetSelect.value;
                const valueInRadians = sourceValue * factors[sourceUnit];
                const result = valueInRadians / factors[targetUnit];
                targetInput.value = parseFloat(result.toPrecision(12)); // Use toPrecision for better accuracy
            }
            
            updateSummary();
            isUpdating = false; // Release lock
        }

        function updateSummary() {
            const fromValue = parseFloat(inputFrom.value);
            const toValue = parseFloat(inputTo.value);
            
            if (!isNaN(fromValue) && !isNaN(toValue)) {
                 const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text.split(' ')[0];
                 const toUnitText = selectTo.options[selectTo.selectedIndex].text.split(' ')[0];
                 summaryDisplay.textContent = `${fromValue} ${fromUnitText} = ${toValue} ${toUnitText}`;
            } else {
                summaryDisplay.textContent = '';
            }
        }
        
        function resetConverter() {
            inputFrom.value = '1';
            selectFrom.value = 'radian';
            selectTo.value = 'degree';
            calculateConversion(inputFrom, selectFrom, inputTo, selectTo);
        }

        // --- Event Listeners ---
        inputFrom.addEventListener('input', () => calculateConversion(inputFrom, selectFrom, inputTo, selectTo));
        selectFrom.addEventListener('change', () => calculateConversion(inputFrom, selectFrom, inputTo, selectTo));
        
        inputTo.addEventListener('input', () => calculateConversion(inputTo, selectTo, inputFrom, selectFrom));
        selectTo.addEventListener('change', () => calculateConversion(inputFrom, selectFrom, inputTo, selectTo));

        resetButton.addEventListener('click', resetConverter);
        
        // --- Initial State ---
        // Set initial conversion on page load for a better user experience
        resetConverter(); 
    });