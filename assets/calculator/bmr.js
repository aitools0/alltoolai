// --- DOM Elements ---
const btnMale = document.getElementById('btn-male');
const btnFemale = document.getElementById('btn-female');
const btnMetric = document.getElementById('btn-metric');
const btnImperial = document.getElementById('btn-imperial');

const ageInput = document.getElementById('age');
const weightInput = document.getElementById('weight');
const heightCmInput = document.getElementById('height-cm');
const heightFtInput = document.getElementById('height-ft');
const heightInInput = document.getElementById('height-in');

const activitySelect = document.getElementById('activity');

const heightMetricContainer = document.getElementById('height-metric-container');
const heightImperialContainer = document.getElementById('height-imperial-container');
const labelWeight = document.getElementById('label-weight');

const errorMessageContainer = document.getElementById('error-message-container');
const errorMessageText = document.getElementById('error-message-text');

const btnCalculate = document.getElementById('btn-calculate');
const btnReset = document.getElementById('btn-reset');

const resultsContainer = document.getElementById('results-container');
const bmrResultEl = document.getElementById('bmr-result');
const tdeeResultEl = document.getElementById('tdee-result');
const goalsTableBody = document.getElementById('goals-table-body');

const macroBalancedBtn = document.getElementById('macro-balanced');
const macroLowCarbBtn = document.getElementById('macro-low-carb');
const macroHighProteinBtn = document.getElementById('macro-high-protein');


// --- State ---
let gender = 'male';
let units = 'metric';
let activityLevel = 1.55;
let macronutrientPlan = 'balanced';
let results = { bmr: 0, tdee: 0 };

const macroRatios = {
    balanced:    { p: 0.30, c: 0.40, f: 0.30 },
    lowCarb:     { p: 0.40, c: 0.25, f: 0.35 },
    highProtein: { p: 0.40, c: 0.30, f: 0.30 }
};

