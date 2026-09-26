# 10: История влияет на сборку

**What to build:** То, что человек выполнил на прошлой неделе, выпадает заметно реже нового. Каталог при этом не исчерпывается.

**Blocked by:** 05, 09

**Status:** closed

- [x] История подаётся на вход сборке вместе с Программой и каталогом
- [x] Вес считается как `max(d / 21, 0.02)`, где `d` это дни с последнего выполнения
- [x] Упражнение, которого нет в Истории, имеет полный вес
- [x] Вес решает только случайный выбор: Закреплённые Группы мышц и Мишени попадают в Занятие всегда
- [x] Выполненное вчера выпадает существенно реже нового, проверено на большой выборке зёрен
- [x] При Истории, покрывающей весь каталог, сборка всё равно возвращает Занятие
- [x] Вес Группы мышц и Мишени считается по самому свежему выполненному Упражнению из них
- [x] Мишень «шейный отдел» продолжает отдавать все четыре Упражнения каждое Занятие

## Comments

Interpretations taken during implementation, 2026-09-27:

- `d` is the exact number of days, fractional, between the History entry's date (the Session's last mark time, ticket 09) and the moment of assembly. It is capped at 21. An Exercise done two hours ago weighs `0.02`, not `0`. When an Exercise appears in History more than once, its most recent date counts.
- The weight lives in `session/domain/novelty.ts`: `noveltyOf(history, now)` turns History into a weight per Exercise, and `sessionOf` takes it as its fourth argument. Without it every Exercise weighs 1, as before.
- The weight applies wherever selection is random, as ADR-0005 lists: the Exercise inside a Target, the Target inside a Muscle group (pinned or drawn), the draw of Muscle groups or Targets, and the `block_pair` row in Stretching. A pinned Target still takes `pick` Exercises, so the cervical spine Target keeps all four.
- A Target weighs as its most recently done Exercise among the Exercises of the Block's Modality that the contraindications permit. A Muscle group weighs as its most recently done such Exercise. An Exercise done in another Modality does not push the Target back: pigeon stretch done yesterday leaves the glutes in Strength untouched.
- History reaches the server in the request body. Assembly moved from `GET` to `POST /programs/<program>/session` with `{ history }`, because three weeks of History does not fit a URL. The client reads it through the Store's `recentExercises` over `HISTORY_DAYS`, only when there is no Active session to return to. The server takes `now` from its own clock. Entries that are not History entries are dropped. Without IndexedDB the History is empty.
- With equal weights the weighted draw picks the same index as the uniform one, so a seed with an empty History gives the same Session as before.
- `HISTORY_DAYS` now lives in `session/domain/novelty.ts`, and `application/store.ts` re-exports it, so the weight cap and the History window are one number.
- The route parses the body. A body that is not JSON, or holds no History, assembles with an empty History instead of failing.
- The seed alone no longer reproduces a Session: History and the moment of assembly are inputs too (ADR-0004), and neither is kept with the Active session. Reproducing a Session needs all three.
- `doneAt` comes from the client clock and `now` from the server clock. When the client runs ahead, `d` is negative and the weight clamps to `0.02`. Nothing breaks.
- Open for the operator: the Modality restriction on Target and Muscle group weights goes beyond the literal text of ADR-0005 («take the weight of their most recently done Exercise»). If an Exercise done in any Modality should push its Target back in every Block, drop the `modality` filter in `targetWeight`.
