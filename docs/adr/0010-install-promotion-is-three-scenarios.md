# Install promotion is three scenarios, not one with branches

No unified programmatic install prompt exists or will exist: WebKit took a formal position against `beforeinstallprompt`, `navigator.install()` and `<install>` at once. So Chromium gets a real button drawn only when `beforeinstallprompt` arrives, iOS gets a "Share, Add to Home Screen" instruction, and Firefox gets no promotion. A "continue in browser" bypass is always visible; a refusal is remembered for thirty days.

Launch-mode detection branches by platform: on iOS only `navigator.standalone` is reliable, because an installed app with `display: standalone` reports `display-mode: fullscreen` (WebKit bug 264218, open since November 2023); elsewhere `display-mode` is used.

Installing matters on iOS: a Safari tab evicts IndexedDB after seven days without interaction, while home-screen apps are exempt, and the two storages are isolated.

Research: [pwa-install.md](../intake/research/pwa-install.md).

Amended 2026-09-27 (ticket 14, operator): the home screen shows in every tab of every browser and is skipped only by an installed launch. Where the browser can install it gives the button or the steps of whatpwacando.today, plus Firefox on Windows (Taskbar Tabs) and Safari on macOS (Add to Dock); where it cannot (Firefox on macOS and Linux, unknown browsers) it says so and offers to copy the address for a browser that can. A refusal lasts until the browser session ends, in `sessionStorage`; there is no thirty-day memory and no bar. On iOS an installed launch is `navigator.standalone` or `display-mode: fullscreen`, because bug 264218 makes an installed app report `fullscreen` while Safari in a tab never does.
