document.addEventListener('DOMContentLoaded', () => {
    // --- Compound Interest Calculator Logic ---
    const elements = {
        form: document.getElementById('interest-form'),
        resultsSection: document.getElementById('results-section'),
        principalInput: document.getElementById('principal'),
        rateInput: document.getElementById('rate'),
        compoundingSelect: document.getElementById('compounding'),
        durationContainer: document.getElementById('duration-container'),
        dateContainer: document.getElementById('date-container'),
        yearsInput: document.getElementById('years'),
        monthsInput: document.getElementById('months'),
        daysInput: document.getElementById('days'),
        startDateInput: document.getElementById('start-date'),
        endDateInput: document.getElementById('end-date'),
    };

    let currentParams = {};
    let dailyPagination = { currentPage: 1, itemsPerPage: 100 };
    const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365.25;

    const formatCurrency = (value) => isNaN(value) ? '$0.00' : value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const compoundInterest = (p, r, n, t) => p * Math.pow(1 + r / n, n * t);

    const calculateTimeInYears = () => {
        if (document.getElementById('mode-duration').checked) {
            const years = parseFloat(elements.yearsInput.value) || 0;
            const months = parseFloat(elements.monthsInput.value) || 0;
            const days = parseFloat(elements.daysInput.value) || 0;
            return years + (months / 12) + (days / 365.25);
        }
        const start = new Date(elements.startDateInput.value);
        const end = new Date(elements.endDateInput.value);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return (end - start) / MS_IN_YEAR;
    };
    
    const clearErrors = () => elements.form.querySelectorAll('[id$="-error"]').forEach(el => el.textContent = '');
    
    const handleModeChange = () => {
        const isDurationMode = document.getElementById('mode-duration').checked;
        elements.durationContainer.classList.toggle('hidden', !isDurationMode);
        elements.dateContainer.classList.toggle('hidden', isDurationMode);
        clearErrors();
    };

    const validateForm = () => {
        clearErrors();
        let isValid = true;
        ['principal', 'rate'].forEach(id => {
            const input = document.getElementById(id);
            if (input.value.trim() === '' || parseFloat(input.value) < 0) {
                document.getElementById(`${id}-error`).textContent = 'Please enter a valid, non-negative number.';
                isValid = false;
            }
        });
        const time = calculateTimeInYears();
        if (time <= 0) {
            if (document.getElementById('mode-duration').checked) {
                document.getElementById('duration-error').textContent = 'Please enter a duration greater than 0.';
            } else {
                document.getElementById('date-error').textContent = !elements.startDateInput.value || !elements.endDateInput.value ? 'Please select both start and end dates.' : 'End date must be after the start date.';
            }
            isValid = false;
        }
        return isValid;
    };
    
    const handleFormSubmit = (e) => {
        e.preventDefault();
        elements.resultsSection.style.display = 'none';
        if (!validateForm()) return;
        currentParams = { p: parseFloat(elements.principalInput.value), r: parseFloat(elements.rateInput.value) / 100, n: parseInt(elements.compoundingSelect.value), t: calculateTimeInYears() };
        const finalAmount = compoundInterest(currentParams.p, currentParams.r, currentParams.n, currentParams.t);
        renderResultsPage(finalAmount);
    };

    const handleFormReset = () => {
        elements.form.reset();
        elements.compoundingSelect.value = '4';
        document.getElementById('mode-duration').checked = true;
        handleModeChange();
        elements.resultsSection.style.display = 'none';
        elements.principalInput.focus();
    };
    
    const renderResultsPage = (finalAmount) => {
        const totalInterest = finalAmount - currentParams.p;
        elements.resultsSection.innerHTML = `
            <div class="space-y-8 pt-4 mt-4">
                <!-- Summary Card -->
                <div class="text-center space-y-4 results-card" style="animation-delay: 0s;">
                    <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-200">Investment Summary</h2>
                    <div class="grid grid-cols-1 gap-4">
                        <div class="bg-slate-100 p-6 rounded-xl dark:bg-slate-900">
                            <h3 class="font-semibold text-xl text-slate-600 dark:text-slate-400">Future Value</h3>
                            <p class="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">${formatCurrency(finalAmount)}</p>
                        </div>
                        <div class="bg-slate-100 p-6 rounded-xl dark:bg-slate-900">
                            <h3 class="font-semibold text-xl text-slate-600 dark:text-slate-400">Total Interest Earned</h3>
                            <p class="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">${formatCurrency(totalInterest)}</p>
                        </div>
                    </div>
                </div>
                <!-- Projected Earnings Card -->
                <div class="text-center space-y-4 results-card" style="animation-delay: 100ms;">
                    <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-200">Projected Earning Power</h2>
                     <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg"><p class="text-lg text-slate-500 dark:text-slate-400">Next Day</p><span id="proj-day" class="block font-bold text-xl text-slate-700 dark:text-slate-200"></span></div>
                        <div class="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg"><p class="text-lg text-slate-500 dark:text-slate-400">Next Week</p><span id="proj-week" class="block font-bold text-xl text-slate-700 dark:text-slate-200"></span></div>
                        <div class="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg"><p class="text-lg text-slate-500 dark:text-slate-400">Next Month</p><span id="proj-month" class="block font-bold text-xl text-slate-700 dark:text-slate-200"></span></div>
                        <div class="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg"><p class="text-lg text-slate-500 dark:text-slate-400">Next Year</p><span id="proj-year" class="block font-bold text-xl text-slate-700 dark:text-slate-200"></span></div>
                    </div>
                </div>
                <!-- Breakdown Card -->
                <div class="results-card" style="animation-delay: 200ms;" id="breakdown-card"></div>
            </div>`;
        renderProjectedGrowth(finalAmount);
        renderBreakdownArea();
        elements.resultsSection.style.display = 'block';
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const renderProjectedGrowth = (finalAmount) => {
        const { r, n } = currentParams;
        const getInterest = (t) => `+${formatCurrency(compoundInterest(finalAmount, r, n, t) - finalAmount)}`;
        document.getElementById('proj-day').textContent = getInterest(1/365.25);
        document.getElementById('proj-week').textContent = getInterest(7/365.25);
        document.getElementById('proj-month').textContent = getInterest(1/12);
        document.getElementById('proj-year').textContent = getInterest(1);
    };

    const renderBreakdownArea = () => {
        const { t } = currentParams;
        const totalDays = t * 365.25;
        const breakdownCard = document.getElementById('breakdown-card');
        const DAILY_LIMIT = 2000;
        const tabs = [{ name: 'Yearly', view: 'yearly', condition: t >= 1 }, { name: 'Monthly', view: 'monthly', condition: t * 12 >= 1 }, { name: 'Weekly', view: 'weekly', condition: t * 52 >= 1 }, { name: 'Daily', view: 'daily', condition: totalDays >= 1, disabled: totalDays > DAILY_LIMIT }].filter(tab => tab.condition);
        
        if (tabs.length === 0) {
            breakdownCard.innerHTML = `<div class="text-center p-8 bg-slate-100 dark:bg-slate-700 rounded-xl"><h3 class="text-xl font-bold text-slate-800 dark:text-slate-200">No Detailed Breakdown</h3><p class="text-slate-500 dark:text-slate-400">Duration is too short for a detailed breakdown.</p></div>`; return;
        }
        const tabsHTML = tabs.map(tab => `<div class="flex items-center justify-center"><button class="breakdown-tab px-4 py-2 ml-4 text-lg font-semibold rounded-lg transition-colors ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}" data-view="${tab.view}" ${tab.disabled ? 'disabled' : ''}>${tab.name}</button></div>`).join('');
        const dailyTabNote = tabs.find(tab => tab.disabled) ? `<div class="text-center text-base my-4 text-slate-500 dark:text-slate-400">Daily breakdown is available for durations up to ${DAILY_LIMIT} days.</div>` : '';
        
        breakdownCard.innerHTML = `<div class="text-center space-y-4">
              <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-200">Detailed Breakdown</h2>
              <div class="bg-slate-100 p-4 rounded-xl dark:bg-slate-900">
                <div id="breakdown-controls" class="flex justify-center flex-wrap gap-2 mb-4">${tabsHTML}</div>
                ${dailyTabNote}
                <div class="table-wrapper overflow-x-auto rounded-lg"><table class="w-full text-left text-base"><thead id="breakdown-head" class="text-slate-600 dark:text-slate-300"></thead><tbody id="breakdown-body"></tbody></table></div>
                <div id="pagination-controls" class="mt-4"></div>
              </div>
            </div>`;
        
        const defaultTab = tabs.find(tab => !tab.disabled) || tabs[0];
        renderBreakdownTable(defaultTab.view);
    };
    
    const renderBreakdownTable = (view) => {
        document.querySelectorAll('.breakdown-tab').forEach(tab => {
            tab.classList.remove('active-tab', 'bg-indigo-600', 'dark:bg-indigo-400', 'text-white');
            tab.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-slate-200');
        });
        const activeTab = document.querySelector(`.breakdown-tab[data-view="${view}"]`);
        activeTab.classList.add('active-tab', 'bg-indigo-600', 'dark:bg-indigo-400', 'text-white');
        activeTab.classList.remove('bg-slate-200', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-slate-200');
        
        if (view === 'daily') {
            dailyPagination.currentPage = 1;
            renderDailyPage();
            return;
        }

        const { p, r, n, t } = currentParams;
        const periodsConfig = { yearly: { name: 'Year', count: Math.floor(t), period: 1 }, monthly: { name: 'Month', count: Math.floor(t * 12), period: 1/12 }, weekly: { name: 'Week', count: Math.floor(t * 52), period: 1/52 }};
        const { name, count, period } = periodsConfig[view];

        document.getElementById('breakdown-head').innerHTML = `<tr><th class="p-3 font-semibold">${name}</th><th class="p-3 font-semibold text-right">Start Balance</th><th class="p-3 font-semibold text-right">Interest</th><th class="p-3 font-semibold text-right">End Balance</th></tr>`;
        let rowsHTML = '';
        for (let i = 1; i <= count; i++) {
            const start = compoundInterest(p, r, n, (i - 1) * period);
            const end = compoundInterest(p, r, n, i * period);
            rowsHTML += `<tr class="hover:bg-slate-200 dark:hover:bg-slate-800"><td class="p-3 text-slate-500 dark:text-slate-400">${i}</td><td class="p-3 text-right font-semibold text-green-500">${formatCurrency(start)}</td><td class="p-3 text-right font-semibold text-red-500">+${formatCurrency(end - start)}</td><td class="p-3 font-semibold text-blue-500 text-right">${formatCurrency(end)}</td></tr>`;
        }
        document.getElementById('breakdown-body').innerHTML = rowsHTML;
        document.getElementById('pagination-controls').innerHTML = '';
    };

    const renderDailyPage = () => {
        const { p, r, n, t } = currentParams;
        const { currentPage, itemsPerPage } = dailyPagination;
        const totalDays = Math.floor(t * 365.25);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalDays);
        
        let rowsHTML = '';
        for (let i = startIndex + 1; i <= endIndex; i++) {
             const start = compoundInterest(p, r, n, (i-1)/365.25);
             const end = compoundInterest(p, r, n, i/365.25);
             rowsHTML += `<tr class="hover:bg-slate-200 dark:hover:bg-slate-800"><td class="p-3 text-slate-500 dark:text-slate-400">${i}</td><td class="p-3 text-right font-semibold text-green-500">${formatCurrency(start)}</td><td class="p-3 text-right font-semibold text-red-500">+${formatCurrency(end-start)}</td><td class="p-3 text-right font-semibold text-blue-500">${formatCurrency(end)}</td></tr>`;
        }
        
        document.getElementById('breakdown-head').innerHTML = `<tr><th class="p-3 font-semibold">Day</th><th class="p-3 font-semibold text-right">Start Balance</th><th class="p-3 font-semibold text-right">Interest</th><th class="p-3 font-semibold text-right">End Balance</th></tr>`;
        document.getElementById('breakdown-body').innerHTML = rowsHTML;
        
        const paginationControls = document.getElementById('pagination-controls');
        const totalPages = Math.ceil(totalDays/itemsPerPage);

        paginationControls.innerHTML = (totalPages <= 1) ? '' : `<div class="flex justify-between items-center w-full mt-4"><button class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50" data-page-nav="prev" ${currentPage === 1 ? 'disabled' : ''}>Previous</button><span class="text-sm text-slate-500 dark:text-slate-400">Page ${currentPage} of ${totalPages}</span><button class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50" data-page-nav="next" ${currentPage === totalPages ? 'disabled' : ''}>Next</button></div>`;
    };
    
    // --- Event Listeners ---
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.form.addEventListener('reset', handleFormReset);
    document.getElementById('mode-switcher').addEventListener('change', handleModeChange);
    elements.resultsSection.addEventListener('click', (e) => {
        if (e.target.matches('.breakdown-tab')) {
            renderBreakdownTable(e.target.dataset.view);
        } else if (e.target.matches('[data-page-nav]')) {
            if(e.target.dataset.pageNav === 'next') dailyPagination.currentPage++;
            if(e.target.dataset.pageNav === 'prev') dailyPagination.currentPage--;
            renderDailyPage();
        }
    });
    // Prevent typing negative signs or 'e' in number inputs
    [elements.principalInput, elements.rateInput, elements.yearsInput, elements.monthsInput, elements.daysInput].forEach(input => input.addEventListener('keydown', e => (e.key === '-' || e.key === 'e') && e.preventDefault()));
});