document.addEventListener('DOMContentLoaded', () => {
    const metricButton = document.querySelector('button[data-unit="metric"]');
    const imperialButton = document.querySelector('button[data-unit="imperial"]');
    const metricInputs = document.querySelector('[data-inputs="metric"]');
    const imperialInputs = document.querySelector('[data-inputs="imperial"]');

    const heightCmInput = document.getElementById('height-cm');
    const weightKgInput = document.getElementById('weight-kg');
    const heightFtInput = document.getElementById('height-ft');
    const heightInInput = document.getElementById('height-in');
    const weightLbInput = document.getElementById('weight-lb');

    const calculateButton = document.querySelector('button[data-action="calculate"]');
    const resetButton = document.querySelector('button[data-action="reset"]');

    const errorMessage = document.querySelector('[data-id="error-message"]');
    const resultsContainer = document.querySelector('[data-id="results"]');
    const bmiValue = document.querySelector('[data-id="bmi-value"]');
    const bmiCategory = document.querySelector('[data-id="bmi-category"]');
    const bmiGauge = document.querySelector('[data-id="bmi-gauge"]');
    const healthyWeightRange = document.querySelector('[data-id="healthy-weight-range"]');

    let unit = 'metric';

    function reset(clearInputs = false) {
        if (clearInputs) {
            heightCmInput.value = '';
            weightKgInput.value = '';
            heightFtInput.value = '';
            heightInInput.value = '';
            weightLbInput.value = '';
        }
        resultsContainer.style.display = 'none';
        errorMessage.textContent = '';
    }

    function calculateBmi() {
        let height, weight;

        if (unit === 'metric') {
            height = parseFloat(heightCmInput.value);
            weight = parseFloat(weightKgInput.value);
        } else {
            height = (parseFloat(heightFtInput.value) || 0) * 12 + (parseFloat(heightInInput.value) || 0);
            weight = parseFloat(weightLbInput.value);
        }

        if (!height || !weight || height <= 0 || weight <= 0) {
            resultsContainer.style.display = 'none';
            errorMessage.textContent = 'Please enter a valid, positive height and weight.';
            return;
        }

        errorMessage.textContent = '';

        let bmi;
        if (unit === 'metric') {
            bmi = (weight / (height / 100) ** 2).toFixed(1);
        } else {
            bmi = (weight / height ** 2 * 703).toFixed(1);
        }

        updateBmiDetails(height, bmi);
        resultsContainer.style.display = 'block';
    }

    function updateBmiDetails(height, bmi) {
        const bmiValueFloat = parseFloat(bmi);
        const categories = [
            { maxBmi: 18.5, name: 'Underweight', textClass: 'text-blue-500', borderClass: 'border-blue-500' },
            { maxBmi: 25, name: 'Healthy Weight', textClass: 'text-green-500', borderClass: 'border-green-500' },
            { maxBmi: 30, name: 'Overweight', textClass: 'text-yellow-500', borderClass: 'border-yellow-500' },
            { maxBmi: Infinity, name: 'Obese', textClass: 'text-red-500', borderClass: 'border-red-500' }
        ];

        const status = categories.find(cat => bmiValueFloat < cat.maxBmi);
        bmiValue.textContent = bmi;
        bmiCategory.textContent = status.name;
        bmiCategory.className = `text-xl font-bold ${status.textClass}`;

        const minBmi = 15, maxBmi = 40;
        const clampedBmi = Math.max(minBmi, Math.min(bmiValueFloat, maxBmi));
        const gaugePosition = (clampedBmi - minBmi) / (maxBmi - minBmi) * 100;
        bmiGauge.style.left = `${gaugePosition}%`;
        bmiGauge.className = `absolute w-5 h-5 bg-white dark:bg-slate-300 rounded-full border-2 ${status.borderClass}`;


        const minHealthyBmi = 18.5, maxHealthyBmi = 24.9;
        let minWeight, maxWeight;

        if (unit === 'metric') {
            minWeight = (minHealthyBmi * (height / 100) ** 2).toFixed(1);
            maxWeight = (maxHealthyBmi * (height / 100) ** 2).toFixed(1);
            healthyWeightRange.textContent = `${minWeight} kg - ${maxWeight} kg`;
        } else {
            minWeight = (minHealthyBmi / 703 * height ** 2).toFixed(0);
            maxWeight = (maxHealthyBmi / 703 * height ** 2).toFixed(0);
            healthyWeightRange.textContent = `${minWeight} lbs - ${maxWeight} lbs`;
        }
    }

    metricButton.addEventListener('click', () => {
        unit = 'metric';
        metricButton.classList.add('bg-white', 'dark:bg-slate-800', 'border', 'border-indigo-300');
        metricButton.classList.remove('text-slate-600', 'dark:text-slate-400', 'bg-slate-200', 'dark:bg-slate-900');
        imperialButton.classList.remove('bg-white', 'dark:bg-slate-800', 'border', 'border-indigo-300');
        imperialButton.classList.add('text-slate-600', 'dark:text-slate-400', 'bg-slate-200', 'dark:bg-slate-900');
        metricInputs.style.display = 'grid';
        imperialInputs.style.display = 'none';
        reset();
    });

    imperialButton.addEventListener('click', () => {
        unit = 'imperial';
        imperialButton.classList.add('bg-white', 'dark:bg-slate-800', 'border', 'border-indigo-300');
        imperialButton.classList.remove('text-slate-600', 'dark:text-slate-400', 'bg-slate-200', 'dark:bg-slate-900');
        metricButton.classList.remove('bg-white', 'dark:bg-slate-800', 'border', 'border-indigo-300');
        metricButton.classList.add('text-slate-600', 'dark:text-slate-400', 'bg-slate-200', 'dark:bg-slate-900');
        metricInputs.style.display = 'none';
        imperialInputs.style.display = 'block';
        reset();
    });

    calculateButton.addEventListener('click', () => calculateBmi());
    resetButton.addEventListener('click', () => reset(true));

    // Initial state
    metricInputs.style.display = 'grid';
    imperialInputs.style.display = 'none';
    resultsContainer.style.display = 'none';
});