// --- Functions ---
function updateButtonStyles(activeBtn, inactiveBtn) {
    activeBtn.classList.add('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
    activeBtn.classList.remove('text-slate-900', 'dark:text-slate-200', 'bg-slate-200', 'dark:bg-slate-900');
    inactiveBtn.classList.remove('bg-indigo-600', 'dark:bg-indigo-500', 'text-white');
    inactiveBtn.classList.add('text-slate-900', 'dark:text-slate-200', 'bg-slate-200', 'dark:bg-slate-900');
}

function updateUnitsUI() {
    if (units === 'metric') {
        updateButtonStyles(btnMetric, btnImperial);
        heightMetricContainer.style.display = 'block';
        heightImperialContainer.style.display = 'none';
        labelWeight.textContent = 'Weight (kg)';
        weightInput.placeholder = 'e.g., 70';
    } else {
        updateButtonStyles(btnImperial, btnMetric);
        heightMetricContainer.style.display = 'none';
        heightImperialContainer.style.display = 'block';
        labelWeight.textContent = 'Weight (lbs)';
        weightInput.placeholder = 'e.g., 155';
    }
}

function reset() {
    gender = 'male';
    units = 'metric';
    ageInput.value = '';
    weightInput.value = '';
    heightCmInput.value = '';
    heightFtInput.value = '';
    heightInInput.value = '';
    activitySelect.value = '1.55';
    macronutrientPlan = 'balanced';
    
    resultsContainer.style.display = 'none';
    errorMessageContainer.style.display = 'none';
    
    updateButtonStyles(btnMale, btnFemale);
    updateUnitsUI();
    updateMacroButtons();
}

function validate() {
    const age = parseFloat(ageInput.value);
    const weight = parseFloat(weightInput.value);
    const heightCm = parseFloat(heightCmInput.value);
    const heightFt = parseFloat(heightFtInput.value);
    const heightIn = parseFloat(heightInInput.value);

    if (isNaN(age) || age < 15 || age > 120) return 'Please enter a valid age between 15 and 120.';
    if (isNaN(weight) || weight <= 0) return 'Please enter a valid positive weight.';
    
    if (units === 'metric') {
        if (isNaN(heightCm) || heightCm <= 0) return 'Please enter a valid positive height in cm.';
    } else {
        if (isNaN(heightFt) || heightFt <= 0) return 'Please enter a valid positive height in feet.';
        if (!isNaN(heightIn) && (heightIn < 0 || heightIn >= 12)) return 'Inches must be a number between 0 and 11.';
    }
    return '';
}

function calculate() {
    const errorMessage = validate();
    if (errorMessage) {
        errorMessageText.textContent = errorMessage;
        errorMessageContainer.style.display = 'block';
        resultsContainer.style.display = 'none';
        return;
    }

    errorMessageContainer.style.display = 'none';
    
    const age = parseFloat(ageInput.value);
    const weight = parseFloat(weightInput.value);

    const weightInKg = units === 'imperial' ? weight * 0.453592 : weight;
    const heightInCm = units === 'imperial' 
        ? (parseFloat(heightFtInput.value) * 30.48) + ((parseFloat(heightInInput.value) || 0) * 2.54)
        : parseFloat(heightCmInput.value);
    
    // Mifflin-St Jeor Formula
    let bmrMifflin = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) + (gender === 'male' ? 5 : -161);
        
    results.bmr = Math.round(bmrMifflin);
    results.tdee = Math.round(bmrMifflin * activityLevel);

    bmrResultEl.textContent = results.bmr;
    tdeeResultEl.textContent = results.tdee;

    calculateGoals();

    resultsContainer.style.display = 'block';
    
    document.getElementById('results-heading')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function calculateGoals() {
    const tdee = results.tdee;
    if(tdee <= 0) return;

    const goalCalories = {
        "Weight Loss": tdee - 500,
        "Mild Weight Loss": tdee - 250,
        "Maintain Weight": tdee,
        "Mild Weight Gain": tdee + 250,
        "Weight Gain": tdee + 500
    };

    let goalsHTML = '';
    for (const [name, cals] of Object.entries(goalCalories)) {
        const macros = getMacros(cals);
        goalsHTML += `
            <tr class="dark:hover:bg-slate-700 hover:bg-slate-100">
                <td class="p-2 font-bold">${name}</td>
                <td class="p-2 font-bold text-indigo-600 dark:text-indigo-400">${Math.round(cals)}</td>
                <td class="p-2 font-bold text-green-500">${macros.protein}</td>
                <td class="p-2 font-bold text-blue-500">${macros.carbs}</td>
                <td class="p-2 font-bold text-red-500">${macros.fat}</td>
            </tr>
        `;
    }
    goalsTableBody.innerHTML = goalsHTML;
}

function getMacros(calories) {
    const ratios = macroRatios[macronutrientPlan];
    return {
        protein: Math.round((calories * ratios.p) / 4),
        carbs: Math.round((calories * ratios.c) / 4),
        fat: Math.round((calories * ratios.f) / 9)
    };
}

function setMacroPlan(plan) {
    macronutrientPlan = plan;
    updateMacroButtons();
    if(results.tdee > 0) calculateGoals();
}

function updateMacroButtons() {
    macroBalancedBtn.classList.toggle('active', macronutrientPlan === 'balanced');
    macroLowCarbBtn.classList.toggle('active', macronutrientPlan === 'lowCarb');
    macroHighProteinBtn.classList.toggle('active', macronutrientPlan === 'highProtein');
}

// --- Event Listeners ---
btnMale.addEventListener('click', () => {
    gender = 'male';
    updateButtonStyles(btnMale, btnFemale);
});
btnFemale.addEventListener('click', () => {
    gender = 'female';
    updateButtonStyles(btnFemale, btnMale);
});
btnMetric.addEventListener('click', () => {
    if (units === 'imperial') {
        weightInput.value = ''; heightCmInput.value = '';
    }
    units = 'metric';
    updateUnitsUI();
});
btnImperial.addEventListener('click', () => {
    if (units === 'metric') {
        weightInput.value = ''; heightFtInput.value = ''; heightInInput.value = '';
    }
    units = 'imperial';
    updateUnitsUI();
});

activitySelect.addEventListener('change', (e) => {
    activityLevel = parseFloat(e.target.value);
});

macroBalancedBtn.addEventListener('click', () => setMacroPlan('balanced'));
macroLowCarbBtn.addEventListener('click', () => setMacroPlan('lowCarb'));
macroHighProteinBtn.addEventListener('click', () => setMacroPlan('highProtein'));

btnCalculate.addEventListener('click', calculate);
btnReset.addEventListener('click', reset);

// --- Initializer ---
function init() {
    updateButtonStyles(btnMale, btnFemale);
    updateUnitsUI();
    updateMacroButtons();
}

init();