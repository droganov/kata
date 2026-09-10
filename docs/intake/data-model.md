# Каноническая реляционная модель

Тикет: [Нормализация модели и формат каталога](../../.scratch/training-webapp/issues/01-katalog-uprazhneniy-format.md).

Модель описана как схема Postgres. Пока базы нет, каждая таблица хранится файлом `data/<table>.jsonl`: одна строка это один кортеж, ключи это имена столбцов, значения только скалярные. Ни вложенных объектов, ни массивов. Переезд на Postgres это `COPY` из этих файлов, без преобразования формы.

Термины по `CONTEXT.md`. Двадцать девять таблиц и одно представление.

## Что даёт нормализация

Требование «упражнение не знает, где оно находится» это следствие первой нормальной формы, а не отдельное правило. В 1NF повторяющихся групп нет, поэтому массивы `equipment[]`, `targets[]`, `steps[]`, `exercises[]` перестают существовать и становятся отдельными таблицами. У связующей таблицы нет направления, поэтому вопрос «кто на кого ссылается» исчезает.

То же с полем `active` в шаге процедуры. В дереве JSON оно выглядело ссылкой вверх и казалось неразрешимым. В реляционной модели это таблица `step_target`, и нарушения нет.

## Нарушения в текущих данных

| Где | Нарушение | Последствие |
|---|---|---|
| `strength.json`, `stretch.json`, `calisthenics.json`, `warmup.json` | вложенные массивы на четырёх уровнях | 1NF |
| `Exercise.equipment` и `Equipment.exercises` | одна связь записана дважды | аномалия обновления |
| `exercises.jsonl`, поля `axis`, `origin`, `slot` | зависят от блока программы, а не от упражнения | 3NF |
| `days.jsonl` | полные копии упражнений с именем, дозой и инструкцией внутри слота | дублирование, аномалия обновления |
| одна мишень в трёх каталогах | «широчайшие» существуют трижды | нет единого ключа |

## Схема

### Типы

```sql
create type target_kind    as enum ('muscle','muscle_head','joint','pattern','system');
create type modality       as enum ('cardio','dynamic','loaded','isometric','static_stretch');
create type equipment_kind as enum ('body','apparatus','machine','tool','environment','free_weight');
create type target_role    as enum ('primary','secondary','stabilizer');
create type equipment_role as enum ('main','auxiliary');
create type draw_level     as enum ('muscle_group','target');
create type oracle_side    as enum ('model','counter');
create type verdict_kind   as enum ('independent','negation','unobservable');
create type goal_priority  as enum ('primary','secondary');
create type session_state  as enum ('active','completed','cancelled','expired');
create type item_status    as enum ('pending','done','skipped');
```

Все первичные ключи это `uuid` версии 7, как требует `schema/common.schema.json`.

### Каталог

Каталога как сущности нет. Четыре файла `warmup`, `strength`, `calisthenics`, `stretch` соответствовали ровно четырём режимам работы, поэтому каталог схлопывается в столбец `exercise.modality`. Мишень «широчайшие» становится одной строкой на все режимы вместо трёх.

Дерево ровно в два уровня: группа мышц, затем мишень. Глубже данные не идут.

