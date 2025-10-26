document.addEventListener('DOMContentLoaded', function () {
  // Elements
  const birthDateInput = document.getElementById('birthdate');
  const birthTimeInput = document.getElementById('birthtime');
  const calculateButton = document.getElementById('calculate-button');
  const resetButton = document.getElementById('reset-button');
  const errorMessage = document.getElementById('error-message');
  const resultsSection = document.getElementById('results');

  const yearsSpan = document.getElementById('years');
  const monthsSpan = document.getElementById('months');
  const daysSpan = document.getElementById('days');
  const totalDaysSpan = document.getElementById('total-days');
  const totalHoursSpan = document.getElementById('total-hours');
  const totalMinutesSpan = document.getElementById('total-minutes');
  const countdownDaysSpan = document.getElementById('countdown-days');

  // Accessibility enhancements
  if (resultsSection) {
    resultsSection.setAttribute('aria-live', 'polite');
    resultsSection.setAttribute('aria-atomic', 'true');
  }
  if (errorMessage) {
    errorMessage.setAttribute('role', 'alert');
    errorMessage.setAttribute('aria-live', 'assertive');
  }

  // Constants
  const MS_PER_MINUTE = 60000;
  const MS_PER_HOUR = 3600000;
  const MS_PER_DAY = 86400000;

  // Respect reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Utils
  function formatLocalDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function daysInMonth(year, month /* 1-12 */) {
    return new Date(year, month, 0).getDate();
  }

  function parseDateParts(yyyyMmDd) {
    const [y, m, d] = (yyyyMmDd || '').split('-').map(Number);
    return { y, m, d };
  }

  function parseTimeParts(hhmm) {
    if (!hhmm) return { hh: 0, mm: 0 };
    const [hhStr, mmStr] = hhmm.split(':');
    const hhNum = Number(hhStr);
    const mmNum = Number(mmStr);
    const hh = Number.isFinite(hhNum) ? Math.max(0, Math.min(23, hhNum)) : 0;
    const mm = Number.isFinite(mmNum) ? Math.max(0, Math.min(59, mmNum)) : 0;
    return { hh, mm };
  }

  function toLocalDate({ y, m, d }, { hh = 0, mm = 0 } = {}) {
    return new Date(y, (m || 1) - 1, d || 1, hh, mm, 0, 0);
  }

  // Calendar age calculation (years, months, days) using local calendar dates
  function calculateCalendarAge(nowDate, birthParts) {
    const nowY = nowDate.getFullYear();
    const nowM = nowDate.getMonth() + 1;
    const nowD = nowDate.getDate();

    let years = nowY - birthParts.y;
    let months = nowM - birthParts.m;
    let days = nowD - birthParts.d;

    if (days < 0) {
      months -= 1;
      const prevMonth = nowM === 1 ? 12 : nowM - 1;
      const prevYear = nowM === 1 ? nowY - 1 : nowY;
      days += daysInMonth(prevYear, prevMonth);
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months, days };
  }

  // Next birthday calculation with Feb 29 handling
  function getNextBirthday(nowDate, birthParts) {
    const { m: bm, d: bd } = birthParts;
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

    function isValidDate(y, m, d) {
      const dt = new Date(y, m - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
    }

    function birthdayInYear(y) {
      if (bd === 29 && bm === 2 && !isValidDate(y, 2, 29)) {
        // Map Feb 29 to Feb 28 on non-leap years
        return new Date(y, 1, 28);
        // Alternative: return new Date(y, 2, 1); // Mar 1
      }
      return new Date(y, bm - 1, bd);
    }

    let candidate = birthdayInYear(nowDate.getFullYear());
    const candidateStart = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    if (candidateStart < todayStart) {
      candidate = birthdayInYear(nowDate.getFullYear() + 1);
    }
    return new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
  }

  function showError(msg) {
    if (!errorMessage) return;
    const p = errorMessage.querySelector('p') || errorMessage.firstElementChild;
    if (p) p.textContent = msg;
    errorMessage.classList.remove('hidden');

    // Accessibility: indicate invalid input and focus the alert
    birthDateInput.setAttribute('aria-invalid', 'true');
    birthDateInput.setAttribute('aria-describedby', 'error-message');
    errorMessage.tabIndex = -1;
    errorMessage.focus();

    resultsSection.classList.add('hidden');
  }

  function clearError() {
    if (!errorMessage) return;
    errorMessage.classList.add('hidden');
    birthDateInput.removeAttribute('aria-invalid');
    birthDateInput.removeAttribute('aria-describedby');
    errorMessage.removeAttribute('tabindex');
  }

  function formatNumber(n) {
    try { return n.toLocaleString(); } catch { return String(n); }
  }

  // Days between two local calendar dates using UTC to avoid DST drift
  function daysBetweenLocalDatesUTC(a /* Date */, b /* Date */) {
    const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((bUTC - aUTC) / MS_PER_DAY);
  }

  // Set date constraints (local)
  const today = new Date();
  if (birthDateInput) {
    birthDateInput.max = formatLocalDateInputValue(today);
    birthDateInput.min = '1900-01-01';
  }

  // Events
  calculateButton.addEventListener('click', calculateAge);
  resetButton.addEventListener('click', resetCalculator);

  // Allow Enter to trigger calculation from inputs
  [birthDateInput, birthTimeInput].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculateAge();
      }
    });
  });

  // Clear error when user edits inputs
  [birthDateInput, birthTimeInput].forEach(el => {
    el.addEventListener('input', () => {
      if (!errorMessage.classList.contains('hidden')) clearError();
    });
  });

  function calculateAge() {
    const birthDateValue = birthDateInput.value;
    if (!birthDateValue) {
      showError('Please enter your date of birth.');
      return;
    }

    const birthParts = parseDateParts(birthDateValue);
    const timeParts = parseTimeParts(birthTimeInput.value);
    const birthDateTime = toLocalDate(birthParts, timeParts);
    const now = new Date();

    if (isNaN(birthDateTime.getTime())) {
      showError('Please enter a valid date and time.');
      return;
    }
    if (birthDateTime.getTime() > now.getTime()) {
      showError('Your birth date is in the future. Please check and try again.');
      return;
    }

    clearError();

    // Calendar age (years, months, days)
    const { years, months, days } = calculateCalendarAge(now, birthParts);

    // Exact totals using time difference
    const diffMs = now.getTime() - birthDateTime.getTime();

    // Calendar days lived (DST safe via UTC midnight comparison)
    const birthStart = new Date(birthParts.y, birthParts.m - 1, birthParts.d);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const totalDays = daysBetweenLocalDatesUTC(birthStart, todayStart);

    // Exact totals including time of birth
    const totalHours = Math.floor(diffMs / MS_PER_HOUR);
    const totalMinutes = Math.floor(diffMs / MS_PER_MINUTE);

    // Next birthday countdown in calendar days (DST safe)
    const nextBday = getNextBirthday(now, birthParts);
    const nextBdayStart = new Date(nextBday.getFullYear(), nextBday.getMonth(), nextBday.getDate());
    let countdownDays = daysBetweenLocalDatesUTC(todayStart, nextBdayStart);
    if (countdownDays < 0) countdownDays = 0;

    // Update UI
    yearsSpan.textContent = years;
    monthsSpan.textContent = months;
    daysSpan.textContent = days;

    totalDaysSpan.textContent = formatNumber(totalDays);
    totalHoursSpan.textContent = formatNumber(totalHours);
    totalMinutesSpan.textContent = formatNumber(totalMinutes);
    countdownDaysSpan.textContent = formatNumber(countdownDays);

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function resetCalculator() {
    birthDateInput.value = '';
    birthTimeInput.value = '';
    clearError();
    resultsSection.classList.add('hidden');

    yearsSpan.textContent = '';
    monthsSpan.textContent = '';
    daysSpan.textContent = '';
    totalDaysSpan.textContent = '';
    totalHoursSpan.textContent = '';
    totalMinutesSpan.textContent = '';
    countdownDaysSpan.textContent = '';

    // Return focus to the date input for better UX
    birthDateInput.focus();
  }
});
