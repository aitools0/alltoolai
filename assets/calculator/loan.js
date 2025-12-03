document.addEventListener('DOMContentLoaded', function () {

    // I usually wrap stuff like this so I remember what it's for later…
    const calcBox = document.getElementById('loan-calculator');

    if (calcBox) {

        // Grabbing elements — probably could shorten these, but meh.
        const amtInput = calcBox.querySelector('#principal');
        const rateInput = calcBox.querySelector('#interestRate');
        const tenureInput = calcBox.querySelector('#loanTenure');
        const tenureUnit = calcBox.querySelector('#tenureType');

        const monthlyTxt = calcBox.querySelector('#monthly-payment');
        const interestTxt = calcBox.querySelector('#total-interest');
        const totalTxt = calcBox.querySelector('#total-payment');

        const toggleBtn = calcBox.querySelector('#amortization-btn');
        const amortSection = calcBox.querySelector('#amortization-details');
        const amortBody = calcBox.querySelector('#amortization-tbody');

        // Keeping track of whether the schedule is open
        let showingSchedule = false;

        // Formatter — I always forget the syntax so I'm leaving this note.
        const cashFmt = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        });

        // --- Main calc function ---
        const recalcEverything = () => {

            // parsing with some fallback so the UI doesn't explode
            const principalVal = parseFloat(amtInput.value) || 0;
            const rateYearly = parseFloat(rateInput.value) || 0;
            const rawTenure = parseInt(tenureInput.value) || 0;

            // quick validation
            if (principalVal <= 0 || rateYearly < 0 || rawTenure <= 0) {
                wipeResults();
                return;
            }

            const monthlyRate = rateYearly / 12 / 100;

            // converting to months — honestly I mix this up sometimes
            const months = (tenureUnit.value === 'years')
                ? rawTenure * 12
                : rawTenure;

            let monthlyPay;

            // Old-school formula; leaving it verbose for my own sanity
            if (monthlyRate === 0) {
                monthlyPay = principalVal / months;
            } else {
                const powVal = Math.pow(1 + monthlyRate, months);
                monthlyPay = (principalVal * monthlyRate * powVal) / (powVal - 1);
            }

            if (!isFinite(monthlyPay)) {
                wipeResults();
                return;
            }

            const totalPaid = monthlyPay * months;
            const interestPaid = totalPaid - principalVal;

            // Update UI
            monthlyTxt.textContent = cashFmt.format(monthlyPay);
            interestTxt.textContent = cashFmt.format(interestPaid);
            totalTxt.textContent = cashFmt.format(totalPaid);

            // If the amortization table is open, refresh it
            if (showingSchedule) {
                // Passing values in an object because it feels cleaner (subjective)
                drawSchedule({
                    principalVal,
                    monthlyRate,
                    months,
                    monthlyPay
                });
            }
        };

        // --- Amortization Table Builder ---
        const drawSchedule = (opts) => {

            // unpack object; a bit unnecessary but looks neat
            let { principalVal, monthlyRate, months, monthlyPay } = opts;

            let leftover = principalVal;
            const frag = document.createDocumentFragment();

            // NOTE: had a thought to group by year differently… leaving this for later
            for (let i = 1; i <= months; i++) {

                // Insert year header rows (this is kinda fun)
                if ((i - 1) % 12 === 0) {
                    const curYr = Math.floor((i - 1) / 12) + 1;
                    const yrRow = document.createElement('tr');

                    yrRow.innerHTML = `
                        <td colspan="4"
                            class="p-3 text-center text-2xl font-bold text-indigo-600">
                            #${curYr} Year
                        </td>
                    `;
                    frag.appendChild(yrRow);
                }

                // Mathy bits  
                const interestFrag = leftover * monthlyRate;

                // could inline this but I always forget where rounding errors slip in
                let prinFrag = monthlyPay - interestFrag;
                leftover -= prinFrag;

                // Fix small float leftovers (learned this the hard way lol)
                if (Math.abs(leftover) < 0.01) {
                    prinFrag += leftover;
                    leftover = 0;
                }

                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-200 dark:hover:bg-slate-800';

                row.innerHTML = `
                    <td class="p-3 text-lg text-slate-900 dark:text-white">${i}</td>
                    <td class="p-3 text-xl text-right font-semibold text-green-500">
                        ${cashFmt.format(prinFrag)}
                    </td>
                    <td class="p-3 text-xl text-right font-semibold text-red-500">
                        ${cashFmt.format(interestFrag)}
                    </td>
                    <td class="p-3 text-xl text-right font-semibold text-blue-500">
                        ${cashFmt.format(leftover)}
                    </td>
                `;

                frag.appendChild(row);
            }

            // wipe existing rows
            amortBody.innerHTML = '';
            amortBody.appendChild(frag);
        };


        // --- Reset function when inputs break things ---
        const wipeResults = () => {
            const zeroish = cashFmt.format(0);
            monthlyTxt.textContent = zeroish;
            interestTxt.textContent = zeroish;
            totalTxt.textContent = zeroish;

            // auto-hide the table if visible
            if (showingSchedule) {
                flipSchedule();   // toggles open/close
            }

            amortBody.innerHTML = '';
        };


        // --- Toggle schedule visibility ---
        const flipSchedule = () => {
            showingSchedule = !showingSchedule;

            amortSection.classList.toggle('hidden', !showingSchedule);
            toggleBtn.textContent = showingSchedule
                ? 'Hide Amortization Schedule'
                : 'View Amortization Schedule';

            // lazy refresh after opening
            if (showingSchedule) {
                recalcEverything();
            }
        };


        // adding listeners (I always debate debouncing these… maybe later)
        const interactiveInputs = [
            amtInput,
            rateInput,
            tenureInput,
            tenureUnit
        ];

        interactiveInputs.forEach(el => {
            el.addEventListener('input', recalcEverything);
        });

        toggleBtn.addEventListener('click', flipSchedule);

        // Initial calc (otherwise UI shows zeros which feels broken)
        recalcEverything();
    }
});
