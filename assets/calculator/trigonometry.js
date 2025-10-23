document.addEventListener('DOMContentLoaded', () => {
    const inputValueEl = document.getElementById('input-value');
    const functionSelectEl = document.getElementById('function-select');
    const calculateBtn = document.getElementById('calculate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultsSection = document.getElementById('results');
    const resultValueEl = document.getElementById('result-value');
    const resultUnitEl = document.getElementById('result-unit');
    const errorMessageEl = document.getElementById('error-message');
    const piBtn = document.getElementById('pi-btn');
    const eBtn = document.getElementById('e-btn');

    let debounceTimer;

    const debounce = (func, delay) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    };

    const FUNC_TYPES = {
        isTrig: f => ['sin', 'cos', 'tan', 'csc', 'sec', 'cot'].includes(f),
        isInverse: f => ['asin', 'acos', 'atan', 'acsc', 'asec', 'acot'].includes(f),
    };
    const toRadians = deg => deg * (Math.PI / 180);
    const toDegrees = rad => rad * (180 / Math.PI);
    const PRECISION = 12;

    const showError = (message) => {
        errorMessageEl.firstElementChild.textContent = message;
        errorMessageEl.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    };

    const clearError = () => {
        errorMessageEl.classList.add('hidden');
    };
    
    const displayResult = (value, func, mode) => {
        if (isNaN(value)) {
            showError('Result is undefined.');
            return;
        }

        clearError();
        resultsSection.classList.remove('hidden');


        if (!isFinite(value)) {
            resultValueEl.textContent = 'Undefined (∞)';
            resultUnitEl.textContent = '';
            return;
        }

        let finalValue = value;
        let finalUnit = '';

        if (FUNC_TYPES.isInverse(func)) {
            finalValue = (mode === 'degrees') ? toDegrees(value) : value;
            finalUnit = (mode === 'degrees') ? '°' : 'rad';
        } else if (func === 'degToRad') {
            finalUnit = 'rad';
        } else if (func === 'radToDeg') {
            finalUnit = '°';
        }

        resultValueEl.textContent = parseFloat(finalValue.toPrecision(PRECISION));
        resultUnitEl.textContent = finalUnit;
    };

    const calculate = () => {
        const valStr = inputValueEl.value;
        if (valStr.trim() === '') {
            clearError();
            resultsSection.classList.add('hidden');
            return;
        }

        const val = parseFloat(valStr);
        const func = functionSelectEl.value;
        const mode = document.querySelector('input[name="mode"]:checked').value;

        if (isNaN(val)) {
            showError('Invalid number.');
            return;
        }

        if ((func === 'asin' || func === 'acos') && (val < -1 || val > 1)) return showError('Input must be between -1 and 1.');
        if ((func === 'asec' || func === 'acsc') && (val > -1 && val < 1)) return showError('Input must be |x| ≥ 1.');
        if (func === 'acosh' && val < 1) return showError('Input must be ≥ 1.');
        if (func === 'atanh' && (val <= -1 || val >= 1)) return showError('Input must be between -1 and 1.');
        
        clearError();
        let result = 0;
        let inputForCalc = FUNC_TYPES.isTrig(func) && mode === 'degrees' ? toRadians(val) : val;
        
        const sin = Math.sin(inputForCalc);
        const cos = Math.cos(inputForCalc);
        const Epsilon = 1e-15;

        switch (func) {
            case 'sin': result = sin; break;
            case 'cos': result = cos; break;
            case 'tan': result = Math.abs(cos) < Epsilon ? Infinity : sin / cos; break;
            case 'csc': result = Math.abs(sin) < Epsilon ? Infinity : 1 / sin; break;
            case 'sec': result = Math.abs(cos) < Epsilon ? Infinity : 1 / cos; break;
            case 'cot': result = Math.abs(sin) < Epsilon ? Infinity : cos / sin; break;
            case 'asin': result = Math.asin(val); break;
            case 'acos': result = Math.acos(val); break;
            case 'atan': result = Math.atan(val); break;
            case 'acsc': result = Math.asin(1 / val); break;
            case 'asec': result = Math.acos(1 / val); break;
            case 'acot': result = Math.atan(1 / val); break;
            case 'sinh': result = Math.sinh(val); break;
            case 'cosh': result = Math.cosh(val); break;
            case 'tanh': result = Math.tanh(val); break;
            case 'asinh': result = Math.asinh(val); break;
            case 'acosh': result = Math.acosh(val); break;
            case 'atanh': result = Math.atanh(val); break;
            case 'degToRad': result = toRadians(val); break;
            case 'radToDeg': result = toDegrees(val); break;
        }

        displayResult(result, func, mode);
    };

    const updatePlaceholder = () => {
        const func = functionSelectEl.value;
        const mode = document.querySelector('input[name="mode"]:checked').value;
        if (FUNC_TYPES.isTrig(func)) {
            inputValueEl.placeholder = `Enter angle in ${mode}...`;
        } else if (func.startsWith('a') || func.endsWith('ToRad') || func.endsWith('ToDeg')) {
            inputValueEl.placeholder = 'Enter a value or ratio...';
        } else {
            inputValueEl.placeholder = 'Enter a value...';
        }
    };
    
    const clearAll = () => {
        inputValueEl.value = '';
        resultsSection.classList.add('hidden');
        clearError();
        functionSelectEl.value = 'sin';
        document.getElementById('degrees').checked = true;
        updatePlaceholder();
    };
    
    // Event Listeners
    piBtn.addEventListener('click', () => {
        inputValueEl.value = Math.PI;
        calculate();
    });

    eBtn.addEventListener('click', () => {
        inputValueEl.value = Math.E;
        calculate();
    });

    calculateBtn.addEventListener('click', calculate);
    clearBtn.addEventListener('click', clearAll);
    inputValueEl.addEventListener('input', () => debounce(calculate, 300));
    functionSelectEl.addEventListener('change', () => { updatePlaceholder(); calculate(); });
    document.querySelectorAll('input[name="mode"]').forEach(radio => radio.addEventListener('change', () => { updatePlaceholder(); calculate(); }));
    
    // Initial state
    updatePlaceholder();
});