# 🛡️ KartseVPN Mobile & Desktop Client

**KartseVPN** — мощный, современный VPN-клиент нативно в стиле Happ на Android и Windows. Приложение специально разработано для обхода жесточайших блокировок ТСПУ, интеграции протоколов VLESS / VLESS Reality / XHTTP, поддержки Wintun системного туннелирования, Двойного туннеля (Double VPN) и Умного разделения трафика (Split Tunneling).

---

## ✨ Основные Возможности KartseVPN

- 📱 **Интерфейс в стиле Happ на Android**:
  - Главный экран с большой кнопкой подключения («ПОДКЛЮЧИТЬСЯ / ОТКЛЮЧИТЬ»), индикацией IP адреса и пинга.
  - Быстрый выбор серверов и переключение режимов.
- 🔀 **Умное разделение трафика (Split Tunneling)**:
  - Российские государственные сервисы, банки (`.ru`, Госуслуги, Яндекс, Сбербанк) и выбранные домены направляются **НАПРЯМУЮ через провайдера без задержек и VPN**.
  - Зарубежные заблокированные сайты и YouTube автоматически идут через зашифрованный VPN-туннель.
- 🔗 **Режим Двойного Туннелирования (Double VPN)**:
  - Проброс трафика через промежуточный реле-узел в РФ на зарубежные ноды выхода (Нидерланды, Эстония, Германия).
- 🚀 **Поддержка Протоколов VLESS**:
  - VLESS / VLESS Reality (XTLS Vision)
  - VLESS XHTTP
  - Sing-Box (Wintun & gVisor) + Xray-Core
- 🤖 **Автоматическая сборка Android APK**:
  - Благодаря GitHub Actions при создании каждого релиза автоматически компилируется нативный установочный **`KartseVPN.apk`**!

---

## 📁 Структура Репозитория

```
kartsevpn/
├── .github/workflows/       # GitHub Actions (Автосборка KartseVPN.apk для GitHub Releases)
│   └── build-apk.yml
├── public/                  # Фронтенд KartseVPN (Happ UI: index.html, style.css, app.js, manifest.json)
├── server.js                # Backend API (Xray/Sing-Box, Split Tunneling, Wintun Driver)
├── capacitor.config.json    # Конфигурация Android сборки
├── start-as-admin.bat       # Скрипт запуска ПК-версии с правами Администратора
└── README.md                # Документация проекта
```

---

## 🚀 Быстрый Запуск

### 💻 1. На ПК (Windows)
```bash
npm install
npm start
```
Откройте браузер по адресу `http://localhost:3000`. Нажмите `F12` -> `Ctrl+Shift+M` для тестирования мобильного вида.

### 📱 2. Скачать `.apk` на Android
Зайдите во вкладку **Releases** репозитория GitHub для скачивания готового установочного файла **`KartseVPN-v1.1.0.apk`**.
