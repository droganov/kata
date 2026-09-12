# Каноническая реляционная модель

Тикет: [Нормализация модели и формат каталога](../../.scratch/training-webapp/issues/01-katalog-uprazhneniy-format.md).

Модель описана как схема Postgres. Пока базы нет, каждая таблица хранится файлом `data/<table>.jsonl`: одна строка это один кортеж, ключи это имена столбцов, значения только скалярные. Ни вложенных объектов, ни массивов. Переезд на Postgres это `COPY` из этих файлов, без преобразования формы.

Термины по `CONTEXT.md`. 45 таблиц и одно представление.

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
create type modality       as enum ('cardio','dynamic','loaded','isometric','calisthenic','static_stretch');
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

Каталога как сущности нет. Четыре файла `warmup`, `strength`, `calisthenics`, `stretch` почти совпадали с режимами работы, поэтому каталог схлопывается в столбец `exercise.modality`, и режим берётся у самого упражнения. Мишень «широчайшие» становится одной строкой на все режимы вместо трёх.

Совпадение оказалось неполным: в `calisthenics` два режима, `isometric` у семидесяти удержаний и `calisthenic` у семидесяти трёх динамических упражнений с весом тела. Перечисление поэтому из шести значений, а не из пяти.

Мишень играет две роли: под ней упражнение лежит в каталоге, и в ней же оно работает с ролью. Первая роль это бывший контур, вторая это запись анатомического словаря `targets.json`. Обе лежат в одной таблице `target`: `exercise.catalog_target_id` ведёт на мишень каталога, `exercise_target` на участников с ролями `primary`, `secondary` и `stabilizer`.

Когда мишень каталога и запись словаря означают одно и то же, строка одна. Совпадения перечислены поимённо: одиннадцать суставов разминки, восемь пучков трапеции, дельты и грудной, и десять целых мышц, среди них «широчайшие». Перечень лежит в `CATALOG_TARGETS` и несёт заодно вид мишени. Вид мишени каталога уточняет словарь: словарь знает только `muscle`, `joint` и `system`, а пучок мышцы становится `muscle_head`. Из пятидесяти одной мишени каталога двадцать восемь склеиваются со словарём, двадцать три заводят свою строку.

Мишень несёт упражнения не во всех режимах, а иногда ни в одном: словарная запись вроде `serratus_anterior` участвует в упражнениях, но каталог под неё ничего не кладёт. Отбор в блоке фильтрует каталог по режиму первым шагом, поэтому выбирает он только среди мишеней, у которых упражнения нужного режима есть.

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

-- Анатомическая группа: delts, rotators, quads, hamstrings…
-- По ней записан недельный объём программы
create table target_group (
  id   uuid primary key,
  slug text not null unique
);

