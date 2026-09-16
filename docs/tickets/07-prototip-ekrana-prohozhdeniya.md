# 07: Прототип экрана прохождения

**What to build:** Грубый прототип, отвечающий на единственный открытый вопрос спеки: что человек видит, стоя у тренажёра. Результат это решение, а не готовый экран.

**Blocked by:** 03

**Status:** closed

- [x] Прототип собран на настоящих данных, включая жим ногами с двумя оракулами по пять и три строки на одном шаге
- [x] Решено, что видно сразу: название и доза, или ещё что-то
- [x] Решено, где живут процедура и оракулы: развёрнуты, спрятаны за раскрытием или на отдельном экране
- [x] Решено, где видны оборудование, Мишени с ролями и заметка Упражнения: сейчас их показывает только `/dev`
- [x] Решено, как выглядят отметки выполнено и пропущено
- [x] Решено, как показано место в Занятии
- [x] Решено, нужны ли изображения Упражнений в фазе 1
- [x] Решение записано в спеку, пользовательские истории 41, 42 и 43 обрели форму

## Comments

Closed on 2026-09-14. The operator reviewed four variants of the Session screen on `/programs/[program]?seed=745425828&at=18&variant=A` through `D`, a real Session with leg press as session item 18. Variant A won after one revision: monochrome marking buttons and Oracle observations, Equipment and Targets grouped by target role in Russian above the steps, place counted inside the Block with a line of all Blocks. Exercise images were not asked: story 58 and the map's Out of scope already put them in phase 2.

The decision is recorded in the spec under Implementation Decisions, **Session screen**, and stories 41 to 46 carry its form. Going back to an earlier session item was decided on 2026-09-16, after the code review found the gap: the prototype grew arrows ‹ › beside the count and a tappable line of Blocks, and both stay in the form. The prototype is kept on branch `prototype/07-ekran-prohozhdeniya` and is not merged.
