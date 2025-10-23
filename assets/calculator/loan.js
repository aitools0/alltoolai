document.addEventListener('DOMContentLoaded', function () {
    // --- Loan Calculator Script ---
    const loanCalculator = document.getElementById('loan-calculator');
    if (loanCalculator) {
        const principalInput = loanCalculator.querySelector('#principal');
        const interestRateInput = loanCalculator.querySelector('#interestRate');
        const loanTenureInput = loanCalculator.querySelector('#loanTenure');
        const tenureTypeSelect = loanCalculator.querySelector('#tenureType');
        const monthlyPaymentSpan = loanCalculator.querySelector('#monthly-payment');
        const totalInterestSpan = loanCalculator.querySelector('#total-interest');
        const totalPaymentSpan = loanCalculator.querySelector('#total-payment');
        const amortizationBtn = loanCalculator.querySelector('#amortization-btn');
        const amortizationDetailsDiv = loanCalculator.querySelector('#amortization-details');
        const amortizationTbody = loanCalculator.querySelector('#amortization-tbody');

        let isAmortizationVisible = false;

        const numberFormatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        });

        const calculateAndDisplay = () => {
            const p = parseFloat(principalInput.value) || 0;
            const annualRate = parseFloat(interestRateInput.value) || 0;
            const tenureValue = parseInt(loanTenureInput.value) || 0;

            if (p <= 0 || annualRate < 0 || tenureValue <= 0) {
                clearResults();
                return;
            }

            const monthlyRate = annualRate / 12 / 100;
            const tenureInMonths = tenureTypeSelect.value === 'years' ? tenureValue * 12 : tenureValue;

            let payment;
            if (monthlyRate === 0) {
                payment = p / tenureInMonths;
            } else {
                const powerTerm = Math.pow(1 + monthlyRate, tenureInMonths);
                payment = (p * monthlyRate * powerTerm) / (powerTerm - 1);
            }

            if (!isFinite(payment)) {
                clearResults();
                return;
            }

            const totalPayment = payment * tenureInMonths;
            const totalInterest = totalPayment - p;

            monthlyPaymentSpan.textContent = numberFormatter.format(payment);
            totalInterestSpan.textContent = numberFormatter.format(totalInterest);
            totalPaymentSpan.textContent = numberFormatter.format(totalPayment);

            if (isAmortizationVisible) {
                renderAmortizationSchedule({
                    p,
                    monthlyRate,
                    tenureInMonths,
                    payment
                });
            }
        };

        const renderAmortizationSchedule = ({
            p,
            monthlyRate,
            tenureInMonths,
            payment
        }) => {
            let balance = p;
            const fragment = document.createDocumentFragment();

            for (let i = 1; i <= tenureInMonths; i++) {
                const interestPayment = balance * monthlyRate;
                let principalPayment = payment - interestPayment;
                balance -= principalPayment;

                if (Math.abs(balance) < 0.01) {
                    principalPayment += balance;
                    balance = 0;
                }

                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-100 dark:hover:bg-slate-800';
                row.innerHTML = `
                        <td class="p-3 text-slate-500 dark:text-slate-400">${i}</td>
                        <td class="p-3 text-right font-semibold text-green-500">${numberFormatter.format(principalPayment)}</td>
                        <td class="p-3 text-right font-semibold text-red-500">${numberFormatter.format(interestPayment)}</td>
                        <td class="p-3 font-semibold text-blue-500 text-right">${numberFormatter.format(balance)}</td>`;
                fragment.appendChild(row);
            }
            amortizationTbody.innerHTML = '';
            amortizationTbody.appendChild(fragment);
        };

        const clearResults = () => {
            const zero = numberFormatter.format(0);
            monthlyPaymentSpan.textContent = zero;
            totalInterestSpan.textContent = zero;
            totalPaymentSpan.textContent = zero;
            if (isAmortizationVisible) {
                toggleAmortization();
            }
            amortizationTbody.innerHTML = '';
        };

        const toggleAmortization = () => {
            isAmortizationVisible = !isAmortizationVisible;
            amortizationDetailsDiv.classList.toggle('hidden', !isAmortizationVisible);
            amortizationBtn.textContent = isAmortizationVisible ? 'Hide Amortization Schedule' : 'View Amortization Schedule';

            if (isAmortizationVisible) {
                calculateAndDisplay();
            }
        };

        const allInputs = [principalInput, interestRateInput, loanTenureInput, tenureTypeSelect];
        allInputs.forEach(input => input.addEventListener('input', calculateAndDisplay));
        amortizationBtn.addEventListener('click', toggleAmortization);

        calculateAndDisplay();
    }
});