-- Нижний уровень: мышца, пучок мышцы, сустав, паттерн движения, система
create table target (
  id              uuid primary key,
  muscle_group_id uuid references muscle_group(id),   -- пусто ровно у мишени вида system
  target_group_id uuid references target_group(id),   -- есть у мышц словаря
  slug            text not null,
  name            text not null,
  latin           text,               -- есть у мышц, нет у суставов и паттернов
  kind            target_kind not null,
  unique (muscle_group_id, slug),
  unique (slug)                      -- словарь и каталог сведены к одному ключу
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
  kg_max            numeric,
  seconds           smallint,         -- длительность в занятии: разминка, кардио
  met               numeric,          -- метаболический эквивалент: кардио
  core_plane        text,             -- плоскость нагрузки кора: изометрия
  hip_plane         text,             -- плоскость тазобедренного сустава
  goal_id           uuid references goal(id)  -- цель программы, которой служит упражнение
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

-- Одна оценка текста наблюдения. Одна и та же строка стоит в разных оракулах,
-- поэтому вердикт один, а связей со строками несколько
create table verdict (
  id      uuid primary key,
  hash    char(40) not null unique,
  verdict verdict_kind not null,
  reason  text
);

create table verdict_line (
  verdict_id uuid not null references verdict(id) on delete cascade,
  line_id    uuid not null unique references oracle_line(id) on delete cascade,
  primary key (verdict_id, line_id)
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

-- Пока входа нет, data/person.jsonl несёт только id и nickname из прототипа.
-- Остальные столбцы появляются со входом.

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
  ord        smallint not null,
  primary key (program_id, goal_id),
  unique (program_id, priority, ord)
);

-- Отдых зависит от вида работы, поэтому это таблица, а не набор столбцов
create table program_timing (
  program_id uuid not null references program(id) on delete cascade,
  key        text not null,   -- work_per_set, rest_strength, rest_accessory, transition, hold_rest
  sec        smallint not null,
  primary key (program_id, key)
);

-- Недельный коридор подходов на анатомическую группу: так он записан в прототипе
create table program_volume (
  program_id      uuid not null references program(id) on delete cascade,
  target_group_id uuid not null references target_group(id),
  min_sets        smallint not null,
  max_sets        smallint not null,
  primary key (program_id, target_group_id)
);

-- Прогрессия словами: pinned, drawn, isometric, stop_rule
create table program_progression (
  program_id uuid not null references program(id) on delete cascade,
  key        text not null,
  text       text not null,
  primary key (program_id, key)
);

-- Занятия вне зала: ходьба, подвижность дома
create table program_outside_gym (
  program_id uuid not null references program(id) on delete cascade,
  key        text not null,
  name       text not null,
  minutes    smallint not null,
  per_week   smallint not null,
  intensity  text,
  primary key (program_id, key)
);

-- Плоскости тазобедренного сустава, которые программа обязана покрыть
create table program_hip_plane (
  program_id uuid not null references program(id) on delete cascade,
  hip_plane  text not null,
  ord        smallint not null,
  primary key (program_id, hip_plane),
  unique (program_id, ord)
);

create table block (
  id         uuid primary key,
  program_id uuid not null references program(id) on delete cascade,
  ord        smallint not null,
  slug       text not null,
  name       text not null,          -- Разогрев, Разминка, Силовой, Изометрия, Растяжка
  modality   modality not null,      -- из какого режима берутся упражнения
  budget_sec smallint,               -- бюджет времени блока
  unique (program_id, ord),
  unique (program_id, slug)
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
  sec_each  smallint,                 -- длительность одного упражнения
  primary key (block_id, target_id)
);

-- Случайный добор из того, что не закреплено
create table block_draw (
  block_id  uuid primary key references block(id) on delete cascade,
  level     draw_level not null,      -- добираем группы мышц или мишени
  count     smallint not null,        -- сколько добрать
  pick_each smallint not null,        -- сколько упражнений с каждой
  sec_each  smallint                  -- длительность одного упражнения
);

-- Растяжка под нагруженную сегодня группу
create table block_pair (
  block_id        uuid not null references block(id) on delete cascade,
  when_group_id   uuid not null references muscle_group(id),
  then_target_id  uuid not null references target(id),
  primary key (block_id, when_group_id, then_target_id)
);

-- Правило блока словами: из zones[].rule и rules[] прототипа
create table block_rule (
  id              uuid primary key,
  block_id        uuid not null references block(id) on delete cascade,
  muscle_group_id uuid references muscle_group(id),
  ord             smallint not null,
  text            text not null,
  unique (block_id, ord)
);

-- Движение, исключённое из блока, с причиной
create table block_excluded (
  id       uuid primary key,
  block_id uuid not null references block(id) on delete cascade,
  ord      smallint not null,
  name     text not null,
  reason   text not null,
  unique (block_id, ord)
);
```

Как записывается текущая программа:

| Блок | Строки |
|---|---|
| Разогрев | `block_pin_target` на мишень вида `system` «Сердечно-сосудистая и дыхательная система», `pick = 1`, `sec_each = 260` |
| Силовой | `block_pin_group` на Ягодичные и Грудь, у обеих `pick = 1`. Одна строка `block_draw` с `level = muscle_group`, `count = 2`, `pick_each = 1` |
| Разминка | одиннадцать строк `block_pin_target` на суставы, `pick` от 1 до 4, `sec_each` из `slots[]` прототипа. Строки `block_draw` нет |

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
5. Порядок строк не значим: каждая строка опознаётся первичным ключом, поэтому место в файле ничего не сообщает. Критик проверяет это как непустой и неповторённый первичный ключ.

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

## Перенос прототипа без потерь

Всё, что знал прототип, лежит в таблицах. Каноническая модель несёт то, что нужно приложению. Устройство прототипа, которое спека заменила закреплениями и добором, лежит в архивных таблицах `prototype_*` со ссылками на канонические строки.

```sql
-- Файл каталога прототипа и секция программы, которая его брала
create table prototype_bank (
  id    uuid primary key,
  slug  text not null unique,
  title text not null
);

create table prototype_section (
  block_id uuid primary key references block(id),
  bank_id  uuid not null unique references prototype_bank(id),
  title    text not null
);

-- zones[] и contours[] каждого файла по порядку, с упражнениями и id процедуры
create table prototype_zone (
  id              uuid primary key,
  bank_id         uuid not null references prototype_bank(id),
  ord             smallint not null,
  slug            text not null,
  title           text not null,
  muscle_group_id uuid references muscle_group(id),
  unique (bank_id, ord)
);

create table prototype_contour (
  id        uuid primary key,
  zone_id   uuid not null references prototype_zone(id),
  ord       smallint not null,
  slug      text not null,
  title     text not null,
  pick      smallint,
  target_id uuid not null references target(id),
  unique (zone_id, ord)
);

create table prototype_contour_exercise (
  exercise_id  uuid primary key references exercise(id),
  contour_id   uuid not null references prototype_contour(id),
  ord          smallint not null,
  procedure_id uuid not null unique,
  unique (contour_id, ord)
);

-- slots[] секций с кандидатами и пары растяжки под нагрузку дня
create table prototype_slot (
  id           uuid primary key,
  block_id     uuid not null references block(id),
  ord          smallint not null,
  kind         text not null,
  label        text not null,
  pick         smallint,
  rule         text,
  sec_each     smallint,
  allow_repeat boolean,
  unique (block_id, ord)
);

create table prototype_slot_exercise (
  slot_id     uuid not null references prototype_slot(id),
  ord         smallint not null,
  exercise_id uuid not null references exercise(id),
  primary key (slot_id, ord)
);

create table prototype_pairing (
  slot_id     uuid not null references prototype_slot(id),
  pairing_ord smallint not null,
  ord         smallint not null,
  exercise_id uuid not null references exercise(id),
  primary key (slot_id, ord)
);

create table prototype_program (
  program_id     uuid primary key references program(id),
  rotation_weeks smallint not null
);

-- zone и kind записи словаря targets.json
create table prototype_target (
  target_id uuid primary key references target(id),
  zone      text not null,
  kind      text not null
);
```

Отсутствие дыр доказывается обратным ходом, а не перечнем. Критик таблиц держит три правила:

| Правило | Что проверяет |
|---|---|
| C13 SYSTEM | группы мышц нет ровно у мишеней вида `system` |
| C14 RESTORE | каждый исходник прототипа собирается из таблиц и совпадает с оригиналом по значениям |
| C15 CONVERTED | таблицы на диске равны конвертации исходников |

Сравнение в C14 не различает порядок там, где порядок не несёт смысла: оборудование, мишени и активные мишени шага упражнения, упражнения оборудования, программы владельца, записи верхнего уровня словарей. Везде остальной порядок хранится столбцом `ord`.

## Что осталось нерешённым

- Суставы разминки приписаны к группам мышц: лопатки к Трапеции, локоть и запястье к Рукам, голеностоп к Икрам, тазобедренный и коленный к Бёдрам. Приписка сделана при проектировании, её надо подтвердить.
- Перечисления сделаны типами Postgres. Альтернатива это таблицы-справочники, тогда добавление значения это данные, а не изменение схемы.
- Блок Изометрии набирает режим `isometric`, поэтому семьдесят три упражнения режима `calisthenic` пока не достаются ни одному блоку.
- Расхождение с планом хранения истории: здесь она выводится из занятий, а не хранится отдельным перечнем идентификаторов. Разбирается в тикете про историю.
