# 05: Правила отбора целиком

**What to build:** Собранное Занятие соответствует Программе, а не случайной выборке. Все правила отбора работают и покрыты тестами на шве сборки.

**Blocked by:** 04

**Status:** closed

- [x] Закреплённые Группы мышц присутствуют в каждом Занятии без исключений
- [x] Внутри Закреплённой Группы мышц Мишень выбирается случайно, затем Упражнение внутри Мишени
- [x] Добор берёт ровно `count` штук и только из незакреплённого
- [x] Упражнение, запрещённое противопоказаниями, не появляется ни при каком зерне
- [x] Фильтр противопоказаний работает до отбора, а не проверкой после сборки
- [x] Порядок Блоков фиксирован, внутри Блока Закреплённые идут перед Добранными
- [x] Одинаковое зерно даёт одинаковое Занятие, разные зёрна дают разные
- [x] Зерно сохраняется вместе с Занятием
- [x] Одно Упражнение не попадает в Занятие дважды
- [x] Разминка отдаёт все одиннадцать суставов
- [x] Растяжка добавляет Мишень под нагруженное сегодня через `block_pair`
- [x] Тесты покрывают каждый пункт выше и не знают про устройство функции внутри

## Comments

Interpretations taken during implementation:

- `block_pair`: for each Muscle group loaded today (items of blocks with modality `loaded` assembled earlier), one row is drawn at random among that group's rows and gives one Exercise. Follows «для каждой нагруженной Группы мышц берётся строка» in `docs/intake/session-assembly.md`; on real tables Растяжка holds 5 to 7 items. The prototype slot had `pick 1` for the whole slot, so confirm if one extra stretch per Session was meant instead.
- An Exercise with `free_weight` and null `kg_max` counts as over the ceiling; a null `free_weight_kg_max` on the Program means no ceiling. Real tables have no such Exercise today.
- A Muscle group draw skips groups that hold a pinned Target, just as a Target draw skips Targets of pinned Muscle groups.
- Selection is uniform; History weights belong to ticket 10. The seed is a uint32 drawn from `crypto` by the interface and carried on `Session` and `SessionView`.
