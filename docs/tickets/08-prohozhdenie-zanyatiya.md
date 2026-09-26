# 08: Прохождение Занятия

**What to build:** Человек проходит Занятие с телефона: одно Упражнение за раз, отмечает выполненным или пропущенным, видит, где находится.

**Blocked by:** 06, 07

**Status:** closed

- [x] Показано одно Упражнение за раз с названием и дозой
- [x] Процедура по шагам доступна в форме, выбранной в тикете 07
- [x] Оборудование, Мишени с ролями и заметка Упражнения доступны в форме, выбранной в тикете 07
- [x] На клиент уходят процедуры, оракулы, оборудование, Мишени и заметки только Упражнений этого Занятия
- [x] Отметка «выполнено» переводит к следующему Упражнению
- [x] Отметка «пропущено» переводит к следующему Упражнению
- [x] Видно место в Занятии и сколько осталось
- [x] Состояние Занятия переживает перезагрузку страницы

## Comments

Interpretations taken during implementation, 2026-09-26:

- The Session screen is variant A of the prototype from ticket 07, built on the live Active session: name, Dose and note at first glance, one disclosure «Оборудование и Мишени» above the Procedure steps, each step a disclosure with its Oracles, «Пропущено» and «Выполнено» fixed to the bottom, arrows ‹ › and the tappable line of Blocks for going back.
- Roles leave the server already in Russian: Equipment carries главное or вспомогательное, Targets arrive grouped under Первичные, Вторичные and Стабилизаторы. A role code the view does not know throws a domain error instead of reaching the screen. The step's active Targets are no longer sent.
- Only the session items' own Procedures, Oracles, Equipment, Targets and notes are in the Session view, as before; a test now pins that a foreign Exercise's detail never enters it.
- A mark goes through the Store (`markExercise`) into `sessionStorage`. After a reload the screen opens the first unmarked session item, so marks survive the reload and the open session item is derived from them rather than stored.
- When every session item is marked, the screen stays on the last marked one. Closing the Session is ticket 09.
- Place in the Session lives in `session/application/session-place.ts`: the session item's number inside its Block, the neighbouring session items across Block borders, and each Block's marked count.
