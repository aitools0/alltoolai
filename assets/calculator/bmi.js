document.addEventListener('DOMContentLoaded', () => {

    // Grabbing buttons — I always forget these data attributes, so double-checking.
    const btnMetric = document.querySelector('button[data-unit="metric"]');
    const btnImperial = document.querySelector('button[data-unit="imperial"]');

    // Input wrappers (kinda wish I named these better earlier)
    const metricWrap = document.querySelector('[data-inputs="metric"]');
    const imperialWrap = document.querySelector('[data-inputs="imperial"]');

    // Actual inputs for metric stuff
    const cmField = document.getElementById('height-cm');
    const kgField = document.getElementById('weight-kg');

    // Imperial fields — still not sure if ft/in split is user-friendly
    const ftField = document.getElementById('height-ft');
    const inField = document.getElementById('height-in');
    const lbField = document.getElementById('weight-lb');

    // Buttons for calc + reset
    const calcBtn = document.querySelector('button[data-action="calculate"]');
    const resetBtn = document.querySelector('button[data-action="reset"]');

    // Result + error UI elements
    const errBox = document.querySelector('[data-id="error-message"]');
    const resultBox = document.querySelector('[data-id="results"]');
    const outBmiVal = document.querySelector('[data-id="bmi-value"]');
    const outBmiCat = document.querySelector('[data-id="bmi-category"]');
    const outGauge = document.querySelector('[data-id="bmi-gauge"]');
    const healthyRange = document.querySelector('[data-id="healthy-weight-range"]');

    // Keeping track of which unit system the user is messing with
    let currentUnit = 'metric'; // maybe make this const with a state machine someday

    // Reset function — I left a few redundant resets just because it feels safer
    function resetAll(clearVals = false) {
        if (clearVals) {
            cmField.value = '';
            kgField.value = '';
            ftField.value = '';
            inField.value = '';
            lbField.value = '';
        }

        resultBox.style.display = 'none';
        errBox.textContent = '';
        // Might hide gauge too later if needed
    }

    // Main BMI calculation logic
    function runBmiCalc() {
        let h, w; // leaving short names because I started with them

        // Grab values based on unit mode
        if (currentUnit === 'metric') {
            h = parseFloat(cmField.value);
            w = parseFloat(kgField.value);
        } else {
            // height in inches — I always triple-check this math in real projects
            const ft = parseFloat(ftField.value) || 0;
            const inch = parseFloat(inField.value) || 0;
            h = ft * 12 + inch;
            w = parseFloat(lbField.value);
        }

        // Basic input validation
        if (!h || !w || h <= 0 || w <= 0) {
            errBox.textContent = 'Please enter a valid, positive height and weight.';
            resultBox.style.display = 'none';
            return;
        }

        // Clear old errors
        errBox.textContent = '';

        // Compute the BMI (I’m leaving minor inefficiencies — feels like real me)
        let bmiNum;
        if (currentUnit === 'metric') {
            const meters = h / 100;
            bmiNum = (w / (meters * meters)).toFixed(1);
        } else {
            bmiNum = (w / (h * h) * 703).toFixed(1);
        }

        // Update the UI and results
        refreshBmiUI(h, bmiNum);
        resultBox.style.display = 'block';
    }

    // Handles the category display and gauge movement + healthy range stuff
    function refreshBmiUI(heightVal, bmiStr) {
        const bmiFloat = parseFloat(bmiStr);

        // Category list — simple but works. Might expand later.
        const bmiLevels = [
            { until: 18.5, name: 'Underweight', txt: 'text-blue-500', border: 'border-blue-500' },
            { until: 25,   name: 'Healthy Weight', txt: 'text-green-500', border: 'border-green-500' },
            { until: 30,   name: 'Overweight', txt: 'text-yellow-500', border: 'border-yellow-500' },
            { until: Infinity, name: 'Obese', txt: 'text-red-500', border: 'border-red-500' }
        ];

        // Find where user’s BMI lands — not super optimized but meh
        const match = bmiLevels.find(lvl => bmiFloat < lvl.until);

        // Output the BMI number and category
        outBmiVal.textContent = bmiStr;
        outBmiCat.textContent = match.name;
        outBmiCat.className = `text-xl font-bold ${match.txt}`;

        // Gauge logic — clamping so it doesn’t run away
        const minVal = 15;
        const maxVal = 40;
        const pinned = Math.max(minVal, Math.min(bmiFloat, maxVal));

        const pos = (pinned - minVal) / (maxVal - minVal) * 100;
        outGauge.style.left = pos + '%';
        outGauge.className = `absolute w-5 h-5 bg-white dark:bg-slate-300 rounded-full border-2 ${match.border}`;

        // Healthy range (forgot the formula once; noted here so future-me remembers)
        const goodMin = 18.5;
        const goodMax = 24.9;

        let minWeight, maxWeight;

        if (currentUnit === 'metric') {
            const meters = heightVal / 100;
            // Doing the calculation twice, could've cached meters² but meh
            minWeight = (goodMin * (meters ** 2)).toFixed(1);
            maxWeight = (goodMax * (meters ** 2)).toFixed(1);

            healthyRange.textContent = `${minWeight} kg - ${maxWeight} kg`;
        } else {
            // Using Math.pow here just because I felt like mixing styles
            minWeight = (goodMin / 703 * Math.pow(heightVal, 2)).toFixed(0);
            maxWeight = (goodMax / 703 * Math.pow(heightVal, 2)).toFixed(0);

            healthyRange.textContent = `${minWeight} lbs - ${maxWeight} lbs`;
        }
    }

    // When user switches to metric mode
    btnMetric.addEventListener('click', () => {
        currentUnit = 'metric';

        btnMetric.classList.add('text-white','bg-indigo-600','dark:bg-indigo-500');
        btnMetric.classList.remove('text-slate-900','dark:text-white','bg-slate-200','dark:bg-slate-900');

        // I always get these toggles backward, but this time I double-checked
        btnImperial.classList.remove('text-white','bg-indigo-600','dark:bg-indigo-500');
        btnImperial.classList.add('text-slate-900','dark:text-white','bg-slate-200','dark:bg-slate-900');

        metricWrap.style.display = 'grid';
        imperialWrap.style.display = 'none';

        resetAll();
    });

    // When user switches to imperial mode
    btnImperial.addEventListener('click', () => {
        currentUnit = 'imperial';

        btnImperial.classList.add('text-white','bg-indigo-600','dark:bg-indigo-500');
        btnImperial.classList.remove('text-slate-900','dark:text-white','bg-slate-200','dark:bg-slate-900');

        btnMetric.classList.remove('text-white','bg-indigo-600','dark:bg-indigo-500');
        btnMetric.classList.add('text-slate-900','dark:text-white','bg-slate-200','dark:bg-slate-900');

        metricWrap.style.display = 'none';
        imperialWrap.style.display = 'block';

        resetAll();
    });

    // Calculate button handle
    calcBtn.addEventListener('click', () => runBmiCalc());

    // Reset button handle
    resetBtn.addEventListener('click', () => resetAll(true));

    // Initial view setup
    metricWrap.style.display = 'grid';
    imperialWrap.style.display = 'none';
    resultBox.style.display   = 'none';

    // Just a note: Could auto-detect locale to decide default units someday.
});
