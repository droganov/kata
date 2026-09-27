# 15: Работа без сети и индикация

**What to build:** Занятие доходит до конца в подвале зала. Человек видит, что связи нет, и понимает, что происходит с его отметками.

**Blocked by:** 09

**Status:** closed

- [x] Начатое Занятие проходится до конца без сети
- [x] Отметки копятся на устройстве и уходят при возврате связи, без действий человека
- [x] Индикатор офлайна постоянный, а не всплывающий
- [x] На странице Программ текст сообщает, что начать Занятие нельзя
- [x] Внутри Занятия текст сообщает, что отметки сохраняются, и показан счётчик неотправленных
- [x] Состояние сети определяется по факту отказа запроса, а не по `navigator.onLine`
- [x] Подключение к точке доступа без интернета распознаётся как отсутствие сети

## Comments

**Evaluate interocitor before implementing this ticket** (added 2026-09-14). [interocitor](https://github.com/Machine-Garden/interocitor) is an MIT, TypeScript, end-to-end encrypted local-first row store. Every trusted device holds the full rows in a local store (IndexedDB in the browser). Changes leave through an outbox to a "mailbox" remote (Cloudflare Worker with D1/R2, S3-compatible storage or WebDAV) that cannot read them. Endpoints merge per field with hybrid logical clocks. As of 2026-09-14 its latest version is v0.2.0 (2026-09-13), with no GitHub releases, 2 stars, and the repo was created in April 2026 with daily commits. Adopting it is hard to reverse, so the outcome is an ADR either way. Tickets 09 and 13 add questions specific to them.

Answer these, with a spike where reading is not enough:

1. **Store contract (ADR-0002).** Can a Store over interocitor pass `src/test/store-contract.ts` unchanged? That means one active Session per Account, idempotent finalization, History returning only done Exercises, nothing past three weeks, Accounts isolated, and domain errors rather than transport errors.
2. **Offline marks (this ticket).** Does its outbox give "marks queue on the device and leave when the connection returns, with no action from the person"? Can the app read how many marks are still unsent, for the counter? Can offline still be detected by a failed request rather than `navigator.onLine`?
3. **Conflict model (ADR-0009).** We chose last write wins and ruled a sync engine out of scope. Is per-field CRDT merge a free upgrade, or a cost we pay in tombstones, clock skew and compaction duties? Adopting it supersedes ADR-0009 and reopens the map's out-of-scope sync-engine item.
4. **Hosting (ADR-0001).** The server is stateless on Deno Deploy, with Postgres in phase 2. Can the mailbox run there? Deno Deploy has no disk, so which adapter and which storage would it use, and who pays? Or does it force Cloudflare or a third-party bucket?
5. **A server that cannot read (ADR-0002, ADR-0004).** Assembly runs on the server and takes History from the client, and phase 2 planned a Postgres Store the server reads. With ciphertext on the remote the server never reads data. Does that block any phase-2 story or server-side feature?
6. **Keys and Account identity (ADR-0007, ADR-0008).** Its device pairing, recovery phrases and WebAuthn credential custody overlap our passkey plan and our "no recovery codes" decision. Can it run with a null key source and our own Account identity? Or does encryption make key loss mean data loss for the person?
7. **iOS storage and failure modes.** Safari evicts IndexedDB after seven days without interaction outside installed apps. Does restoring from the mailbox after eviction work? How does its local store behave when IndexedDB is missing, refused, or fails mid-work? The current Store already handles all three.
8. **Footprint and maintenance.** What is the added client bundle size and dependency count? Does browser support cover iOS Safari, Android Chrome, desktop Chromium and Firefox? What are its test and release practices? What is the maintenance risk of a v0.2 library with 2 stars?

interocitor evaluation for this ticket, 2026-09-27 (repo read at commit 624f01b, `@interocitor/core` and `@interocitor/web` 0.3.0 in the repo; npm latest core 0.2.0, web 0.2.1, which the spike used):

- **Store contract (ADR-0002).** A Store with History in interocitor passes `src/test/store-contract.ts` unchanged in a spike: one engine per Account (`dbName` per Account id), `keySource: null`, no remote, the Active session kept in `sessionStorage`. Query results do not carry their row id, pruning leaves tombstones on disk, and domain errors need a wrapper: the plain local store throws `ReferenceError` without IndexedDB and `SecurityError` when refused.
- **Offline marks.** No on all three counts. A failed flush stays in the outbox but nothing retries it until the next local write; a `connect()` made offline is not retried. `pendingCount` is private and `outboxSize()` counts batches, not marks. Its connection status is not driven by failed requests, and calls outside `connect()` have no deadline, so a hotspot that drops packets can leave a flush hanging.
- **Conflict model (ADR-0009).** Not free: tombstones are never collected, compaction is manual in peer mode, clocks are hybrid logical clocks clamped at 5 minutes of skew, and queued writes older than 30 days are quarantined. Our data has nothing to merge.
- **Hosting (ADR-0001).** `@interocitor/workers` is Cloudflare-only (D1, `caches.default`, a Durable Object relay). On Deno Deploy it needs a third-party S3 bucket or a `StorageAdapter` we write.
- **A server that cannot read (ADR-0002, ADR-0004).** Assembly is unaffected, since it takes History from the client, but ciphertext on the remote rules out the phase 2 Postgres Store the server reads and any server-side report over History.
- **Keys and Account identity (ADR-0007, ADR-0008).** `keySource: null` works with our Account id as `dbName`, but then the mailbox holds plaintext. With a key, losing it loses History, and we have no recovery codes; only a custom PRF key provider over our passkey would be safe.
- **iOS storage and failure modes.** Eviction wipes rows, device id and stored credential together; with no key a reconnect pulls the whole mesh back, unflushed marks are lost as today. The resilient local store falls back to memory but throws `UnpushedLocalWritesError` with queued writes, where the current Store keeps working and reports History unavailable.
- **Footprint and maintenance.** 28 to 34 KB min+gzip against 2.3 KB for the current Store; 2 packages, no runtime dependencies. `npm install` fails with ERESOLVE (web declares a peer `core@0.1.0` that was never published). No browser support claim, Playwright on Chromium and desktop Safari only, no CI, no tags, manual releases, 3 stars, and a README that warns each release may change the API and the local-store format.
- **Outcome: reject for phase 1, revisit when story 59 is scheduled.** Recorded in [ADR-0013](../adr/0013-interocitor-is-not-adopted.md).

Interpretations taken during implementation, 2026-09-27:

- Phase 1 has no server-side store, so an unsent mark is one not yet acknowledged by `POST /marks`. The route is stateless: it validates the body and answers 204 without keeping anything, as the sign-in stub does. Phase 2 puts the Postgres Store behind it (ADR-0013).
- Every mark joins a queue of unsent marks in `sessionStorage` under `training:unsent-marks:<account>`, beside the Active session (ADR-0011, ADR-0012). An entry carries the Session's program and seed, the session item, its Exercise, the mark and `markedAt`. A new mark on the same session item replaces the queued one: the last write wins (ADR-0009). Marks of a finalized Session stay queued until sent. The queue dies with the tab, like the Active session.
- Connection state is decided only by the outcome of `POST /marks`: a 204 means connected; a rejected request, any other status (a hotspot's own page, 511, 5xx) or no answer within 8 seconds means offline. The request goes out even with an empty queue, so it doubles as the connection check. `navigator.onLine` is never read; the `online` event and the tab becoming visible only trigger a check.
- The connection monitor (`src/routes/connection.svelte.ts`) checks on opening the Program list or the Session screen and after every mark. While offline or while marks are unsent it retries every 15 seconds, one request at a time, so marks leave on their own when the connection returns. A result for a previous Account is not shown after a switch.
- The Program list shows «Нет связи. Начать Занятие нельзя: его собирает сервер. Начатое Занятие продолжается.» for as long as it is offline. «Начать Занятие» becomes a disabled button and «Пересобрать» is hidden; «Продолжить» and «Отменить Занятие» stay.
- The Session screen shows «Нет связи · Отметки сохраняются на устройстве и уйдут сами» inside its sticky header, with «не отправлено N» when N is above zero. The «Занятие завершено» screen shows the same line, since a Session finished offline still has unsent marks. «Заменить» is hidden offline, since a redraw needs the server. The screen stays monochrome.
- A mark no longer reloads server data: it navigates with `invalidate: ['training:session']`, a dependency declared by the root layout `load` (expiry) and the Session page `load`, instead of `invalidateAll`, which fetched `__data.json` and failed offline.
- The shell is cached by a service worker, as the map decided (`src/service-worker.ts`, logic in `src/routes/offline-shell.ts`). On install it caches the build, the static files and `/`; on activate it drops caches of other versions. Build files are served cache-first; pages and `__data.json` network-first with a 5 second deadline, falling back to the last cached copy on a failed request, a missed deadline or an error status, and for a page never cached, to `/`. Cached `__data.json` is keyed by path and `x-sveltekit-invalidated`, since no server `load` reads the query. A navigation inside the app asks only for some nodes (`=01`), while a reload asks for all (`=11`); so when a partial answer arrives, the worker also fetches and keeps the full one once, and a partial request offline falls back to the full copy. It holds the Auth session cookie value, so any request to `/auth/session` drops the data cache. Only GET is cached; `/marks` and assembly go straight to the network.
- `@deno/svelte-adapter` serves only `static/` and `/_app/immutable/`, not the built `service-worker.js`. `src/hooks.server.ts` serves it from `.deno-deploy/static/service-worker.js` with `no-cache`.
- A Session reached offline for the first time after install works once the service worker has taken control, that is from the second load after install.
- Known limits: the indicator appears only after the first request fails, so behind a dead hotspot «Начать Занятие» stays live for up to 8 seconds. After an Account switch the monitor sends only the current Account's queue; the previous one waits until that Account is watched again. Neither matters in phase 1, where `/marks` keeps nothing.
