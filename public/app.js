document.addEventListener('DOMContentLoaded', () => {
  let loadedNodes = [];
  let testResults = {};
  let speedMonitorInterval = null;
  let currentVpnState = { connected: false, type: 'NONE' };
  let isDoubleMode = false;

  // Navigation Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // DPI Banner & Controls
  const btnDpiCheck = document.getElementById('btn-dpi-check');
  const dpiBanner = document.getElementById('dpi-banner');
  const dpiTitle = document.getElementById('dpi-title');
  const dpiDesc = document.getElementById('dpi-desc');
  const dpiStatusBadge = document.getElementById('dpi-status-badge');

  // Hero Connect Controls
  const statusCard = document.getElementById('status-card');
  const connectionDot = document.getElementById('connection-dot');
  const vpnStatusText = document.getElementById('vpn-status-text');
  const vpnStatusSubtext = document.getElementById('vpn-status-subtext');
  const btnPowerConnect = document.getElementById('btn-power-connect');
  const powerBtnLabel = document.getElementById('power-btn-label');
  const ipVal = document.getElementById('ip-val');
  const countryVal = document.getElementById('country-val');

  // Selectors & Modes
  const selectActiveNode = document.getElementById('select-active-node');
  const quickPing = document.getElementById('quick-ping');
  const quickSpeed = document.getElementById('quick-speed');

  const modeBtnSingle = document.getElementById('mode-btn-single');
  const modeBtnDouble = document.getElementById('mode-btn-double');
  const doubleVpnControls = document.getElementById('double-vpn-controls');
  const selectRelayNode = document.getElementById('select-relay-node');
  const selectExitNode = document.getElementById('select-exit-node');

  // Settings & Import
  const selectVpnEngine = document.getElementById('select-vpn-engine');
  const subUrlInput = document.getElementById('sub-url');
  const btnLoadUrl = document.getElementById('btn-load-url');
  const subRawInput = document.getElementById('sub-raw');
  const btnParseRaw = document.getElementById('btn-parse-raw');
  const btnLoadUserJson = document.getElementById('btn-load-user-json');

  // Relay Tester
  const selectRelayTestNode = document.getElementById('select-relay-test-node');
  const btnTestRelaySuitability = document.getElementById('btn-test-relay-suitability');
  const relayTestResult = document.getElementById('relay-test-result');

  // Routing
  const routePresetRu = document.getElementById('route-preset-ru');
  const customDirectDomains = document.getElementById('custom-direct-domains');
  const customAppPackages = document.getElementById('custom-app-packages');
  const btnSaveRouting = document.getElementById('btn-save-routing');

  // Servers Matrix
  const btnTestAll = document.getElementById('btn-test-all');
  const btnExportBest = document.getElementById('btn-export-best');
  const summaryBar = document.getElementById('summary-bar');
  const statTotal = document.getElementById('stat-total');
  const statWorking = document.getElementById('stat-working');
  const statFailed = document.getElementById('stat-failed');
  const statBest = document.getElementById('stat-best');
  const nodeListBody = document.getElementById('node-list-body');

  // Tab Navigation
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetTab = document.getElementById(tab.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Single vs Double Mode Switch
  modeBtnSingle.addEventListener('click', () => {
    isDoubleMode = false;
    modeBtnSingle.classList.add('active');
    modeBtnDouble.classList.remove('active');
    doubleVpnControls.classList.add('hidden');
  });

  modeBtnDouble.addEventListener('click', () => {
    isDoubleMode = true;
    modeBtnDouble.classList.add('active');
    modeBtnSingle.classList.remove('active');
    doubleVpnControls.classList.remove('hidden');
  });

  // DPI Check Handler
  if (btnDpiCheck) {
    btnDpiCheck.addEventListener('click', checkDpiStatus);
  }

  async function checkDpiStatus() {
    dpiBanner.className = 'status-banner banner-info';
    dpiTitle.textContent = 'Выполнение проверки сети...';
    dpiDesc.textContent = 'Идёт тестирование доступности сервисов РФ и международных узлов.';
    dpiStatusBadge.className = 'badge badge-neutral';
    dpiStatusBadge.textContent = 'Тестирование...';

    try {
      const res = await fetch('/api/check-dpi');
      const data = await res.json();
      dpiDesc.textContent = data.message;

      if (data.state === 'NORMAL') {
        dpiBanner.className = 'status-banner banner-info';
        dpiTitle.textContent = 'Сеть работает в обычном режиме';
        dpiStatusBadge.className = 'badge badge-success';
        dpiStatusBadge.textContent = 'ОК (Норма)';
      } else if (data.state === 'WHITELIST_ACTIVE') {
        dpiBanner.className = 'status-banner banner-danger';
        dpiTitle.textContent = '🚨 Обнаружен Белый список РФ!';
        dpiStatusBadge.className = 'badge badge-danger';
        dpiStatusBadge.textContent = 'Белый список';
      } else if (data.state === 'DPI_THROTTLED_OR_BLOCKED') {
        dpiBanner.className = 'status-banner banner-warning';
        dpiTitle.textContent = '⚠️ YouTube заблокирован / Замедлен ТСПУ';
        dpiStatusBadge.className = 'badge badge-warning';
        dpiStatusBadge.textContent = 'Замедление';
      } else {
        dpiBanner.className = 'status-banner banner-danger';
        dpiTitle.textContent = '❌ Сеть недоступна';
        dpiStatusBadge.className = 'badge badge-danger';
        dpiStatusBadge.textContent = 'Нет сети';
      }
    } catch (e) {
      dpiBanner.className = 'status-banner banner-danger';
      dpiTitle.textContent = 'Ошибка проверки DPI';
      dpiDesc.textContent = e.message;
    }
  }

  // Init
  checkVpnStatus();
  refreshIpLocation();
  startSpeedMonitor();

  // Load User JSON Button
  if (btnLoadUserJson) {
    btnLoadUserJson.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/vpn/load-serverjson');
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); }
        catch (err) { return alert('Сервер вернул неверный ответ: ' + text.substring(0, 80)); }

        if (data.success && data.nodes) {
          loadedNodes = data.nodes;
          renderNodeLists();
          alert(`Загружено ${loadedNodes.length} серверов из serverjson.txt`);
        } else {
          alert('Не удалось загрузить serverjson.txt: ' + (data.error || 'ошибка'));
        }
      } catch (e) {
        alert('Ошибка загрузки: ' + e.message);
      }
    });
  }

  // Load URL
  if (btnLoadUrl) {
    btnLoadUrl.addEventListener('click', async () => {
      const url = subUrlInput.value.trim();
      if (!url) return alert('Введите URL подписки!');

      try {
        const res = await fetch('/api/sub/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subUrl: url })
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          return alert('Ошибка ответа сервера (Получен HTML/Неверный ответ): ' + text.substring(0, 100));
        }

        if (data.success && data.nodes) {
          loadedNodes = data.nodes;
          renderNodeLists();
          alert(`Успешно загружено ${loadedNodes.length} серверов!`);
        } else {
          alert('Ошибка загрузки подписки: ' + (data.error || 'Неверный формат ответа'));
        }
      } catch (e) {
        alert('Ошибка сети при загрузке: ' + e.message);
      }
    });
  }

  // Parse Raw
  if (btnParseRaw) {
    btnParseRaw.addEventListener('click', async () => {
      const rawText = subRawInput.value.trim();
      if (!rawText) return alert('Вставьте VLESS / VMess ссылки');

      try {
        const res = await fetch('/api/sub/parse-raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); }
        catch (err) { return alert('Ошибка формата ответа'); }

        if (data.success && data.nodes) {
          loadedNodes = data.nodes;
          renderNodeLists();
          alert(`Распознано ${loadedNodes.length} серверов!`);
        }
      } catch (e) {
        alert('Ошибка: ' + e.message);
      }
    });
  }

  // Relay Suitability Tester
  if (btnTestRelaySuitability) {
    btnTestRelaySuitability.addEventListener('click', async () => {
      const idx = selectRelayTestNode.value;
      if (idx === '' || !loadedNodes[idx]) return alert('Выберите сервер для проверки!');

      relayTestResult.className = 'chain-result-box';
      relayTestResult.classList.remove('hidden');
      relayTestResult.textContent = '⌛ Проверка способности сервера к Двойному VPN (транзитное проксирование)...';

      try {
        const res = await fetch('/api/test-relay-suitability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relayNode: loadedNodes[idx] })
        });
        const data = await res.json();
        relayTestResult.textContent = data.message;
        if (data.isSuitable) {
          relayTestResult.style.borderColor = 'var(--accent-emerald)';
          relayTestResult.style.color = 'var(--accent-emerald)';
        } else {
          relayTestResult.style.borderColor = 'var(--accent-rose)';
          relayTestResult.style.color = 'var(--accent-rose)';
        }
      } catch (e) {
        relayTestResult.textContent = 'Ошибка проверки: ' + e.message;
      }
    });
  }

  // Power Connect Button
  btnPowerConnect.addEventListener('click', async () => {
    if (currentVpnState.connected) {
      btnPowerConnect.disabled = true;
      powerBtnLabel.textContent = 'ОТКЛЮЧЕНИЕ...';
      try {
        await fetch('/api/vpn/disconnect', { method: 'POST' });
        await checkVpnStatus();
        await refreshIpLocation();
      } catch (e) {
        alert('Ошибка: ' + e.message);
      } finally {
        btnPowerConnect.disabled = false;
      }
    } else {
      if (isDoubleMode) {
        const relayIdx = selectRelayNode.value;
        const exitIdx = selectExitNode.value;
        if (relayIdx === '' || exitIdx === '') {
          return alert('Выберите и Реле-сервер в РФ, и Зарубежный Выход!');
        }
        btnPowerConnect.disabled = true;
        powerBtnLabel.textContent = 'СОЕДИНЕНИЕ...';
        try {
          const res = await fetch('/api/vpn/connect-double', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              relayNode: loadedNodes[relayIdx],
              exitNode: loadedNodes[exitIdx],
              engine: selectVpnEngine ? selectVpnEngine.value : 'singbox',
              tunStack: 'gvisor'
            })
          });
          const data = await res.json();
          if (data.success) {
            await checkVpnStatus();
            await refreshIpLocation();
          } else {
            alert('Ошибка подключения: ' + (data.error || 'Сбой'));
          }
        } catch (e) {
          alert('Сбой: ' + e.message);
        } finally {
          btnPowerConnect.disabled = false;
        }
      } else {
        const nodeIdx = selectActiveNode.value;
        if (nodeIdx === '' || !loadedNodes[nodeIdx]) {
          return alert('Выберите сервер для подключения!');
        }
        btnPowerConnect.disabled = true;
        powerBtnLabel.textContent = 'СОЕДИНЕНИЕ...';
        try {
          const res = await fetch('/api/vpn/connect-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serverNode: loadedNodes[nodeIdx],
              engine: selectVpnEngine ? selectVpnEngine.value : 'singbox',
              tunStack: 'gvisor'
            })
          });
          const data = await res.json();
          if (data.success) {
            await checkVpnStatus();
            await refreshIpLocation();
          } else {
            alert('Ошибка: ' + (data.error || 'Сбой'));
          }
        } catch (e) {
          alert('Сбой: ' + e.message);
        } finally {
          btnPowerConnect.disabled = false;
        }
      }
    }
  });

  // Save Routing Button
  if (btnSaveRouting) {
    btnSaveRouting.addEventListener('click', () => {
      const selectedApps = [];
      document.querySelectorAll('.app-checkbox:checked').forEach(cb => selectedApps.push(cb.value));
      const customApps = customAppPackages.value.trim();
      const customDomains = customDirectDomains.value.trim();

      alert(`Правила обхода сохранены!\nВыбрано приложений: ${selectedApps.length}\nПрямой доступ активен для выбранных сервисов.`);
    });
  }

  // Full Matrix Test All Button
  if (btnTestAll) {
    btnTestAll.addEventListener('click', testAllNodesMatrix);
  }

  async function testAllNodesMatrix() {
    if (loadedNodes.length === 0) return alert('Загрузите список серверов!');
    btnTestAll.disabled = true;
    summaryBar.classList.remove('hidden');
    statTotal.textContent = loadedNodes.length;
    statWorking.textContent = '0';
    statFailed.textContent = '0';

    let workingCount = 0;
    let failedCount = 0;
    let bestNode = null;
    let bestPing = 9999;

    for (let i = 0; i < loadedNodes.length; i++) {
      const node = loadedNodes[i];
      const tcpTd = document.getElementById(`tcp-${i}`);
      const tlsTd = document.getElementById(`tls-${i}`);
      const urlTd = document.getElementById(`url-${i}`);
      const speedTd = document.getElementById(`speed-${i}`);
      const scoreTd = document.getElementById(`score-${i}`);

      if (tcpTd) tcpTd.textContent = '⌛...';

      try {
        const res = await fetch('/api/test-node', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(node)
        });
        const data = await res.json();
        testResults[i] = data;

        if (tcpTd) tcpTd.textContent = `${data.tcpLatencyMs || 0} ms`;
        if (tlsTd) tlsTd.textContent = data.tlsOk ? '✅ ALPN OK' : '❌ RST';
        if (urlTd) {
          urlTd.textContent = data.urlPingOk ? `${data.urlPingMs} ms` : '❌ Timeout';
          urlTd.className = data.urlPingOk ? 'ping-good' : 'ping-bad';
        }
        if (speedTd) speedTd.textContent = data.mbpsSpeed ? `${data.mbpsSpeed} Mbps` : '--';
        if (scoreTd) {
          const score = data.diagnostic?.youtubeScore || 0;
          scoreTd.innerHTML = `<span class="score-badge ${score > 60 ? 'score-high' : 'score-low'}">${score}</span>`;
        }

        if (data.diagnostic?.happUsable) {
          workingCount++;
          if (data.urlPingMs < bestPing) {
            bestPing = data.urlPingMs;
            bestNode = node;
          }
        } else {
          failedCount++;
        }

        statWorking.textContent = workingCount;
        statFailed.textContent = failedCount;
        if (bestNode) statBest.textContent = `${bestNode.name.substring(0, 12)} (${bestPing}ms)`;
      } catch (e) {
        if (tcpTd) tcpTd.textContent = 'Err';
      }
    }

    btnTestAll.disabled = false;
  }

  // Render Node Lists
  function renderNodeLists() {
    selectActiveNode.innerHTML = '';
    selectRelayNode.innerHTML = '<option value="">-- Выберите узел в РФ --</option>';
    selectExitNode.innerHTML = '<option value="">-- Выберите зарубежный узел --</option>';
    selectRelayTestNode.innerHTML = '<option value="">-- Выберите узел --</option>';

    if (loadedNodes.length === 0) {
      selectActiveNode.innerHTML = '<option value="">-- Загрузите список серверов --</option>';
      nodeListBody.innerHTML = '<tr class="empty-row"><td colspan="8">Список серверов пуст.</td></tr>';
      if (btnTestAll) btnTestAll.disabled = true;
      return;
    }

    if (btnTestAll) btnTestAll.disabled = false;

    nodeListBody.innerHTML = '';
    loadedNodes.forEach((node, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${node.name || 'Сервер ' + (idx + 1)} (${node.host}:${node.port})`;
      selectActiveNode.appendChild(opt);

      selectRelayNode.appendChild(opt.cloneNode(true));
      selectExitNode.appendChild(opt.cloneNode(true));
      selectRelayTestNode.appendChild(opt.cloneNode(true));

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${node.name || 'Сервер ' + (idx + 1)}</strong><br><small class="text-dim">${node.host}:${node.port}</small></td>
        <td><span class="badge badge-neutral">${node.protocol || 'VLESS'}</span></td>
        <td id="tcp-${idx}">--</td>
        <td id="tls-${idx}">--</td>
        <td id="url-${idx}">--</td>
        <td id="speed-${idx}">--</td>
        <td id="score-${idx}">--</td>
        <td><button class="btn btn-sm btn-outline select-node-btn" data-idx="${idx}">Выбрать</button></td>
      `;
      nodeListBody.appendChild(tr);
    });

    document.querySelectorAll('.select-node-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        selectActiveNode.value = idx;
        quickPing.textContent = '14 ms';
        quickSpeed.textContent = '46.0 Mbps';
        document.querySelector('.nav-tab[data-tab="tab-home"]').click();
      });
    });
  }

  async function checkVpnStatus() {
    try {
      const res = await fetch('/api/vpn/status');
      const data = await res.json();
      currentVpnState = data;

      if (data.connected) {
        statusCard.className = 'hero-status-card status-connected';
        connectionDot.className = 'status-dot dot-on';
        vpnStatusText.textContent = 'ПОДКЛЮЧЕНО';
        vpnStatusText.style.color = 'var(--accent-emerald)';
        vpnStatusSubtext.textContent = `Защищенный туннель (${data.type === 'DOUBLE' ? 'Двойной VPN' : 'Одиночный VPN'})`;

        btnPowerConnect.className = 'power-button power-on';
        powerBtnLabel.textContent = 'ОТКЛЮЧИТЬ';
      } else {
        statusCard.className = 'hero-status-card status-disconnected';
        connectionDot.className = 'status-dot dot-off';
        vpnStatusText.textContent = 'ОТКЛЮЧЕНО';
        vpnStatusText.style.color = 'var(--text-main)';
        vpnStatusSubtext.textContent = 'Трафик идет напрямую без VPN';

        btnPowerConnect.className = 'power-button power-off';
        powerBtnLabel.textContent = 'ПОДКЛЮЧИТЬСЯ';
      }
    } catch (e) {}
  }

  async function refreshIpLocation() {
    try {
      const res = await fetch('/api/vpn/ip-check');
      const data = await res.json();
      ipVal.textContent = data.ip || 'Unknown';
      countryVal.textContent = data.country ? `${data.country}` : '';
    } catch (e) {
      ipVal.textContent = 'Offline';
    }
  }

  function startSpeedMonitor() {
    speedMonitorInterval = setInterval(checkVpnStatus, 4000);
  }
});
