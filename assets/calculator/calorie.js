    document.addEventListener('DOMContentLoaded', () => {
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
        const goalSelect = document.getElementById('goal');
        const macroSelect = document.getElementById('macro-split');

        const heightMetricContainer = document.getElementById('height-metric-container');
        const heightImperialContainer = document.getElementById('height-imperial-container');
        const labelWeight = document.getElementById('label-weight');
        
        const errorMessageContainer = document.getElementById('error-message-container');
        const errorMessageText = document.getElementById('error-message-text');

        const btnCalculate = document.getElementById('btn-calculate');
        const btnReset = document.getElementById('btn-reset');
        
        const resultsContainer = document.getElementById('results-container');
        const maintenanceEl = document.getElementById('maintenance-calories');
        const goalEl = document.getElementById('goal-calories');
        const goalTitleEl = document.getElementById('goal-title');
        const proteinGramsEl = document.getElementById('protein-grams');
        const carbsGramsEl = document.getElementById('carbs-grams');
        const fatGramsEl = document.getElementById('fat-grams');
        const proteinPercentEl = document.getElementById('protein-percent');
        const carbsPercentEl = document.getElementById('carbs-percent');
        const fatPercentEl = document.getElementById('fat-percent');


        // --- State ---
        let gender = 'male';
        let units = 'metric';

        const goalTitles = {
            'maintain': 'Maintain Weight', 'lose-mild': 'Mild Weight Loss', 'lose-std': 'Weight Loss',
            'gain-mild': 'Mild Weight Gain', 'gain-std': 'Weight Gain'
        };
        const macroSplits = {
            'balanced': { p: 0.30, c: 0.40, f: 0.30 },
            'low-carb': { p: 0.40, c: 0.20, f: 0.40 },
            'high-protein': { p: 0.40, c: 0.30, f: 0.30 },
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
            goalSelect.value = 'maintain';
            macroSelect.value = 'balanced';
            
            resultsContainer.style.display = 'none';
            errorMessageContainer.style.display = 'none';
            
            init();
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
            
            let bmr = (gender === 'male')
                ? 88.362 + (13.397 * weightInKg) + (4.799 * heightInCm) - (5.677 * age)
                : 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age);

            const tdee = bmr * parseFloat(activitySelect.value);
            const calorieAdjustment = { 'lose-mild': -250, 'lose-std': -500, 'gain-mild': 250, 'gain-std': 500, 'maintain': 0 }[goalSelect.value];
            const finalCalories = tdee + calorieAdjustment;

            maintenanceEl.textContent = Math.round(tdee);
            goalEl.textContent = Math.round(finalCalories);
            goalTitleEl.textContent = goalTitles[goalSelect.value];
            
            const targetCalsForMacros = finalCalories > 0 ? finalCalories : 0;
            const currentSplit = macroSplits[macroSelect.value];

            proteinGramsEl.textContent = Math.round((targetCalsForMacros * currentSplit.p) / 4) + ' g';
            carbsGramsEl.textContent = Math.round((targetCalsForMacros * currentSplit.c) / 4) + ' g';
            fatGramsEl.textContent = Math.round((targetCalsForMacros * currentSplit.f) / 9) + ' g';
            
            proteinPercentEl.textContent = `Protein (${currentSplit.p * 100}%)`;
            carbsPercentEl.textContent = `Carbs (${currentSplit.c * 100}%)`;
            fatPercentEl.textContent = `Fat (${currentSplit.f * 100}%)`;

            resultsContainer.style.display = 'block';
            
            document.getElementById('results-heading')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

        btnCalculate.addEventListener('click', calculate);
        btnReset.addEventListener('click', reset);

        // --- Initializer ---
        function init() {
            updateButtonStyles(btnMale, btnFemale);
            updateUnitsUI();
        }
        
        init();
    });