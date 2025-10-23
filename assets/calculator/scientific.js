document.addEventListener('DOMContentLoaded', () => {
    const calculator = document.getElementById('calculator');
    if (!calculator) return;

    const expressionDisplay = document.getElementById('expression-display');
    const resultDisplay = document.getElementById('result-display');
    const angleToggleButton = document.getElementById('angle-toggle');
    const memoryIndicator = document.getElementById('memory-indicator');

    const state = { expression: '0', memory: 0, angleMode: 'DEG', isResultShown: false, isErrorState: false, cursorPosition: 1 };
    const CONSTANTS = { PI: 'π', E: 'e' };
    const OPERATORS = ['+', '*', '/', '^', '%', '!'];
    const { PI, E } = Math;

    const mathContext = {
        pi: PI, e: E, sqrt: Math.sqrt, log: Math.log10, ln: Math.log,
        sin: x => state.angleMode === 'DEG' ? Math.sin(x * PI / 180) : Math.sin(x),
        cos: x => state.angleMode === 'DEG' ? Math.cos(x * PI / 180) : Math.cos(x),
        tan: x => state.angleMode === 'DEG' ? Math.tan(x * PI / 180) : Math.tan(x),
        asin: x => state.angleMode === 'DEG' ? Math.asin(x) * 180 / PI : Math.asin(x),
        acos: x => state.angleMode === 'DEG' ? Math.acos(x) * 180 / PI : Math.acos(x),
        atan: x => state.angleMode === 'DEG' ? Math.atan(x) * 180 / PI : Math.atan(x),
        sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
        factorial: n => {
            if (n < 0 || !Number.isInteger(n) || n > 170) return NaN;
            if (n === 0) return 1; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
        },
    };

    calculator.addEventListener('click', handleButtonClick);
    window.addEventListener('keydown', handleKeyPress);
    resultDisplay.addEventListener('click', handleDisplayClick);

    function handleButtonClick(event) {
        const button = event.target.closest('.button');
        if (!button) return;
        const { action, value, key } = button.dataset;
        routeAction(action || 'input', value || key);
    }
    
    function handleKeyPress(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveCursorLeft();
            updateDisplay();
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveCursorRight();
            updateDisplay();
            return;
        }

        event.preventDefault();
        const key = event.key;
        let targetButton;
        
        if (key === 'Enter' || key === '=') targetButton = document.querySelector('[data-key="Enter"]');
        else if (key === 'Backspace') targetButton = document.querySelector('[data-key="Backspace"]');
        else if (key === 'Escape') targetButton = document.querySelector('[data-key="Escape"]');
        else targetButton = document.querySelector(`[data-key="${key}"]`);
        
        if (targetButton) {
            targetButton.click();
            targetButton.classList.add('active');
            setTimeout(() => targetButton.classList.remove('active'), 100);
        }
    }

    function handleDisplayClick(event) {
        if (state.isResultShown) {
             state.isResultShown = false;
             updateDisplay();
             return;
        }
        if (state.isErrorState) return;

        const target = event.target.closest('[data-index]');
        if (target) {
            const index = parseInt(target.dataset.index, 10);
            const rect = target.getBoundingClientRect();

            if (rect.width > 0) { 
                const mid = rect.left + rect.width / 2;
                state.cursorPosition = event.clientX < mid ? index : index + 1;
            } else {
                state.cursorPosition = index;
            }

            updateDisplay();
        }
    }
    
    function routeAction(action, value) {
        if (state.isErrorState && action !== 'clear') return;
        const actions = {
            'input': () => insertText(value), 'operation': () => insertText(value), 'decimal': appendDecimal,
            'group': () => insertText(value), 'constant': () => appendConstant(value), 'function': () => appendFunction(value),
            'clear': clearAll, 'backspace': backspace, 'calculate': calculate, 'power': val => insertText(`^${val}`),
            'reciprocal': reciprocal, 'nthRoot': () => insertText('^(1/'), 'random': appendRandom,
            'toggleAngle': toggleAngleMode, 'memoryClear': () => updateMemory('clear'),
            'memoryAdd': () => updateMemory('add'), 'memorySubtract': () => updateMemory('subtract'), 'memoryRecall': () => updateMemory('recall'),
        };
        if (actions[action]) actions[action](value);
        updateDisplay();
    }
    
    function clearAll() {
        state.expression = '0';
        state.cursorPosition = 1;
        expressionDisplay.innerText = '';
        state.isResultShown = false;
        state.isErrorState = false;
        resultDisplay.classList.remove('error');
    }

    function backspace() {
        if (state.isResultShown) {
            expressionDisplay.innerText = '';
            state.isResultShown = false;
            return;
        }
        if (state.cursorPosition > 0) {
            state.expression = state.expression.slice(0, state.cursorPosition - 1) + state.expression.slice(state.cursorPosition);
            moveCursorLeft();
        }
        if (state.expression.length === 0) {
            state.expression = '0';
            state.cursorPosition = 1;
        }
    }

    function insertText(text) {
        if (state.isResultShown) {
            if (OPERATORS.includes(text.charAt(0))) {
                state.isResultShown = false;
            } else {
                state.expression = '0';
                state.cursorPosition = 0;
                state.isResultShown = false;
            }
        }
        if (state.expression === '0' && text !== '.' && !OPERATORS.includes(text.charAt(0))) {
             state.expression = text;
             state.cursorPosition = text.length;
        } else {
            state.expression = state.expression.slice(0, state.cursorPosition) + text + state.expression.slice(state.cursorPosition);
            state.cursorPosition += text.length;
        }
    }

    function appendDecimal() {
        const segments = state.expression.split(/[+\-*/^!()]/);
        if (!segments[segments.length - 1].includes('.')) insertText('.');
    }
    
    function appendConstant(constSymbol) {
        if (state.isResultShown) {
            state.expression = '0';
            state.isResultShown = false;
            state.cursorPosition = 0;
        }
        const charBeforeCursor = state.cursorPosition > 0 ? state.expression.slice(state.cursorPosition - 1, state.cursorPosition) : '';
        const needsMultiplier = !isNaN(parseInt(charBeforeCursor, 10)) || [')', CONSTANTS.PI, CONSTANTS.E].includes(charBeforeCursor);
        const textToAppend = (needsMultiplier ? '*' : '') + constSymbol;
        insertText(textToAppend);
    }
    
    function appendFunction(funcName) {
        if (state.isResultShown) {
            state.expression = '0';
            state.isResultShown = false;
            state.cursorPosition = 0;
        }
        const charBeforeCursor = state.cursorPosition > 0 ? state.expression.slice(state.cursorPosition - 1, state.cursorPosition) : '';
        const needsMultiplier = !isNaN(parseInt(charBeforeCursor, 10)) || [')', CONSTANTS.PI, CONSTANTS.E].includes(charBeforeCursor);
        const textToAppend = (needsMultiplier ? '*' : '') + funcName + '(';
        insertText(textToAppend);
    }
    
    function moveCursorLeft() {
        if (state.cursorPosition > 0) state.cursorPosition--;
    }

    function moveCursorRight() {
        if (state.cursorPosition < state.expression.length) state.cursorPosition++;
    }

    function reciprocal() {
        if (state.isResultShown) state.isResultShown = false;
        const newExpr = `1/(${state.expression})`;
        state.expression = newExpr;
        state.cursorPosition = newExpr.length;
    }
    
    function preprocess(expr) {
        return String(expr)
            .replace(/π/g, 'pi')
            .replace(/e/g, 'e')
            .replace(/\^/g, '**')
            .replace(/(\d+)!/g, 'factorial($1)')
            .replace(/(\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\))!/g, 'factorial$1')
            .replace(/(\d|\)|\bpi\b|\be\b)(?=\(|[a-z])/g, '$1*')
            .replace(/(\d*\.?\d+)%/g, '($1/100)');
    }

    // --- NEW ROBUST CALCULATION ENGINE ---
    function calculate() {
        if (state.isResultShown || state.isErrorState) return;
        expressionDisplay.innerText = state.expression.replace(/\*/g, '×').replace(/\//g, '÷') + '=';

        try {
            // A robust evaluator that respects parentheses and order of operations.
            const evaluate = (expr) => {
                const parensRegex = /\(([^()]*)\)/;
                let currentExpr = expr;
                while (parensRegex.test(currentExpr)) {
                    currentExpr = currentExpr.replace(parensRegex, (match, innerExpr) => {
                        return evaluate(innerExpr); // Recursively solve innermost parentheses
                    });
                }

                // After resolving parentheses, this logic handles the special `A + B%` case on a "flat" expression.
                const percentMatch = currentExpr.match(/(.*)([+\-])(\d*\.?\d+)%$/);

                if (percentMatch) {
                    const baseExpression = percentMatch[1];
                    const operator = percentMatch[2];
                    const percentValue = parseFloat(percentMatch[3]);
                    
                    // The base expression is flat, so we can evaluate it directly.
                    const preprocessedBase = preprocess(baseExpression);
                    const mathFunctionKeys = Object.keys(mathContext).join(',');
                    const func = new Function('math', `const {${mathFunctionKeys}} = math; return ${preprocessedBase};`);
                    const baseValue = func(mathContext);
                    
                    if (operator === '+') {
                        return baseValue + (baseValue * percentValue / 100);
                    } else { // operator === '-'
                        return baseValue - (baseValue * percentValue / 100);
                    }
                } else {
                    // If no special percentage case, evaluate the flat expression normally.
                    const preprocessedExpr = preprocess(currentExpr);
                    const mathFunctionKeys = Object.keys(mathContext).join(',');
                    const func = new Function('math', `const {${mathFunctionKeys}} = math; return ${preprocessedExpr};`);
                    return func(mathContext);
                }
            };

            let result = evaluate(state.expression);
            
            if (!isFinite(result)) throw new Error("Result is not finite");
            state.expression = String(Number(result.toPrecision(15)));

        } catch (error) {
            state.expression = "Error";
            state.isErrorState = true;
            resultDisplay.classList.add('error');
        }

        state.isResultShown = true;
        state.cursorPosition = state.expression.length;
        updateDisplay();
    }
    
    function updateMemory(action) {
        let currentValue = 0;
        try {
            const expressionToEvaluate = preprocess(state.expression);
            const mathFunctionKeys = Object.keys(mathContext).join(',');
            const func = new Function('math', `const {${mathFunctionKeys}} = math; return ${expressionToEvaluate};`);
            currentValue = func(mathContext);
        } catch {}
        if (action === 'add' && isFinite(currentValue)) state.memory += currentValue;
        else if (action === 'subtract' && isFinite(currentValue)) state.memory -= currentValue;
        else if (action === 'clear') state.memory = 0;
        else if (action === 'recall') insertText(String(state.memory));
        memoryIndicator.style.opacity = state.memory !== 0 ? '1' : '0';
    }
    
    function toggleAngleMode() {
        state.angleMode = (state.angleMode === 'DEG') ? 'RAD' : 'DEG';
        angleToggleButton.innerText = state.angleMode;
    }

    function appendRandom() {
        insertText(String(Number(Math.random().toPrecision(15))));
    }
    
    function updateDisplay() {
        const sanitizedExpr = state.expression.replace(/\*/g, '×').replace(/\//g, '÷');
        let leftHtml = '', rightHtml = '';

        for (let i = 0; i < state.cursorPosition; i++) {
            leftHtml += `<span class="char-span" data-index="${i}">${sanitizedExpr[i]}</span>`;
        }
        for (let i = state.cursorPosition; i < sanitizedExpr.length; i++) {
            rightHtml += `<span class="char-span" data-index="${i}">${sanitizedExpr[i]}</span>`;
        }
        
        if (state.isResultShown) {
             resultDisplay.innerHTML = `<span>${sanitizedExpr}</span>`;
        } else {
             resultDisplay.innerHTML = `${leftHtml}<span class="cursor"></span>${rightHtml}<span class="end-target" data-index="${sanitizedExpr.length}">&nbsp;</span>`;
             const cursorEl = resultDisplay.querySelector('.cursor');
             if (cursorEl) {
                 cursorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
             }
        }
    }
    updateDisplay();
});