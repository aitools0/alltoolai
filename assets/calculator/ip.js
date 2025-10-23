document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const ipAddressInput = document.getElementById('ip-address');
  const subnetInput = document.getElementById('subnet-mask');
  const calculateBtn = document.getElementById('calculate-btn');
  const resetBtn = document.getElementById('reset-btn');
  const subnetHelper = document.getElementById('subnet-helper');
  const errorMessageContainer = document.getElementById('error-message-container');
  const errorMessageEl = document.getElementById('error-message');
  const resultsContainer = document.getElementById('results-container');
  const hostInfoResults = document.getElementById('host-info-results');
  const networkInfoResults = document.getElementById('network-info-results');
  const binaryInfoResults = document.getElementById('binary-info-results');

  // --- Helper Functions ---
  const _ipToLong = ip =>
    ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

  const _longToIp = long =>
    [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');

  const _longToBinary = long =>
    long.toString(2).padStart(32, '0').match(/.{1,8}/g).join('.');

  const _cidrToLong = cidr =>
    cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;

  const _validateIPv4 = ip =>
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);

  const _getSubnetData = subnet => {
    if (subnet.startsWith('/')) {
      const cidr = parseInt(subnet.substring(1), 10);
      if (!isNaN(cidr) && cidr >= 0 && cidr <= 32) {
        return { cidr, mask: _longToIp(_cidrToLong(cidr)) };
      }
    }
    const cidrNum = parseInt(subnet, 10);
    if (!isNaN(cidrNum) && cidrNum >= 0 && cidrNum <= 32 && !subnet.includes('.')) {
      return { cidr: cidrNum, mask: _longToIp(_cidrToLong(cidrNum)) };
    }
    if (_validateIPv4(subnet)) {
      const maskLong = _ipToLong(subnet);
      if (!/^1*0*$/.test(maskLong.toString(2).padStart(32, '0'))) return null;
      const cidr = (maskLong.toString(2).match(/1/g) || []).length;
      return { cidr, mask: subnet };
    }
    return null;
  };

  const _getIpInfo = ip => {
    const firstOctet = parseInt(ip.split('.')[0], 10);
    let ipClass = '';
    if (firstOctet >= 1 && firstOctet <= 126) ipClass = 'A';
    else if (firstOctet >= 128 && firstOctet <= 191) ipClass = 'B';
    else if (firstOctet >= 192 && firstOctet <= 223) ipClass = 'C';
    else if (firstOctet >= 224 && firstOctet <= 239) ipClass = 'D (Multicast)';
    else ipClass = 'E (Experimental)';
    if (firstOctet === 127) ipClass = 'Loopback';

    const ipLong = _ipToLong(ip);
    const isPrivate = [
      { start: _ipToLong('10.0.0.0'), end: _ipToLong('10.255.255.255') },
      { start: _ipToLong('172.16.0.0'), end: _ipToLong('172.31.255.255') },
      { start: _ipToLong('192.168.0.0'), end: _ipToLong('192.168.255.255') }
    ].some(range => ipLong >= range.start && ipLong <= range.end);

    return { class: ipClass, type: isPrivate ? 'Private' : 'Public' };
  };

  // --- UI and Event Handlers ---
  const updateSubnetHelper = () => {
    const data = _getSubnetData(subnetInput.value.trim());
    if (!data) {
      subnetHelper.textContent = '';
      return;
    }
    const current = subnetInput.value.trim();
    if (current !== data.mask && (current.startsWith('/') || !current.includes('.'))) {
      subnetHelper.textContent = `-> ${data.mask}`;
    } else if (current !== `/${data.cidr}` && current !== data.cidr.toString()) {
      subnetHelper.textContent = `-> /${data.cidr}`;
    } else {
      subnetHelper.textContent = '';
    }
  };

  const reset = () => {
    ipAddressInput.value = '';
    subnetInput.value = '';
    subnetHelper.textContent = '';
    errorMessageContainer.style.display = 'none';
    errorMessageEl.textContent = '';
    resultsContainer.style.display = 'none';
    hostInfoResults.innerHTML = '';
    networkInfoResults.innerHTML = '';
    binaryInfoResults.innerHTML = '';
  };

  const displayError = (message) => {
    errorMessageEl.textContent = message;
    errorMessageContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
  };

  const renderResults = (results) => {
    // Clear previous results and errors
    hostInfoResults.innerHTML = '';
    networkInfoResults.innerHTML = '';
    binaryInfoResults.innerHTML = '';
    errorMessageContainer.style.display = 'none';

    // Helper to create a single result row
    const createRow = (item, isBinary = false) => {
      const row = document.createElement('div');
      const labelSpan = document.createElement('span');
      const valueSpan = document.createElement('span');

      if (isBinary) {
        row.className = 'flex flex-col sm:flex-row justify-between sm:items-center text-base font-semibold';
        labelSpan.className = 'text-slate-900 dark:text-white mb-1 sm:mb-0';
        valueSpan.className = 'text-indigo-600 dark:text-green-400 text-left';
      } else {
        row.className = 'flex justify-between items-center text-base font-semibold';
        labelSpan.className = 'text-slate-900 dark:text-white';
        valueSpan.className = 'text-indigo-600 dark:text-green-400 text-right';
      }

      labelSpan.textContent = item.label;
      valueSpan.textContent = item.value;

      row.appendChild(labelSpan);
      row.appendChild(valueSpan);
      return row;
    };

    results.hostInfo.forEach(item => hostInfoResults.appendChild(createRow(item)));
    results.networkInfo.forEach(item => networkInfoResults.appendChild(createRow(item)));
    results.binaryInfo.forEach(item => binaryInfoResults.appendChild(createRow(item, true)));

    resultsContainer.style.display = 'block';
  };

  // Updated calculate() with precise /31 and /32 handling
  const calculate = () => {
    errorMessageContainer.style.display = 'none';

    const trimmedIp = ipAddressInput.value.trim();
    const trimmedSubnet = subnetInput.value.trim();

    if (!_validateIPv4(trimmedIp)) {
      displayError('Invalid IPv4 address format.');
      return;
    }
    const subnetData = _getSubnetData(trimmedSubnet);
    if (!subnetData) {
      displayError('Invalid subnet mask or CIDR notation.');
      return;
    }

    const { cidr } = subnetData;
    const ipLong = _ipToLong(trimmedIp);
    const subnetMaskLong = _cidrToLong(cidr);
    const networkAddressLong = ipLong & subnetMaskLong;
    const broadcastAddressLong = networkAddressLong | (~subnetMaskLong >>> 0);
    const totalHosts = Math.pow(2, 32 - cidr);

    // Handle special cases (/31, /32) and standard subnets
    let usableHosts, usableHostRange;
    if (cidr === 32) {
      usableHosts = 1; // single-host route
      usableHostRange = _longToIp(networkAddressLong);
    } else if (cidr === 31) {
      usableHosts = 2; // RFC 3021 point-to-point
      usableHostRange = `${_longToIp(networkAddressLong)} - ${_longToIp(broadcastAddressLong)}`;
    } else {
      usableHosts = Math.max(0, totalHosts - 2);
      usableHostRange = usableHosts > 0
        ? `${_longToIp(networkAddressLong + 1)} - ${_longToIp(broadcastAddressLong - 1)}`
        : 'N/A';
    }

    const ipInfo = _getIpInfo(trimmedIp);

    const results = {
      hostInfo: [
        { label: 'Host Address', value: trimmedIp },
        { label: 'Address Class', value: ipInfo.class },
        { label: 'Address Type', value: ipInfo.type }
      ],
      networkInfo: [
        { label: 'Network Address', value: _longToIp(networkAddressLong) },
        { label: 'Broadcast Address', value: _longToIp(broadcastAddressLong) },
        { label: 'Usable Host Range', value: usableHostRange },
        { label: 'Subnet Mask', value: `${_longToIp(subnetMaskLong)} (/${cidr})` },
        { label: 'Wildcard Mask', value: _longToIp(~subnetMaskLong >>> 0) },
        { label: 'Total Hosts', value: totalHosts.toLocaleString() },
        { label: 'Usable Hosts', value: usableHosts.toLocaleString() }
      ],
      binaryInfo: [
        { label: 'Host Address', value: _longToBinary(ipLong) },
        { label: 'Subnet Mask', value: _longToBinary(subnetMaskLong) },
        { label: 'Network Address', value: _longToBinary(networkAddressLong) }
      ]
    };

    renderResults(results);
  };

  // Attach Event Listeners
  calculateBtn.addEventListener('click', calculate);
  resetBtn.addEventListener('click', reset);
  subnetInput.addEventListener('input', updateSubnetHelper);
});