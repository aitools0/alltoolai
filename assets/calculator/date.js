    (() => {
        "use strict";

        function initializeDateCalculator() {
            const ui = {
                diffForm: document.getElementById('diffForm'), startDate: document.getElementById('startDate'), endDate: document.getElementById('endDate'), diffResultArea: document.getElementById('diffResultArea'),
                opForm: document.getElementById('opForm'), opDate: document.getElementById('opDate'), operation: document.getElementById('operation'), opValue: document.getElementById('opValue'), opUnit: document.getElementById('opUnit'), opResultArea: document.getElementById('opResultArea'),
                dayOfWeekDate: document.getElementById('dayOfWeekDate'), dayOfWeekResultArea: document.getElementById('dayOfWeekResultArea'),
                resetBtn: document.getElementById('resetBtn'),
            };

            const parseDateAsUTC = (dateString) => { const date = new Date(dateString); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); };
            const toInputFormat = (d) => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
            const pluralize = (c, s) => c === 1 ? s : `${s}s`;
            const showResult = (a, c, e = false) => { a.innerHTML = c; a.classList.remove('hidden'); a.classList.toggle('bg-red-100', e); a.classList.toggle('dark:bg-red-900', e);};
            const hideResult = (a) => { a.innerHTML = ''; a.classList.add('hidden'); };

            const calculateDifference = () => {
                if (!ui.diffForm.checkValidity()) { showResult(ui.diffResultArea, '<p>Please provide both a valid start and end date.</p>', true); return; }
                const start = parseDateAsUTC(ui.startDate.value), end = parseDateAsUTC(ui.endDate.value);
                if (start > end) { showResult(ui.diffResultArea, '<p>The end date cannot be before the start date.</p>', true); return; }

                const totalDays = Math.round((end - start) / 864e5);
                let y = end.getUTCFullYear() - start.getUTCFullYear(), m = end.getUTCMonth() - start.getUTCMonth(), d = end.getUTCDate() - start.getUTCDate();
                if (d < 0) { m--; d += new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0)).getUTCDate(); }
                if (m < 0) { y--; m += 12; }

                const breakdown = `<p><span class="dc-highlight">${y}</span> ${pluralize(y,'year')}, <span class="dc-highlight">${m}</span> ${pluralize(m,'month')}, and <span class="dc-highlight">${d}</span> ${pluralize(d,'day')}.</p>`;
                const total = `<p><strong class="dc-sub-highlight">${totalDays.toLocaleString()}</strong> total days.</p>`;
                showResult(ui.diffResultArea, breakdown + '<hr class="dc-hr">' + total);
            };

            const calculateOperation = () => {
                if (!ui.opForm.checkValidity()) { showResult(ui.opResultArea, '<p>Please fill out all fields with valid information.</p>', true); return; }
                const date = parseDateAsUTC(ui.opDate.value);
                const num = parseInt(ui.opValue.value, 10) * (ui.operation.value === 'add' ? 1 : -1);

                switch (ui.opUnit.value) {
                    case 'days': date.setUTCDate(date.getUTCDate() + num); break;
                    case 'weeks': date.setUTCDate(date.getUTCDate() + num * 7); break;
                    case 'months': date.setUTCMonth(date.getUTCMonth() + num); break;
                    case 'years': date.setUTCFullYear(date.getUTCFullYear() + num); break;
                }
                showResult(ui.opResultArea, `<p>The new date is: <strong class="dc-highlight">${date.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})}</strong>.</p>`);
            };

            const findDayOfWeek = () => {
                if (!ui.dayOfWeekDate.value) { hideResult(ui.dayOfWeekResultArea); return; }
                const dayName = parseDateAsUTC(ui.dayOfWeekDate.value).toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'});
                showResult(ui.dayOfWeekResultArea, `<p>That date is a <strong class="dc-highlight">${dayName}</strong>.</p>`);
            };

            const setInitialState = () => {
                const today = toInputFormat(new Date());
                ui.startDate.value = ui.endDate.value = ui.opDate.value = ui.dayOfWeekDate.value = today;
                findDayOfWeek();
            };

            const resetAll = () => {
                ui.diffForm.reset();
                ui.opForm.reset();
                Object.values(ui).filter(el => el.classList && el.classList.contains('results-area')).forEach(hideResult);
                setInitialState();
            };

            document.getElementById('calcDiffBtn').addEventListener('click', calculateDifference);
            document.getElementById('calcOpBtn').addEventListener('click', calculateOperation);
            ui.dayOfWeekDate.addEventListener('input', findDayOfWeek);
            ui.resetBtn.addEventListener('click', resetAll);

            setInitialState();
        }

        initializeDateCalculator();
    })();