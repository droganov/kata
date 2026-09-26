# 15: Работа без сети и индикация

**What to build:** Занятие доходит до конца в подвале зала. Человек видит, что связи нет, и понимает, что происходит с его отметками.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] Начатое Занятие проходится до конца без сети
- [ ] Отметки копятся на устройстве и уходят при возврате связи, без действий человека
- [ ] Индикатор офлайна постоянный, а не всплывающий
- [ ] На странице Программ текст сообщает, что начать Занятие нельзя
- [ ] Внутри Занятия текст сообщает, что отметки сохраняются, и показан счётчик неотправленных
- [ ] Состояние сети определяется по факту отказа запроса, а не по `navigator.onLine`
- [ ] Подключение к точке доступа без интернета распознаётся как отсутствие сети

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
