document.addEventListener('DOMContentLoaded', () => {
    // === UTILS ===
    const el = (id) => document.getElementById(id);
    const showNotification = (message, duration = 3000) => {
        const notification = el('notification');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), duration);
    };

    // === ELEMENT REFERENCES ===
    const elements = {
        crop: el('crop-type'), soil: el('soil-type'), size: el('field-size'), unit: el('unit-switcher'),
        n: el('nitrogen'), p: el('phosphorus'), k: el('potassium'),
        currency: el('currency-symbol'), uPrice: el('urea-price'), dPrice: el('dap-price'), mPrice: el('mop-price'),
        outputUnit: el('output-unit'), calcBtn: el('calculate-btn'), resetBtn: el('reset-btn'),
        results: el('results-section'), resultsSummary: el('results-summary'), advisory: el('advisory-note'),
        
        customEnable: el('custom-blend-enable'), customInputsDiv: el('custom-blend-inputs'),
        customN: el('custom-n'), customP: el('custom-p'), customK: el('custom-k'),
        customPrice: el('custom-price'), blendStrategy: el('blend-strategy'),
        
        splitEnable: el('split-app-enable'), splitInputsDiv: el('split-app-inputs'), splitPercent: el('split-app-percentage'),
        allInputs: document.querySelectorAll('input, select')
    };

    // === CONSTANTS & DATA ===
    const PRESETS = {
        "Custom": { n: 120, p: 60, k: 60 }, "Corn": { n: 180, p: 75, k: 90 }, "Wheat": { n: 120, p: 60, k: 40 }, 
        "Rice": { n: 100, p: 50, k: 50 }, "Potato": { n: 160, p: 150, k: 200 }, "Soybean": { n: 20, p: 50, k: 80 }
    };
    const SOIL_MOD = {
        loamy: { n: 1.0, p: 1.0, k: 1.0 }, sandy: { n: 1.15, p: 1.0, k: 1.15 }, clay: { n: 0.9, p: 1.1, k: 1.0 }
    };
    const FERT = { urea: { n: 0.46, p: 0, k: 0 }, dap: { n: 0.18, p: 0.46, k: 0 }, mop: { n: 0, p: 0, k: 0.60 } }; // P content is P2O5, K is K2O
    const CONV = { ACRE_HA: 0.404686, P_P2O5: 2.291, K_K2O: 1.205, KG_LBS: 2.20462, KGHA_LBSACRE: 0.892179 };

    // === INITIALIZATION ===
    function init() {
        populateCrops();
        if (!loadSettings()) { resetCalculator(false); }
        setupEventListeners();
        toggleCustomBlend();
        toggleSplitApp();
    }

    function setupEventListeners() {
        elements.allInputs.forEach(input => input.addEventListener('change', saveSettings));
        elements.crop.addEventListener('change', handleCropChange);
        elements.customEnable.addEventListener('change', toggleCustomBlend);
        elements.splitEnable.addEventListener('change', toggleSplitApp);
        elements.calcBtn.addEventListener('click', calculate);
        elements.resetBtn.addEventListener('click', () => resetCalculator(true));
    }

    // === UI TOGGLES ===
    const toggleCustomBlend = () => {
        elements.customInputsDiv.style.display = elements.customEnable.checked ? 'block' : 'none';
    };
    const toggleSplitApp = () => {
        const enabled = elements.splitEnable.checked;
        elements.splitInputsDiv.style.display = enabled ? 'block' : 'none';
        elements.splitPercent.disabled = !enabled;
    };
    
    // === SETUP FUNCTIONS ===
    const populateCrops = () => { Object.keys(PRESETS).forEach(crop => elements.crop.add(new Option(crop, crop))); };
    
    const handleCropChange = () => {
        const values = PRESETS[elements.crop.value];
        if (values) {
            elements.n.value = values.n; elements.p.value = values.p; elements.k.value = values.k;
        }
        saveSettings();
    };

    // === DATA PERSISTENCE ===
    function saveSettings() {
        const settings = {};
        for (const key in elements) {
            const el = elements[key];
            if (el.id && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
                settings[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            }
        }
        localStorage.setItem('fertSettingsV2', JSON.stringify(settings));
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('fertSettingsV2'));
        if (!settings) return false;
        for (const key in settings) {
            const el = document.getElementById(key); // Use getElementById to be safe
            if (el && typeof el.value !== 'undefined') {
                if (el.type === 'checkbox') el.checked = settings[key];
                else el.value = settings[key];
            }
        }
        return true;
    }

    function resetCalculator(notify) {
        localStorage.removeItem('fertSettingsV2');
        const defaults = {"crop-type":"Custom","soil-type":"loamy","field-size":"10","unit-switcher":"hectare","nitrogen":"120","phosphorus":"60","potassium":"60","currency-symbol":"$","urea-price":"0.7","dap-price":"0.9","mop-price":"0.6","output-unit":"kg","custom-blend-enable":false,"custom-n":"10","custom-p":"10","custom-k":"10","custom-price":"0.8","blend-strategy":"p-based", "split-app-enable": false, "split-app-percentage": "50"};
        Object.keys(defaults).forEach(key => { 
            const el = document.getElementById(key);
            if (el) {
                 if (el.type === 'checkbox') el.checked = defaults[key];
                 else el.value = defaults[key];
            }
        });
        toggleCustomBlend();
        toggleSplitApp();
        elements.results.style.display = 'none';
        if (notify) showNotification("Calculator has been reset.", 2000);
    }

    // === CORE CALCULATION LOGIC ===
    function calculate() {
        // 1. Get Adjusted Nutrient Targets
        const soilMod = SOIL_MOD[elements.soil.value];
        const baseN = parseFloat(elements.n.value) || 0, baseP = parseFloat(elements.p.value) || 0, baseK = parseFloat(elements.k.value) || 0;
        const adjN = baseN * soilMod.n;
        const adjP = baseP * soilMod.p;
        const adjK = baseK * soilMod.k;
        const reqP2O5 = adjP * CONV.P_P2O5;
        const reqK2O = adjK * CONV.K_K2O;

        let fertRates = {};
        if (elements.customEnable.checked) {
            fertRates = calculateWithBlend({ adjN, reqP2O5, reqK2O });
        } else {
            fertRates = calculateStandard({ adjN, reqP2O5, reqK2O });
        }
        
        displayResults({ adjN, adjP, adjK, reqP2O5, reqK2O }, fertRates);
    }
    
    function calculateStandard({ adjN, reqP2O5, reqK2O }) {
        const rateMOP = reqK2O > 0 ? reqK2O / FERT.mop.k : 0;
        const rateDAP = reqP2O5 > 0 ? reqP2O5 / FERT.dap.p : 0;
        let nFromDAP = rateDAP * FERT.dap.n;
        let ureaN = adjN - nFromDAP;
        if (ureaN < 0) ureaN = 0;
        const rateUrea = ureaN > 0 ? ureaN / FERT.urea.n : 0;

        return { "Urea": rateUrea, "DAP": rateDAP, "MOP": rateMOP };
    }
    
    function calculateWithBlend({ adjN, reqP2O5, reqK2O }) {
        const cN = (parseFloat(elements.customN.value) / 100) || 0;
        const cP2O5 = (parseFloat(elements.customP.value) / 100) || 0;
        const cK2O = (parseFloat(elements.customK.value) / 100) || 0;
        
        let rateBlend = 0;
        let deficitN = adjN, deficitP2O5 = reqP2O5, deficitK2O = reqK2O;

        if (elements.blendStrategy.value === 'p-based' && cP2O5 > 0) {
            rateBlend = reqP2O5 / cP2O5;
        } else if (elements.blendStrategy.value === 'k-based' && cK2O > 0) {
            rateBlend = reqK2O / cK2O;
        }
        
        if (rateBlend > 0) {
            deficitN -= rateBlend * cN;
            deficitP2O5 -= rateBlend * cP2O5;
            deficitK2O -= rateBlend * cK2O;
        }
        
        const {Urea, DAP, MOP} = calculateStandard({ adjN: deficitN > 0 ? deficitN : 0, reqP2O5: deficitP2O5 > 0 ? deficitP2O5 : 0, reqK2O: deficitK2O > 0 ? deficitK2O : 0 });

        return { "Custom Blend": rateBlend, "Urea": Urea, "DAP": DAP, "MOP": MOP };
    }

    // === DISPLAY RESULTS ===
    function displayResults(targets, rates) {
        const currency = elements.currency.value;
        const sizeHA = elements.unit.value === 'acre' ? (parseFloat(elements.size.value) * CONV.ACRE_HA) : parseFloat(elements.size.value);
        const isLbs = elements.outputUnit.value === 'lbs';
        const rateConv = isLbs ? CONV.KGHA_LBSACRE : 1;
        const massConv = isLbs ? CONV.KG_LBS : 1;
        const rateUnit = isLbs ? 'lbs/acre' : 'kg/ha';
        const massUnit = isLbs ? 'lbs' : 'kg';
        const splitEnabled = elements.splitEnable.checked;
        const splitPct = (parseFloat(elements.splitPercent.value) || 0) / 100;
        const prices = {
            "Urea": parseFloat(elements.uPrice.value), "DAP": parseFloat(elements.dPrice.value),
            "MOP": parseFloat(elements.mPrice.value), "Custom Blend": parseFloat(elements.customPrice.value)
        };
        const blendNutrients = {
            n: (parseFloat(elements.customN.value)/100)||0, p: (parseFloat(elements.customP.value)/100)||0, k: (parseFloat(elements.customK.value)/100)||0
        };

        let totalCost = 0;
        let tableRows = '';
        let appliedN = 0, appliedP2O5 = 0, appliedK2O = 0;
        let advisoryMessages = [];
        
        const FERT_INFO = {
             "Urea": {n: FERT.urea.n, p: 0, k: 0}, "DAP": {n: FERT.dap.n, p: FERT.dap.p, k: 0},
             "MOP": {n: 0, p: 0, k: FERT.mop.k}, "Custom Blend": {n: blendNutrients.n, p: blendNutrients.p, k: blendNutrients.k}
        };

        for (const fertName in rates) {
            if (rates[fertName] <= 0.001) continue;

            const totalRateKgHa = rates[fertName];
            const costPerKg = prices[fertName] || 0;
            const totalAmountKg = totalRateKgHa * sizeHA;
            const cost = totalAmountKg * costPerKg;
            totalCost += cost;
            
            const nCont = totalRateKgHa * FERT_INFO[fertName].n;
            const pCont = totalRateKgHa * FERT_INFO[fertName].p;
            const kCont = totalRateKgHa * FERT_INFO[fertName].k;
            appliedN += nCont; appliedP2O5 += pCont; appliedK2O += kCont;
            
            let rate1 = totalRateKgHa;
            let rate2 = 0;
            if (splitEnabled && ['Urea'].includes(fertName)) {
                 rate1 = totalRateKgHa * (1 - splitPct);
                 rate2 = totalRateKgHa * splitPct;
            } else if (splitEnabled) {
                // For DAP, MOP, Custom, all goes in App 1
                rate1 = totalRateKgHa;
                rate2 = 0;
            }

            tableRows += `<tr>
                <td><b>${fertName}</b></td>
                <td>${(splitEnabled ? (rate1 * rateConv).toFixed(1) : '-')}</td>
                <td>${(splitEnabled ? (rate2 * rateConv).toFixed(1) : '-')}</td>
                <td><b>${(totalRateKgHa * rateConv).toFixed(1)}</b></td>
                <td>${(totalAmountKg * massConv).toFixed(1)}</td>
                <td>${currency}${(cost).toFixed(2)}</td>
            </tr>`;
            
            if (nCont > 0 || pCont > 0 || kCont > 0) {
                 tableRows += `<tr class="breakdown-row">
                    <td colspan="6">
                        Nutrients Supplied: 
                        ${nCont > 0 ? `<b>${nCont.toFixed(1)}</b> N, ` : ''} 
                        ${pCont > 0 ? `<b>${pCont.toFixed(1)}</b> P₂O₅, ` : ''} 
                        ${kCont > 0 ? `<b>${kCont.toFixed(1)}</b> K₂O` : ''} 
                        (kg/ha)
                    </td>
                </tr>`;
            }
        }
        
        const appliedP = appliedP2O5 / CONV.P_P2O5, appliedK = appliedK2O / CONV.K_K2O;
        const balanceN = appliedN - targets.adjN, balanceP = appliedP - targets.adjP, balanceK = appliedK - targets.adjK;
        
        if (Math.abs(balanceN) > 1) advisoryMessages.push(`Nitrogen application has a balance of ${balanceN.toFixed(1)} kg/ha.`);
        if (Math.abs(balanceP) > 1) advisoryMessages.push(`Phosphorus application has a balance of ${balanceP.toFixed(1)} kg/ha.`);
        if (Math.abs(balanceK) > 1) advisoryMessages.push(`Potassium application has a balance of ${balanceK.toFixed(1)} kg/ha.`);
        if (elements.soil.value === 'sandy' && appliedN > 0) {
            advisoryMessages.push(`For Sandy soils, split applying Nitrogen (and Potassium, if high rate) is recommended to improve efficiency.`);
        }

        elements.resultsSummary.innerHTML = `
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Nutrient Balance (kg/ha)</h3>
            <div class="overflow-x-auto">
            <table>
                <thead><tr><th>Nutrient</th><th>Target (Adjusted)</th><th>Applied</th><th>Balance</th></tr></thead>
                <tbody>
                    <tr><td><b>N (Elemental)</b></td><td>${targets.adjN.toFixed(1)}</td><td>${appliedN.toFixed(1)}</td><td>${balanceN.toFixed(1)}</td></tr>
                    <tr><td><b>P (Elemental)</b></td><td>${targets.adjP.toFixed(1)}</td><td>${appliedP.toFixed(1)}</td><td>${balanceP.toFixed(1)}</td></tr>
                    <tr><td><b>K (Elemental)</b></td><td>${targets.adjK.toFixed(1)}</td><td>${appliedK.toFixed(1)}</td><td>${balanceK.toFixed(1)}</td></tr>
                </tbody>
            </table>
            </div>
            
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">Application & Cost Plan</h3>
            <div class="overflow-x-auto">
            <table>
                 <thead>
                    <tr>
                        <th>Fertilizer</th>
                        <th>${splitEnabled ? `App 1 Rate (${rateUnit})` : '-'}</th>
                        <th>${splitEnabled ? `App 2 Rate (${rateUnit})` : '-'}</th>
                        <th>Total Rate (${rateUnit})</th>
                        <th>Total Amount (${massUnit})</th>
                        <th>Total Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="5"><b>GRAND TOTAL</b></td>
                        <td><b>${currency}${totalCost.toFixed(2)}</b></td>
                    </tr>
                </tfoot>
            </table>
            </div>`;

        if (advisoryMessages.length > 0) {
            elements.advisory.innerHTML = `<strong class="font-semibold">Agronomic Advisory:</strong><ul class="list-disc pl-5 mt-2"><li>${advisoryMessages.join("</li><li>")}</li></ul>`;
            elements.advisory.style.display = 'block';
        } else {
            elements.advisory.style.display = 'none';
        }

        elements.results.style.display = 'block';
        elements.results.scrollIntoView({ behavior: 'smooth' });
    }

    // Initialize the calculator on load
    init();
});