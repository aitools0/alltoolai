    document.addEventListener('DOMContentLoaded', () => {

        const formatNumber = (num) => parseFloat(num.toPrecision(15));

        // --- Calculation Logic Functions ---
        const calculations = {
            calc1: (card) => {
                const p = card.querySelector('#c1-percent'), n = card.querySelector('#c1-num');
                const [err, resEl] = validateAndGetResultEl(card, [p, n]); if (err) return displayResult(resEl, err, false);
                const result = (parseFloat(p.value) / 100) * parseFloat(n.value);
                displayResult(resEl, `<span class="highlight">${formatNumber(result)}</span> is ${p.value}% of ${n.value}.`, true);
            },
            calc2: (card) => {
                const x = card.querySelector('#c2-num-x'), y = card.querySelector('#c2-num-y');
                const [err, resEl] = validateAndGetResultEl(card, [x, y]); if (err) return displayResult(resEl, err, false);
                const yVal = parseFloat(y.value); if (yVal === 0) return displayResult(resEl, 'Total Value (Y) cannot be zero.', false);
                const result = (parseFloat(x.value) / yVal) * 100;
                displayResult(resEl, `${x.value} is <span class="highlight">${formatNumber(result)}%</span> of ${y.value}.`, true);
            },
            calc3: (card) => {
                const v1 = card.querySelector('#c3-val1'), v2 = card.querySelector('#c3-val2');
                const [err, resEl] = validateAndGetResultEl(card, [v1, v2]); if (err) return displayResult(resEl, err, false);
                const v1Val = parseFloat(v1.value); if (v1Val === 0) return displayResult(resEl, 'Initial Value cannot be zero.', false);
                const change = ((parseFloat(v2.value) - v1Val) / Math.abs(v1Val)) * 100;
                displayResult(resEl, `A <span class="highlight">${formatNumber(Math.abs(change))}%</span> ${change >= 0 ? 'increase' : 'decrease'}.`, true);
            },
            calc4: (card) => {
                const v = card.querySelector('#c4-val'), p = card.querySelector('#c4-percent'), o = card.querySelector('#c4-op');
                const [err, resEl] = validateAndGetResultEl(card, [v, p]); if (err) return displayResult(resEl, err, false);
                const vVal = parseFloat(v.value), pVal = parseFloat(p.value);
                const result = o.value === 'increase' ? vVal * (1 + pVal / 100) : vVal * (1 - pVal / 100);
                displayResult(resEl, `The new value is <span class="highlight">${formatNumber(result)}</span>.`, true);
            },
            calc5: (card) => {
                const fv = card.querySelector('#c5-final-val'), p = card.querySelector('#c5-percent'), o = card.querySelector('#c5-op');
                const [err, resEl] = validateAndGetResultEl(card, [fv, p]); if (err) return displayResult(resEl, err, false);
                const fvVal = parseFloat(fv.value), pVal = parseFloat(p.value);
                let result;
                if (o.value === 'increase') {
                    if (pVal <= -100) return displayResult(resEl, 'Increase must be > -100%.', false);
                    result = fvVal / (1 + pVal / 100);
                } else {
                    if (pVal >= 100) return displayResult(resEl, 'Decrease must be < 100%.', false);
                    result = fvVal / (1 - pVal / 100);
                }
                displayResult(resEl, `The original value was <span class="highlight">${formatNumber(result)}</span>.`, true);
            }
        };

        // --- Helper Functions ---
        function validateAndGetResultEl(card, inputs) {
            for (const input of inputs) {
                if (input.value.trim() === '') return [`${card.querySelector(`label[for="${input.id}"]`).textContent} is required.`, card.querySelector('.results-area')];
                if (isNaN(parseFloat(input.value))) return [`${card.querySelector(`label[for="${input.id}"]`).textContent} must be a valid number.`, card.querySelector('.results-area')];
            }
            return [null, card.querySelector('.results-area')];
        }

        function displayResult(element, message, isSuccess) {
            element.innerHTML = `<span class="results-message">${message}</span>`;
            element.classList.remove('success', 'error');
            if (isSuccess === true) element.classList.add('success');
            else if (isSuccess === false) element.classList.add('error');
        }
        
        // --- Event Listener Setup ---
        document.querySelectorAll('section[id^="calc"]').forEach(card => {
            const calcButton = card.querySelector('.calculate');
            const resetButton = card.querySelector('.reset');
            const inputs = card.querySelectorAll('input');

            if(calcButton) {
                calcButton.addEventListener('click', () => {
                    if (calculations[card.id]) {
                        calculations[card.id](card);
                    }
                });
            }

            if(resetButton) {
                resetButton.addEventListener('click', () => {
                    card.querySelectorAll('input').forEach(input => input.value = '');
                    card.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
                    displayResult(card.querySelector('.results-area'), 'Result appears here.', null);
                });
            }

            inputs.forEach(input => {
                input.addEventListener('keydown', (e) => {
                    if(e.key === 'Enter') {
                        e.preventDefault();
                        if (calculations[card.id]) {
                            calculations[card.id](card);
                        }
                    }
                });
            });
        });
    });