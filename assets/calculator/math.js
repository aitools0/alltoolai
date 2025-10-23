document.addEventListener('DOMContentLoaded', () => {
    // --- CALCULATOR DOM REFERENCES ---
    const modeButtons = {
        single: document.getElementById('single-equation-mode'),
        system: document.getElementById('system-equations-mode'),
    };
    const sections = {
        single: document.getElementById('single-equation-container'),
        system: document.getElementById('system-equations-container'),
    };
    const singleEquation = {
        input: document.getElementById('equation-input'),
        solveBtn: document.getElementById('solve-button'),
        clearBtn: document.getElementById('clear-button'),
        output: document.getElementById('single-output'),
    };
    const systemEquations = {
        input1: document.getElementById('equation1-input'),
        input2: document.getElementById('equation2-input'),
        solveBtn: document.getElementById('solve-system-button'),
        clearBtn: document.getElementById('clear-system-button'),
        output: document.getElementById('system-output'),
    };

    // --- MODE SWITCHER LOGIC ---
    if(modeButtons.single){
        modeButtons.single.addEventListener('click', () => switchMode('single'));
        modeButtons.system.addEventListener('click', () => switchMode('system'));
    }

    function switchMode(mode) {
        if (mode === 'single') {
            modeButtons.single.classList.add('bg-indigo-600', 'text-white', 'dark:bg-indigo-400');
            modeButtons.single.classList.remove('bg-slate-200', 'dark:bg-slate-700');
            modeButtons.system.classList.remove('bg-indigo-600', 'text-white', 'dark:bg-indigo-400');
            modeButtons.system.classList.add('bg-slate-200', 'dark:bg-slate-700');
            sections.single.classList.remove('hidden');
            sections.system.classList.add('hidden');
        } else {
            modeButtons.system.classList.add('bg-indigo-600', 'text-white', 'dark:bg-indigo-400');
            modeButtons.system.classList.remove('bg-slate-200', 'dark:bg-slate-700');
            modeButtons.single.classList.remove('bg-indigo-600', 'text-white', 'dark:bg-indigo-400');
            modeButtons.single.classList.add('bg-slate-200', 'dark:bg-slate-700');
            sections.system.classList.remove('hidden');
            sections.single.classList.add('hidden');
        }
        clearSingle();
        clearSystem();
    }

    // --- EVENT LISTENERS ---
    if (singleEquation.solveBtn) {
        singleEquation.solveBtn.addEventListener('click', solveSingleEquation);
        singleEquation.clearBtn.addEventListener('click', clearSingle);
        singleEquation.input.addEventListener('keydown', e => e.key === 'Enter' && solveSingleEquation());
    }
    if (systemEquations.solveBtn) {
        systemEquations.solveBtn.addEventListener('click', solveSystemOfEquations);
        systemEquations.clearBtn.addEventListener('click', clearSystem);
    }
    
    // --- UI CLEARING FUNCTIONS ---
    function clearSingle() {
        if (singleEquation.input) {
            singleEquation.input.value = '';
            singleEquation.output.innerHTML = '';
            singleEquation.output.classList.remove('show');
        }
    }

    function clearSystem() {
        if (systemEquations.input1) {
            systemEquations.input1.value = '';
            systemEquations.input2.value = '';
            systemEquations.output.innerHTML = '';
            systemEquations.output.classList.remove('show');
        }
    }

    // --- DISPLAY FUNCTIONS ---
    function displayOutput(element, title, steps, finalAnswer, isError = false) {
        let stepsHtml = steps ? `<div class="steps-container space-y-2">${steps.map(step => `<p class="p-2 rounded-md bg-slate-100 dark:bg-slate-700">${step}</p>`).join('')}</div>` : '';
        // FIX: Error messages are red, success has a blue background.
        const resultClass = isError ? 'text-red-500 text-lg' : 'bg-indigo-100 text-lg text-red-500 text-lg';
        
        element.innerHTML = `
            <div class="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                <h3 class="text-lg font-bold mb-2 text-slate-800 dark:text-slate-200">${title}</h3>
                ${stepsHtml}
                <div class="final-answer mt-4 p-3 rounded-lg text-center font-semibold ${resultClass}">
                    ${finalAnswer}
                </div>
            </div>
        `;
        element.classList.add('show');
    }

    function displayError(element, message) {
        displayOutput(element, 'Error', null, message, true);
    }
    
    // --- SINGLE EQUATION SOLVER ---
    function solveSingleEquation() {
        const eq = singleEquation.input.value.trim();
        if (!eq) {
            displayError(singleEquation.output, "Please enter an equation.");
            return;
        }
        if ((eq.match(/=/g) || []).length !== 1) {
            displayError(singleEquation.output, "The equation must contain exactly one '=' sign.");
            return;
        }

        try {
            const { a, b, c } = parseSingleEquation(eq);
            if (a !== 0) solveQuadratic(a, b, c, eq);
            else if (b !== 0) solveLinear(b, c, eq);
            else {
                const steps = [`Original: <strong>${eq}</strong>`, `Simplified: <strong>${c} = 0</strong>`];
                if (c === 0) displayOutput(singleEquation.output, "Result", steps, 'This is a true statement (e.g., 0=0). Infinitely many solutions.');
                else displayOutput(singleEquation.output, "Result", steps, 'This is a false statement. No solution exists.');
            }
        } catch (err) {
            displayError(singleEquation.output, err.message);
        }
    }

    function parseSingleEquation(eq) {
        const cleanEq = eq.replace(/\s+/g, '').replace(/\^2/g, '²');
        let [lhs, rhs] = cleanEq.split('=');

        const getCoeffs = (side) => {
            const coeffs = { a: 0, b: 0, c: 0 };
            const terms = side.match(/([+-]?[0-9.]*x²)|([+-]?[0-9.]*x(?!²))|([+-]?[0-9.]+)/g) || [];
            
            for (let term of terms) {
                if (term.includes('x²')) {
                    let val = term.replace('x²', '');
                    if (val === '' || val === '+') coeffs.a += 1;
                    else if (val === '-') coeffs.a -= 1;
                    else coeffs.a += parseFloat(val);
                } else if (term.includes('x')) {
                    let val = term.replace('x', '');
                    if (val === '' || val === '+') coeffs.b += 1;
                    else if (val === '-') coeffs.b -= 1;
                    else coeffs.b += parseFloat(val);
                } else {
                    coeffs.c += parseFloat(term);
                }
            }
            return coeffs;
        };

        const l = getCoeffs(lhs);
        const r = getCoeffs(rhs);

        return { a: l.a - r.a, b: l.b - r.b, c: l.c - r.c };
    }

    function solveLinear(b, c, originalEq) {
        const x = -c / b;
        const steps = [
            `Original Equation: <strong>${originalEq}</strong>`,
            `Rearranged into standard form: <strong>${b}x + ${c} = 0</strong>`,
            `Isolate x: <strong>${b}x = ${-c}</strong>`,
            `Solve for x: <strong>x = ${-c} / ${b}</strong>`
        ];
        displayOutput(singleEquation.output, 'Linear Solution', steps, `Solution: x = ${Number(x.toFixed(4))}`);
    }

    function solveQuadratic(a, b, c, originalEq) {
        const steps = [
            `Original Equation: <strong>${originalEq}</strong>`,
            `Standard Form: <strong>${a}x² + ${b >= 0 ? '+' : ''} ${b}x + ${c >= 0 ? '+' : ''} ${c} = 0</strong>`,
            `Coefficients: <strong>a=${a}, b=${b}, c=${c}</strong>`
        ];

        const discriminant = b * b - 4 * a * c;
        steps.push(`Discriminant (Δ = b²-4ac): (${b})² - 4(${a})(${c}) = <strong>${discriminant}</strong>`);

        if (discriminant > 0) {
            steps.push("Δ > 0, indicating two distinct real roots.");
            const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            displayOutput(singleEquation.output, 'Quadratic Solution', steps, `Two Real Solutions:<br>x₁ = ${x1.toFixed(4)}, x₂ = ${x2.toFixed(4)}`);
        } else if (discriminant === 0) {
            steps.push("Δ = 0, indicating one real root.");
            const x = -b / (2 * a);
            displayOutput(singleEquation.output, 'Quadratic Solution', steps, `One Real Solution:<br>x = ${x.toFixed(4)}`);
        } else {
            steps.push("Δ < 0, indicating two complex roots.");
            const realPart = -b / (2 * a);
            const imaginaryPart = Math.sqrt(-discriminant) / (2 * a);
            displayOutput(singleEquation.output, 'Quadratic Solution', steps, `Complex Solutions:<br>x₁ = ${realPart.toFixed(4)} + ${imaginaryPart.toFixed(4)}i<br>x₂ = ${realPart.toFixed(4)} - ${imaginaryPart.toFixed(4)}i`);
        }
    }

    // --- SYSTEM OF EQUATIONS SOLVER ---
    function solveSystemOfEquations() {
        try {
            const eq1Str = systemEquations.input1.value;
            const eq2Str = systemEquations.input2.value;
            if (!eq1Str || !eq2Str) throw new Error("Please enter both equations.");

            const c1 = parseSystemEquation(eq1Str);
            const c2 = parseSystemEquation(eq2Str);

            const steps = [
                `Equation 1: <strong>${c1.a}x + ${c1.b}y = ${c1.c}</strong>`,
                `Equation 2: <strong>${c2.a}x + ${c2.b}y = ${c2.c}</strong>`,
                `Solving using Cramer's Rule.`
            ];
            
            const D = c1.a * c2.b - c2.a * c1.b;
            steps.push(`Main Determinant D = (${c1.a})(${c2.b}) - (${c2.a})(${c1.b}) = <strong>${D}</strong>`);

            if (D !== 0) {
                const Dx = c1.c * c2.b - c2.c * c1.b;
                const Dy = c1.a * c2.c - c2.a * c1.c;
                steps.push(`Determinant Dx = (${c1.c})(${c2.b}) - (${c2.c})(${c1.b}) = <strong>${Dx}</strong>`);
                steps.push(`Determinant Dy = (${c1.a})(${c2.c}) - (${c2.a})(${c1.c}) = <strong>${Dy}</strong>`);
                const x = Dx / D;
                const y = Dy / D;
                steps.push(`x = Dx/D = ${x.toFixed(4)}, y = Dy/D = ${y.toFixed(4)}`);
                displayOutput(systemEquations.output, 'System Solution', steps, `Solution:<br>x = ${x.toFixed(4)}, y = ${y.toFixed(4)}`);
            } else {
                 if ((c1.c * c2.a === c2.c * c1.a) && (c1.c * c2.b === c2.c * c1.b)) {
                    steps.push("D = 0 and the lines are coincident.");
                    displayOutput(systemEquations.output, 'System Solution', steps, `Infinitely many solutions.`);
                } else {
                    steps.push("D = 0 and the lines are parallel and distinct.");
                    displayOutput(systemEquations.output, 'System Solution', steps, `No solution.`);
                }
            }
        } catch (err) {
            displayError(systemEquations.output, err.message);
        }
    }
    
    function parseSystemEquation(eq) {
        if ((eq.match(/=/g) || []).length !== 1) throw new Error("Each equation must have one '=' sign.");
        
        let [lhs, rhs] = eq.replace(/\s+/g, '').split('=');
        
        if (isNaN(parseFloat(rhs))) throw new Error(`The right side of the equation ('${rhs}') must be a number.`);
        const c = parseFloat(rhs);

        const terms = lhs.match(/[+-]?[^+-]+/g) || [];
        let a = 0, b = 0;
        
        for (let t of terms) {
            if (t.includes('x')) {
                let val = t.replace('x', '');
                if (val === '+' || val === '') a += 1;
                else if (val === '-') a -= 1;
                else a += parseFloat(val);
            } else if (t.includes('y')) {
                let val = t.replace('y', '');
                if (val === '+' || val === '') b += 1;
                else if (val === '-') b -= 1;
                else b += parseFloat(val);
            } else {
                throw new Error(`Invalid term '${t}'. Equations must be in the form 'ax + by = c'.`);
            }
        }
        return { a, b, c };
    }
});