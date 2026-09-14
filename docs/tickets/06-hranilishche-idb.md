# 06: Хранилище: интерфейс и реализация поверх IndexedDB

**What to build:** Активное занятие и История переживают перезагрузку страницы. Появляется слой доступа к данным, который приложение может использовать, не зная, где данные лежат.

**Blocked by:** 04

**Status:** closed

- [x] Интерфейс называет операции предметной области, а не строки таблиц
- [x] Реализация поверх IndexedDB для изменяемого, активное Занятие в `sessionStorage`
- [x] Хранилище ничего не считает: веса, отбор и фильтры остаются в сборке
- [x] Ошибки предметные: не «нарушено ограничение уникальности», а «почта уже занята»
- [x] Набор тестов написан против интерфейса, а не против реализации
- [x] Активное Занятие одно на Аккаунт, второе создать нельзя
- [x] Приложение работает, если IndexedDB недоступна: История считается пустой, человек предупреждён один раз

## Comments

Interpretations taken during implementation, 2026-09-14:

- The Store covers the Session and History part of the intake interface. Its operations are keyed by Account, since an Account has at most one active Session. Account, key and Auth session operations stay with tickets 12 and 13. `docs/intake/store-interface.md` records the shape.
- Until sign-in exists (ticket 12), the Account is the owner of the opened Program (`program.person_id`), an existing `person` row.
- The page first looks for the active Session in the Store and only asks the server to assemble a new one when there is none (`GET /programs/[program]/session`). An active Session begun in another Program redirects there.
- Any IndexedDB failure, at open or mid-work, makes History unavailable and empty while the Session still runs. "Warned once" is remembered in `sessionStorage`, so it is once per tab.
- The contract suite lives in `src/test/store-contract.ts` and runs on the browser Store; a Postgres Store would reuse it.
