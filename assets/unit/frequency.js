document.addEventListener('DOMContentLoaded', () => {

    const inputFrom = document.getElementById('input-from');
    const selectFrom = document.getElementById('select-from');
    const inputTo = document.getElementById('input-to');
    const selectTo = document.getElementById('select-to');
    const summaryDisplay = document.getElementById('summary-display');
    const resetButton = document.getElementById('reset-button');

    const conversionFactors = {
        'hertz': 1,
        'kilohertz': 1e3,
        'megahertz': 1e6,
        'gigahertz': 1e9
    };

    /**
     * Converts from the LEFT input to the RIGHT input.
     */
    function convertFromLeft() {
        const fromValue = parseFloat(inputFrom.value);
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;

        if (isNaN(fromValue)) {
            inputTo.value = '';
            summaryDisplay.textContent = '';
            return;
        }

        const valueInHertz = fromValue * conversionFactors[fromUnit];
        const result = valueInHertz / conversionFactors[toUnit];
        const finalResult = Number(result.toPrecision(15));
        inputTo.value = finalResult;
        updateSummary(fromValue, finalResult);
    }

    /**
     * Converts from the RIGHT input to the LEFT input.
     */
    function convertFromRight() {
        const toValue = parseFloat(inputTo.value);
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;

        if (isNaN(toValue)) {
            inputFrom.value = '';
            summaryDisplay.textContent = '';
            return;
        }

        const valueInHertz = toValue * conversionFactors[toUnit];
        const result = valueInHertz / conversionFactors[fromUnit];
        const finalResult = Number(result.toPrecision(15));
        inputFrom.value = finalResult;
        updateSummary(finalResult, toValue);
    }
    
    /**
     * Updates the summary text display.
     */
    function updateSummary(fromValue, toValue) {
        const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text;
        const toUnitText = selectTo.options[selectTo.selectedIndex].text;
        summaryDisplay.textContent = `${fromValue} ${fromUnitText} = ${toValue} ${toUnitText}`;
    }

    /**
     * Resets the converter to its default state.
     */
    function resetConverter() {
        inputFrom.value = '1';
        selectFrom.value = 'hertz';
        selectTo.value = 'kilohertz';
        convertFromLeft();
    }

    // --- EVENT LISTENERS ---
    inputFrom.addEventListener('input', convertFromLeft);
    inputTo.addEventListener('input', convertFromRight);

    selectFrom.addEventListener('change', convertFromLeft);
    selectTo.addEventListener('change', convertFromLeft);

    resetButton.addEventListener('click', resetConverter);

    // --- INITIALIZATION ---
    convertFromLeft();
});