```sql
-- Верхний уровень: Шея, Трапеция, Плечи, Грудь, Спина,
-- Руки, Пресс и кор, Ягодичные, Бёдра, Икры
create table muscle_group (
  id   uuid primary key,
  slug text not null unique,
  name text not null,
  ord  smallint not null unique      -- порядок показа
);

-- Нижний уровень: мышца, пучок мышцы, сустав, паттерн движения, система
create table target (
  id              uuid primary key,
  muscle_group_id uuid not null references muscle_group(id),
  slug            text not null,
  name            text not null,
  latin           text,               -- есть у мышц, нет у суставов и паттернов
  kind            target_kind not null,
  unique (muscle_group_id, slug)
);

create table equipment (
  id       uuid primary key,
  slug     text not null unique,
  name     text not null,
  canon_en text not null,
  kind     equipment_kind not null
);

create table exercise (
  id                uuid primary key,
  slug              text not null unique,
  name              text not null,
  modality          modality not null,
  -- Мишень, под которой упражнение лежит в каталоге. Ровно одна.
  -- Это классификация самого упражнения, а не его место в программе.
  catalog_target_id uuid not null references target(id),
  dose              text not null,    -- '3×12–15', '40с × 2'
  note              text,
  axial             boolean not null, -- даёт осевую компрессию позвоночника
  lumbar_flex       boolean not null, -- сгибание поясницы под нагрузкой
  lumbar_ext        boolean not null, -- разгибание поясницы под нагрузкой
  free_weight       boolean not null,
  kg_max            numeric
);

create table exercise_target (
  exercise_id uuid not null references exercise(id) on delete cascade,
  target_id   uuid not null references target(id),
  role        target_role not null,
  primary key (exercise_id, target_id)
);

create table exercise_equipment (
  exercise_id  uuid not null references exercise(id) on delete cascade,
  equipment_id uuid not null references equipment(id),
  role         equipment_role not null,
  primary key (exercise_id, equipment_id)
);

create table exercise_source (
  id          uuid primary key,
  exercise_id uuid not null unique references exercise(id) on delete cascade,
  title       text not null,
  url         text,
  note        text
);
```

Ровно одно оборудование с ролью `main` на упражнение выражается частичным уникальным индексом:

```sql
create unique index on exercise_equipment (exercise_id) where role = 'main';
```

### Процедура

```sql
create table step (
  id          uuid primary key,
  exercise_id uuid not null references exercise(id) on delete cascade,
  ord         smallint not null,
  title       text not null,
  unique (exercise_id, ord)
);

-- бывшее поле active
create table step_target (
  step_id   uuid not null references step(id) on delete cascade,
  target_id uuid not null references target(id),
  primary key (step_id, target_id)
);

create table oracle (
  id        uuid primary key,
  step_id   uuid not null references step(id) on delete cascade,
  ord       smallint not null,
  predicate text not null,
  unique (step_id, ord)
);

-- бывшие массивы model и counterModel в одной таблице
create table oracle_line (
  id        uuid primary key,
  oracle_id uuid not null references oracle(id) on delete cascade,
  side      oracle_side not null,
  ord       smallint not null,
  text      text not null,
  unique (oracle_id, side, ord)
);

create table verdict (
  id      uuid primary key,
  line_id uuid not null unique references oracle_line(id) on delete cascade,
  hash    char(40) not null,
  verdict verdict_kind not null,
  reason  text
);
```

### Программа

