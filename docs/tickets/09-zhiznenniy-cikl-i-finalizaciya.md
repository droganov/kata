# 09: Жизненный цикл и финализация

**What to build:** Занятие заканчивается одним из трёх способов, и все три одинаково отправляют выполненное в Историю.

**Blocked by:** 08

**Status:** closed

- [x] Отметка времени пишется при завершении Упражнения и переходе к следующему
- [x] Открытие приложения, прокрутка и чтение процедуры срок не двигают
- [x] При каждом открытии приложения читаются все активные Занятия, истёкшие финализируются
- [x] Занятие истекает через два часа после последней отметки
- [x] Отдельного фонового таймера нет
- [x] Отмена и завершение всех Упражнений ведут в ту же финализацию
- [x] Финализация пишет в IndexedDB идентификаторы выполненных Упражнений, закрытое Занятие не хранится
- [x] Пропущенные Упражнения в Историю не попадают
- [x] Финализация идемпотентна
- [x] Просроченное за окном три недели чистится при записи

## Comments

Note from ticket 06, 2026-09-14: the Store's `closeSession` is already idempotent (closing a closed Session does nothing and raises no error), as the spec's Testing Decisions require. The intake's example error «Занятие уже закрыто» therefore does not apply to finalization. `store-interface.md` records this exception.

**Evaluate interocitor before implementing this ticket** (added 2026-09-14). General criteria and context are in ticket 15. Specific to this ticket:

- **Where the active Session lives (ADR-0011).** ADR-0011 keeps it in `sessionStorage` and only done Exercise ids in IndexedDB. interocitor keeps rows in its own local store. Would the active Session move there and survive a closed tab? That would change the consequence ADR-0011 accepted.
- **Pruning History.** Finalization prunes History entries older than three weeks on write. With CRDT rows, is that a real deletion, or do tombstones and snapshots keep the entries until compaction? Who compacts, and when?
- **Expiry and duplicate finalization.** Expiry is judged on app open from the last mark time. Once a Session can reach more than one device, whose clock decides? Can two devices finalize the same Session twice, given that finalization must stay idempotent?

Interpretations taken during implementation, 2026-09-26:

- The last mark time is `markedAt` on the Active session. Opening the Session sets it to the opening time, so a Session with no marks expires two hours after it was opened. Only `markExercise` moves it. Reading the Active session, navigating, scrolling and disclosures do not. The intake's `touchSession` is dropped: the mark itself writes the time.
- An Active session stored without `markedAt` is an older shape and is not taken for an Active session, as in ticket 08.
- "Every app open" is the root layout `load` (`src/routes/+layout.ts`). It reads every Active session in the tab through the new Store operation `activeSessions` and finalizes the expired ones. The Session page `load` awaits `parent()`, so an expired Session is finalized before an Active session is looked up or a new one assembled. The layout load also runs again after every mark (`invalidateAll`). No timer runs in the background.
- Expiry is judged in `session/application/session-lifecycle.ts`. The Store only stores, and does no computing.
- When a person opens the app and an expired Session was finalized, the layout shows «Занятие закрылось само» (user story 52).
- The mark that leaves no unmarked session item finalizes the Session, and the screen goes to `/programs/<program>/finished` («Занятие завершено», user story 50). After that the marks can no longer be changed.
- «Отменить Занятие» on the Session screen runs the same `closeSession` and returns to the list of Programs, with no confirmation step.
- A History entry's date is the Session's last mark time (`markedAt`), not the finalization time. A Session that expired and was found days later keeps the date on which it was done.
- Expiry is judged only on app open. With no timer, a tab left open past two hours still takes a mark, and that mark moves `markedAt` forward. The «Занятие закрылось само» notice stays until the layout load runs again, at the next mark.
- Pruning happens on every History write. The window is `HISTORY_DAYS` (21) in `session/application/store.ts`, and the Store contract pins it.

interocitor evaluation for this ticket, 2026-09-26 (repo read at core/web 0.3.0, npm latest 0.2.x):

- **Where the Active session lives.** interocitor has no `sessionStorage`-backed store. Its rows live in a durable IndexedDB store, so an Active session kept there would survive a closed tab and would change the consequence ADR-0011 accepted. It does not touch `sessionStorage`, so the Active session can stay where it is.
- **Pruning History.** `delete()` is a soft delete that leaves a tombstone. The protocol never garbage-collects tombstones, and snapshots carry them. Compaction is manual in peer mode, run by one key holder at a time. It is automatic only in managed mode, after 7 days. "Nothing past three weeks" would hold for payloads only, not for row ids.
- **Expiry and duplicate finalization.** Clocks are hybrid logical clocks, and a remote clock more than 5 minutes ahead is clamped. Order is not real-time proof, so a device with a skewed clock can still win. Two devices can both finalize, since there are no cross-device locks. Deterministic row ids with upserts would converge to one result, but "one active Session per Account" cannot be enforced.
- **Outcome: defer.** This ticket keeps ADR-0011 and ADR-0009 unchanged and adds no dependency. The full question list and the ADR belong to ticket 15.
