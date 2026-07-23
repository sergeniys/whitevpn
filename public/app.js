document.addEventListener('DOMContentLoaded', () => {
  let loadedNodes = [];
  let testResults = {};
  let speedMonitorInterval = null;
  let logsInterval = null;

  const btnDpiCheck = document.getElementById('btn-dpi-check');
  const dpiBanner = document.getElementById('dpi-banner');
  const dpiTitle = document.getElementById('dpi-title');
  const dpiDesc = document.getElementById('dpi-desc');
  const dpiStatusBadge = document.getElementById('dpi-status-badge');

  const adminBadge = document.getElementById('admin-badge');
  const gaugeSpeedVal = document.getElementById('gauge-speed-val');
  const gaugePingVal = document.getElementById('gauge-ping-val');

  const ipVal = document.getElementById('ip-val');
  const countryVal = document.getElementById('country-val');
  const cityVal = document.getElementById('city-val');
  const ispVal = document.getElementById('isp-val');
  const btnRefreshIp = document.getElementById('btn-refresh-ip');

  const vpnActiveBar = document.getElementById('vpn-active-bar');
  const connectionDot = document.getElementById('connection-dot');
  const vpnStatusTitle = document.getElementById('vpn-status-title');
  const vpnStatusDesc = document.getElementById('vpn-status-desc');
  const btnVpnDisconnect = document.getElementById('btn-vpn-disconnect');

  const selectVpnEngine = document.getElementById('select-vpn-engine');
  const selectTunStack = document.getElementById('select-tun-stack');

  const btnLoadUserJson = document.getElementById('btn-load-user-json');
  const subUrlInput = document.getElementById('sub-url');
  const btnLoadUrl = document.getElementById('btn-load-url');
  const subRawInput = document.getElementById('sub-raw');
  const btnParseRaw = document.getElementById('btn-parse-raw');
  const btnDemoSub = document.getElementById('btn-demo-sub');

  const selectRelayNode = document.getElementById('select-relay-node');
  const selectExitNode = document.getElementById('select-exit-node');
  const btnTestChain = document.getElementById('btn-test-chain');
  const btnConnectDouble = document.getElementById('btn-connect-double');
  const chainResult = document.getElementById('chain-result');

  const btnTestAll = document.getElementById('btn-test-all');
  const btnExportBest = document.getElementById('btn-export-best');
  const summaryBar = document.getElementById('summary-bar');
  const statTotal = document.getElementById('stat-total');
  const statWorking = document.getElementById('stat-working');
  const statFailed = document.getElementById('stat-failed');
  const statBest = document.getElementById('stat-best');

  const nodeListBody = document.getElementById('node-list-body');
  const liveLogsBody = document.getElementById('live-logs-body');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  const diagModal = document.getElementById('diag-modal');
  const modalNodeTitle = document.getElementById('modal-node-title');
  const modalNodeContent = document.getElementById('modal-node-content');
  const modalClose = document.getElementById('modal-close');

  checkVpnStatus();
  refreshIpLocation();
  startSpeedMonitor();
  startLogsMonitor();

  btnRefreshIp.addEventListener('click', refreshIpLocation);

  async function refreshIpLocation() {
    ipVal.textContent = '⌛...';
    countryVal.textContent = '⌛...';
    cityVal.textContent = '⌛...';
    ispVal.textContent = '⌛...';

    try {
      const res = await fetch('/api/vpn/ip-check');
      const data = await res.json();
      
      ipVal.textContent = data.ip || 'Unknown';
      countryVal.innerHTML = `${getFlagEmoji(data.countryCode)} ${data.country || 'Russia'}`;
      cityVal.textContent = data.city || 'Moscow';
      ispVal.textContent = data.org || 'ISP';

      if (data.isVpn) {
        ipVal.style.color = 'var(--accent-emerald)';
        countryVal.style.color = 'var(--accent-emerald)';
      } else {
        ipVal.style.color = 'var(--accent-cyan)';
        countryVal.style.color = 'var(--accent-cyan)';
      }
    } catch (e) {
      ipVal.textContent = 'Ошибка';
    }
  }

  function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  function startSpeedMonitor() {
    if (speedMonitorInterval) clearInterval(speedMonitorInterval);
    speedMonitorInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/vpn/live-speed');
        const data = await res.json();
        updateVpnBar(data);
      } catch (e) {}
    }, 3000);
  }

  function startLogsMonitor() {
    if (logsInterval) clearInterval(logsInterval);
    logsInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/vpn/logs');
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          liveLogsBody.innerHTML = data.logs.map(line => `<div class="log-entry">${escapeHtml(line)}</div>`).join('');
          liveLogsBody.scrollTop = liveLogsBody.scrollHeight;
        }
      } catch (e) {}
    }, 2000);
  }

  btnClearLogs.addEventListener('click', () => {
    liveLogsBody.innerHTML = '<div class="log-entry text-dim">[SYSTEM] Логи очищены.</div>';
  });

  async function checkVpnStatus() {
    try {
      const res = await fetch('/api/vpn/status');
      const data = await res.json();
      updateVpnBar(data);
    } catch (e) {}
  }

  function updateVpnBar(status) {
    if (status.isAdmin) {
      adminBadge.className = 'badge badge-success';
      adminBadge.innerHTML = '<span class="icon">🛡️</span> АДМИН: ДА';
    } else {
      adminBadge.className = 'badge badge-warning';
      adminBadge.innerHTML = '<span class="icon">⚠️</span> АДМИН: НЕТ (Режим Прокси)';
    }

    if (status.connected && status.liveMbps > 0) {
      gaugeSpeedVal.textContent = `${status.liveMbps} Mbps`;
      gaugePingVal.textContent = `${status.livePingMs || 0} ms`;
    } else {
      gaugeSpeedVal.textContent = `0.0 Mbps`;
      gaugePingVal.textContent = `0 ms`;
    }

    if (status.connected) {
      vpnActiveBar.className = 'vpn-connection-bar vpn-connected';
      connectionDot.className = 'status-dot dot-on';
      btnVpnDisconnect.classList.remove('hidden');

      const engineName = (status.engine || 'singbox').toUpperCase();
      const stackName = status.tunStack || 'gvisor';
      const liveSpeedText = status.liveMbps ? `⚡ Скорость: ~${status.liveMbps} Mbps | Пинг: ${status.livePingMs || 0} мс` : 'Подключение установлено';

      if (status.type === 'DOUBLE') {
        vpnStatusTitle.textContent = `🟢 Двойной TUN VPN Активен (${engineName} / ${stackName})`;
        vpnStatusDesc.innerHTML = `Цепочка: <strong>${escapeHtml(status.relayName)}</strong> (РФ) ➔ <strong>${escapeHtml(status.exitName)}</strong> (Зарубеж). <br><span style="color:var(--accent-emerald); font-weight:600">${liveSpeedText}</span>`;
      } else {
        vpnStatusTitle.textContent = `🟢 VPN Подключен: ${escapeHtml(status.exitName)} (Ядро: ${engineName})`;
        vpnStatusDesc.innerHTML = `Sing-Box / Xray TUN Mode + Remote DNS. <span style="color:var(--accent-emerald); font-weight:600">${liveSpeedText}</span>`;
      }
    } else {
      vpnActiveBar.className = 'vpn-connection-bar vpn-disconnected';
      connectionDot.className = 'status-dot dot-off';
      vpnStatusTitle.textContent = 'VPN Отключен';
      vpnStatusDesc.textContent = 'Трафик вашего компьютера идет напрямую через оператора связи.';
      btnVpnDisconnect.classList.add('hidden');
    }
  }

  btnVpnDisconnect.addEventListener('click', async () => {
    btnVpnDisconnect.disabled = true;
    try {
      const res = await fetch('/api/vpn/disconnect', { method: 'POST' });
      const data = await res.json();
      updateVpnBar(data.details);
      setTimeout(refreshIpLocation, 1000);
    } catch (e) {
      alert('Ошибка отключения: ' + e.message);
    } finally {
      btnVpnDisconnect.disabled = false;
    }
  });

  // Load User Working serverjson.txt
  btnLoadUserJson.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/load-user-config');
      const data = await res.json();
      if (data.node) {
        loadedNodes = [data.node];
        renderNodesTable(loadedNodes);
        updateChainSelects(loadedNodes);
        alert(`✅ Узел "${data.node.name}" из файла serverjson.txt успешно загружен!\nПротокол: VLESS + Reality (Flow: ${data.node.flow || 'xtls-rprx-vision'})`);
      } else {
        alert(data.error || 'Не удалось найти рабочий узел в serverjson.txt');
      }
    } catch (e) {
      alert('Ошибка загрузки serverjson.txt: ' + e.message);
    }
  });

  // DPI Pre-check
  btnDpiCheck.addEventListener('click', runDpiCheck);

  async function runDpiCheck() {
    btnDpiCheck.disabled = true;
    btnDpiCheck.innerHTML = '<span class="icon">⌛</span> Проверка сети...';
    
    dpiBanner.className = 'status-banner banner-info';
    dpiTitle.textContent = 'Выполняется анализ блокировок и Белых списков...';
    dpiDesc.textContent = 'Тестирование доступа к разрешенным сайтам РФ (ВК, Авито, МТС), обычным международным сервисам и YouTube...';

    try {
      const res = await fetch('/api/check-dpi');
      const data = await res.json();

      dpiBanner.className = 'status-banner';
      if (data.state === 'WHITELIST_ACTIVE') {
        dpiBanner.classList.add('banner-danger');
        dpiTitle.textContent = '🚨 БЕЛЫЙ СПИСОК РФ АКТИВЕН!';
        dpiStatusBadge.className = 'badge badge-danger';
        dpiStatusBadge.textContent = 'WHITELIST ACTIVE';
      } else if (data.state === 'DPI_THROTTLED_OR_BLOCKED') {
        dpiBanner.classList.add('banner-warning');
        dpiTitle.textContent = '⚠️ Блокировка ТСПУ (DPI) только на YouTube';
        dpiStatusBadge.className = 'badge badge-warning';
        dpiStatusBadge.textContent = 'DPI ACTIVE';
      } else if (data.state === 'NORMAL') {
        dpiBanner.classList.add('banner-success');
        dpiTitle.textContent = '✅ Прямой интернет работает нормально';
        dpiStatusBadge.className = 'badge badge-success';
        dpiStatusBadge.textContent = 'ONLINE';
      } else {
        dpiBanner.classList.add('banner-danger');
        dpiTitle.textContent = '❌ Нет подключения к Сети';
        dpiStatusBadge.className = 'badge badge-danger';
        dpiStatusBadge.textContent = 'NO INTERNET';
      }

      dpiDesc.textContent = data.message;
    } catch (e) {
      dpiBanner.className = 'status-banner banner-danger';
      dpiTitle.textContent = 'Ошибка проверки сети';
      dpiDesc.textContent = e.message;
    } finally {
      btnDpiCheck.disabled = false;
      btnDpiCheck.innerHTML = '<span class="icon">🔍</span> Проверить DPI';
    }
  }

  // Load Sub
  btnLoadUrl.addEventListener('click', async () => {
    const url = subUrlInput.value.trim();
    if (!url) return alert('Пожалуйста, введите URL подписки v2raytun / Happ');
    await loadSubscription({ url });
  });

  btnParseRaw.addEventListener('click', async () => {
    const content = subRawInput.value.trim();
    if (!content) return alert('Пожалуйста, вставьте текст с VLESS / VMess / Trojan ссылками');
    await loadSubscription({ content });
  });

  btnDemoSub.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/demo-subscription');
      const data = await res.json();
      if (data.nodes) {
        loadedNodes = data.nodes;
        renderNodesTable(loadedNodes);
        updateChainSelects(loadedNodes);
      }
    } catch (e) {
      alert('Ошибка демо-подписки: ' + e.message);
    }
  });

  async function loadSubscription(payload) {
    btnLoadUrl.disabled = true;
    btnParseRaw.disabled = true;
    try {
      const res = await fetch('/api/parse-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        loadedNodes = data.nodes || [];
        renderNodesTable(loadedNodes);
        updateChainSelects(loadedNodes);
      }
    } catch (e) {
      alert('Ошибка при загрузке подписки: ' + e.message);
    } finally {
      btnLoadUrl.disabled = false;
      btnParseRaw.disabled = false;
    }
  }

  function updateChainSelects(nodes) {
    selectRelayNode.innerHTML = '<option value="">-- Выберите узел в РФ (Реле) --</option>' +
      nodes.map(n => `<option value="${n.id}">${escapeHtml(n.name)} (${n.host})</option>`).join('');

    selectExitNode.innerHTML = '<option value="">-- Выберите зарубежный узел (Exit) --</option>' +
      nodes.map(n => `<option value="${n.id}">${escapeHtml(n.name)} (${n.host})</option>`).join('');
  }

  // Test Chain
  btnTestChain.addEventListener('click', async () => {
    const relayId = selectRelayNode.value;
    const exitId = selectExitNode.value;

    if (!relayId || !exitId) {
      return alert('Выберите узел-реле в РФ и конечный зарубежный узел!');
    }

    const relayNode = loadedNodes.find(n => n.id === relayId);
    const exitNode = loadedNodes.find(n => n.id === exitId);

    btnTestChain.disabled = true;
    chainResult.classList.remove('hidden');
    chainResult.innerHTML = 'Запуск теста двойного туннеля через Sing-Box Core...';

    try {
      const res = await fetch('/api/test-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relayNode, exitNode })
      });
      const data = await res.json();

      if (data.success) {
        chainResult.style.background = 'rgba(16, 185, 129, 0.15)';
        chainResult.style.borderColor = 'var(--accent-emerald)';
        chainResult.innerHTML = `
          <strong>${data.message}</strong><br>
          • <strong>Задержка туннеля:</strong> ${data.latencyMs} мс<br>
          • <strong>Цепочка:</strong> ПК ➔ ${escapeHtml(relayNode.name)} ➔ ${escapeHtml(exitNode.name)} ➔ ИНТЕРНЕТ
        `;
      } else {
        chainResult.style.background = 'rgba(244, 63, 94, 0.15)';
        chainResult.style.borderColor = 'var(--accent-rose)';
        chainResult.innerHTML = `<strong>${data.message}</strong>`;
      }
    } catch (e) {
      chainResult.innerHTML = `Ошибка теста: ${e.message}`;
    } finally {
      btnTestChain.disabled = false;
    }
  });

  // REAL Connect Double Tunnel with TUN Stack
  btnConnectDouble.addEventListener('click', async () => {
    const relayId = selectRelayNode.value;
    const exitId = selectExitNode.value;
    const tunStack = selectTunStack.value;

    if (!relayId || !exitId) {
      return alert('Выберите узел-реле в РФ и зарубежный узел!');
    }

    const relayNode = loadedNodes.find(n => n.id === relayId);
    const exitNode = loadedNodes.find(n => n.id === exitId);

    btnConnectDouble.disabled = true;
    btnConnectDouble.innerHTML = '<span class="icon">⌛</span> Подключение...';

    try {
      const res = await fetch('/api/vpn/connect-double', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relayNode, exitNode, tunStack })
      });
      const data = await res.json();

      if (data.success) {
        updateVpnBar(data.details);
        setTimeout(refreshIpLocation, 1200);
        alert(`🎉 Двойной TUN VPN успешно подключен (Стек: ${tunStack})!\n\nЦепочка: ПК ➔ ${relayNode.name} (РФ) ➔ ${exitNode.name} (Зарубеж).\nАктивирован Sing-Box TUN режим + Mixed Proxy.`);
      } else {
        alert('Ошибка подключения: ' + (data.error || 'Сбой'));
      }
    } catch (e) {
      alert('Ошибка подключения: ' + e.message);
    } finally {
      btnConnectDouble.disabled = false;
      btnConnectDouble.innerHTML = '<span class="icon">⚡</span> Подключить Двойной TUN';
    }
  });

  // Render Table with TCP Ping, TLS ALPN, HTTP URL Ping
  function renderNodesTable(nodes, preserveResults = false) {
    if (!nodes || nodes.length === 0) {
      nodeListBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="8">В подписке не найдено поддерживаемых узлов.</td>
        </tr>
      `;
      btnTestAll.disabled = true;
      summaryBar.classList.add('hidden');
      return;
    }

    btnTestAll.disabled = false;
    summaryBar.classList.remove('hidden');
    statTotal.textContent = nodes.length;

    if (!preserveResults) {
      testResults = {};
      statWorking.textContent = '0';
      statFailed.textContent = '0';
      statBest.textContent = '--';
    }

    nodeListBody.innerHTML = nodes.map(node => {
      const res = testResults[node.id];
      let pingHtml = '<span class="text-dim">--</span>';
      let tlsHtml = '<span class="text-dim">--</span>';
      let urlPingHtml = '<span class="text-dim">--</span>';
      let speedHtml = '<span class="text-dim">--</span>';
      let scoreHtml = '<span class="text-dim">--</span>';

      if (res) {
        if (res.tcpOk) {
          const cls = res.tcpLatencyMs < 200 ? 'ping-good' : (res.tcpLatencyMs < 500 ? 'ping-medium' : 'ping-bad');
          pingHtml = `<span class="${cls}">${res.tcpLatencyMs} мс</span>`;
        } else {
          pingHtml = `<span class="ping-bad">Таймаут</span>`;
        }

        if (res.tlsOk) {
          tlsHtml = `<span class="badge badge-success">OK (${res.tlsLatencyMs || 0}мс)</span>`;
        } else {
          tlsHtml = `<span class="badge badge-danger">RST / Ошибка</span>`;
        }

        if (res.urlPingOk) {
          const cls = res.urlPingMs < 400 ? 'ping-good' : (res.urlPingMs < 1000 ? 'ping-medium' : 'ping-bad');
          urlPingHtml = `<strong class="${cls}">⚡ ${res.urlPingMs} мс</strong>`;
        } else {
          urlPingHtml = `<span class="ping-bad">❌ Ошибка URL</span>`;
        }

        if (res.diagnostic?.happUsable) {
          speedHtml = `<strong style="color: var(--accent-emerald)">~${res.mbpsSpeed} Mbps</strong>`;
          const score = res.diagnostic.youtubeScore;
          const scoreClass = score >= 75 ? 'score-high' : (score >= 50 ? 'score-mid' : 'score-low');
          scoreHtml = `
            <span class="score-badge ${scoreClass}">${score}/100</span>
            <button class="btn-link text-dim btn-details" data-id="${node.id}" style="font-size:11px; margin-left:4px; background:none; border:none; color:var(--accent-cyan); cursor:pointer">Инфо</button>
          `;
        } else if (res.diagnostic) {
          speedHtml = `<span class="ping-bad">0 Mbps</span>`;
          scoreHtml = `
            <span class="score-badge score-low">0/100</span>
            <button class="btn-link btn-details" data-id="${node.id}" style="font-size:11px; margin-left:4px; background:none; border:none; color:var(--accent-amber); cursor:pointer">Причина</button>
          `;
        }
      }

      return `
        <tr id="row-${node.id}">
          <td>
            <div class="node-name">
              <span>${escapeHtml(node.name)}</span>
              <span class="node-subtext">${node.host}:${node.port} (${node.sni || 'no-sni'})</span>
            </div>
          </td>
          <td><span class="badge badge-neutral">${node.protocol}</span></td>
          <td id="ping-${node.id}">${pingHtml}</td>
          <td id="tls-${node.id}">${tlsHtml}</td>
          <td id="urlping-${node.id}">${urlPingHtml}</td>
          <td id="speed-${node.id}">${speedHtml}</td>
          <td id="score-${node.id}">${scoreHtml}</td>
          <td>
            <div style="display:flex; gap:4px">
              <button class="btn btn-secondary btn-sm btn-test-single" data-id="${node.id}">Тест</button>
              <button class="btn btn-primary btn-sm btn-connect-single" data-id="${node.id}">Подключить</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.btn-test-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const node = loadedNodes.find(n => n.id === id);
        if (node) testSingleNode(node);
      });
    });

    document.querySelectorAll('.btn-connect-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const node = loadedNodes.find(n => n.id === id);
        if (node) connectSingleNode(node);
      });
    });

    document.querySelectorAll('.btn-details').forEach(b => {
      const id = b.getAttribute('data-id');
      const node = loadedNodes.find(n => n.id === id);
      if (node && testResults[id]) {
        b.addEventListener('click', () => showDiagnosticModal(node, testResults[id]));
      }
    });
  }

  // REAL Connect Single Node with Engine & TUN Stack
  async function connectSingleNode(node) {
    const tunStack = selectTunStack.value;
    const engine = selectVpnEngine.value;
    try {
      const res = await fetch('/api/vpn/connect-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node, tunStack, engine })
      });
      const data = await res.json();

      if (data.success) {
        updateVpnBar(data.details);
        setTimeout(refreshIpLocation, 1200);
        alert(`✅ VPN подключен к серверу: ${node.name} (Ядро: ${engine.toUpperCase()})!\nАктивирован TUN режим + WinINet Proxy.`);
      } else {
        alert('Ошибка подключения к серверу: ' + (data.error || 'Сбой'));
      }
    } catch (e) {
      alert('Ошибка подключения: ' + e.message);
    }
  }

  // Multi-Ping Test (TCP Ping + TLS Handshake + HTTP URL Ping)
  async function testSingleNode(node) {
    const row = document.getElementById(`row-${node.id}`);
    const pingTd = document.getElementById(`ping-${node.id}`);
    const tlsTd = document.getElementById(`tls-${node.id}`);
    const urlPingTd = document.getElementById(`urlping-${node.id}`);
    const speedTd = document.getElementById(`speed-${node.id}`);
    const scoreTd = document.getElementById(`score-${node.id}`);

    pingTd.innerHTML = '<span class="icon">⌛</span>';
    tlsTd.innerHTML = '<span class="icon">⌛</span>';
    urlPingTd.innerHTML = '<span class="icon">⌛</span>';
    speedTd.innerHTML = '<span class="icon">⌛</span>';
    scoreTd.innerHTML = '<span class="icon">⌛</span>';

    try {
      const res = await fetch('/api/test-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node)
      });
      const data = await res.json();
      testResults[node.id] = data;

      // 1. TCP Ping
      if (data.tcpOk) {
        const cls = data.tcpLatencyMs < 200 ? 'ping-good' : (data.tcpLatencyMs < 500 ? 'ping-medium' : 'ping-bad');
        pingTd.innerHTML = `<span class="${cls}">${data.tcpLatencyMs} мс</span>`;
      } else {
        pingTd.innerHTML = `<span class="ping-bad">Таймаут</span>`;
      }

      // 2. TLS Handshake Ping
      if (data.tlsOk) {
        tlsTd.innerHTML = `<span class="badge badge-success">OK (${data.tlsLatencyMs || 0}мс)</span>`;
      } else {
        tlsTd.innerHTML = `<span class="badge badge-danger">RST / Ошибка</span>`;
      }

      // 3. HTTP URL Ping (HTTP 204 GET via Proxy)
      if (data.urlPingOk) {
        urlPingTd.innerHTML = `<strong class="ping-good">⚡ ${data.urlPingMs} мс</strong>`;
      } else {
        urlPingTd.innerHTML = `<span class="ping-bad">❌ Ошибка URL</span>`;
      }

      // 4. Speed & Score
      if (data.diagnostic?.happUsable) {
        speedTd.innerHTML = `<strong style="color: var(--accent-emerald)">~${data.mbpsSpeed} Mbps</strong>`;
        
        const score = data.diagnostic.youtubeScore;
        const scoreClass = score >= 75 ? 'score-high' : (score >= 50 ? 'score-mid' : 'score-low');
        scoreTd.innerHTML = `
          <span class="score-badge ${scoreClass}">${score}/100</span>
          <button class="btn-link text-dim btn-details" data-id="${node.id}" style="font-size:11px; margin-left:4px; background:none; border:none; color:var(--accent-cyan); cursor:pointer">Инфо</button>
        `;
      } else {
        speedTd.innerHTML = `<span class="ping-bad">0 Mbps</span>`;
        scoreTd.innerHTML = `
          <span class="score-badge score-low">0/100</span>
          <button class="btn-link btn-details" data-id="${node.id}" style="font-size:11px; margin-left:4px; background:none; border:none; color:var(--accent-amber); cursor:pointer">Причина</button>
        `;
      }

      row.querySelectorAll('.btn-details').forEach(b => {
        b.addEventListener('click', () => showDiagnosticModal(node, data));
      });

      updateSummaryStats();
    } catch (e) {
      pingTd.innerHTML = `<span class="ping-bad">Ошибка</span>`;
    }
  }

  // Test All Batch
  btnTestAll.addEventListener('click', async () => {
    btnTestAll.disabled = true;
    btnTestAll.innerHTML = '<span class="icon">⌛</span> Выполняются тесты...';

    for (const node of loadedNodes) {
      await testSingleNode(node);
    }

    // Automatically sort loadedNodes by lowest (best) URL Ping (urlPingMs)
    loadedNodes.sort((a, b) => {
      const resA = testResults[a.id];
      const resB = testResults[b.id];

      const pingA = (resA && resA.urlPingOk && resA.urlPingMs > 0) ? resA.urlPingMs : 999999;
      const pingB = (resB && resB.urlPingOk && resB.urlPingMs > 0) ? resB.urlPingMs : 999999;

      return pingA - pingB;
    });

    // Re-render table with sorted nodes and preserved test badges
    renderNodesTable(loadedNodes, true);

    btnTestAll.disabled = false;
    btnTestAll.innerHTML = '<span class="icon">▶</span> Тестировать все серверы';
    btnExportBest.disabled = false;
  });

  function updateSummaryStats() {
    const resultsArr = Object.values(testResults);
    const working = resultsArr.filter(r => r.diagnostic?.happUsable);
    const failed = resultsArr.filter(r => !r.diagnostic?.happUsable);

    statWorking.textContent = working.length;
    statFailed.textContent = failed.length;

    if (working.length > 0) {
      working.sort((a, b) => (b.diagnostic?.youtubeScore || 0) - (a.diagnostic?.youtubeScore || 0));
      statBest.textContent = working[0].name.substring(0, 15);
    } else {
      statBest.textContent = '--';
    }
  }

  function showDiagnosticModal(node, data) {
    modalNodeTitle.textContent = `Диагностика сервера: ${node.name}`;
    const diag = data.diagnostic || {};

    modalNodeContent.innerHTML = `
      <div class="diag-section">
        <div class="diag-title">Статус сервера:</div>
        <div class="diag-detail" style="font-weight:600; color:${diag.happUsable ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
          ${diag.primaryIssue || 'Неизвестная ошибка'}
        </div>
        <div class="diag-detail">${diag.explanation || ''}</div>
      </div>

      <div class="diag-section">
        <div class="diag-title">Результаты Мульти-Тестирования:</div>
        <div class="diag-detail">
          • <strong>Host / IP:</strong> ${node.host}:${node.port}<br>
          • <strong>1. TCP Socket Ping:</strong> ${data.tcpLatencyMs || 0} мс (${data.tcpOk ? 'Сокет открыт' : 'Таймаут'})<br>
          • <strong>2. TLS ClientHello Ping:</strong> ${data.tlsOk ? `Успешно (${data.tlsLatencyMs}мс)` : 'Сброшен ТСПУ (RST)'}<br>
          • <strong>3. HTTP Proxy URL Ping:</strong> ${data.urlPingOk ? `HTTP 204 OK (${data.urlPingMs}мс)` : 'Ошибка запроса'}<br>
          • <strong>Скорость YouTube:</strong> ~${data.mbpsSpeed || 0} Mbps (Индекс: ${diag.youtubeScore || 0}/100)
        </div>
      </div>
    `;

    diagModal.classList.remove('hidden');
  }

  modalClose.addEventListener('click', () => diagModal.classList.add('hidden'));

  btnExportBest.addEventListener('click', () => {
    const resultsArr = Object.values(testResults).filter(r => r.diagnostic?.happUsable);
    if (resultsArr.length === 0) return alert('Нет доступных рабочих серверов');
    resultsArr.sort((a, b) => (b.diagnostic?.youtubeScore || 0) - (a.diagnostic?.youtubeScore || 0));
    const best = resultsArr[0];
    const nodeObj = loadedNodes.find(n => n.id === best.nodeId);
    
    if (nodeObj && nodeObj.rawUri) {
      navigator.clipboard.writeText(nodeObj.rawUri);
      alert(`Ссылка на лучший сервер (${best.name}) скопирована!\n\nИспользуйте режим TUN в Happ: ${best.diagnostic.recommendedHappTunMode}`);
    }
  });

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  runDpiCheck();
});