```sql
-- Аккаунт человека. handle это user handle WebAuthn: 64 случайных байта,
-- принадлежит аккаунту, после первого passkey неизменяем.
create table person (
  id               uuid primary key,
  handle           bytea not null unique,
  nickname         text not null,
  email            text not null unique,
  email_verified_at timestamptz,
  created_at       timestamptz not null
);

-- Код подтверждения почты. Им же связывается создаваемый passkey.
create table email_code (
  id         uuid primary key,
  person_id  uuid not null references person(id) on delete cascade,
  code_hash  text not null,
  expires_at timestamptz not null,
  used_at    timestamptz
);

-- Passkey. У одного аккаунта их может быть несколько, по одному на устройство или связку.
create table credential (
  id             uuid primary key,
  person_id      uuid not null references person(id) on delete cascade,
  credential_id  bytea not null unique,   -- идентификатор ключа, публичное значение
  public_key     bytea not null,
  sign_count     bigint not null,
  transports     text,
  backed_up      boolean not null,        -- синхронизирован ли ключ в связке
  created_at     timestamptz not null,
  last_used_at   timestamptz
);

-- Сеанс: один вход на одном устройстве. Не путать с занятием.
create table auth_session (
  id           uuid primary key,
  person_id    uuid not null references person(id) on delete cascade,
  credential_id uuid not null references credential(id),
  device_label text not null,             -- что показать в списке сеансов
  created_at   timestamptz not null,
  last_seen_at timestamptz not null,
  revoked_at   timestamptz                -- null пока сеанс жив
);

-- Цель программы: ради чего она написана
create table goal (
  id   uuid primary key,
  slug text not null unique,
  name text not null
);

create table program (
  id                  uuid primary key,
  person_id           uuid not null references person(id),
  slug                text not null,
  title               text not null,
  sessions_per_week   smallint not null,
  session_budget_min  smallint not null,
  -- противопоказания
  no_axial_load       boolean not null,
  no_lumbar_flexion   boolean not null,
  no_lumbar_extension boolean not null,
  free_weight_kg_max  numeric,
  unique (person_id, slug)
);

create table program_goal (
  program_id uuid not null references program(id) on delete cascade,
  goal_id    uuid not null references goal(id),
  priority   goal_priority not null,
  primary key (program_id, goal_id)
);

-- Отдых зависит от вида работы, поэтому это таблица, а не набор столбцов
create table program_timing (
  program_id uuid not null references program(id) on delete cascade,
  key        text not null,   -- work_per_set, rest_strength, rest_accessory, transition, hold_rest
  sec        smallint not null,
  primary key (program_id, key)
);

-- Недельный коридор подходов на группу мышц
create table program_volume (
  program_id      uuid not null references program(id) on delete cascade,
  muscle_group_id uuid not null references muscle_group(id),
  min_sets        smallint not null,
  max_sets        smallint not null,
  primary key (program_id, muscle_group_id)
);

create table block (
  id         uuid primary key,
  program_id uuid not null references program(id) on delete cascade,
  ord        smallint not null,
  name       text not null,          -- Разогрев, Разминка, Силовой, Изометрия, Растяжка
  modality   modality not null,      -- из какого режима берутся упражнения
  unique (program_id, ord)
);

-- Закрепление на группе мышц: мишень внутри группы выбирается случайно
create table block_pin_group (
  block_id        uuid not null references block(id) on delete cascade,
  muscle_group_id uuid not null references muscle_group(id),
  ord             smallint not null,
  pick            smallint not null,   -- сколько упражнений взять
  primary key (block_id, muscle_group_id)
);

-- Закрепление на конкретной мишени
create table block_pin_target (
  block_id  uuid not null references block(id) on delete cascade,
  target_id uuid not null references target(id),
  ord       smallint not null,
  pick      smallint not null,
  primary key (block_id, target_id)
);

-- Случайный добор из того, что не закреплено
create table block_draw (
  block_id  uuid primary key references block(id) on delete cascade,
  level     draw_level not null,      -- добираем группы мышц или мишени
  count     smallint not null,        -- сколько добрать
  pick_each smallint not null         -- сколько упражнений с каждой
);

-- Растяжка под нагруженную сегодня группу
create table block_pair (
  block_id        uuid not null references block(id) on delete cascade,
  when_group_id   uuid not null references muscle_group(id),
  then_target_id  uuid not null references target(id),
  primary key (block_id, when_group_id, then_target_id)
);
```

Как записывается текущая программа:

| Блок | Строки |
|---|---|
| Силовой | `block_pin_group` на Ягодичные и Грудь, у обеих `pick = 1`. Одна строка `block_draw` с `level = muscle_group`, `count = 2`, `pick_each = 1` |
| Разминка | одиннадцать строк `block_pin_target` на суставы, `pick` от 1 до 4. Строки `block_draw` нет |

Добор всегда исключает уже закреплённое. Силовой блок добирает две группы из восьми оставшихся, а не из десяти.

**Порядок.** Блоки идут в порядке `block.ord`, он фиксирован: Разогрев, Разминка, Силовой, Изометрия, Растяжка. Внутри блока сначала идут закреплённые группы мышц в порядке `block_pin_group.ord`, затем добранные. Приоритетная работа делается на свежие силы, поэтому закреплённое идёт первым.

**Противопоказания работают фильтром, а не проверкой.** Флаги программы `no_axial_load`, `no_lumbar_flexion`, `no_lumbar_extension` и `free_weight_kg_max` сравниваются с полями упражнения `axial`, `lumbar_flex`, `lumbar_ext`, `free_weight` и `kg_max` в момент отбора. Запрещённое упражнение в выборку не попадает вовсе. Проверка после сборки не годится: она может завалить готовое занятие и оставить дыру, которую нечем закрыть.

### Занятие

