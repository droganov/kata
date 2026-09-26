# 09: Жизненный цикл и финализация

**What to build:** Занятие заканчивается одним из трёх способов, и все три одинаково отправляют выполненное в Историю.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Отметка времени пишется при завершении Упражнения и переходе к следующему
- [ ] Открытие приложения, прокрутка и чтение процедуры срок не двигают
- [ ] При каждом открытии приложения читаются все активные Занятия, истёкшие финализируются
- [ ] Занятие истекает через два часа после последней отметки
- [ ] Отдельного фонового таймера нет
- [ ] Отмена и завершение всех Упражнений ведут в ту же финализацию
- [ ] Финализация пишет в IndexedDB идентификаторы выполненных Упражнений, закрытое Занятие не хранится
- [ ] Пропущенные Упражнения в Историю не попадают
- [ ] Финализация идемпотентна
- [ ] Просроченное за окном три недели чистится при записи

## Comments

Note from ticket 06, 2026-09-14: the Store's `closeSession` is already idempotent (closing a closed Session does nothing and raises no error), as the spec's Testing Decisions require. The intake's example error «Занятие уже закрыто» therefore does not apply to finalization. `store-interface.md` records this exception.

**Evaluate interocitor before implementing this ticket** (added 2026-09-14). General criteria and context are in ticket 15. Specific to this ticket:

- **Where the active Session lives (ADR-0011).** ADR-0011 keeps it in `sessionStorage` and only done Exercise ids in IndexedDB. interocitor keeps rows in its own local store. Would the active Session move there and survive a closed tab? That would change the consequence ADR-0011 accepted.
- **Pruning History.** Finalization prunes History entries older than three weeks on write. With CRDT rows, is that a real deletion, or do tombstones and snapshots keep the entries until compaction? Who compacts, and when?
- **Expiry and duplicate finalization.** Expiry is judged on app open from the last mark time. Once a Session can reach more than one device, whose clock decides? Can two devices finalize the same Session twice, given that finalization must stay idempotent?
