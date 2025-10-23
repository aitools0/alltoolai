document.addEventListener('DOMContentLoaded', () => {
    // 1. Get references to all necessary DOM elements
    const inputFrom = document.getElementById('input-from');
    const selectFrom = document.getElementById('select-from');
    const inputTo = document.getElementById('input-to');
    const selectTo = document.getElementById('select-to');
    const summaryDisplay = document.getElementById('summary-display');
    const resetButton = document.getElementById('reset-button');

    // 2. Define conversion factors. The base unit is 'bit' for all calculations.
    const BITS_IN_BYTE = 8;
    const KILO = 1000; // Decimal prefix
    const KIBI = 1024; // Binary prefix

    const CONVERSION_FACTORS_IN_BITS = {
        bit: 1,
        kilobit: KILO,
        kibibit: KIBI,
        megabit: KILO ** 2,
        mebibit: KIBI ** 2,
        gigabit: KILO ** 3,
        gibibit: KIBI ** 3,
        terabit: KILO ** 4,
        tebibit: KIBI ** 4,
        petabit: KILO ** 5,
        pebibit: KIBI ** 5,
        byte: BITS_IN_BYTE,
        kilobyte: BITS_IN_BYTE * KILO,
        kibibyte: BITS_IN_BYTE * KIBI,
        megabyte: BITS_IN_BYTE * (KILO ** 2),
        mebibyte: BITS_IN_BYTE * (KIBI ** 2),
        gigabyte: BITS_IN_BYTE * (KILO ** 3),
        gibibyte: BITS_IN_BYTE * (KIBI ** 3),
        terabyte: BITS_IN_BYTE * (KILO ** 4),
        tebibyte: BITS_IN_BYTE * (KIBI ** 4),
    };

    // 3. Function to perform conversion from the 'From' input to the 'To' input
    function convertFromTo() {
        const fromValue = parseFloat(inputFrom.value);
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;

        if (isNaN(fromValue) || fromValue < 0) {
            inputTo.value = '';
            summaryDisplay.textContent = '';
            return;
        }

        const fromFactor = CONVERSION_FACTORS_IN_BITS[fromUnit];
        const toFactor = CONVERSION_FACTORS_IN_BITS[toUnit];

        const valueInBits = fromValue * fromFactor;
        const result = valueInBits / toFactor;
        
        const formattedResult = parseFloat(result.toPrecision(15));
        inputTo.value = formattedResult;
        
        updateSummary(fromValue, fromUnit, formattedResult, toUnit);
    }

    // 4. Function to perform conversion from the 'To' input to the 'From' input
    function convertToFrom() {
        const toValue = parseFloat(inputTo.value);
        const fromUnit = selectFrom.value;
        const toUnit = selectTo.value;

        if (isNaN(toValue) || toValue < 0) {
            inputFrom.value = '';
            summaryDisplay.textContent = '';
            return;
        }

        const fromFactor = CONVERSION_FACTORS_IN_BITS[fromUnit];
        const toFactor = CONVERSION_FACTORS_IN_BITS[toUnit];

        const valueInBits = toValue * toFactor;
        const result = valueInBits / fromFactor;

        const formattedResult = parseFloat(result.toPrecision(15));
        inputFrom.value = formattedResult;
        
        updateSummary(formattedResult, fromUnit, toValue, toUnit);
    }
    
    // 5. Function to update the summary text
    function updateSummary(fromValue, fromUnit, toValue, toUnit) {
        const fromUnitName = selectFrom.options[selectFrom.selectedIndex].text.split(' (')[0];
        const toUnitName = selectTo.options[selectTo.selectedIndex].text.split(' (')[0];

        const formattedFromValue = fromValue.toLocaleString();
        const formattedToValue = toValue.toLocaleString(undefined, { maximumFractionDigits: 10 });

        summaryDisplay.textContent = `${formattedFromValue} ${fromUnitName} = ${formattedToValue} ${toUnitName}`;
    }

    // 6. Function to reset the converter to its default state
    function resetConverter() {
        selectFrom.value = 'megabit';
        inputFrom.value = '100';
        selectTo.value = 'megabyte';
        convertFromTo();
    }
    
    // 7. Attach event listeners
    inputFrom.addEventListener('input', convertFromTo);
    inputTo.addEventListener('input', convertToFrom);

    selectFrom.addEventListener('change', convertFromTo);
    selectTo.addEventListener('change', convertFromTo);
    
    resetButton.addEventListener('click', resetConverter);

    // 8. Perform an initial conversion when the page loads
    convertFromTo();
});