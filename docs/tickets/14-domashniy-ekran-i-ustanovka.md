# 14: Домашний экран и продвижение установки

**What to build:** Первый экран предлагает поставить приложение и разрешает работать в браузере. Три платформы, три разных сценария.

**Blocked by:** 01, 12

**Status:** closed

- [x] На Chromium кнопка установки появляется только когда придёт `beforeinstallprompt`, не при первой отрисовке
- [x] На iOS показана инструкция «Поделиться, На экран Домой» с изображением кнопки
- [x] ~~В Firefox продвижения нет, сразу обход~~ Экран установки показывается в любой вкладке любого браузера, кроме запущенного установленным (operator, 2026-09-27)
- [x] Кнопка «продолжить в браузере» всегда видна и не спрятана
- [x] ~~Отказ помнится тридцать дней, после отказа вместо полного экрана тонкая полоса сверху~~ Отказ помнится до конца сессии браузера в `sessionStorage`, полосы нет (operator, 2026-09-27)
- [x] Запущенным установленным домашний экран не показывается
- [x] Определение режима запуска ветвится: `navigator.standalone` на iOS, `display-mode` на остальных
- [x] На экране прямо написано, что без установки на iPhone локальные данные живут семь дней
- [x] Вход идёт после домашнего экрана, а не до него

## Comments

Interpretations taken during implementation, 2026-09-27:

- The home screen is not a route (operator). `src/routes/home-screen.svelte` is a high-level component like `authorized.svelte`: it renders the home screen instead of its children. `+layout.svelte` wraps every page in it, so sign-in always comes after it.
- The criterion is the launch, not the browser (operator): every tab of every browser shows the home screen, and only an installed launch skips it. A refusal («Продолжить в браузере», a small link) lasts until the browser session ends: it lives in `sessionStorage` under `training:install-refused`; a new session shows the screen again. Where storage is blocked it lives in memory until reload.
- Two screens (operator). Where this browser can install, the screen says so for the device (a computer: own window, Dock or taskbar; a phone: the Home Screen) and gives the install button or the steps. Where it cannot, the screen says so, tells where to open the address, and offers «Скопировать адрес»; the copied state resets when the window regains focus, since the clipboard may have changed.
- The install model follows whatpwacando.today (operator): `beforeinstallprompt` gives a button, drawn only when the event arrives; elsewhere steps by platform, browser and iOS version. Beyond the site: Firefox on Windows 143+ installs with «Добавить вкладку на панель задач» (Mozilla, Taskbar Tabs docs and localization); Firefox on macOS cannot install (same docs) and is sent to Safari; Firefox on Linux has it disabled by default and is sent to Chrome or Edge; Safari on macOS 14+ uses «Поделиться» > «Добавить в Dock» > «Добавить» (Apple, support 104996). Button names in the steps follow the browser language (`navigator.language`): Russian names for `ru`, English otherwise.
- The seven-day warning is shown in Safari: on iOS as the iPhone rule, on macOS as the Safari rule.
- Launch detection: on iOS `navigator.standalone === true` or `display-mode: fullscreen` (WebKit bug 264218, Safari in a tab never reports `fullscreen`); elsewhere `display-mode` `standalone`, `minimal-ui` or `window-controls-overlay`, or an `android-app://` referrer. It follows `display-mode` changes, `appinstalled` and an accepted prompt without reload. `fullscreen` is not trusted outside iOS because F11 and the Fullscreen API report it.
- Chrome may fire `beforeinstallprompt` before the bundle loads, so an inline script in `src/app.html` stores it in `window.deferredInstallPrompt` and the binding starts from it.
- Known limit: Chrome, Edge and Firefox on iOS choose steps by the `CPU iPhone OS` version, which iOS 26 freezes at `18_6`, so they may show the older steps; Safari reads `Version/` and is not affected.
