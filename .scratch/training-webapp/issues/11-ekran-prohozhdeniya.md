# Экран прохождения упражнения

Type: prototype
Status: resolved
Blocked by: 01

## Question

Каждое упражнение несёт процедуру из шагов, каждый шаг несёт оракулы с наблюдаемым утверждением, перечнем совместимых наблюдений и перечнем опровергающих. Это очень плотный материал. У жима ногами только на настройку приходится два оракула по пять и три строки.

Показать всё это целиком во время подхода невозможно.

Сделать грубый прототип экрана и решить на нём:

- Что человек видит, стоя у тренажёра. Название и доза, или ещё шаги.
- Где живут процедуры и оракулы: развёрнуты сразу, спрятаны за раскрытием, вынесены на отдельный экран.
- Как выглядит отметка выполнено и пропущено.
- Как человек переходит между упражнениями и видит, где он в занятии.
- Нужны ли изображения. Их сейчас нет, есть только промпты генерации на 4.8 МБ.

## Выпущен в работу

Вопрос не решён разговором и не может быть: нужен прототип на настоящих данных. Он выпущен отдельным тикетом реализации: [docs/tickets/07-prototip-ekrana-prohozhdeniya.md](../../../docs/tickets/07-prototip-ekrana-prohozhdeniya.md).

Тикет блокирует прохождение Занятия, а через него жизненный цикл, пересборку и работу без сети. Это единственная настоящая пробка в плане реализации.

## Answer

Settled on 2026-09-14 by ticket 07 on a prototype over a real Session; variant A won, the prototype stays on branch `prototype/07-ekran-prohozhdeniya`. Name, Dose and note at first glance; the Procedure as step disclosures with their Oracles; Equipment and Targets by target role above the steps; «Выполнено» wider than «Пропущено», and a mark moves to the next unmarked session item; monochrome; place counted inside the Block with a line of all Blocks; no images in phase 1. Going back to an earlier session item, decided 2026-09-16: the arrows ‹ › beside the count step to the neighbouring session item, and tapping a Block in the line opens that Block's session items; a new mark replaces the old one.

The full decision is in [the spec](../../../docs/specs/training-webapp.md), Implementation Decisions, **Session screen**.
