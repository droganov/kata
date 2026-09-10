# Установка PWA: что реально возможно на целевых платформах

Исследование по первоисточникам. Дата проверки: **10 сентября 2026**. Все ссылки открывались в этот день; там, где источник устарел или сам себе противоречит, это отмечено явно.

Читателю: это не обзор возможностей, а перечень ограничений. Разделы устроены так, чтобы по ним можно было принять продуктовое решение по задачам [07](../../../.scratch/training-webapp/issues/07-pwa-vozmozhnosti-platform.md) и [08](../../../.scratch/training-webapp/issues/08-prodvizhenie-ustanovki.md).

---

## Краткие выводы

1. **Программный вызов установки — только Chromium.** `beforeinstallprompt` не стандартизован, живёт в инкубаторе WICG, WebKit официально **против** ([position: oppose](https://github.com/WebKit/standards-positions/issues/619)), Mozilla не реализует и позиции не публиковала. Замены в стандарте **нет**.
2. **На iOS программного вызова установки нет и не предвидится.** Единственный путь — «Поделиться → На экран Домой». При этом в **iOS 26 Apple убрала все требования к установимости**: на домашний экран добавляется любой сайт ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)).
3. **Определение «запущено установленным» ломается ровно там, где это важнее всего.** На iOS установленное приложение с `display: standalone` рапортует `display-mode: fullscreen`, а не `standalone` — [WebKit bug 264218](https://bugs.webkit.org/show_bug.cgi?id=264218), открыт с ноября 2023, не исправлен. На iOS достоверен только `navigator.standalone`.
4. **Установка на iOS — единственный способ сделать IndexedDB долговечной.** В обычной вкладке Safari данные, записанные скриптом, удаляются после **7 дней без взаимодействия** пользователя. Домашние веб-приложения из этого правила **исключены** ([WebKit Tracking Prevention](https://webkit.org/tracking-prevention/)).
5. **`navigator.storage.estimate()` в Chrome 133+ возвращает выдумку** — `usage + 10 GiB` — и в обычном режиме тоже. Считать по нему свободное место больше нельзя ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/7q0YGQNVkjs/m/mpYkQVWpAQAJ)).

---

## 1. `beforeinstallprompt`

### 1.1. Кто вызывает событие сегодня

Данные взяты из [browser-compat-data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BeforeInstallPromptEvent.json) — того же массива, что рендерит таблицы совместимости MDN.

| Браузер | Поддержка |
| --- | --- |
| Chrome (десктоп) | 44 |
| Chrome Android | зеркалирует Chrome (44) |
| Edge | зеркалирует Chromium (79) |
| Samsung Internet | 5.0 |
| Opera / Opera Android | зеркалирует Chromium |
| **Firefox / Firefox Android** | **нет** |
| **Safari / Safari iOS** | **нет** |

Существенные оговорки:

- Пригодный к использованию `prompt()`, возвращающий промис, — с **Chrome 76**. В 44–75 он резолвился пустым промисом ([BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BeforeInstallPromptEvent.json)).
- Свойство-обработчик `window.onbeforeinstallprompt` — с **Chrome 61** (там же, [Window.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Window.json)).
- Событие `appinstalled` — Chrome desktop 64 / Chrome Android 57. **Opera объявляет обработчик, но событие никогда не вызывает** ([BCD Window.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Window.json)).
- Значения для Edge, Opera и Chrome Android в BCD помечены как `mirror` — они **вычислены**, а не измерены. Отдельных заметок по платформам нет.
- Страница MDN несёт сразу три плашки: **Limited availability**, **Experimental**, **Non-standard** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent)).

Отдельно про Android: даже там, где событие вызывается, «установка» означает разное. WebAPK (настоящая запись в лаунчере без бейджа браузера) собирается только Chrome на устройствах с Google Mobile Services и Samsung Internet на устройствах Samsung; «Firefox, Edge, Opera и другие браузеры вместо этого добавляют ярлык на домашний экран с бейджем браузера» ([MDN, обновлено 2026-09-07](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)).

