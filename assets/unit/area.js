document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECT DOM ELEMENTS
    const inputFrom = document.getElementById('input-from');
    const selectFrom = document.getElementById('select-from');
    const inputTo = document.getElementById('input-to');
    const selectTo = document.getElementById('select-to');
    const summaryDisplay = document.getElementById('summary-display');
    const resetButton = document.getElementById('reset-button');

    // 2. CONVERSION FACTORS (All values are their equivalent in Square Metres)
    const conversionFactors = {
        'square-kilometre': 1_000_000,
        'square-metre': 1,
        'square-mile': 2_589_988.11,
        'square-yard': 0.836127,
        'square-foot': 0.092903,
        'square-inch': 0.00064516,
        'hectare': 10_000,
        'acre': 4046.86,
    };

    // 3. CORE CONVERSION FUNCTIONS
    // Calculates result in the "to" field based on the "from" field.
    function convertFromTo() {
        const fromValue = parseFloat(inputFrom.value);
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;

        if (isNaN(fromValue) || fromValue < 0) {
            inputTo.value = '';
            summaryDisplay.textContent = '';
            return;
        }

        const valueInSquareMetres = fromValue * conversionFactors[fromUnit];
        const result = valueInSquareMetres / conversionFactors[toUnit];
        inputTo.value = parseFloat(result.toPrecision(10));
        
        updateSummary();
    }

    // Calculates result in the "from" field based on the "to" field.
    function convertToFrom() {
        const toValue = parseFloat(inputTo.value);
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;
        
        if (isNaN(toValue) || toValue < 0) {
            inputFrom.value = '';
            summaryDisplay.textContent = '';
            return;
        }

        const valueInSquareMetres = toValue * conversionFactors[toUnit];
        const result = valueInSquareMetres / conversionFactors[fromUnit];
        inputFrom.value = parseFloat(result.toPrecision(10));

        updateSummary();
    }

    // 4. UPDATE SUMMARY FUNCTION
    function updateSummary() {
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;
        const singleUnitInSquareMetres = 1 * conversionFactors[fromUnit];
        const singleUnitResult = singleUnitInSquareMetres / conversionFactors[toUnit];
        const formattedSingleUnitResult = parseFloat(singleUnitResult.toPrecision(6));
        const fromUnitText = selectFrom.options[selectFrom.selectedIndex].text.split(' (')[0];
        const toUnitText = selectTo.options[selectTo.selectedIndex].text.split(' (')[0];
        summaryDisplay.textContent = `1 ${fromUnitText} = ${formattedSingleUnitResult} ${toUnitText}`;
    }

    // 5. RESET FUNCTION
    function resetConverter() {
        inputFrom.value = '1';
        selectFrom.value = 'square-kilometre'; 
        selectTo.value = 'square-metre';
        convertFromTo();
    }

    // 6. ATTACH EVENT LISTENERS (Robust and predictable logic)
    inputFrom.addEventListener('input', convertFromTo);
    inputTo.addEventListener('input', convertToFrom);

    // When units are changed, always recalculate based on the 'from' input for intuitive results.
    selectFrom.addEventListener('change', convertFromTo);
    selectTo.addEventListener('change', convertFromTo);
    
    resetButton.addEventListener('click', resetConverter);

    // 7. INITIAL CONVERSION ON PAGE LOAD
    convertFromTo();
});