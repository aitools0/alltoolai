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
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return { y, m, d };
  }

  function parseTimeParts(hhmm) {
    if (!hhmm) return { hh: 0, mm: 0 };
    const [hhStr, mmStr] = hhmm.split(':');
    const hh = Math.max(0, Math.min(23, Number(hhStr)));
    const mm = Math.max(0, Math.min(59, Number(mmStr)));
    return { hh: isFinite(hh) ? hh : 0, mm: isFinite(mm) ? mm : 0 };
  }

  function toLocalDate({ y, m, d }, { hh = 0, mm = 0 } = {}) {
    return new Date(y, m - 1, d, hh, mm, 0, 0);
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

  function getNextBirthday(nowDate, birthParts) {
    const year = nowDate.getFullYear();
    let candidate = new Date(year, birthParts.m - 1, birthParts.d);
    // Compare on start-of-day basis to avoid time-of-day quirks
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const candidateStart = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    if (candidateStart - todayStart < 0) {
      candidate = new Date(year + 1, birthParts.m - 1, birthParts.d);
    }
    return new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
  }

  function showError(msg) {
    const p = errorMessage.querySelector('p') || errorMessage.firstElementChild;
    if (p) p.textContent = msg;
    errorMessage.classList.remove('hidden');
    resultsSection.classList.add('hidden');
  }

  function clearError() {
    errorMessage.classList.add('hidden');
  }

  function formatNumber(n) {
    try { return n.toLocaleString(); } catch { return String(n); }
  }

  // Set date constraints (local)
  const today = new Date();
  birthDateInput.max = formatLocalDateInputValue(today);
  birthDateInput.min = '1900-01-01';

  // Events
  calculateButton.addEventListener('click', calculateAge);
  resetButton.addEventListener('click', resetCalculator);

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
    const totalDays = Math.floor(diffMs / MS_PER_DAY);
    const totalHours = Math.floor(diffMs / MS_PER_HOUR);
    const totalMinutes = Math.floor(diffMs / MS_PER_MINUTE);

    // Next birthday countdown in calendar days
    const nextBday = getNextBirthday(now, birthParts);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextBdayStart = new Date(nextBday.getFullYear(), nextBday.getMonth(), nextBday.getDate());
    let countdownDays = Math.round((nextBdayStart - todayStart) / MS_PER_DAY);
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
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  }
});