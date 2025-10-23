document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Element Selection ---
    const inputFrom = document.getElementById('input-from');
    const selectFrom = document.getElementById('select-from');
    const inputTo = document.getElementById('input-to');
    const selectTo = document.getElementById('select-to');
    const summaryDisplay = document.getElementById('summary-display');
    const resetButton = document.getElementById('reset-button');
    
    // Flag to prevent recursive event firing, which can cause lagging or errors.
    let isUpdating = false;

    // --- Conversion Factors (Base Unit: Joule) ---
    const CONVERSION_FACTORS = {
        'joule': 1,
        'kilojoule': 1000,
        'gram-calorie': 4.184,
        'kilocalorie': 4184,
        'watt-hour': 3600,
        'kilowatt-hour': 3600000,
        'electronvolt': 1.60218e-19,
        'british-thermal-unit': 1055.06,
        'us-therm': 1.054804e8,
        'foot-pound': 1.35582
    };

    // --- Generic Conversion Function ---
    // This single function handles conversions in both directions to reduce code duplication.
    function calculate(sourceInput, sourceSelect, targetInput, targetSelect) {
        if (isUpdating) return;
        isUpdating = true;

        try {
            const sourceValue = parseFloat(sourceInput.value);
            const sourceUnit = sourceSelect.value;
            const targetUnit = targetSelect.value;

            if (isNaN(sourceValue) || sourceValue < 0) {
                targetInput.value = '';
            } else {
                const valueInJoules = sourceValue * CONVERSION_FACTORS[sourceUnit];
                const result = valueInJoules / CONVERSION_FACTORS[targetUnit];
                
                if (isFinite(result)) {
                    // Use toPrecision to handle floating-point issues and scientific notation gracefully.
                    targetInput.value = parseFloat(result.toPrecision(15));
                } else {
                    targetInput.value = 'Error';
                }
            }
            updateSummary();
        } finally {
            isUpdating = false;
        }
    }

    // --- Summary Update Function ---
    function updateSummary() {
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;
        
        const singleUnitInJoules = CONVERSION_FACTORS[fromUnit];
        const singleUnitResult = singleUnitInJoules / CONVERSION_FACTORS[toUnit];

        if (!isFinite(singleUnitResult)) return;

        const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text.split(' (')[0];
        const toUnitText = selectTo.options[selectTo.selectedIndex].text.split(' (')[0];

        const formattedResult = Number(singleUnitResult.toPrecision(6));
        summaryDisplay.textContent = `1 ${fromUnitText} = ${formattedResult} ${toUnitText}`;
    }

    // --- Reset Function ---
    function resetConverter() {
        inputFrom.value = '1';
        selectFrom.value = 'joule';
        selectTo.value = 'kilojoule';
        // Trigger a calculation from the 'from' field to update the 'to' field.
        calculate(inputFrom, selectFrom, inputTo, selectTo);
    }

    // --- Event Listeners ---
    inputFrom.addEventListener('input', () => calculate(inputFrom, selectFrom, inputTo, selectTo));
    selectFrom.addEventListener('change', () => calculate(inputFrom, selectFrom, inputTo, selectTo));
    
    inputTo.addEventListener('input', () => calculate(inputTo, selectTo, inputFrom, selectFrom));
    selectTo.addEventListener('change', () => calculate(inputFrom, selectFrom, inputTo, selectTo));

    resetButton.addEventListener('click', resetConverter);

    // --- Initial Conversion on Page Load ---
    calculate(inputFrom, selectFrom, inputTo, selectTo);
});