На **iOS ни один браузер** не поддерживает программный промпт установки, включая Chrome и Edge ([MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [web.dev](https://web.dev/learn/pwa/installation-prompt)).

### 1.2. Позиции вендоров

**WebKit — формально против.** [WebKit/standards-positions#619](https://github.com/WebKit/standards-positions/issues/619) закрыт с меткой `position: oppose` и претензиями `complexity`, `usability`, `API design`, `annoyance`; то же в [машиночитаемом summary.json](https://raw.githubusercontent.com/WebKit/standards-positions/main/summary.json). Из текста позиции (14 мая 2026):

> «For this reason, WebKit sees installation as a user-initiated browser action.»

> «APIs such as `BeforeInstallPromptEvent`, `navigator.install()`, or declarative `<install>` approaches introduce a programmable mechanism for initiating the installation conversation from page context. While these APIs may rely on user activation and display browser-managed dialogs, the presence of native UI does not alter the initiation model. The key distinction is who determines when the installation flow begins.»

Требование пользовательского жеста этой позиции не снимает: «this requirement does not change who controls the initiation of the installation conversation».

Важно, что **одна позиция покрывает все три подхода**: [WebKit/standards-positions#463](https://github.com/WebKit/standards-positions/issues/463) («Web Install API») закрыт 26 мая 2026 со ссылкой на #619. То есть рассчитывать, что Safari примет `navigator.install()` вместо `beforeinstallprompt`, не приходится.

Взамен WebKit предлагает **только детектирование, без промпта** — CSS-фичу `installed`: [w3c/manifest#1218](https://github.com/w3c/manifest/pull/1218). Смёржена ли она — проверить не удалось.

**Mozilla — позиции нет.** Запросы [#1371](https://github.com/mozilla/standards-positions/issues/1371) (BIP, открыт 10 марта 2026), [#1387](https://github.com/mozilla/standards-positions/issues/1387) (`navigator.install()`), [#1388](https://github.com/mozilla/standards-positions/issues/1388) (`<install>`), [#1179](https://github.com/mozilla/standards-positions/issues/1179) — все **открыты без метки позиции**, и в [activities.yml](https://raw.githubusercontent.com/mozilla/standards-positions/main/activities.yml) записей нет. Комментарии инженеров Mozilla в тредах — личные мнения, не позиция организации.

### 1.3. Стандартизация: её нет

`beforeinstallprompt` **не входит** в спецификацию Web Application Manifest и **не находится** на рекомендательном треке W3C.

- Нормативный дом — черновик [WICG Manifest Incubations](https://wicg.github.io/manifest-incubations/#onbeforeinstallprompt-attribute). Именно на него ссылается MDN.
- Из спецификации W3C событие **удалили** в 2019–2020 годах: [w3c/manifest#836](https://github.com/w3c/manifest/pull/836) по возражению WebKit в [w3c/manifest#835](https://github.com/w3c/manifest/issues/835).
- Прямо сейчас идёт попытка вернуть: [w3c/manifest#1206 «Bring back `beforeinstallprompt`»](https://github.com/w3c/manifest/pull/1206), открыт 6 февраля 2026, **не смёржен**. Отмечены обязательства только Chromium; WebKit и Gecko — пусто.

То есть предположение «оно всё равно когда-нибудь станет стандартом» описывает исход, который сейчас **заблокирован**.

### 1.4. Замены в стандарте нет

Есть две несовместимые инкубации, обе от Microsoft, обе под позицией `oppose` от WebKit.

**`navigator.install()` (Web Install API)**

- [Chrome Platform Status](https://chromestatus.com/feature/5183481574850560): статус **«In development»**, целевая веха десктопа **155**, зрелость — **Incubation**, Safari: Oppose, Firefox: No signal.
- **Origin trial завершён.** В [реестре Chrome](https://chromestatus.com/api/v0/origintrials) трайл `WebAppInstallation` имеет `"status": "COMPLETE"`, вехи **143–150**.
- Сейчас: **Chrome 154 за флагом `#web-app-installation-api`** ([BCD Navigator.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json)), с примечанием, что требуются абсолютные URL для `manifest` и `manifestId`.
- **API переработан в 2026 году.** [Объяснитель Microsoft](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer.md) теперь описывает `navigator.install({ manifest: <url> [, manifestId: <url>] })`. Раньше целью установки был URL документа (`install_url`), теперь — URL манифеста, забираемый как JSON ([обзор TAG](https://github.com/w3ctag/design-reviews/issues/1245)). **Код, написанный под форму 2025 года, сегодня неверен.**
- Попытка внести в спецификацию — [w3c/manifest#1175](https://github.com/w3c/manifest/pull/1175), открыт с июня 2025, не смёржен.

**HTML-элемент `<install>`**

- [Блог Chrome, 12 мая 2026](https://developer.chrome.com/blog/install-element-ot): за флагом `#web-app-install-element` с версии **148**, origin trial **148–153** в Chrome и Edge (один токен на оба).
- В [реестре](https://chromestatus.com/api/v0/origintrials) трайл `InstallElement` — `"status": "ACTIVE"`, вехи 148–153. Стабильный Chrome сейчас 153, то есть **трайл в последней своей вехе**.
- [Chrome Platform Status](https://chromestatus.com/feature/5152834368700416): статус **«Proposed»**, десктоп 155.
- Требует в манифесте поле **`id`** для установки текущего приложения; для кросс-доменной установки — атрибут `installurl` и `id`/`manifestid`.
- Chrome прямо пишет, что не решил, что именно выпустит: элемент, API или оба.

**Вывод по разделу.** На сентябрь 2026 стандартизованной замены `beforeinstallprompt` нет, и ни одна из двух кандидатных технологий не является кроссбраузерной. Строить продакшн на `navigator.install()` или `<install>` нельзя.

### 1.5. Практические ограничения в Chrome

- **`prompt()` требует пользовательского жеста.** «Although the `beforeinstallprompt` event may be fired without a user gesture, calling `prompt()` requires one» ([developer.chrome.com](https://developer.chrome.com/blog/a2hs-updates) — ⚠️ страница обновлялась последний раз **2018-06-04**).
- **Событие можно отложить и сохранить.** Штатный паттерн: `preventDefault()`, сохранить объект события, показать свой UI, вызвать `prompt()` по клику ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event), [web.dev](https://web.dev/articles/customize-install)).
- **`prompt()` одноразовый.** «You can only call `prompt()` on the deferred event once» ([web.dev](https://web.dev/articles/customize-install)).
- **Отказ не запоминается платформой.** После отказа нужно ждать следующего `beforeinstallprompt`, который обычно приходит сразу после резолва `userChoice` ([web.dev](https://web.dev/articles/customize-install)). Значит, **запоминать отказ должно само приложение** — это прямо относится к задаче 08.
- **Момент вызова не гарантирован.** «There's no guaranteed time this event is fired, but it usually happens on page load» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)). Следствие: кнопку «Установить» нельзя рисовать синхронно при первой отрисовке — только по факту прихода события.
- **Эвристики вовлечённости.** Chrome документирует: сайт ещё не установлен; пользователь хотя бы раз кликнул или тапнул по странице (когда угодно, хоть в прошлой загрузке); пользователь провёл на странице суммарно не меньше 30 секунд ([web.dev/install-criteria](https://web.dev/articles/install-criteria)). ⚠️ **Это единственный авторитетный источник по эвристике, и ему два года (обновлён 2024-09-19).** Подтвердить, что правило 30 секунд действует в Chrome 153, не удалось.
- **Срок жизни отложенного события.** ⚠️ **Никакого документированного срока истечения найти не удалось.** Ни MDN, ни web.dev, ни блог Chrome его не описывают. Документированы только два способа инвалидации: событие уже использовано, либо приложение установлено. Утверждение «событие протухает через N минут» — **непроверенный фольклор**.
- **Mini-infobar на Android** описан как элемент UI Chrome, неуправляемый сайтом, подавляемый на «примерно 3 месяца» после закрытия, и глушимый через `preventDefault()` с Chrome 76 ([блог Chrome](https://developer.chrome.com/blog/mini-infobar-update)). ⚠️ Оба источника по нему — **2018–2019 годов**; подтверждений, что mini-infobar вообще существует в текущем Chrome Android, найти не удалось.

### 1.6. Что изменилось с 2023 года

1. **Сервис-воркер больше не нужен для установимости из меню** — Chrome 108 на мобильных, 112 на десктопе ([блог Chrome, 2023-12-05](https://developer.chrome.com/blog/update-install-criteria)). Причина названа прямо: «the service worker check was meant as a proxy for detecting sites with some offline experience, but sites added service workers with empty fetch handlers to satisfy the criteria». ⚠️ При этом там же сказано, что *алгоритм показа промпта* пока по-прежнему требует наличия `fetch()`-обработчика — и это утверждение с декабря 2023 года никем не подтверждено и не отозвано. Практический вывод: **воркер не нужен, чтобы быть установимым, но нужен, если хочется автоматический промпт.**
2. **MDN пометила API как Non-standard** — этой плашки в 2023 году не было.
3. **Идёт активная и заблокированная ре-стандартизация** (PR #1206 против позиции WebKit `oppose`).
4. **Появился и частично отступил преемник** — `navigator.install()`: origin trial 143–150 завершён, API переработан, сейчас снова за флагом в 154.
5. **Появился второй, декларативный преемник** — `<install>`, origin trial 148–153.
6. **Ни один преемник не кроссбраузерный.**
7. **Документация web.dev по установке протухла**: `customize-install` — 2020-02-14, `learn/pwa/installation-prompt` — 2022-03-09, `install-criteria` — 2024-09-19, `a2hs-updates` — 2018-06-04. Самый свежий авторитетный источник по поддержке — [MDN «Making PWAs installable», 2026-09-07](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
8. **Цифры самого Chrome** (полезны, чтобы понимать масштаб): около 13% загрузок страниц в Chrome удовлетворяют условиям показа промпта, около 3% пытаются показать собственный UI, и лишь **0,019% страниц действительно показывают промпт** ([комментарий Chrome в обзоре TAG, 2026-08-13](https://github.com/w3ctag/design-reviews/issues/1245)).

---

## 2. iOS и Safari

Базовая линия на день проверки: последняя **выпущенная** версия — **Safari 26.6** ([WebKit, 27 июля 2026](https://webkit.org/blog/18178/webkit-features-for-safari-26-6/)). Safari 27 / iOS 27 ещё в бете — страница Apple называется [«Safari 27 Beta Release Notes»](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes), поста «WebKit Features in Safari 27.0» пока нет.

### 2.1. Программного вызова установки нет

| API | Safari / Safari iOS | Источник |
| --- | --- | --- |
| `beforeinstallprompt` | `false` | [BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BeforeInstallPromptEvent.json) |
| `navigator.install()` | `false` | [BCD Navigator.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json) |
| `navigator.getInstalledRelatedApps()` | `false` | там же |

И это не «пока не сделали», а формальное **`position: oppose`** по обоим предложениям: [Web Install API](https://github.com/WebKit/standards-positions/issues/463), [BeforeInstallPromptEvent](https://github.com/WebKit/standards-positions/issues/619). MDN формулирует прямо: «This is not supported on iOS» ([Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)).

**Нельзя даже определить, поддерживается ли установка в текущем контексте.** Запросы висят открытыми годами: [bug 255858](https://bugs.webkit.org/show_bug.cgi?id=255858) («Add to Home Screen Smart Banner», NEW, без реакции инженеров) и [bug 198673](https://bugs.webkit.org/show_bug.cgi?id=198673) («Need way to feature-detect for Add to home screen instructions», NEW с 2019 года; последнее движение — 25 января 2026, Marcos Caceres перенаправил в [w3c/manifest#1092](https://github.com/w3c/manifest/issues/1092)).

Следствие для задачи 08: **на iOS инструкция пользователю — не запасной вариант, а единственный вариант**, и показывать её приходится по эвристике определения платформы, без возможности спросить у браузера, применима ли она.

### 2.2. Что изменилось — и в какую сторону

Safari 26.0 (сентябрь 2025) убрала требования к установимости, но передала контроль **пользователю**, а не разработчику. Дословно из [WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/):

> «Now, we are revising the behavior on iOS 26 and iPadOS 26. By default, every website added to the Home Screen opens as a web app. If the user prefers to add a bookmark for their browser, **they can disable "Open as Web App" when adding to Home Screen — even if the site is configured to be a web app**. The UI is always consistent, no matter how the site's code is configured. And the power to define the experience is in the hands of users.»

> «Simply put, there are now zero requirements for "installability" in Safari.»

Подтверждено релиз-нотами Apple: «Added support for any website to become a web app on iOS or iPadOS. (113034903)» ([Safari 26.0 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes)).

**Чистый эффект: манифест больше не нужен, но пользователь теперь может отказаться от режима приложения, даже когда манифест его просит.** То есть на iOS 26 факт установки перестал быть гарантией standalone-запуска.

Ревизия всех постов WebKit по Safari 26.0–26.6, поста по бете 27 и релиз-нот Apple: **ничего** по промптам, баннерам или установимости, кроме пункта выше. Единственное, что когда-либо добавляли по части точек входа, — Safari 17.0: «Add to Home Screen is now available from Safari View Controller on iOS 17 and iPadOS 17» ([WebKit](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)).

### 2.3. Сторонние браузеры на iOS

Могут предлагать «На экран Домой» с **iOS 16.4**: «iOS and iPadOS 16.4 also add support so that third-party web browsers can offer 'Add to Home Screen' in the Share menu» ([WebKit](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)). MDN: «On iOS 16.4 and later, PWAs can be installed from the Share menu in Safari, Chrome, Edge, Firefox, and Orion».

Механика в API Apple:

- [`SFAddToHomeScreenActivityItem`](https://developer.apple.com/documentation/safariservices/sfaddtohomescreenactivityitem) — iOS 17.4+. Дословно: «If your browser app uses WebKit, [it] always represents a bookmark. To let someone add a web app to their Home Screen, add a `SFAddToHomeScreenInfo`… If your browser app includes an alternative browser engine, pass detailed information about the bookmark… If the bookmark represents a web app, include the web app manifest, **and cookies that the system uses when someone opens the web app from their Home Screen**.» И: «[It] is only available to web browsers.»
- [`SFAddToHomeScreenInfo`](https://developer.apple.com/documentation/safariservices/sfaddtohomescreeninfo) — iOS 18.2+.

Альтернативные движки — **только ЕС**, iOS 17.4+ / iPadOS 18+, по entitlement ([Apple](https://developer.apple.com/support/alternative-browser-engines/)).

⚠️ **Не проверено:** используется ли альтернативный движок хоть одним реально выпущенным браузером сегодня — Apple документирует возможность, а не факт применения.

### 2.4. Квоты хранилища

Действует [«Updates to Storage Policy», WebKit, 10 августа 2023](https://webkit.org/blog/14403/updates-to-storage-policy/) — **самый свежий** документ WebKit по теме; в Safari 26.x и 27 ничего не менялось. Дословно:

> «For a browser app, the origin quota is up to 60% of the total disk space. For other apps, the origin quota is up to 15% of the total disk space.»
>
> «For a browser app, overall quota is up to 80% of the total disk space. For other apps, overall quota is up to 20% of the total disk space.»
>
> «**When a web app is running standalone (as Home Screen Web App on iOS or Web App added to dock on macOS), it has the same origin quota and overall quota as when it is opened in a browser app.**»

То есть установленное приложение попадает в **браузерный** уровень: до 60% диска на источник, 80% суммарно. Кросс-доменные фреймы получают «10% of the main frame's origin quota».

Оговорки оттуда же: «the quota is an upper limit … there is no guarantee that a site can store that much, so error handling for `QuotaExceededError` is necessary», и «quota might change based on factors like existing usage and site visit frequency». Куки и HTTP-кэш под эту политику **не подпадают** и квотой не ограничены.

Историческая справка, объясняющая старые советы: до Safari 17 источник имел стартовый лимит 1 ГБ, при превышении операция падала в установленном приложении либо Safari спрашивала пользователя. **Запроса больше нет**: «Safari 17.0 no longer prompts users about a website wanting to use more space» ([WebKit](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)).

### 2.5. Семидневное правило и исключение для установленных приложений

Объявлено в [посте WebKit от 24 марта 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/): ITP удаляет всё записанное скриптом хранилище «after seven days of Safari use without user interaction on the site». Затронуты Indexed DB, LocalStorage, Media keys, SessionStorage, **регистрации сервис-воркеров и их кэш**.

Раздел «A Note On Web Applications Added to the Home Screen», дословно:

> «**Web applications added to the home screen are not part of Safari and thus have their own counter of days of use. Their days of use will match actual use of the web application which resets the timer. We do not expect the first-party in such a web application to have its website data deleted.**»
>
> «If your web application does experience website data deletion, please let us know since we would consider it a serious bug.»

Это **действующая политика на сегодня**. На поддерживаемой странице [webkit.org/tracking-prevention](https://webkit.org/tracking-prevention/) есть отдельный раздел:

> «**Home Screen Web Application Domain Exempt From ITP** — The first-party domain of home screen web applications is exempt from ITP's 7-day cap on all script-writeable storage, i.e. ITP always skips that domain in its website data removal algorithm. In addition, the website data of home screen web applications is kept isolated from Safari…»

⚠️ У этой страницы **нет даты обновления** и заголовка `Last-Modified` — WebKit её не версионирует. Подтверждение от инженера: [bug 209563](https://bugs.webkit.org/show_bug.cgi?id=209563) (статус NEW, открыт), John Wilander, 12 августа 2021: «Home screen web apps on iOS and iPadOS have a carveout»; 4 ноября 2023: «Web apps in the Dock on macOS have the same exemption».

**Это и есть главный продуктовый аргумент за установку на iOS.**

### 2.6. Два разных механизма вытеснения — не путать

1. **Семидневный лимит ITP** → установленное приложение **исключено**. `persist()` здесь ни при чём.
2. **Вытеснение по квоте и давлению на диск** → **продолжает действовать** и для установленного приложения. Из поста о политике хранения: «Eviction … can happen … when exceeding the overall quota, when the system is under storage pressure, or when the site has not been interacted with by the user for some time», и источник исключается, «if it has active page at the time of eviction, or **its storage is in persistent mode**».

Про `persist()` WebKit говорит: «WebKit currently grants a request based on **heuristics like whether the website is opened as a Home Screen Web App**».

⚠️ Формулировка «heuristics **like**» не гарантирует, что установка всегда даёт persistent. **Всегда вызывать `navigator.storage.persist()` и проверять `navigator.storage.persisted()`, не полагаясь на факт установки.** `persist()` доступен с Safari 15.2, `estimate()` — с Safari 17 ([BCD StorageManager.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/StorageManager.json)).

### 2.7. Ловушка с куками, которую исключение не покрывает

Исключение из ITP касается *script-writeable storage*. **Куки, записанные из JavaScript, по-прежнему живут 7 дней даже внутри установленного приложения.** В [bug 237350](https://bugs.webkit.org/show_bug.cgi?id=237350) («Web App Added to Home Screen Cookies Deleted After 7 Days», статус NEW) John Wilander объясняет, что семидневный лимит на JS-куки — это *срок годности*, проставляемый в момент записи, а не удаление силами ITP, поэтому исключение до него не дотягивается. Серверные `HttpOnly`-куки с большим сроком соблюдаются. Его рекомендация: «Login cookies should always be HttpOnly, i.e. not be created or accessible by JavaScript».

⚠️ Это комментарий инженера 2022 года в открытом баге, а не формальная документация. Смежно: [bug 272325](https://bugs.webkit.org/show_bug.cgi?id=272325) «REGRESSION (iOS 17.x): Session cookies being reset randomly in a Home Screen web app», статус NEW.

Для задачи 04 (личность без авторизации) это значит: **любое состояние личности, записанное в куку из JS, на iOS протухнет через неделю.** IndexedDB в установленном приложении надёжнее куки, записанной скриптом.

### 2.8. IndexedDB в установленном приложении

**Работает.** Открытых багов про пустой или отсутствующий раздел IndexedDB внутри установленного приложения нет. Отдельного лимита у IndexedDB тоже нет — она одна из API, которыми управляет квота источника: «the policy discussed in this post is mostly related to the types created by storage APIs: localStorage, Cache API, IndexedDB, Service Worker, and File System» ([WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/)). Значит: до 60% диска, общие на все storage-API этого источника, `QuotaExceededError` при переполнении.

**Раздел хранилища отделён от Safari — намеренно.** [bug 181849](https://bugs.webkit.org/show_bug.cgi?id=181849) («'Add to homescreen' apps don't share storage with Safari», статус NEW), Brent Fulgham, февраль 2022:

> «The current behavior (on Apple platforms) is by design. Home Screen apps are created as isolated entities without shared state with the browser.»

То же на [tracking-prevention](https://webkit.org/tracking-prevention/): «the website data of home screen web applications is kept isolated from Safari». **Практически: история, накопленная во вкладке Safari, при установке не переезжает.** Пользователь, поработавший в браузере и потом установивший приложение, начнёт с пустого хранилища.

**Открытые дефекты, которые заденут:**

- [bug 235579](https://bugs.webkit.org/show_bug.cgi?id=235579) — «An internal error was encountered in the Indexed Database server» / «Connection to Indexed Database server lost» в PWA. Статус **NEW, severity Critical**, последнее изменение 4 августа 2025. Репортеры отмечают, что воспроизводится при уходе в фон и возврате.
- [bug 181850](https://bugs.webkit.org/show_bug.cgi?id=181850) — «Cross-origin storage in 'Add to home screen' apps always lost», NEW с 2018 года.
- [bug 266363](https://bugs.webkit.org/show_bug.cgi?id=266363) — IndexedDB отключена в Lockdown Mode, **включая** установленные приложения. NEW, последнее изменение 25 января 2026. ⚠️ Apple ничего конкретного не документирует: [About Lockdown Mode](https://support.apple.com/en-us/105120) говорит только «Certain complex web technologies are blocked». Это свидетельство из багтрекера, поведение на iOS 26 подтвердить не удалось.

Недавние исправления (релиз-ноты Apple): Safari 26.4 — рассинхрон метаданных и кодировки имени базы; Safari 26.5 — «IndexedDB connections could become permanently broken until the page was reloaded»; Safari 27 beta — «IndexedDB transactions could be blocked for an extended period before starting when another page's transaction **was suspended in the background**».

### 2.9. Сервис-воркеры: работают, срок жизни не документирован

Сервис-воркеры работают в установленных приложениях и **никогда не были для них обязательны**: «Home Screen web apps on iOS and iPadOS never required Service Workers (as PWAs do on other platforms)» ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)).

**Ни Apple, ни WebKit не публикуют контракт по времени жизни воркера на iOS.** Ни поста, ни документации, ни статьи поддержки: сколько живёт воркер, как агрессивно его убивают, может ли он работать в фоне — нигде. Единственное официальное утверждение о политике — из [Meet Web Push](https://webkit.org/blog/12945/meet-web-push/): «The Web Push API is **not an invitation for silent background runtime**, as that would both violate a user's trust and impact a user's battery life».

⚠️ В исходниках WebCore есть `defaultTerminationDelay = 10_s` и `defaultFunctionalEventDuration = 2_s` ([SWServer.h](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/workers/service/server/SWServer.h)), но это константы движка в целом, не документация и не обещание для iOS. **Закладываться на них нельзя.**

Живая хрупкость: [bug 268797](https://bugs.webkit.org/show_bug.cgi?id=268797) — «notificationclick events in serviceworkers not firing», статус NEW, последнее изменение **5 сентября 2026**: в установленном PWA без живой страницы WebKit поднимает воркер, который не вызывает `notificationclick` и рапортует `activated`, не вызвав `install`/`activate`.

Исторический баг «iOS PWAs using Service Workers freeze after being backgrounded» ([bug 211018](https://bugs.webkit.org/show_bug.cgi?id=211018)) — **RESOLVED**, чинилось около iOS 14.

### 2.10. Push и фоновая работа

**Web Push — с iOS 16.4, и установка на домашний экран обязательна.** [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): «Now with iOS and iPadOS 16.4, we are adding support for Web Push to Home Screen web apps», и разрешение можно запросить только «in response to direct user interaction».

Apple держит разделение явным: «Add web push to Home Screen web apps in iOS 16.4 or later **and** Webpages in Safari 16 for macOS 13 or later» ([Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)). BCD: `Notification` «is undefined, unless the page is a web app saved to the home screen».

**Declarative Web Push требование установки не снял** — он снял требование *сервис-воркера*: «Declarative Web Push is now available on iOS and iPadOS 18.4 **for web apps added to the Home Screen**» ([Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)).

Жёсткие правила: `userVisibleOnly: true` обязателен, тихих пушей нет, «Violations of the `userVisibleOnly` promise will result in a push subscription being revoked» ([Meet Web Push](https://webkit.org/blog/12945/meet-web-push/)).

⚠️ **Не проверено:** BCD до сих пор пишет, что для существования `Notification` манифест должен иметь недефолтное значение `display`. После «zero requirements for installability» в iOS 26 это почти наверняка устарело, но **ни Apple, ни WebKit явно не заявили**, что приложение без манифеста на iOS 26 имеет право на push.

**Фоновая синхронизация — нет.**

| | Статус | Источник |
| --- | --- | --- |
| `SyncManager` (Background Sync) | Не поддержан. Баг **NEW с 2018 года**, последнее изменение 13 июля 2026. Позиция WebKit **не занята** (`position: null`), метки `concerns: power`, `concerns: privacy` | [BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SyncManager.json), [bug 182565](https://bugs.webkit.org/show_bug.cgi?id=182565), [позиция](https://github.com/WebKit/standards-positions/issues/14) |
| `PeriodicSyncManager` | Не поддержан. Запрос **RESOLVED / WONTFIX** (декабрь 2019) | [bug 204117](https://bugs.webkit.org/show_bug.cgi?id=204117) |
| Background Fetch | Не реализован, позиции нет | [позиция](https://github.com/WebKit/standards-positions/issues/149) |

**Единственный санкционированный способ выполнить код в фоне на iOS — событие `push`, показывающее видимое пользователю уведомление.** Другой фоновой работы нет, и бюджета на неё не документировано.

### 2.11. Переживает ли состояние уход в фон

Честный ответ: **Apple не документирует жизненный цикл установленного веб-приложения вообще.** Ни в документации разработчика, ни в статьях поддержки, ни в сессиях WWDC, ни в HIG не сказано, возобновляется приложение или перезапускается при возврате пользователя. Архивная [Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) (обновлена 2016-12-12) описывает `apple-mobile-web-app-capable` и `navigator.standalone` и молчит о сохранении состояния.

Что есть из первоисточников:

- **Механизм задокументирован, но только для WKWebView.** Apple: «Web views use a separate process to render and manage web content. WebKit calls this method when the process for the specified web view terminates for any reason» ([`webContentProcessDidTerminate`](https://developer.apple.com/documentation/webkit/wknavigationdelegate/webviewwebcontentprocessdidterminate(_:))). Домашние веб-приложения «built directly on WebKit and its security architecture» ([Apple](https://developer.apple.com/support/alternative-browser-engines/)), то есть модель процессов та же — но следствий для установленных приложений Apple не описывает, и **делегата, за который можно зацепиться, у веб-кода нет**.
- **Возобновление без перезагрузки действительно происходит.** [bug 323322](https://bugs.webkit.org/show_bug.cgi?id=323322) (NEW, заведён 3 сентября 2026): «A standalone (Add to Home Screen) web page **resumes from the background** with `visualViewport.height` short of `window.innerHeight`…». Такой баг можно завести только если возобновление без перезагрузки — нормальный случай.
- **Но возобновление ненадёжно.** [bug 226848](https://bugs.webkit.org/show_bug.cgi?id=226848) («Touch events lost when PWA goes background», NEW), [bug 235579](https://bugs.webkit.org/show_bug.cgi?id=235579) (ошибки IndexedDB после ухода в фон, Critical/NEW), [bug 295518](https://bugs.webkit.org/show_bug.cgi?id=295518) («Audio Element Fails to Play on Reopen in PWA (iOS 26)», NEW).
- **Приостановка реальна на уровне хранилища** — исправление в Safari 27 beta прямо говорит про транзакцию, «suspended in the background».
- **bfcache здесь ни при чём.** Page Cache в WebKit касается навигации назад-вперёд внутри сессии ([WebKit](https://webkit.org/blog/427/webkit-page-cache-i-the-basics/), [MDN](https://developer.mozilla.org/en-US/docs/Glossary/bfcache)), а не переключения приложений. Использовать `pageshow.persisted` для определения возврата из фона нельзя.

**Инженерный вывод: считать возобновление best-effort и негарантированным.** Сохранять всё значимое состояние по `visibilitychange` (`document.visibilityState === 'hidden'`) и `pagehide`, и уметь восстанавливаться с холодного старта в любой момент. Гарантии, под которую можно писать, не существует, и API для наблюдения за завершением процесса нет.

Для задачи 06 (жизненный цикл занятия) это ключевое ограничение: **активное занятие должно быть восстановимо из IndexedDB на каждом шаге, а не жить в памяти страницы.**

### 2.12. Прочее, что надо знать

**Хранилище и сессия изолированы от Safari — намеренно** (§2.8). Следствие: пользователь, залогиненный в Safari, в установленном приложении может оказаться разлогиненным.

**Ловушка с сессией.** На [WWDC23](https://developer.apple.com/videos/play/wwdc2023/10120/) Apple описывает копирование кук **только для Mac**: «we copy website cookies when a web app on Mac is added to the Dock… From that point on, cookies are separate between Safari and the web app», и «Since local storage is **not** copied when a web app is created, users would have to re-authenticate… keep authentication state saved within cookies».

⚠️ **Аналогичного утверждения про копирование кук для домашних веб-приложений iOS Apple не делает.** Единственное косвенное свидетельство — инструкция в `SFAddToHomeScreenActivityItem` передавать куки, но это API для сторонних браузеров, а не описание поведения самой Safari. **Исходить из того, что на iOS пользователь при первом запуске может быть разлогинен, и никогда не разносить состояние авторизации между куками и localStorage.**

**Несколько установок одного сайта.** Поле `id` (Safari 16.4+) позволяет «save multiple copies of the same web app with different login states» ([WebKit](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)).

**Ссылки вне `scope`** открываются в Safari View Controller, а не внутри приложения ([WWDC23](https://developer.apple.com/videos/play/wwdc2023/10120/)).

**Две возможности, которых на iOS нет** (Safari 18.0 дала их только macOS, [WebKit](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/)): перехват ссылок приложением ([запрос для iOS](https://bugs.webkit.org/show_bug.cgi?id=318623), NEW) и веб-расширения с блокировщиками контента внутри приложения ([запрос](https://bugs.webkit.org/show_bug.cgi?id=320101), NEW). Паритета платформ здесь предполагать нельзя.

**Прочие открытые дефекты установленных приложений на сегодня:** нет `requestPictureInPicture()` ([303885](https://bugs.webkit.org/show_bug.cgi?id=303885)); статус-бар виден в полноэкранном режиме на iOS 26.1 и 27.0 ([301994](https://bugs.webkit.org/show_bug.cgi?id=301994), переоткрыт 28 августа 2026); теряются POST-данные форм на сторонние домены ([294063](https://bugs.webkit.org/show_bug.cgi?id=294063)); падает запись медиа ([300342](https://bugs.webkit.org/show_bug.cgi?id=300342)). Одно приобретение: **Screen Wake Lock работает в домашних веб-приложениях с iOS 18.4** ([Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)) — прямо полезно для экрана прохождения занятия (задача 11).

## 3. Как приложение достоверно понимает, что запущено установленным

### 3.1. Поправка к постановке вопроса

Медиафича `display-mode` определена **не** в спецификации манифеста, а в [CSS Media Queries Level 5](https://drafts.csswg.org/mediaqueries-5/#display-modes). Спецификация манифеста определяет сами *режимы отображения* ([W3C appmanifest §6](https://www.w3.org/TR/appmanifest/#display-modes)), но не медиафичу. MDN ссылается ровно на MQ5 и ни на что другое.

| Что | Где определено |
| --- | --- |
| медиафича `display-mode` | [MQ5](https://drafts.csswg.org/mediaqueries-5/#display-modes) |
| режимы `fullscreen`, `standalone`, `minimal-ui`, `browser` | [W3C appmanifest §6](https://www.w3.org/TR/appmanifest/#display-modes) |
| `display_override`, `tabbed` | [WICG manifest-incubations](https://wicg.github.io/manifest-incubations/) — «unofficial proposal» |

Значения в грамматике MQ5: `fullscreen | standalone | minimal-ui | browser | picture-in-picture`. **`window-controls-overlay` и `tabbed` в грамматику MQ5 не входят**; первое задокументировано MDN и работает в Chrome, второе описано только в инкубациях и на developer.chrome.com и не имеет строки в BCD вовсе.

### 3.2. `display-mode`: поддержка и провалы

Данные из [BCD `css/at-rules/media.json`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json).

| значение | Chrome | Chrome Android | Firefox | Firefox Android | Safari | Safari iOS |
| --- | --- | --- | --- | --- | --- | --- |
| сама фича | 42 | зеркало | 47 | зеркало | 13 | 12.2 |
| `browser` | 42 | зеркало | 116 | 116 | 13 ⚠️ | 12.2 ⚠️ |
| `standalone` | 42 | зеркало | 57 ⚠️ **никогда не true** | 116 | 13 | 12.2 ⚠️ **сломано** |
| `minimal-ui` | 42 | зеркало | 57 ⚠️ (true только с 142) | 116 | 13 ⚠️ никогда | 12.2 ⚠️ никогда |
| `fullscreen` | 47 | **false** | 47 ⚠️ частично | 116 | 13 ⚠️ частично | 12.2 ⚠️ |
| `window-controls-overlay` | 105 (экспериментально) | false | false | false | false | false |

**Главная находка — iOS рапортует не то значение.** Примечание BCD для `safari_ios`, дословно:

> «In an installed web application with the `display` manifest member set to `standalone`, `display-mode: standalone` is **false** and `display-mode: fullscreen` is **true**. See bug 264218.»

[WebKit bug 264218](https://bugs.webkit.org/show_bug.cgi?id=264218) «display-mode media query is incorrect on full screen PWA» заведён 4 ноября 2023, статус **NEW**, исполнитель — Nobody, последняя активность — импорт в Radar 11 ноября 2023. **Не исправлен.** То есть `matchMedia('(display-mode: standalone)')` в установленном iOS-приложении вернёт **false**.

**В Safari-браузере медиафича вообще инертна**: `browser` всегда true, `fullscreen` никогда, даже при Fullscreen API или полноэкранном режиме macOS. Мейнтейнер MDN объясняет причину: [«the implementation seems to only read the Manifest `display` value, which afaik isn't set for regular web pages»](https://github.com/mdn/browser-compat-data/issues/18807#issuecomment-2607031785) (2025-01-22).

**Android Chrome — единственная платформа, где проверка чистая.** Chrome 42+, без отрицательных примечаний.

**Firefox десктоп для этой задачи бесполезен**: `standalone` «is never true»; с Firefox 142 закреплённые на панели задач Windows приложения рапортуют `minimal-ui`.

**macOS Safari (Add to Dock) работает.** [WebKit bug 257806](https://bugs.webkit.org/show_bug.cgi?id=257806) закрыт как MOVED: проблема была не в WebKit, а в хост-приложении Apple, и исправлена в macOS Sonoma Beta 3.

### 3.3. `navigator.standalone`

- **Нестандартное, только iOS.** Отдельной страницы на MDN нет — [URL возвращает 404](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/standalone); свойство существует лишь строкой на странице [`Navigator`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator) с плашкой **Non-standard**. Заметьте: **не deprecated** — строка стоит выше заголовка «Deprecated properties».
- **Записи в BCD нет вообще** — таблицы версий не существует.
- Документация Apple: «You can determine whether a webpage is displaying in standalone mode using the `window.navigator.standalone` read-only Boolean JavaScript property» ([Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)). ⚠️ Это **архивный** документ Apple, «Updated: 2016-12-12»; современной замены Apple не выпустила.
- **Есть ли оно в macOS Safari — не установлено.** MDN пишет «iOS Safari only», но в исходниках WebKit флаг `ENABLE_NAVIGATOR_STANDALONE` включён под `#if PLATFORM(COCOA)`, а не `PLATFORM(IOS_FAMILY)` ([PlatformEnableCocoa.h](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WTF/wtf/PlatformEnableCocoa.h), [Navigator.idl](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/page/Navigator.idl)). Значение — просто настройка, которую выставляет хост-приложение. **Вывод: считать iOS-only на практике и никогда не использовать как отрицательный сигнал на macOS.**
- Свойство присутствует в `main` WebKit сегодня, признаков удаления нет. ⚠️ Что значение по-прежнему корректно выставляется на iOS 26, проверить на устройстве не удалось.

### 3.4. `navigator.getInstalledRelatedApps()`

Отвечает на **другой вопрос**: «установлено ли моё приложение где-то на этом устройстве», и спрашивать это можно из обычной вкладки. Для «я ли и есть установленный экземпляр» не годится.

Требования из [спецификации WICG](https://wicg.github.io/get-installed-related-apps/spec/):

- `[SecureContext]`, только HTTPS, только верхнеуровневый контекст: во фрейме промис отклоняется с `InvalidStateError`.
- «The user agent MUST NOT return installed applications when running in a privacy preserving mode» — в приватном режиме **всегда пусто**.
- «The user agent MAY limit the number of related applications to be matched»; Chrome учитывает только первые три записи.

Для обнаружения собственного PWA нужна самоссылающаяся запись в манифесте ([developer.chrome.com](https://developer.chrome.com/docs/capabilities/get-installed-related-apps)):

```json
{ "related_applications": [ { "platform": "webapp", "url": "/manifest.webmanifest", "id": "https://example.com/?utm_source=home_screen" } ] }
```

причём `id` «required for Desktop, not needed for Android».

Поддержка:

| | версия | охват |
| --- | --- | --- |
| Chrome Android | 80 (нативные приложения) → **84** (PWA, в скоупе и вне) | полный |
| Chrome/Edge Windows | 85 | UWP-приложения |
| Chrome/Edge macOS, Linux, ChromeOS | **140** | PWA **только в скоупе** |

Firefox, Safari, Safari iOS, **Android WebView** — `false` ([BCD](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getInstalledRelatedApps)). Обнаружение PWA вне скоупа остаётся **только на Android**. ⚠️ BCD здесь отстаёт: строка `chrome: 85` с примечанием «Resolves with an empty array on other platforms» не учитывает расширение на десктоп в Chrome 140; документация Chrome свежее.

### 3.5. Ложные срабатывания и промахи

- **Ложный промах, iOS**: установленное приложение рапортует `fullscreen`, не `standalone` (§3.2).
- **Ложный промах, Firefox десктоп**: `standalone` «is never true».
- **Ложное срабатывание, `fullscreen` на десктопе.** MQ5 дословно: «a side effect of calling the `requestFullscreen()` method can be that the browser enters a fullscreen mode at the OS-level, in which case **both `:fullscreen` and `(display-mode: fullscreen)` will match**». Примечание BCD для Firefox: «In Firefox's 'Full Screen' user interface, browser tabs and other user interface appear but `display-mode: fullscreen` is true». Отсюда прямое следствие: **`fullscreen` нельзя проверять как признак установки на десктопе, но именно его приходится проверять на iOS.** Значит, ветка по iOS обязательна.
- ⚠️ Поведение Chrome-десктопа при F11 в первоисточниках **не описано**.
- ⚠️ **Поведение внутри WKWebView и Android WebView (встроенные браузеры Instagram, Slack и т. п.) первоисточниками не описано вообще.** BCD помечает `webview_android: mirror`, но это умолчание BCD, а не измерение. `getInstalledRelatedApps` там явно `false` — этот хотя бы падает предсказуемо.
- ⚠️ **Стабильность значения на первой отрисовке не документирована.** Ближайшее, что есть, — appmanifest §6: «Once a manifest is applied to a top-level traversable, the display mode in effect is the applied display mode for that top-level traversable». При этом спецификация разрешает агенту **менять** применённый режим на лету (например, при уходе за пределы скоупа) — аргумент в пользу подписки на медиазапрос, а не разового чтения.

### 3.6. Рекомендация

| Платформа | Чем проверять | Почему |
| --- | --- | --- |
| **iOS / iPadOS** | `navigator.standalone` — **и только** | `display-mode: standalone` там false (bug 264218), `getInstalledRelatedApps` не поддержан |
| **Android Chrome** | `display-mode: standalone` | чистая поддержка с Chrome 42 |
| **Десктоп Chrome/Edge** | `display-mode`: `standalone` \| `minimal-ui` \| `window-controls-overlay` | полная поддержка |
| **macOS Safari (Dock)** | `display-mode: standalone` | исправлено в Sonoma Beta 3 |
| **Firefox десктоп** | `display-mode: minimal-ui` с 142, иначе — **сдаться** | `standalone` «never true» |

```js
const isIOS =
  /iP(hone|ad|od)/.test(navigator.platform || '') ||
  (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)); // iPadOS

function isInstalled() {
  // 1. iOS/iPadOS: единственный корректный там сигнал.
  if (navigator.standalone === true) return true;

  // 2. Android trusted web activity.
  if (document.referrer.startsWith('android-app://')) return true;

  // 3. Всё остальное. Без 'fullscreen': F11 и requestFullscreen дают ложное срабатывание.
  const modes = ['standalone', 'minimal-ui', 'window-controls-overlay'];
  if (modes.some((m) => matchMedia(`(display-mode: ${m})`).matches)) return true;

  // 4. Уступка WebKit bug 264218: установленное iOS-приложение рапортует fullscreen.
  //    Safari-браузер fullscreen не рапортует никогда, поэтому на iOS это безопасно.
  if (isIOS && matchMedia('(display-mode: fullscreen)').matches) return true;

  return false;
}
```

Два эксплуатационных замечания. Читать **по требованию, а не кэшировать на первой отрисовке** — спецификация разрешает агенту менять применённый режим по ходу сессии. И трактовать `false` как «скорее всего не установлено», а не как доказательство: Firefox до 142 и любой встроенный WebView вернут `false` независимо от реальности.

Ссылка на `document.referrer.startsWith('android-app://')` — из [web.dev/learn/pwa/detection](https://web.dev/learn/pwa/detection).

---

## 4. Манифест и иконки: минимум для установимости

### 4.1. Что говорит спецификация

Текущая версия — [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/), **Working Draft от 13 августа 2026**. Это **не** Recommendation и **не** Candidate Recommendation; на CR документ никогда не выходил. [Редакторский черновик](https://w3c.github.io/manifest/) несёт предупреждение «Implementors need to be aware that this specification is not stable».

**Обязательных полей в спецификации нет.** Дословно из примечания в §1:

> «Although it is optional for any member to appear in a manifest, some user agents might require one or more to be present to take full advantage of the capabilities afforded by this specification.»

Это ненормативное примечание. Всё, что ниже, — **политика браузеров**, а не соответствие спецификации.

Стоит понимать, что многие поля, которые принято считать «частью манифеста», в этом WD отсутствуют. `screenshots`, `categories`, `description` живут в [W3C Note от 2020 года](https://www.w3.org/TR/manifest-app-info/) (не на рекомендательном треке), а `display_override`, `related_applications`, `prefer_related_applications`, `protocol_handlers`, `file_handlers`, `share_target` — в [WICG Manifest Incubations](https://wicg.github.io/manifest-incubations/). MDN документирует всё вместе, не разделяя статусы.

По иконкам спецификация намеренно неконкретна: размеры «serve as hints for the user agent to determine a suitable icon to use in a particular context». Допустимые значения `purpose`: `monochrome`, `maskable`, `any` (по умолчанию `any`).

### 4.2. Android Chrome

Самый свежий авторитетный источник — [MDN «Making PWAs installable», обновлено 7 сентября 2026](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable). Дословно:

> Chromium-based browsers, including Google Chrome, Samsung Internet, and Microsoft Edge, require that the manifest includes the following members:
> - `name` or `short_name`
> - `icons` must contain a 192px and a 512px icon
> - `start_url`
> - `display` and/or `display_override`
> - `prefer_related_applications` must be `false` or not present

Плюс HTTPS: «For a PWA to be installable it must be served using the `https` protocol, or from a local development environment using `localhost` or `127.0.0.1`».

**Сервис-воркер не требуется** — подтверждено дважды: MDN («While not a requirement for a PWA to be installable, many PWAs use service workers to provide an offline experience») и [блогом Chrome](https://developer.chrome.com/blog/update-install-criteria) (Chrome 108 на мобильных, 112 на десктопе). ⚠️ Оговорка про `fetch()`-обработчик для *автоматического промпта* — из документа, последний раз обновлённого 2023-12-05, и с тех пор не подтверждена.

**Maskable-иконка не обязательна.** Без неё на Android иконка вписывается в белый круг вместо заполнения адаптивной формы ([web.dev/maskable-icon](https://web.dev/articles/maskable-icon)). Безопасная зона: логотип должен уместиться в центральный круг радиусом 40% ширины, внешние 10% могут быть обрезаны.

**Допустимые значения `display`.** ⚠️ Два источника Chrome противоречат друг другу: [web.dev/install-criteria](https://web.dev/articles/install-criteria) перечисляет `fullscreen`, `standalone`, `minimal-ui`, `window-controls-overlay`; [страница Lighthouse](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest) — без `window-controls-overlay`. Страница Lighthouse несёт баннер об устаревании, так что верить стоит web.dev. `standalone` безопасен по всем источникам.

**WebAPK.** На Android при выполнении критериев Chrome (на устройствах с GMS) отправляет манифест на облачный сервер, который собирает и подписывает настоящий APK ([web.dev/webapks](https://web.dev/articles/webapks)). Именно поэтому 512×512 важна: из неё выводится иконка лаунчера.

**`id`.** Не требуется для установимости; с Chrome 96 браузер выводит его из `start_url` ([developer.chrome.com](https://developer.chrome.com/docs/capabilities/pwa-manifest-id)). Ценность в том, что он отвязывает идентичность приложения от `start_url` — иначе смена `start_url` читается браузером как новое приложение. **Новое в 2026: `id` стал нужен** для `<install>` и `navigator.install()` ([блог Chrome, 2026-05-12](https://developer.chrome.com/blog/install-element-ot)). Задавать явно стоит уже сейчас.

### 4.3. Десктоп Chrome и Edge

Отдельного списка полей для десктопа Chrome не публикует; единственное документированное отличие от Android — сроки отмены требования сервис-воркера (108 против 112). Шага WebAPK на десктопе нет.

Edge своего списка критериев тоже не публикует и отсылает к MDN. Явно сказано, что воркер не нужен ([learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/)):

> «A Progressive Web App (PWA) doesn't need to have a service worker for Microsoft Edge to be able to install the app.»

⚠️ Пример манифеста в документации Edge содержит **одну иконку 512×512**, что противоречит правилу 192+512 для Chromium. Edge — Chromium, так что верить надо MDN.

Ловушка Edge: «Individual webpages can also define a theme color, by using the `theme-color` meta tag. When this meta tag is present on the page, its defined color overrides the color that's found in the web app manifest» ([learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/icon-theme-color)).

### 4.4. iOS Safari — здесь 2026 год расходится с 2023 сильнее всего

**Safari 26 убрала требования к установимости полностью.** Дословно из [WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/):

> «Simply put, there are now zero requirements for 'installability' in Safari. Users can add any site to their Home Screen and open it as a web app on iOS 26 and iPadOS 26.»

> «By default, every website added to the Home Screen opens as a web app. If the user prefers to add a bookmark that opens in their default browser, they can turn off 'Open as Web App', even if the site is configured to be a web app.»

Раньше (17 лет подряд) роль ворот играли мета-тег `apple-mobile-web-app-capable` либо значение `display` в манифесте. Теперь ни то, ни другое воротами не является. **Держать `"display": "standalone"` всё равно нужно** — для Chromium это жёсткое требование, а на iOS ≤ 18 оно по-прежнему определяет, откроется ли иконка в standalone.

**Иконки: `apple-touch-icon` побеждает манифест.** Точное правило из [WebKit, Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/):

> «Safari and iOS use manifest-declared icons when there is no `apple-touch-icon` defined in the HTML head, and when the manifest file code for declaring the icons either omits the `"purpose"` key or includes `"purpose": "any"`.»

> «Defining icons by using `apple-touch-icon` takes precedence over manifest-declared icons…»

🔴 **Ловушка:** иконка, объявленная **только** как `"purpose": "maskable"`, для iOS **невидима**. Нужна хотя бы одна запись без `purpose` или с `"any"`, иначе iOS подставит скриншот страницы. `maskable` объявлять **дополнительной** записью, никогда не единственным значением purpose на основной иконке.

Размер `apple-touch-icon`: **180×180** — ретиновый размер iPhone; 167 и 152 — необязательные уточнения для iPad ([архивная документация Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)). ⚠️ Это единственное место, где Apple перечисляет размеры, и оно **архивное**; современная страница `developer.apple.com/documentation/webkit/configuring-your-web-app` отдаёт **404**.

**Какие поля манифеста Safari реально читает — Apple никогда не публиковала списка.** Самое конкретное утверждение ([WebKit, Safari 17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)):

> «By providing a web app manifest, you can customize the presentation of your web app, including the display mode, name, theme color, and start URL.»

Подтверждены: `display`, `name`, `theme_color`, `start_url`, `icons`, и `id` — с iOS 16.4, что позволяет иметь несколько разных веб-приложений на одном домене ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). ⚠️ **Не подтверждены ни в ту, ни в другую сторону**: `short_name`, `scope`, `background_color`, `orientation`, `display_override`, `shortcuts`. В частности, нет подтверждения Apple, что `scope` ограничивает навигацию внутри приложения так же, как в Chromium.

**Точки входа установки на iOS** ([MDN, 2026-09-07](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)): на iOS 16.3 и раньше — только Safari; на iOS 16.4 и позже PWA устанавливается из меню «Поделиться» в Safari, Chrome, Edge, Firefox и Orion.

### 4.5. macOS Safari «Add to Dock»

С macOS Sonoma (Safari 17): «you can add a website — any website — to your Dock» ([WebKit](https://webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta/)). Требований нет — iOS 26 позже скопировала эту модель. Полезная деталь: «when a user adds a website to their Dock, Safari will copy the website's cookies to the web app» — пользователь остаётся залогиненным.

### 4.6. Минимальный манифест под все три платформы

```json
{
  "id": "/?source=pwa",
  "name": "Training",
  "short_name": "Training",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d4c73",
  "icons": [
    { "src": "/icons/icon-192.png",          "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png",          "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

В `<head>`:

```html
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Training">
```

Обоснование по полям:

| Поле | Зачем | Источник |
| --- | --- | --- |
| `name` | Chromium требует `name` **или** `short_name`; Safari берёт как имя приложения | [MDN 2026-09-07](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [WebKit](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/) |
| `short_name` | подпись на домашнем экране, где мало места | [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) |
| `start_url` | жёсткое требование Chromium; источник авто-вычисляемого `id` | [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Chrome](https://developer.chrome.com/docs/capabilities/pwa-manifest-id) |
| `display: "standalone"` | единственное значение, признаваемое всеми источниками Chrome; на iOS ≤ 18 определяет standalone-запуск | [web.dev](https://web.dev/articles/install-criteria), [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |
| `id` | отвязывает идентичность от `start_url`; **требуется** для `<install>` / `navigator.install()` | [Chrome](https://developer.chrome.com/docs/capabilities/pwa-manifest-id), [Chrome blog](https://developer.chrome.com/blog/install-element-ot) |
| `scope` | ни одним критерием не требуется; удерживает навигацию в окне приложения на Chromium. ⚠️ поведение на iOS не документировано | — |
| `theme_color` | цвет заголовка в Windows/Edge; цвет статус-бара на iOS | [Edge](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/icon-theme-color), [WebKit](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/) |
| `icons` 192 + 512 (`any`) | жёсткое требование Chromium; отсутствие `purpose` — то, что позволяет iOS взять иконки из манифеста | [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [WebKit](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/) |
| `icons` maskable (отдельной записью) | без неё иконка Android вписана в белый круг | [web.dev](https://web.dev/articles/maskable-icon) |
| `apple-touch-icon` 180 | приоритетнее иконок манифеста на iOS; должна быть непрозрачной | [Apple (архив)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) |
| `prefer_related_applications` | **намеренно опущено** — Chromium требует `false` или отсутствия | [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) |
| `apple-mobile-web-app-capable` | подстраховка для iOS ≤ 18; на iOS 26+ уже не нужен | [WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) |

Если нужен богатый диалог установки в Chrome — добавить `description` (до 300 символов) и `screenshots` (минимум по одному на форм-фактор) ([Chrome](https://developer.chrome.com/blog/richer-pwa-installation)). Оба поля живут в W3C Note и инкубациях, не в основном WD.

### 4.7. Итоговый набор иконок

Минимально достаточный комплект — **четыре файла**: 192 `any`, 512 `any`, 512 `maskable`, `apple-touch-icon` 180. Это закрывает установимость Chromium, даёт корректную адаптивную иконку Android и корректную иконку домашнего экрана iOS. `favicon.ico` — конвенция, ни одним критерием установимости не требуется.

### 4.8. Расхождение по платформам

| | Android Chrome | Десктоп Chrome/Edge | iOS Safari 26+ | macOS Safari 17+ |
| --- | --- | --- | --- | --- |
| HTTPS | требуется | требуется | не описан как условие | — |
| Манифест | требуется | требуется | **не требуется** | **не требуется** |
| `name`/`short_name` | одно из двух | одно из двух | опционально | опционально |
| `icons` 192 + 512 | требуется | требуется | опционально, `apple-touch-icon` главнее | опционально |
| `display` | требуется | требуется | **больше не ворота** (было до iOS 18) | никогда не было воротами |
| Сервис-воркер | **не требуется** (108+) | **не требуется** (112+) | не требуется | не требуется |
| `fetch`-обработчик для авто-промпта | ⚠️ вероятно да (источник 2023) | ⚠️ то же | неприменимо | неприменимо |
| Результат установки | подписанный WebAPK | локальная оболочка | веб-приложение на домашнем экране | приложение в Dock |

---

## 5. IndexedDB, квоты и вытеснение

### 5.1. Предупреждение об устаревшем источнике

⚠️ [`web.dev/articles/storage-for-the-web`](https://web.dev/articles/storage-for-the-web) (обновлено 2024-09-23) до сих пор первый в выдаче и **противоречит свежим первоисточникам по трём из четырёх ключевых цифр**:

| Утверждение web.dev | Реальность |
| --- | --- |
| Firefox: до 50% **свободного** места, группа eTLD+1 — до **2 ГБ** | Неверно. 10% **общего** объёма диска, лимит группы **10 GiB** |
| Safari: около **1 ГБ**, дальше спрашивать пользователя порциями по 200 МБ | Устарело с Safari 17 (2023). Сейчас ~60% диска, без запросов |
| Инкогнито Chrome: около **5% диска** | Не то, что делает код Chromium: доля от **физической памяти** |
| Chrome: до 80% диска суммарно, до 60% на источник | ✅ Верно, подтверждено в исходниках сегодня |

Актуальный источник — [MDN «Storage quotas and eviction criteria», обновлено 2026-01-05](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

### 5.2. Как считается квота

**Chrome / Chromium — 60% общего объёма диска, на storage key.**

MDN дословно: «an origin can store up to **60% of the total disk size** in both persistent and best-effort modes. For example, if the device has a 1 TiB hard drive, the browser will allow an origin to use up to 600 GiB.»

Проверено по исходникам `main`: [`quota_features.cc`](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/storage/browser/quota/quota_features.cc) — `PoolSizeRatio` = `0.8`; [`quota_settings.cc`](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/storage/browser/quota/quota_settings.cc) — `kPerStorageKeyTemporaryRatio` = `0.75`. 0,8 × 0,75 = **0,60**.

**Не на origin, а на storage key**, и это важно. Storage key = origin + сайт верхнего уровня ([Privacy Sandbox: Storage partitioning, 2025-06-13](https://privacysandbox.google.com/cookies/storage-partitioning)): «The quota system manages each partition as a separate bucket to determine how much space is permitted, and when it is cleared». Практически: тот же origin во фрейме на чужом сайте получает **другой** бакет квоты.

Там же в исходниках: `kMustRemainAvailableRatio` = 1%, `kMustRemainAvailableBytes` = 1 ГБ, с комментарием «The amount of the device's storage the browser attempts to keep free at all costs. Data will be aggressively evicted». ⚠️ Как именно эти две величины комбинируются, проследить не удалось.

**Firefox — лимит группы 10 GiB, а не старые 2 ГБ.**

MDN дословно: best-effort — меньшее из «10% of the total disk size» и «**10 GiB**, which is the group limit that Firefox applies to all origins that are part of the same site». С разрешением на постоянное хранилище — «up to **50% of the total disk size, capped at 8 TiB**, and are not subject to the group limit».

Пример с той же страницы: на диске 500 GiB — 10 GiB в best-effort и 250 GiB в persistent. Группа считается по eTLD+1, то есть поддомены **делят** 10 GiB. ⚠️ Подтвердить по firefox-source-docs не удалось: страницы про quota manager отдают 404. Цифры держатся на MDN, но MDN свежий.

**Safari / WebKit — 60% на источник с Safari 17.**

Первоисточник — [«Updates to Storage Policy», WebKit, 10 августа 2023](https://webkit.org/blog/14403/updates-to-storage-policy/). Это по-прежнему **самый свежий** пост WebKit по политике хранения: в [категории Storage](https://webkit.org/blog/category/storage/) с 2024 по 2026 ничего нового нет, и MDN (2026-01-05) ссылается на него же.

| | Квота на источник | Общий потолок |
| --- | --- | --- |
| Браузеры (Safari, сторонние браузеры по умолчанию) | **~60% диска** | **~80% диска** |
| Прочие приложения, встраивающие веб (WKWebView) | **~15% диска** | **~20% диска** |
| Кросс-доменные фреймы | ~1/10 квоты родителя | — |

Покрываются «localStorage, Cache API, IndexedDB, Service Worker, and File System».

**Про установленные приложения WebKit говорит прямо:**

> «When a web app is running standalone (as Home Screen Web App on iOS or Web App added to dock on macOS), it has the same origin quota and overall quota as when it is opened in a browser app.»

То есть установка **вытаскивает из уровня 15%/20% для WKWebView в уровень 60%/80%** — а не даёт больше, чем сам Safari.

При превышении: «the storage operation that requires space will fail, and a QuotaExceededError exception will be thrown». **Никаких запросов пользователю в Safari 17+ нет.** Старое поведение «1 GiB, потом спрашивать по 200 МБ» MDN описывает как бывшее «in earlier versions of Safari».

### 5.3. Вытеснение

**Спецификация.** [WHATWG Storage Standard, обновлён 15 марта 2026](https://storage.spec.whatwg.org/):

- «Whenever a storage bucket is cleared by the user agent, it must be cleared **in its entirety**.»
- «A local storage bucket has a mode, which is 'best-effort' or 'persistent'. It is initially 'best-effort'.» Перевести в `persistent` можно только с разрешением `persistent-storage`; такие бакеты «cannot be cleared without consent by the user».

**Chrome — вытеснение атомарно по источнику.** MDN дословно: «When an origin's data is evicted by the browser, **all of its data, not parts of it, is deleted at the same time**. If the origin had stored data by using IndexedDB and the Cache API for example, then both types of data are deleted.» Порядок — LRU, источники с гранованным persistent пропускаются.

Второй триггер, о котором забывают: «there may come a point at which the data stored by all of the combined origins exceeds the maximum size without any one origin being above its individual quota». **Вас могут вытеснить, когда вы далеко не выбрали свою квоту.**

Частично обойти правило «всё или ничего» позволяют [Storage Buckets](https://developer.chrome.com/docs/web-platform/storage-buckets) — «the browser may choose to delete each bucket independently of other buckets». Это единственный способ сказать «выкинь мой кэш, но сохрани несинхронизированные правки». ⚠️ Страница датирована 2022-11-04; Storage Buckets поехали в Chromium 122.

**Safari — LRU по последнему взаимодействию пользователя.** WebKit дословно: «It can happen under a few conditions: when exceeding the overall quota, when the system is under storage pressure, or when the site has not been interacted with by the user for some time». И: «The last use time is **the time of the last user interaction, or the time of the last storage operation**». Источник исключается из вытеснения, «if it has active page at the time of eviction, or its storage is in persistent mode». Удаление тоже по источнику целиком.

### 5.4. Приватный режим

**Chrome инкогнито — опубликованная цифра неверна.** В исходниках `quota_settings.cc` на `main`: `kIncognitoQuotaRatioLowerBound` = `0.15`, `kIncognitoQuotaRatioUpperBound` = `0.2`, а сам пул считается как `физическая память × коэффициент`, где коэффициент **рандомизируется** в этих границах (антифингерпринтинг). Комментарий в коде: «The incognito pool size is a fraction of the amount of system memory». То есть **~15–20% ОЗУ**, а не процент диска и не фиксированные 100 МБ (последняя цифра — со [страницы Workbox от 2018-06-26](https://developer.chrome.com/docs/workbox/understanding-storage-quota), сильно устаревшей).

**Firefox в приватном режиме больше не бросает исключение.** Это то место, где фольклор из 2023 года устарел. [Bugzilla 1639542](https://bugzilla.mozilla.org/show_bug.cgi?id=1639542) — RESOLVED FIXED, поехало в **Firefox 115**: IndexedDB работает через **зашифрованное дисковое хранилище** (шифрованный SQLite, имена источников заменены на UUID), ключ живёт только в памяти и теряется при завершении. Подтверждение — [Bugzilla 1841806](https://bugzilla.mozilla.org/show_bug.cgi?id=1841806): «Before a regressing change, IndexedDB was throwing an error under private browsing mode. After the change, IndexedDB doesn't throw anymore». ⚠️ Числовой квоты для приватного режима Firefox Mozilla не публикует.

**Safari в приватном режиме — эфемерно и изолировано по вкладкам.** [WebKit Tracking Prevention](https://webkit.org/tracking-prevention/): «Safari's Private Browsing Mode uses a new ephemeral session for **each tab** the user opens to isolate tabs from each other», и «Cookies and other stateful things are not persisted and go away when the user closes the tab, quits the browser, or reboots their device». Две приватные вкладки одного сайта **не разделяют** IndexedDB. ⚠️ Числовой квоты нет.

**Переживают ли данные конец сессии — нет, нигде.** MDN: «in private browsing mode… stored data is usually deleted when the private browsing mode ends».

### 5.5. `persist()`, `persisted()`, `estimate()`

Спецификация ([Storage Standard](https://storage.spec.whatwg.org/)): `persist()` запрашивает разрешение и переводит бакет в `persistent`; `persisted()` сообщает режим; `estimate()` возвращает `usage` и `quota`, причём:

- «Storage usage is an implementation-defined **rough estimate**… User agents might use deduplication, compression, and other techniques that obscure exactly how many bytes.»
- «[quota] **must not be a function of the available storage space on the device**.» ← отсюда и растёт то, что все браузеры считают квоту от *общего* объёма диска.

**Chrome — молча, без запроса.** MDN: «Safari and most Chromium-based browsers… automatically approve or deny the request based on the user's history of interaction with the site and **do not show any prompts to the user**». Эвристики (⚠️ только из [web.dev/persistent-storage, 2020-05-12](https://web.dev/articles/persistent-storage), шесть лет): уровень вовлечённости; установлен ли сайт или добавлен в закладки; выдано ли разрешение на уведомления.

⚠️ **Ловушка:** в Chrome квота одинакова «in both persistent and best-effort modes» — то есть `persist()` даёт **только иммунитет от вытеснения, но не больше места**. В Firefox, наоборот, он даёт **в 25 раз больше** места.

**Firefox — спрашивает пользователя.** MDN: «In Firefox, when a site chooses to use persistent storage, the user is notified with a UI popup that their permission is requested».

**Safari — реализовано, по эвристикам.** WebKit: «WebKit currently grants a request based on heuristics like **whether the website is opened as a Home Screen Web App**». Резолвится и `true`, и `false`.

⚠️ **Неоднозначность, которую надо назвать прямо:** WebKit пишет, что persistent-режим исключает источник «from eviction», но перечисляет три триггера вытеснения, включая отсутствие взаимодействия. **Нигде не сказано, освобождает ли `persist()` от семидневного правила ITP.** Документированное исключение из семи дней — только для домашних веб-приложений, а это другой механизм. **Не рассчитывать на `persist()` против семидневного правила на iOS.**

**`estimate()` — главная ловушка 2026 года.** [PSA в blink-dev, 5 декабря 2024](https://groups.google.com/a/chromium.org/g/blink-dev/c/7q0YGQNVkjs/m/mpYkQVWpAQAJ), поехало в **Chrome 133** (десктоп, Android, WebView):

> «Return an artificial quota equal to **usage + 10 GiB** in the Storage Manager and Storage Bucket APIs estimate() method in **both incognito mode and regular mode**.»
>
> «Additionally, **enforced quota will be unaffected**.»

То есть в Chrome 133+ `estimate().quota` — **константная выдумка** и в обычном режиме тоже. Любой код вида `quota - usage`, решающий, сколько ещё можно закэшировать, читает вымышленное число и спокойно пишет дальше — до `QuotaExceededError`.

Прочие оговорки `estimate()`:

- **Паддинг непрозрачных кросс-доменных ответов.** MDN: «browsers voluntarily pad the size of the cross-origin data when reporting total usage value».
- **Неточно по определению.** MDN: «between compression, deduplication, and obfuscation for security reasons, they will be imprecise».
- **Не обещание места.** `quota` — «a conservative approximation… It's possible that there's more than this amount of space available though you can't rely on that being the case».
- **Включает Cache Storage**, IndexedDB и OPFS вместе.
- **Считается по storage key**, а не по origin, в Chrome.

### 5.6. Семидневное вытеснение WebKit — действует

Объявлено в [«Full Third-Party Cookie Blocking and More», WebKit, 24 марта 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/). Формулировка на поддерживаемой странице [Tracking Prevention](https://webkit.org/tracking-prevention/):

> «ITP deletes all cookies created in JavaScript and all other script-writeable storage after **7 days of no user interaction** with the website.»

**IndexedDB туда входит.** Перечень из поста 2020 года: «Indexed DB, LocalStorage, Media keys, SessionStorage, Service Worker registrations and cache».

Независимо подтверждено MDN (2026-01-05): «If an origin has no user interaction, such as click or tap, in the last seven days of browser use, its data created from script will be deleted. **Cookies set by server are exempt from this eviction.**»

**Два первоисточника описывают это в настоящем времени в 2026 году. Правило действует.** Пост 2023 года не отменяет его, а включает как один из трёх триггеров.

Исключения и уточнения:

- **Домашние веб-приложения исключены.** Дословно: «The first-party domain of home screen web applications is exempt from ITP's 7-day cap on all script-writeable storage.» Причина в посте 2020 года: запуск приложения сам по себе есть свидетельство использования, и таймер сбрасывается.
- **Семь дней — «of browser use»**, а не календарных. Неиспользуемый Safari часы не жжёт.
- **Таймер сбрасывает взаимодействие пользователя** (клик, тап), а не фоновый fetch и не срабатывание сервис-воркера.
- **`persist()` — не подтверждён** как исключение (§5.5).

### 5.7. Практические ловушки

**`QuotaExceededError` теперь несёт данные.** [MDN, обновлено 2025-08-20](https://developer.mozilla.org/en-US/docs/Web/API/QuotaExceededError): раньше это был обычный `DOMException`, теперь — отдельный интерфейс со свойствами `quota` («the system-defined storage limit (in bytes) that was exceeded») и `requested`. На фоне вымышленного `estimate().quota` в Chrome **объект ошибки стал более правдивым источником реального лимита, чем сам `estimate()`**. ⚠️ Таблицу совместимости по браузерам прочитать не удалось.

**Пользователя браузер не предупреждает.** MDN: «when the browser needs to evict best-effort data, it does so **without interrupting the user**». Safari 17+ свой запрос тоже убрала. Единственный UI — попап Firefox в момент `persist()`.

**Приложение не может узнать, что его сейчас вытеснят.** События storage pressure нет, предупреждения нет, колбэка нет. Данные просто исчезают к следующему чтению. Защиты три: вызвать `persist()` заранее **и проверить результат**; проверять `persisted()` при каждом старте, чтобы поймать молчаливый отказ; трактовать любое клиентское хранилище как кэш с путём восстановления.

**Молчаливый `false` — основной режим отказа.** [MDN про `persist()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist): «The browser may or may not honor the request, depending on browser-specific rules». В Chrome и Safari ни запроса, ни объяснения нет, так что малопосещаемый, не добавленный в закладки, не установленный сайт получает тихий `false`. **Всегда ветвиться по результату, никогда не вызывать `persist()` вслепую.**

**Квота считается от общего объёма диска, а не от свободного.** MDN: «it might not actually be possible for the origin to reach its quota because it is calculated based on the hard drive **total** size, not the currently available disk space. This is done for security reasons, to avoid fingerprinting». На забитом диске `QuotaExceededError` придёт **сильно** раньше номинальной квоты.

**Web Storage — отдельный крошечный бюджет.** MDN: «limited to 10 MiB of data maximum on all browsers… 5 MiB of local storage, and 5 MiB of session storage per origin». К квоте IndexedDB отношения не имеет. `localStorage` как запасной вариант для чего-то объёмного не годится.

### 5.8. Расхождение по платформам

| Ситуация | Поведение |
| --- | --- |
| **iOS Safari, обычная вкладка** | Семидневная зачистка IndexedDB без взаимодействия. Самая жёсткая среда в вебе. |
| **iOS, установленное приложение** | Исключение из семи дней + уровень квоты 60%/80%. **Установка — самое сильное действие для долговечности данных на iOS.** |
| **iOS, встроенный WKWebView** (браузер внутри Instagram, Slack) | 15% на источник / 20% суммарно — **вчетверо меньше**, чем Safari, и молча |
| **Android Chrome** | 60% диска, но устройства маленькие; порог «держать свободным 1 ГБ» включает агрессивное вытеснение |
| **Десктоп Chrome** | Самая щедрая среда; для установленного PWA `persist()` скорее всего выдадут |
| **Десктоп Firefox** | 10 GiB на группу eTLD+1 упирается задолго до 60% Chrome; `persist()` спрашивает пользователя, но открывает 50%/8 TiB — **наибольшая отдача от `persist()` именно здесь** |
| **Сторонний фрейм (Chromium)** | Отдельный бакет по storage key; на WebKit — ~1/10 квоты родителя |

---

## 6. Что осталось непроверенным

Перечислено отдельно, чтобы никто не принял отсутствие ответа за ответ.

**По `beforeinstallprompt` и Chrome**

- Действует ли до сих пор эвристика «30 секунд просмотра и один тап». Единственный источник — [web.dev/install-criteria](https://web.dev/articles/install-criteria), обновлён 2024-09-19.
- Требует ли алгоритм показа промпта наличия `fetch()`-обработчика в 2026 году. Утверждение из [документа от 2023-12-05](https://developer.chrome.com/blog/update-install-criteria), не подтверждено и не отозвано.
- Существует ли mini-infobar в текущем Chrome Android. Источники 2018–2019 годов.
- Есть ли у отложенного события `beforeinstallprompt` срок истечения. **Документации нет ни у кого.**
- Отказался ли Chrome, как обещал в 2023 году, от части требований к полям манифеста. Объявлений не найдено, MDN на 2026-09-07 перечисляет всё тот же набор — значит, скорее всего, нет.
- Является ли `window-controls-overlay` допустимым значением `display` для установимости: web.dev говорит да, устаревшая страница Lighthouse — нет.
- Смёржен ли [w3c/manifest#1218](https://github.com/w3c/manifest/pull/1218) (медиафича `installed` от WebKit).
- Итог сентябрьской очной встречи TAG по Web Install API.

**По iOS**

- Какие поля манифеста Safari честно читает, кроме `display`, `name`, `theme_color`, `start_url`, `icons`, `id`. **Apple списка не публиковала.** `short_name`, `scope`, `background_color`, `orientation` не подтверждены ни в ту, ни в другую сторону; в частности, нет подтверждения, что `scope` ограничивает навигацию.
- Актуальной страницы Apple с размерами `apple-touch-icon` не существует: `developer.apple.com/documentation/webkit/configuring-your-web-app` отдаёт **404**, единственный перечень — в архиве.
- Срок жизни сервис-воркера на iOS. **Не документирован нигде.**
- Возобновляется ли установленное приложение или перезапускается при возврате из фона. **Apple не документирует жизненный цикл вообще**; вывод сделан по открытым багам.
- Имеет ли право на push приложение без манифеста на iOS 26. BCD говорит, что `display` должен быть недефолтным, но это почти наверняка устарело; явного заявления Apple или WebKit нет.
- Копируются ли куки при добавлении на домашний экран на iOS (для macOS — копируются, заявлено на WWDC23).
- Отключена ли IndexedDB в Lockdown Mode для установленных приложений на iOS 26. Свидетельство только из [bug 266363](https://bugs.webkit.org/show_bug.cgi?id=266363).
- Использует ли хоть один выпущенный браузер альтернативный движок на iOS.
- Значение `navigator.standalone` в macOS Safari: в исходниках WebKit флаг включён под `PLATFORM(COCOA)`, а не только iOS, но поведение хост-приложения неизвестно.
- Корректно ли `navigator.standalone` выставляется на iOS 26 — признаков удаления нет, проверить на устройстве не удалось.

**По детектированию и хранилищу**

- Поведение `display-mode` внутри WKWebView и Android WebView. **Первоисточников нет вообще.**
- Даёт ли F11 в десктопном Chrome `display-mode: fullscreen`.
- Стабильно ли значение `display-mode` на первой отрисовке.
- Числовые квоты приватного режима в Firefox и Safari — не публикуются.
- Освобождает ли `persist()` от семидневного правила ITP. **WebKit не говорит.** Документированное исключение — только для домашних веб-приложений.
- Совместимость свойств `quota` и `requested` у `QuotaExceededError` по браузерам.
- Как комбинируются `kMustRemainAvailableRatio` (1%) и `kMustRemainAvailableBytes` (1 ГБ) в Chromium.
- Обновлена ли строка BCD `chrome: 85` для `getInstalledRelatedApps` после расширения на десктоп в Chrome 140.

---

## 7. Следствия для проекта

Без рекомендаций по продукту — только то, что напрямую вытекает из фактов выше и относится к открытым задачам.

**К задаче 08 (продвижение установки).** Единый программный промпт на все платформы построить нельзя, и это не вопрос усилий: WebKit занял формальную позицию против. Реально существуют три разных сценария — кнопка по `beforeinstallprompt` в Chromium, инструкция «Поделиться → На экран Домой» на iOS, и полное отсутствие обоих в Firefox. Отказ платформа не запоминает (§1.5), поэтому его хранение и срок — задача приложения. Кнопку нельзя рисовать при первой отрисовке: момент прихода события не гарантирован.

**К задаче 05 (история в IndexedDB).** Установка на iOS — не украшение, а условие сохранности данных: в обычной вкладке Safari IndexedDB зачищается через 7 дней без взаимодействия, у установленного приложения такого лимита нет (§2.5). При этом хранилище вкладки и установленного приложения **изолированы**, так что накопленная в браузере история при установке не переезжает (§2.8) — сценарий «поработал в браузере, потом установил» приведёт к пустой истории. Отдельно: `persist()` надо вызывать и **проверять результат**, а не считать факт установки гарантией (§2.6).

**К задаче 06 (жизненный цикл занятия).** Возобновление приложения после ухода в фон на iOS не гарантировано и не документировано (§2.11). Активное занятие должно быть восстановимо из IndexedDB на каждом шаге; сохранять по `visibilitychange` и `pagehide`; уметь подниматься с холодного старта.

**К задаче 04 (личность без авторизации).** Куку, записанную из JavaScript, на iOS убивает семидневный срок годности даже внутри установленного приложения (§2.7). Идентификатор личности в JS-куке на iOS не живёт.

**К определению режима запуска.** Проверка обязана ветвиться по платформе: на iOS достоверен только `navigator.standalone`, на всём остальном — `display-mode` (§3.6). На iOS 26 сам факт установки перестал гарантировать standalone-режим: пользователь может отключить «Open as Web App» при добавлении (§2.2). Значит, «установлено» и «запущено как приложение» — теперь два разных состояния.

**К манифесту.** Ни манифест, ни сервис-воркер больше не требуются для установимости ни на одной из трёх платформ (§4.8). Минимальный набор — четыре файла иконок и восемь полей (§4.6). Иконку `maskable` объявлять **дополнительной** записью: если это единственное значение `purpose`, iOS иконку не увидит вовсе (§4.4).
