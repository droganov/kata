# 16: Удаление прототипа

**What to build:** Прототипные данные и код, который их читает, уходят из репозитория. Таблицы становятся единственным источником истины.

**Blocked by:** 08

**Status:** ready-for-agent

- [x] `data/plan.json` удалён
- [x] `static/data/days.jsonl` и `static/data/exercises.jsonl` удалены
- [x] `tools/build_data.py` удалён
- [x] `data/procedures.json`, `data/links.json` и `data/dose_by_key.json` перенесены в таблицы и удалены
- [x] Критики из `tools/` переписаны на TypeScript, правила предметной области сохранены
- [ ] Роут `/dev` удалён: оборудование, Мишени и заметку Упражнения показывает экран прохождения
- [ ] Исходные каталоги `data/banks/` и словари прототипа в `data/*.json` удалены вместе с конвертером
- [ ] Код, читающий исходники прототипа, удалён или перенацелен на таблицы, правила предметной области проверяются на таблицах
- [ ] `make check` проходит без исходников прототипа
- [ ] Поиск по репозиторию не находит ни одной ссылки на удалённые файлы

## Comments

Re-triaged on 2026-09-13. The first five checks were already done before the ticket was taken. The ticket was blocked by 05 and 10, which it doesn't depend on. It is now blocked by 08, because `/dev` is the only place that shows equipment, Targets and the Exercise note until the Session screen exists.
