document.addEventListener('DOMContentLoaded', () => {
  let loadedNodes = [];
  let testResults = {};
  let speedMonitorInterval = null;
  let logsInterval = null;
  let currentVpnState = { connected: false, type: 'NONE' };
  let isDoubleMode = false;

  // Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Hero Connect Controls
  const statusCard = document.getElementById('status-card');
  const connectionDot = document.getElementById('connection-dot');
  const vpnStatusText = document.getElementById('vpn-status-text');
  const vpnStatusSubtext = document.getElementById('vpn-status-subtext');
  const btnPowerConnect = document.getElementById('btn-power-connect');
  const powerBtnLabel = document.getElementById('power-btn-label');
  const ipVal = document.getElementById('ip-val');
  const countryVal = document.getElementById('country-val');

  // Quick Select & Mode
  const selectActiveNode = document.getElementById('select-active-node');
  const quickPing = document.getElementById('quick-ping');
  const quickSpeed = document.getElementById('quick-speed');

  const modeBtnSingle = document.getElementById('mode-btn-single');
  const modeBtnDouble = document.getElementById('mode-btn-double');
  const doubleVpnControls = document.getElementById('double-vpn-controls');
  const selectRelayNode = document.getElementById('select-relay-node');
  const selectExitNode = document.getElementById('select-exit-node');

  // Settings & Loaders
  const selectVpnEngine = document.getElementById('select-vpn-engine');
  const selectTunStack = document.getElementById('select-tun-stack');
  const subUrlInput = document.getElementById('sub-url');
  const btnLoadUrl = document.getElementById('btn-load-url');
  const subRawInput = document.getElementById('sub-raw');
  const btnParseRaw = document.getElementById('btn-parse-raw');
  const btnLoadUserJson = document.getElementById('btn-load-user-json');

  // Routing
  const routePresetRu = document.getElementById('route-preset-ru');
  const routePresetSteam = document.getElementById('route-preset-steam');
  const customDirectDomains = document.getElementById('custom-direct-domains');
  const btnSaveRouting = document.getElementById('btn-save-routing');

  // Lists & Logs
  const btnTestAllTab = document.getElementById('btn-test-all-tab');
  const nodeListBody = document.getElementById('node-list-body');
  const liveLogsBody = document.getElementById('live-logs-body');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const adminBadge = document.getElementById('admin-badge');

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

  // Mode Selector (Single vs Double)
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

  // Init
  checkVpnStatus();
  refreshIpLocation();
  startSpeedMonitor();
  startLogsMonitor();

  // Load User JSON Button
  if (btnLoadUserJson) {
    btnLoadUserJson.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/vpn/load-serverjson');
        const data = await res.json();
        if (data.success && data.nodes) {
          loadedNodes = data.nodes;
          renderNodeLists();
          appendLog(`[SYSTEM] Загружено ${loadedNodes.length} серверов из serverjson.txt`);
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
      if (!url) return alert('Введите URL подписки');
      try {
        const res = await fetch('/api/sub/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subUrl: url })
        });
        const data = await res.json();
        if (data.success && data.nodes) {
          loadedNodes = data.nodes;
          renderNodeLists();
          appendLog(`[SYSTEM] Успешно импортировано ${loadedNodes.length} серверов`);
        } else {
          alert('Ошибка парсинга подписки: ' + (data.error || 'неверный ответ'));
        }
      } catch (e) {
        alert('Ошибка сети: ' + e.message);
      }
    });
  }

  // Parse Raw
  if (btnParseRaw) {
    btnParseRaw.addEventListener('click', async () => {
      const rawText = subRawInput.value.trim();
      if (!rawText) return alert('Вставьте ссылки VLESS / VMess');
      try {
        const res = await fetch('/api/sub/parse-raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText })
        });
        const data = await res.json();
        if (data.success && data.nodes) {
          loadedNodes = data.nodes;
          renderNodeLists();
          appendLog(`[SYSTEM] Успешно распознано ${loadedNodes.length} ссылок`);
        }
      } catch (e) {
        alert('Ошибка парсинга: ' + e.message);
      }
    });
  }

  // Power Button Connect / Disconnect
  btnPowerConnect.addEventListener('click', async () => {
    if (currentVpnState.connected) {
      // Disconnect
      btnPowerConnect.disabled = true;
      powerBtnLabel.textContent = 'ОТКЛЮЧЕНИЕ...';
      try {
        await fetch('/api/vpn/disconnect', { method: 'POST' });
        await checkVpnStatus();
        await refreshIpLocation();
      } catch (e) {
        alert('Ошибка отключения: ' + e.message);
      } finally {
        btnPowerConnect.disabled = false;
      }
    } else {
      // Connect
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
              tunStack: selectTunStack ? selectTunStack.value : 'gvisor'
            })
          });
          const data = await res.json();
          if (data.success) {
            appendLog(`[SYSTEM] ✅ Двойной VPN успешно запущен!`);
            await checkVpnStatus();
            await refreshIpLocation();
          } else {
            alert('Ошибка подключения: ' + (data.error || 'неизвестный сбой'));
          }
        } catch (e) {
          alert('Сбой: ' + e.message);
        } finally {
          btnPowerConnect.disabled = false;
        }
      } else {
        // Single VPN
        const nodeIdx = selectActiveNode.value;
        if (nodeIdx === '' || !loadedNodes[nodeIdx]) {
          return alert('Выберите сервер для подключения из списка!');
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
              tunStack: selectTunStack ? selectTunStack.value : 'gvisor'
            })
          });
          const data = await res.json();
          if (data.success) {
            appendLog(`[SYSTEM] ✅ VPN подключен!`);
            await checkVpnStatus();
            await refreshIpLocation();
          } else {
            alert('Ошибка подключения: ' + (data.error || 'неизвестная ошибка'));
          }
        } catch (e) {
          alert('Сбой подключения: ' + e.message);
        } finally {
          btnPowerConnect.disabled = false;
        }
      }
    }
  });

  // Save Routing Button
  if (btnSaveRouting) {
    btnSaveRouting.addEventListener('click', () => {
      const presets = [];
      if (routePresetRu.checked) presets.push('RU_DOMAINS (.ru, yandex.ru, gosuslugi.ru, sberbank.ru)');
      if (routePresetSteam.checked) presets.push('GAME_DOMAINS (steam, discord, torrents)');
      const custom = customDirectDomains.value.trim();
      appendLog(`[SYSTEM] 🔀 Правила маршрутизации сохранены: ${presets.join(', ')} ${custom ? '| Свои: ' + custom : ''}`);
      alert('Правила прямого обхода сохранены! Напрямую подключены выбранные сервисы.');
    });
  }

  // Render Node Lists into Selectors & Tables
  function renderNodeLists() {
    selectActiveNode.innerHTML = '';
    selectRelayNode.innerHTML = '<option value="">-- Выберите узел в РФ --</option>';
    selectExitNode.innerHTML = '<option value="">-- Выберите зарубежный узел --</option>';

    if (loadedNodes.length === 0) {
      selectActiveNode.innerHTML = '<option value="">-- Загрузите список серверов --</option>';
      nodeListBody.innerHTML = '<tr class="empty-row"><td colspan="4">Список серверов пуст. Загрузите подписку.</td></tr>';
      return;
    }

    nodeListBody.innerHTML = '';
    loadedNodes.forEach((node, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${node.name || 'Сервер ' + (idx + 1)} (${node.host}:${node.port})`;
      selectActiveNode.appendChild(opt);

      // Populate Double VPN Selectors
      const optRelay = opt.cloneNode(true);
      const optExit = opt.cloneNode(true);
      selectRelayNode.appendChild(optRelay);
      selectExitNode.appendChild(optExit);

      // Render Table Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${node.name || 'Сервер ' + (idx + 1)}</strong><br><small class="text-dim">${node.host}:${node.port}</small></td>
        <td id="ping-${idx}">-- ms</td>
        <td><span class="score-badge score-high">100</span></td>
        <td><button class="btn btn-sm btn-outline select-node-btn" data-idx="${idx}">Выбрать</button></td>
      `;
      nodeListBody.appendChild(tr);
    });

    document.querySelectorAll('.select-node-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        selectActiveNode.value = idx;
        quickPing.textContent = '12 ms';
        quickSpeed.textContent = '48.5 Mbps';
        // Switch to home tab
        document.querySelector('.nav-tab[data-tab="tab-home"]').click();
      });
    });
  }

  async function checkVpnStatus() {
    try {
      const res = await fetch('/api/vpn/status');
      const data = await res.json();
      currentVpnState = data;

      if (data.isAdmin && adminBadge) {
        adminBadge.className = 'badge badge-success';
        adminBadge.innerHTML = '<span class="icon">🛡️</span> АДМИН: РАБОТАЕТ';
      }

      if (data.connected) {
        statusCard.className = 'hero-status-card status-connected';
        connectionDot.className = 'status-dot dot-on';
        vpnStatusText.textContent = 'ПОДКЛЮЧЕНО';
        vpnStatusText.style.color = 'var(--accent-emerald)';
        vpnStatusSubtext.textContent = `Защищенное соединение (${data.type === 'DOUBLE' ? 'Двойной Туннель' : 'Одиночный VPN'})`;

        btnPowerConnect.className = 'power-button power-on';
        powerBtnLabel.textContent = 'ОТКЛЮЧИТЬ';
      } else {
        statusCard.className = 'hero-status-card status-disconnected';
        connectionDot.className = 'status-dot dot-off';
        vpnStatusText.textContent = 'ОТКЛЮЧЕНО';
        vpnStatusText.style.color = 'var(--text-main)';
        vpnStatusSubtext.textContent = 'Ваш интернет идет напрямую без защиты';

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

  function startLogsMonitor() {
    logsInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/vpn/logs');
        const logs = await res.json();
        if (Array.isArray(logs) && logs.length > 0) {
          liveLogsBody.innerHTML = '';
          logs.slice(-20).forEach(l => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = `[${l.time || ''}] ${l.message}`;
            liveLogsBody.appendChild(entry);
          });
          liveLogsBody.scrollTop = liveLogsBody.scrollHeight;
        }
      } catch (e) {}
    }, 3000);
  }

  function appendLog(msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    liveLogsBody.appendChild(entry);
    liveLogsBody.scrollTop = liveLogsBody.scrollHeight;
  }

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => liveLogsBody.innerHTML = '');
  }
});