```sql
create table session (
  id               uuid primary key,
  person_id        uuid not null references person(id),
  seed             bigint not null,      -- зерно случайности, сборка воспроизводима
  program_id       uuid not null references program(id),
  state            session_state not null,
  started_at       timestamptz not null,
  last_activity_at timestamptz not null,
  ended_at         timestamptz
);

-- Не больше одного активного занятия на человека
create unique index on session (person_id) where state = 'active';

create table session_item (
  id          uuid primary key,
  session_id  uuid not null references session(id) on delete cascade,
  block_id    uuid not null references block(id),
  ord         smallint not null,
  target_id   uuid not null references target(id),   -- Мишень, из которой взято
  exercise_id uuid not null references exercise(id),
  dose        text not null,          -- снимок дозы на момент сборки
  status      item_status not null,
  draw_no     smallint not null,      -- какая по счёту сборка дала эту позицию
  unique (session_id, ord)
);
```

Пересборка перезаписывает позицию и увеличивает `draw_no`. Так видно, сколько раз человек отказывался и что именно менялось.

`session_item.dose` это копия, а не ссылка. Каталог со временем меняется, а занятие обязано помнить, что было предписано в тот день. Это временнóй факт, а не дублирование.

### История

История это не таблица, а запрос.

```sql
create view history as
select s.person_id, i.exercise_id, s.ended_at
from session_item i
join session s on s.id = i.session_id
where s.ended_at is not null
  and s.ended_at > now() - interval '21 days';
```

В историю попадают все Упражнения закрытого Занятия, и выполненные, и пропущенные. Человек их видел, значит показывать их снова рано.

Сборка занятия получает на вход `person_id` и результат этого запроса.

## Проверка нормальных форм

**1NF.** Ни одного повторяющегося поля. Все бывшие массивы стали таблицами: `exercise_target`, `exercise_equipment`, `step`, `step_target`, `oracle`, `oracle_line`, `program_goal`, `block_pin_group`, `block_pin_target`.

**2NF.** У составных ключей нет частичных зависимостей. В `exercise_target` роль зависит от обоих столбцов ключа, не от одного.

**3NF.** Нет транзитивных зависимостей. Имя группы мышц не хранится в упражнении, оно достаётся через `target`. Поля `axis`, `origin`, `slot` из упражнения удалены: они зависели от блока программы, а не от упражнения.

**BCNF.** Каждый детерминант является ключом-кандидатом. Нарушений не найдено.

## Правила файлов jsonl

1. Один файл на таблицу, имя файла совпадает с именем таблицы.
2. Одна строка это один кортеж, объект JSON без переводов строки.
3. Ключи объекта совпадают с именами столбцов один в один.
4. Значения только скалярные: строка, число, булево, null. Массив или вложенный объект это ошибка.
5. Порядок строк не значим.

Критик проверяет все пять правил плюс целостность внешних ключей. Переезд на Postgres это `COPY` без преобразования формы.

## Судьба прототипа

| Файл | Что с ним |
|---|---|
| `data/plan.json` | удаляется после переноса чисел в `program`, `program_timing`, `program_volume`, `block*` |
| `static/data/days.jsonl` | удаляется, занятия теперь собираются, а не пекутся заранее |
| `static/data/exercises.jsonl` | удаляется, его содержимое расходится по `exercise`, `exercise_target`, `exercise_equipment`, `step`, `oracle` |
| `tools/build_data.py` | заменяется разовым конвертером из четырёх каталогов в таблицы, после конвертации удаляется |
| `data/procedures.json`, `data/links.json`, `data/dose_by_key.json` | входят в конвертер как источники, затем удаляются |
| критики в `tools/` | перенацеливаются на таблицы, правила сохраняются |

## Что осталось нерешённым

- Суставы разминки приписаны к группам мышц: лопатки к Трапеции, локоть и запястье к Рукам, голеностоп к Икрам, тазобедренный и коленный к Бёдрам. Приписка сделана при проектировании, её надо подтвердить.
- Перечисления сделаны типами Postgres. Альтернатива это таблицы-справочники, тогда добавление значения это данные, а не изменение схемы.
- Кардио-упражнения существуют только в прототипе и в каталоги не входят. Им нужна мишень вида `system`.
- Расхождение с планом хранения истории: здесь она выводится из занятий, а не хранится отдельным перечнем идентификаторов. Разбирается в тикете про историю.
