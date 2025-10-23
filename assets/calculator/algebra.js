document.addEventListener('DOMContentLoaded', () => {
    // --- CORE CALCULATOR LOGIC ---
    const calculator = {
        configs: {
            'solve-linear': { ui: 'standard', p: '5x - 3 = 2x + 9' },
            'solve-quadratic': { ui: 'standard', p: '-x^2 + 4x - 3 = 0' },
            'simplify-expression': { ui: 'standard', p: '3x^2 - 5x + 2 - x^2' },
            'expand-expression': { ui: 'standard', p: '(x + 2)(x - 4)' },
            'factor-polynomial': { ui: 'standard', p: 'x^2 - 5x + 6' },
            'simplify-radical': { ui: 'standard', p: 'sqrt(75) or 12' },
            'gcd': { ui: 'standard', p: '48, 18' },
            'lcm': { ui: 'standard', p: '15, 20' },
            'evaluate-expression': { ui: 'multi', l1: 'Expression:', p1: '2x^2 + 3y', l2: 'Variables:', p2: 'x=3, y=-2', op: false },
            'poly-arithmetic': { ui: 'multi', l1: 'Polynomial 1:', p1: '3x^2 - x', l2: 'Polynomial 2:', p2: 'x^2 + 4', op: true, ops: [['add', '+'], ['subtract', '-'], ['multiply', '*']] },
            'poly-division': { ui: 'multi', l1: 'Dividend:', p1: 'x^3 - 2x^2 - 4', l2: 'Divisor:', p2: 'x - 3', op: false }
        },
        calculationRouter(op, ...args) {
            const [i1, i2, polyOp] = args;
            switch (op) {
                case 'simplify-expression':
                    const p = this.parsePoly(i1);
                    return { answer: this.formatPoly(p), explanation: `<strong>Objective:</strong> To simplify the algebraic expression by combining like terms.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Identify Terms:</strong> The expression is broken down into its individual terms.</li><li><strong>Group Like Terms:</strong> Terms with the same variable and exponent are grouped together.</li><li><strong>Combine Coefficients:</strong> The coefficients (numerical parts) of like terms are added or subtracted.</li><li><strong>Final Expression:</strong> The simplified terms are combined to form the final expression.</li></ol>` };
                case 'expand-expression': return this.expandExpression(i1);
                case 'factor-polynomial': return this.factorPolynomial(i1);
                case 'solve-linear': return this.solveLinear(i1);
                case 'solve-quadratic': return this.solveQuadratic(i1);
                case 'simplify-radical': return this.simplifyRadical(i1);
                case 'evaluate-expression': return this.evaluateExpression(i1, i2);
                case 'poly-arithmetic': return this.polynomialArithmetic(i1, i2, polyOp);
                case 'poly-division': return this.polynomialDivision(i1, i2);
                case 'gcd': return this.findGcd(i1);
                case 'lcm': return this.findLcm(i1);
                default: throw new Error("Invalid operation selected.");
            }
        },
        parsePoly(e) { let t = {}; const n = e.replace(/\s/g, '').replace(/\-/g, '+-').match(/[+-]?[^+-]+/g) || []; for (const o of n) { if (!o) continue; const r = o.match(/^([+-]?\d*\.?\d*)([a-zA-Z]?)\^?(\d*)$/); if (!r) throw new Error(`Could not parse term: "${o}"`); let [, i, s, a] = r; i = i === '' || i === '+' ? 1 : i === '-' ? -1 : parseFloat(i); a = a === '' ? s ? 1 : 0 : parseInt(a); t[a] = (t[a] || 0) + i } return t },
        formatPoly(e) { if (Object.keys(e).length === 0) return '0'; let t = Object.entries(e).sort((o, r) => r[0] - o[0]).map(([o, r], i) => { if (r === 0) return ''; let s = Math.abs(r), a = i === 0 ? r < 0 ? '-' : '' : r < 0 ? '- ' : '+ '; o = parseInt(o); let l = o === 0 ? '' : o === 1 ? 'x' : 'x^' + o; let p = s === 1 && o > 0 ? '' : s; return `${a}${p}${l}` }).join(' ').trim(); return t.startsWith('+ ') ? t.substring(2) : t },
        expandExpression(e) { const t = e.split(')(').map((o, r) => r === 0 ? o.substring(1) : r === e.split(')(').length - 1 ? o.substring(0, o.length - 1) : o); if (t.length !== 2) throw new Error('Invalid expression for expansion. Use the format (ax+b)(cx+d).'); const n = t.map(o => this.parsePoly(o)); let o = {}; for (const [r, i] of Object.entries(n[0])) for (const [s, a] of Object.entries(n[1])) { const l = parseInt(r) + parseInt(s); o[l] = (o[l] || 0) + i * a } const r = this.formatPoly(n[0]), i = this.formatPoly(n[1]), s = this.formatPoly(o); return { answer: s, explanation: `<strong>Objective:</strong> To expand the expression <strong>(${r})(${i})</strong> by multiplying the polynomials.<br><br><strong>Method:</strong> The distributive property is applied, often remembered by the mnemonic FOIL (First, Outer, Inner, Last) for binomials.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Multiply First Terms:</strong> The first term of each polynomial is multiplied.</li><li><strong>Multiply Outer Terms:</strong> The outermost terms are multiplied.</li><li><strong>Multiply Inner Terms:</strong> The innermost terms are multiplied.</li><li><strong>Multiply Last Terms:</strong> The last term of each polynomial is multiplied.</li><li><strong>Combine Like Terms:</strong> The resulting terms are summed, and any like terms are combined to yield the final expanded polynomial.</li></ol>` } },
        factorPolynomial(e) { const t = this.parsePoly(e); const n = Object.keys(t).map(o => parseInt(o)).sort((o, r) => r - o); if (n.length > 3 || n[0] !== 2 || n[1] > 1 || n[2] > 0 ) throw new Error('Can only factor quadratic polynomials of the form ax^2+bx+c.'); const a = t[2] || 0, b = t[1] || 0, c = t[0] || 0; const ac = a * c; const s = this.getFactors(ac); for (const [p, q] of s) { if (p + q === b) { const g1 = this.findGcd(`${a}, ${p}`.replace(/,/g, '')); const g2 = this.findGcd(`${c}, ${q}`.replace(/,/g, '')); if ( (a/g1) * g2 === c && (p/g1) * g2 === q) { const f1 = this.formatPoly({ 1: a / g1, 0: p / g1 }); const f2 = this.formatPoly({ 1: g1, 0: g2}); return { answer: `(${f1})(${f2})`, explanation: `<strong>Objective:</strong> To factor the quadratic polynomial <strong>${e}</strong>.<br><br><strong>Method:</strong> For a quadratic in the form <i>ax²+bx+c</i>, we find two integers that multiply to <i>a*c</i> and sum to <i>b</i>.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Identify Coefficients:</strong> For the given polynomial, a=${a}, b=${b}, c=${c}.</li><li><strong>Find Two Numbers:</strong> Find two numbers that multiply to a*c (${ac}) and add to b (${b}). These numbers are <strong>${p}</strong> and <strong>${q}</strong>.</li><li><strong>Rewrite the Polynomial:</strong> The middle term is split using these numbers: <i>${a}x² + ${p}x + ${q}x + ${c}</i>.</li><li><strong>Factor by Grouping:</strong> The expression is factored by grouping the terms, leading to the final factored form.</li></ol>` } } } } throw new Error('Polynomial is not factorable with rational numbers.') },
        solveLinear(e) { const [t, n] = e.split('=').map(o => this.parsePoly(o)); if (!t || !n) throw new Error('Invalid linear equation. Must contain an "=" sign.'); let o = { 1: 0, 0: 0 }; for (const [r, i] of Object.entries(t)) o[r] = (o[r] || 0) + i; for (const [r, i] of Object.entries(n)) o[r] = (o[r] || 0) - i; const r = o[1] || 0, i = o[0] || 0; if (r === 0) throw new Error(i === 0 ? 'Infinite solutions (identity)' : 'No solution (contradiction)'); const s = -i / r; return { answer: `x = ${s}`, explanation: `<strong>Objective:</strong> To solve for the variable <i>x</i> in the linear equation.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Isolate Variable Terms:</strong> All terms containing <i>x</i> are moved to one side of the equation, and all constant terms are moved to the other.<br><i>${t[1] || 0}x - ${n[1] || 0}x = ${n[0] || 0} - ${t[0] || 0}</i></li><li><strong>Combine Like Terms:</strong> Both sides of the equation are simplified by combining like terms.<br><i>${r}x = ${-i}</i></li><li><strong>Solve for x:</strong> Isolate <i>x</i> by dividing both sides by its coefficient (${r}).<br><i>x = ${-i} / ${r}</i></li></ol>` } },
        solveQuadratic(e) { const [t] = e.split('=').map(o => this.parsePoly(o)); const n = t[2] || 0, o = t[1] || 0, r = t[0] || 0; if (n === 0) throw new Error('Not a quadratic equation (a=0).'); const i = o * o - 4 * n * r; let s, a; a = `<strong>Objective:</strong> To find the roots of the quadratic equation <i>ax²+bx+c = 0</i>.<br><br><strong>Method:</strong> The quadratic formula, <i>x = [-b ± sqrt(b²-4ac)] / 2a</i>, is used. The nature of the roots is determined by the discriminant (Δ = b²-4ac).<br><br><strong>Analysis:</strong><ul class='list-disc list-inside space-y-2'><li>The discriminant Δ = b²-4ac is calculated to be <strong>${i.toFixed(4)}</strong>.</li><li>${i < 0 ? 'Since the discriminant is negative, the equation has two complex conjugate roots.' : i === 0 ? 'Since the discriminant is zero, the equation has one real root.' : 'Since the discriminant is positive, the equation has two distinct real roots.'}</li></ul>`; if (i < 0) { const l = Math.sqrt(-i) / (2 * n), p = -o / (2 * n); s = `x = ${p.toFixed(4)} ± ${l.toFixed(4)}i` } else { const l = Math.sqrt(i), p = (-o + l) / (2 * n), c = (-o - l) / (2 * n); s = p === c ? `x = ${p}` : `x = ${p} and x = ${c}` } return { answer: s, explanation: a } },
        simplifyRadical(e) { const t = parseInt(e.replace(/sqrt\(|\)/g, '')); if (isNaN(t) || t < 0) throw new Error('Input must be a non-negative integer or in the form sqrt(n).'); if (t === 0) return { answer: '0', explanation: '' }; let n = 1, o = t; for (let r = Math.floor(Math.sqrt(t)); r > 1; r--) { const i = r * r; if (t % i === 0) { n = r, o = t / i; break } } return { answer: o === 1 ? `${n}` : `${n}√${o}`, explanation: `<strong>Objective:</strong> To simplify the radical expression √${t}.<br><br><strong>Method:</strong> The number under the radical (radicand) is factored to find the largest perfect square divisor.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Find Largest Perfect Square:</strong> The largest perfect square that divides ${t} is <strong>${n * n}</strong>.</li><li><strong>Factor the Radicand:</strong> The original radical is rewritten as √(<strong>${n * n}</strong> × <strong>${o}</strong>).</li><li><strong>Extract the Root:</strong> The square root of the perfect square is moved outside the radical sign. √(${n * n}) becomes <strong>${n}</strong>.</li><li><strong>Final Result:</strong> The simplified form is the product of the extracted root and the remaining radical.</li></ol>` } },
        evaluateExpression(e, t) { const n = t.replace(/\s/g, '').split(',').reduce((r, i) => { const [s, a] = i.split('='); if (!s || !a) throw new Error('Invalid variable format. Use "x=3, y=-2".'); r[s] = parseFloat(a); return r }, {}); let o = e; for (const [r, i] of Object.entries(n)) o = o.replace(new RegExp(r, 'g'), `(${i})`); try { const r = new Function('return ' + o)(); return { answer: r, explanation: `<strong>Objective:</strong> To evaluate the expression with the given variable values.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Substitution:</strong> The given numerical values for the variables are substituted into the expression.<br><i>${e}</i> becomes <i>${o}</i>.</li><li><strong>Calculation:</strong> The resulting arithmetic expression is computed according to the order of operations (PEMDAS/BODMAS) to arrive at the final value.</li></ol>` } } catch (r) { throw new Error('Failed to evaluate the expression. Check syntax.') } },
        polynomialArithmetic(e, t, n) { const o = this.parsePoly(e), r = this.parsePoly(t); let i = {}; if (n === 'add') { for (const [s, a] of Object.entries(o)) i[s] = (i[s] || 0) + a; for (const [s, a] of Object.entries(r)) i[s] = (i[s] || 0) + a } else if (n === 'subtract') { for (const [s, a] of Object.entries(o)) i[s] = (i[s] || 0) + a; for (const [s, a] of Object.entries(r)) i[s] = (i[s] || 0) - a } else if (n === 'multiply') { for (const [s, a] of Object.entries(o)) for (const [l, p] of Object.entries(r)) { const c = parseInt(s) + parseInt(l); i[c] = (i[c] || 0) + a * p } } return { answer: this.formatPoly(i), explanation: `<strong>Objective:</strong> To perform polynomial ${n}.<br><br><strong>Method:</strong> The operation involves a term-by-term calculation.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Parse Polynomials:</strong> Both input expressions are converted into structured polynomial representations.</li><li><strong>Apply Operation:</strong> The specified operation (${n}) is applied. For addition/subtraction, coefficients of like terms are combined. For multiplication, each term from the first polynomial is multiplied by each term from the second.</li><li><strong>Combine and Format:</strong> All resulting like terms are combined to produce the final simplified polynomial.</li></ol>` } },
        polynomialDivision(e, t) { let n = this.parsePoly(e), o = this.parsePoly(t); const r = Object.keys(n).map(Number).sort((a, l) => l - a), i = Object.keys(o).map(Number).sort((a, l) => l - a); if (i.length === 0 || o[i[0]] === 0) throw new Error("Divisor cannot be zero."); if (r[0] < i[0]) return { answer: `Quotient: 0, Remainder: ${this.formatPoly(n)}`, explanation: "The degree of the dividend is less than the degree of the divisor." }; let s = {}, a = Object.assign({}, n); for (let l = r[0]; l >= i[0]; l--) { const p = a[l] || 0; if (p === 0) continue; const c = i[0], d = o[c], u = l - c, f = p / d; s[u] = f; for (const [g, h] of Object.entries(o)) { const m = u + Number(g); a[m] = (a[m] || 0) - f * h } delete a[l] } Object.keys(a).forEach(l => { if (Math.abs(a[l]) < 1e-9) delete a[l] }); const l = this.formatPoly(s), p = this.formatPoly(a); return { answer: `Quotient: ${l}, Remainder: ${p}`, explanation: `<strong>Objective:</strong> To divide one polynomial by another using long division.<br><br><strong>Method:</strong> A systematic process analogous to numerical long division is followed.<br><br><strong>Steps:</strong><ol class='list-decimal list-inside space-y-2'><li><strong>Divide Leading Terms:</strong> The leading term of the current dividend is divided by the leading term of the divisor. The result is the next term of the quotient.</li><li><strong>Multiply:</strong> The new quotient term is multiplied by the entire divisor.</li><li><strong>Subtract:</strong> The product from the previous step is subtracted from the current dividend to get a new, lower-degree polynomial (the remainder).</li><li><strong>Repeat:</strong> Steps 1-3 are repeated using the new remainder as the dividend, until the degree of the remainder is less than the degree of the divisor.</li></ol>` } },
        findGcd(e) { const t = e.split(',').map(o => parseInt(o.trim())); if (t.some(isNaN)) throw new Error("Invalid input. Please provide comma-separated integers."); const n = (o, r) => r === 0 ? o : n(r, o % r); const o = t.reduce((r, i) => n(r, Math.abs(i))); return { answer: o, explanation: `<strong>Definition:</strong> The Greatest Common Divisor (GCD) of the numbers <strong>${t.join(', ')}</strong> is the largest positive integer that divides each of them without leaving a remainder.<br><br><strong>Method:</strong> The Euclidean algorithm is typically used, which repeatedly finds the remainder of the division between the two numbers until the remainder is zero. The last non-zero remainder is the GCD.` } },
        findLcm(e) { const t = e.split(',').map(o => parseInt(o.trim())); if (t.some(isNaN)) throw new Error("Invalid input. Please provide comma-separated integers."); const n = (o, r) => r === 0 ? o : n(r, o % r), o = (r, i) => Math.abs(r * i) / n(r, i); const r = t.reduce(o); return { answer: r, explanation: `<strong>Definition:</strong> The Least Common Multiple (LCM) of the numbers <strong>${t.join(', ')}</strong> is the smallest positive integer that is a multiple of all of them.<br><br><strong>Method:</strong> The LCM can be calculated from the GCD using the formula:<br><i>LCM(a, b) = (|a × b|) / GCD(a, b)</i>.<br>This process is applied iteratively for more than two numbers.` } },
        getFactors(e) { const t = []; e = Math.abs(e); for (let n = 1; n <= Math.sqrt(e); n++) { if (e % n === 0) { t.push([n, e / n]); if (n * n !== e) t.push([-n, -e / n]) } } return t }
    };

    // --- DOM ELEMENT REFERENCES ---
    const elements = {
        operation: document.getElementById('operation'),
        inputMain: document.getElementById('input-main'),
        input1: document.getElementById('input-1'),
        input2: document.getElementById('input-2'),
        polyOp: document.getElementById('poly-op'),
        errorMessage: document.querySelector('#error-message-container p'),
        calculateBtn: document.getElementById('calculate-btn'),
        resetBtn: document.getElementById('reset-btn'),
        resultContainer: document.getElementById('result-container'),
        resultAnswer: document.getElementById('result-answer'),
        resultExplanationContainer: document.getElementById('result-explanation-container'),
        resultExplanation: document.getElementById('result-explanation'),
        uiStandard: document.getElementById('ui-standard'),
        uiMulti: document.getElementById('ui-multi'),
        label1: document.getElementById('label-1'),
        label2: document.getElementById('label-2'),
        polyOpContainer: document.getElementById('poly-op-container')
    };

    // --- UI & EVENT HANDLING LOGIC ---
    function updateUI() {
        const op = elements.operation.value;
        const config = calculator.configs[op] || {};

        if (config.ui === 'standard') {
            elements.uiStandard.style.display = 'block';
            elements.uiMulti.style.display = 'none';
            elements.inputMain.placeholder = config.p || '';
        } else if (config.ui === 'multi') {
            elements.uiStandard.style.display = 'none';
            elements.uiMulti.style.display = 'block';
            
            elements.label1.textContent = config.l1 || '';
            elements.input1.placeholder = config.p1 || '';
            elements.label2.textContent = config.l2 || '';
            elements.input2.placeholder = config.p2 || '';

            if (config.op) {
                elements.polyOpContainer.style.display = 'block';
                elements.polyOp.innerHTML = '';
                config.ops.forEach(([value, text]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = text;
                    elements.polyOp.appendChild(option);
                });
            } else {
                elements.polyOpContainer.style.display = 'none';
            }
        }
    }

    function handleReset() {
        elements.inputMain.value = '';
        elements.input1.value = '';
        elements.input2.value = '';
        elements.errorMessage.textContent = '';
        elements.resultContainer.style.display = 'none';
        elements.resultAnswer.textContent = '';
        elements.resultExplanation.innerHTML = '';
    }

    function handleCalculate() {
        elements.errorMessage.textContent = '';
        elements.resultContainer.style.display = 'none';

        try {
            const op = elements.operation.value;
            const config = calculator.configs[op];
            
            let inputs;
            if (config.ui === 'standard') {
                inputs = [elements.inputMain.value];
            } else {
                inputs = [elements.input1.value, elements.input2.value, elements.polyOp.value];
            }

            if ((config.ui === 'standard' && inputs[0].trim() === '') || (config.ui === 'multi' && (inputs[0].trim() === '' || inputs[1].trim() === ''))) {
                throw new Error("Input fields cannot be empty.");
            }

            const result = calculator.calculationRouter(op, ...inputs);

            if (result && typeof result.answer !== 'undefined') {
                elements.resultAnswer.textContent = result.answer;
                
                if (result.explanation && result.explanation.trim() !== '') {
                    elements.resultExplanationContainer.style.display = 'block';
                    elements.resultExplanation.innerHTML = result.explanation;
                } else {
                    elements.resultExplanationContainer.style.display = 'none';
                }
                
                elements.resultContainer.style.display = 'block';
            }

        } catch (e) {
            elements.errorMessage.textContent = e.message;
        }
    }
    
    // --- INITIALIZATION ---
    elements.operation.addEventListener('change', () => {
        handleReset();
        updateUI();
    });
    elements.resetBtn.addEventListener('click', handleReset);
    elements.calculateBtn.addEventListener('click', handleCalculate);
    
    updateUI();
});