document.addEventListener("DOMContentLoaded", function () {
    
    // Just a tiny helper I keep reusing in projects
    const grab = (id) => document.getElementById(id);
    const toNum = (id) => parseFloat(grab(id).value) || 0; // might revisit this fallback later

    /* Soil multipliers
       I always forget which soils boost what, so writing this out again for my own sanity.
    */
    const SOIL_MODIFIERS = {
        loamy: { n: 1,   p: 1,    k: 1 },
        sandy: { n: 1.2, p: 1,    k: 1.2 },
        clay:  { n: 0.9, p: 1.2,  k: 1 }
    };

    // Basic fertilizer contents, oxide basis nothing fancy
    const fertTable = {
        urea: { n: 0.46, p: 0,    k: 0 },
        dap:  { n: 0.18, p: 0.46, k: 0 },
        mop:  { n: 0,    p: 0,    k: 0.60 }
    };

    // Conversions I always forget so they live here
    const CONVERT = {
        P_TO_P2O5: 2.2913,
        K_TO_K2O: 1.2046,
        ACRE_TO_HA: 0.404686
    };

    // --- UI BEHAVIOR STUFF ---
    function updateBasisLabels() {
        const basis = grab('nutrient-basis').value;

        // Probably over-commented but I like knowing *why* I'm doing this later.
        let pLabel = "Phosphorus Target";
        let kLabel = "Potassium Target";

        if (basis === "elemental") {
            pLabel += " <b>(Elemental P)</b>";
            kLabel += " <b>(Elemental K)</b>";
        } else {
            pLabel += " <b>(Oxide P₂O₅)</b>";
            kLabel += " <b>(Oxide K₂O)</b>";
        }

        grab("label-p").innerHTML = pLabel;
        grab("label-k").innerHTML = kLabel;
    }

    // Show/hide split / custom blend panels
    function toggleSplit() {
        grab("split-app-inputs").style.display =
            grab("split-app-enable").checked ? "block" : "none";
    }

    function toggleCustom() {
        grab("custom-blend-inputs").style.display =
            grab("custom-blend-enable").checked ? "block" : "none";
    }

    // Crop presets (I should probably expand these someday)
    function applyPreset() {
        const crop = grab("crop-type").value;

        const presets = {
            "Custom": { n: 100, p: 50, k: 50 },
            "Corn (Maize)": { n: 180, p: 70, k: 80 },
            "Wheat": { n: 120, p: 50, k: 40 },
            "Rice": { n: 100, p: 40, k: 40 },
            "Potatoes": { n: 160, p: 120, k: 200 }
        };

        let sel = presets[crop];
        if (!sel) return; // shouldn't happen but just in case

        grab("nitrogen").value   = sel.n;
        grab("phosphorus").value = sel.p;
        grab("potassium").value  = sel.k;

        // I default back to oxide because 95% of recommendations use oxide labels anyway.
        grab("nutrient-basis").value = "oxide";
        updateBasisLabels();
    }

    // Populate crop list manually no need to be fancy
    ["Custom", "Corn (Maize)", "Wheat", "Rice", "Potatoes"].forEach(crop => {
        grab("crop-type").add(new Option(crop, crop));
    });

    // --- EVENTS ----
    grab("crop-type").addEventListener("change", applyPreset);
    grab("nutrient-basis").addEventListener("change", updateBasisLabels);
    grab("split-app-enable").addEventListener("change", toggleSplit);
    grab("custom-blend-enable").addEventListener("change", toggleCustom);
    grab("reset-btn").addEventListener("click", () => location.reload());

    // MAIN CALC BUTTON
    grab("calculate-btn").addEventListener("click", function () {

        // Collect input (little messy but it's fine for now)
        const basisType = grab("nutrient-basis").value;

        let N_req = toNum("nitrogen");
        let P_req = toNum("phosphorus");
        let K_req = toNum("potassium");

        const soilType = grab("soil-type").value;

        // Convert elemental to oxide if necessary
        if (basisType === "elemental") {
            P_req = P_req * CONVERT.P_TO_P2O5;
            K_req = K_req * CONVERT.K_TO_K2O;
            // NOTE: N has no oxide conversion, which always weirded me out
        }

        // Apply soil corrections  
        const mod = SOIL_MODIFIERS[soilType] || SOIL_MODIFIERS.loamy;
        const N_adj = N_req * mod.n;
        const P_adj = P_req * mod.p;
        const K_adj = K_req * mod.k;

        // Deficits to fill  
        let remN = N_adj;
        let remP = P_adj;
        let remK = K_adj;

        // Output fertilizer rates (kg/ha)
        let rateBlend = 0,
            rateDAP   = 0,
            rateMOP   = 0,
            rateUrea  = 0;

        // CUSTOM BLEND HANDLING
        if (grab("custom-blend-enable").checked) {

            // Small inconsistency: naming here is slightly different than fertTable keys
            const cn = toNum("custom-n") / 100;
            const cp = toNum("custom-p") / 100;
            const ck = toNum("custom-k") / 100;

            const how = grab("blend-strategy").value;

            // A bit repetitive but makes the thinking clearer
            if (how === "p-based" && cp > 0) {
                rateBlend = remP / cp;
            } else if (how === "k-based" && ck > 0) {
                rateBlend = remK / ck;
            } else {
                // fallback by N — usually not ideal
                rateBlend = remN / cn;
            }

            // Apply blend contributions
            remN -= rateBlend * cn;
            remP -= rateBlend * cp;
            remK -= rateBlend * ck;
        }

        // K from MOP
        if (remK > 0) {
            rateMOP = remK / fertTable.mop.k;
            remK = 0;
        }

        // P from DAP (adds some N, remember)
        if (remP > 0) {
            rateDAP = remP / fertTable.dap.p;
            remN -= rateDAP * fertTable.dap.n;
        }

        // Remaining N from urea
        if (remN > 0) {
            rateUrea = remN / fertTable.urea.n;
        }

        // Tell the renderer to take over from here
        renderEverything(
            { n: N_adj, p: P_adj, k: K_adj },
            { "Urea": rateUrea, "DAP": rateDAP, "MOP": rateMOP, "Custom Blend": rateBlend }
        );
    });

    // --- RENDER SECTION ---
    function renderEverything(targets, fertRates) {

        const currency = grab("currency-symbol").value;
        const unit = grab("unit-switcher").value;

        const rawSize = toNum("field-size");
        const sizeHa  = (unit === "acre") ? rawSize * CONVERT.ACRE_TO_HA : rawSize;

        // convert kg/ha → kg/acre (approx)
        const conv = (unit === "acre") ? 0.4047 : 1;
        const unitText = (unit === "acre") ? "kg / acre" : "kg / ha";

        const splitting = grab("split-app-enable").checked;
        const splitPct  = splitting ? (toNum("split-app-percentage") / 100) : 0;

        let appliedN = 0,
            appliedP = 0,
            appliedK = 0;

        let totalCost = 0;
        let rows = "";

        const priceLookup = {
            "Urea": toNum("urea-price"),
            "DAP": toNum("dap-price"),
            "MOP": toNum("mop-price"),
            "Custom Blend": toNum("custom-price")
        };

        // re-map custom blend content structure
        const contentMap = {
            "Urea": fertTable.urea,
            "DAP": fertTable.dap,
            "MOP": fertTable.mop,
            "Custom Blend": {
                n: toNum("custom-n") / 100,
                p: toNum("custom-p") / 100,
                k: toNum("custom-k") / 100
            }
        };

        // Loop through products
        for (let [name, kgHa] of Object.entries(fertRates)) {

            if (kgHa < 0.1) continue; // skip tiny noise values

            const disp = kgHa * conv;
            const totalKg = kgHa * sizeHa;

            let cost = totalKg * (priceLookup[name] || 0);
            totalCost += cost;

            // Sum nutrients
            appliedN += kgHa * contentMap[name].n;
            appliedP += kgHa * contentMap[name].p;
            appliedK += kgHa * contentMap[name].k;

            // Splits (only Urea for now)
            let firstDose = disp, secondDose = 0;
            if (splitting && name === "Urea") {
                secondDose = disp * splitPct;
                firstDose  = disp - secondDose;
            }

            rows += `
                <tr>
                    <td class="p-3 font-semibold">${name}</td>
                    <td class="p-3">${firstDose.toFixed(1)} <small>${unitText}</small></td>
                    <td class="p-3">${secondDose > 0 ? secondDose.toFixed(1) + " <small>" + unitText + "</small>" : "-"}</td>
                    <td class="p-3">${disp.toFixed(1)}</td>
                    <td class="p-3 font-mono">${totalKg.toFixed(1)} kg</td>
                    <td class="p-3">${currency}${cost.toFixed(2)}</td>
                </tr>
            `;
        }

        grab("schedule-tbody").innerHTML = rows;
        grab("total-cost-display").innerText = currency + totalCost.toFixed(2);

        // BALANCE TABLE
        function balanceRow(name, target, got) {
            const diff = got - target;
            const ok = Math.abs(diff) < 2;
            let label = ok ? "✔️ Balanced" :
                        diff > 0 ? "+" + diff.toFixed(1) + " (Surplus)" :
                                   diff.toFixed(1) + " Deficit";

            return `
                <tr>
                    <td class="p-3">${name}</td>
                    <td class="p-3 font-mono">${target.toFixed(1)}</td>
                    <td class="p-3 font-mono font-bold text-green-500">${got.toFixed(1)}</td>
                    <td class="p-3 font-bold ${ok ? "text-green-600" : "text-red-500"}">${label}</td>
                </tr>
            `;
        }

        grab("balance-tbody").innerHTML =
            balanceRow("Nitrogen (N)", targets.n, appliedN) +
            balanceRow("Phosphate (P₂O₅)", targets.p, appliedP) +
            balanceRow("Potash (K₂O)", targets.k, appliedK);

        // Little notifier tag
        if (grab("nutrient-basis").value === "elemental") {
            grab("basis-alert").innerHTML =
                "⚠️ Converted your input from <b>Elemental</b> → <b>Oxide</b> values.";
        } else {
            grab("basis-alert").innerHTML =
                "ℹ️ Working directly with Oxide-based entries.";
        }

        // And finally reveal the results
        const out = grab("results-section");
        out.classList.remove("hidden");
        out.scrollIntoView({ behavior: "smooth" });
    }

    // Initial label tweak
    updateBasisLabels();
});
