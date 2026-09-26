# 11: Пересборка на трёх уровнях

**What to build:** Человек отказывается от того, что выпало, и просит другое. Бесплатно и без ограничений.

**Blocked by:** 08

**Status:** closed

- [x] Пересборка Упражнения сохраняет Мишень
- [x] Пересборка Мишени сохраняет Группу мышц и Блок
- [x] Пересборка всего Занятия сбрасывает исключения и начинается с чистого листа
- [x] Отклонённое не возвращается до конца сборки этого Занятия
- [x] Отклонённое в Историю не попадает
- [x] Позиция со статусом не `pending` не пересобирается
- [x] Счётчик сборок позиции растёт, видно, сколько раз человек отказывался
- [x] Ограничения на число пересборок нет

## Comments

Interpretations taken during implementation, 2026-09-27:

- Redraw of a session item is a pure server function, `redrawnItem` in `session/domain/redraw.ts`, beside assembly and on the same helpers. The server keeps no state, so the client sends everything in `POST /programs/<program>/session/redraw` with `{ history, redraw: { items, level, ord, rejected } }`: every session item as Block, Exercise, Target and number, the level, the session item to redraw and what the person has rejected so far. The server answers with the new session item, `409` when there is nothing to replace it with, `400` when the body holds no redraw. History weights the redraw the same way as assembly.
- Exercise level: the Target stays, another Exercise of that Target in the Block's Modality is drawn. Exercises already in the Session and rejected Exercises are out.
- Target level: the Muscle group of the current Target and the Block stay, another Target of that Muscle group stocked in the Block's Modality is drawn, then one Exercise inside it. Targets already in this Block and rejected Targets are out, and so are Exercises already in the Session and rejected Exercises. A Target outside Muscle groups and a pinned Target are never redrawn on this level: the pin is a Program rule.
- Target level redraws one session item, not every session item taken from that Target. In the current Program a Target gives more than one session item only when it is pinned, and pinned Targets are not redrawn on this level.
- When nothing can replace the session item, it stays, and the screen says «Замены нет: всё подходящее уже в Занятии или отклонено». Rejected never comes back, even when the Target runs out.
- What is rejected lives in the Active session, `rejected: { exercises, targets }`. The Exercise level rejects the old Exercise, the Target level rejects the old Exercise and the old Target. Rejected is never written to History: finalization takes only the Exercises of done marks, and a rejected Exercise is no longer in any session item.
- The whole Session is redrawn only while it has no marks: redrawing it would erase what is marked. The button «Пересобрать Занятие» lives on the program list, beside the Program whose Active session it redraws, and is shown only then; after the redraw the Session opens (operator, 2026-09-27). The Session screen redraws only its session items and links back to the program list with «На главную». It assembles a new Session with a new seed and the current History, clears rejected, and keeps `openedAt` and the last mark time. The Store refuses with `MarkedSessionItemError` when a mark exists.
- A session item with a mark, done or skipped, is not redrawn: the buttons are hidden, and the Store refuses with `MarkedSessionItemError` («Позиция уже отмечена, её не пересобрать»).
- The draw counter is `drawNo` on each session item view, `draw_no` of the data model. Assembly gives `1`, each redraw of the session item adds one, and a whole Session redraw adds one at every number that existed before, `1` at a number that is new. The screen does not show it (operator, 2026-09-27).
- The Store operation `redrawn` of `store-interface.md` became two: `redrawItem(account, item, rejected)` and `redrawSession(account, view)`. The contract tests cover both.
- An Active session stored before this ticket has no `rejected`, `drawNo` or `target` and is not taken for an Active session, as ticket 08 decided for older shapes: a new Session is assembled.
- `SessionItemRef`, `Redraw`, `RedrawLevel`, `Rejected`, `REDRAW_LEVEL`, `isRedrawLevel`, `isTargetRedrawable` and `redrawnItem` joined the session domain public API in `eslint.config.js`.
- A redraw of a session item draws on a fresh server seed that is not kept: `view.seed` stays the seed of the assembly. After an Exercise or Target redraw the Active session can no longer be reproduced from its seed alone (ADR-0004 already needs History and the moment too, ticket 10). A whole Session redraw keeps its new seed.
- Whether a session item can be replaced is known before the person asks: `redrawOptionsOf` gives every session item `isExerciseRedrawable` and `isTargetRedrawable` against the Session as it is and what is rejected. Assembly sets them, and each redraw answers with them for every session item, together with the new rejected (`rejectedAfter`). The Store takes that answer whole. The screen offers «Заменить» only where one of them is true, and its menu lists only the available levels (operator, 2026-09-27). The novelty weight never reaches zero, so History does not change them.
- The Session screen is laid out in zones: a sticky top bar with home, the current Block, the arrows and the Block line; the Exercise with its Dose and «Заменить»; the details; the marks at the bottom. In the Block line the current Block expands its session items, another Block leads to its first unmarked session item. «Отменить Занятие» moved to the Program card on the program list, beside «Продолжить» and «Пересобрать» (operator, 2026-09-27).
- An `ord` absent from the sent session items answers `409`, as when nothing can replace the session item.

Open for the operator (review, 2026-09-27):

- Whole Session redraw only before the first mark is a narrowing of story 37. The alternative is to redraw every pending session item and keep the marked ones.
- A Target redraw of a session item added by `block_pair` (Stretching under the day's load) picks any Target of the same Muscle group, so the pair relation is not kept. A Target redraw of a Strength session item leaves its paired Stretching session item in place. The spec does not cover pairs.
