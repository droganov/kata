#!/usr/bin/env python3
"""Критик оракулов. Структура: procedure → steps[] → {title, oracles[]} → {predicate, model[], counterModel[]}.
Оракул D = (∀ model) ∧ ¬(∃ counterModel).

Правила (все обязательны, любой провал = запись невалидна):
Процедура
  O1  PRESENT   procedure.steps ≥ 2; у каждого шага oracles ≥ 1; лишних полей нет.
  O2  CYCLE     первый шаг — установка/исходное; «Сменить сторону» — последний шаг ⇔ доза содержит «/сторона» или «каждая нога»;
                доза «в каждую сторону» ⇒ есть шаг «Сменить направление»;
                есть шаг удержания (для секундных доз) или повтора (для повторных доз).
  O3  DOSE      числа дозы (секунды/минуты/повторы/шаги) встречаются цифрами в title/predicate шагов.
  O4  DISTINCT  предикаты всех оракулов процедуры попарно различны.
  O5  SOURCE    у записи есть источник методики.
Шаг
  O6  TITLE     первое слово — глагол в инфинитиве; без запятых; 3–60 знаков; кириллица.
Оракул
  O7  PREDICATE одно утверждение: без «,» «;» « и » « или » «/» скобок тире-склеек; 3–90; кириллица; ≥ 2 слов.
  O8  WRAPPER   predicate не обёртка: нет «принят/выполнен/сделан/готов/завершён/закончен/правильн».
  O9  DISJOINT  predicate ∉ model, predicate ∉ counterModel.
  O10 ATOMIC    каждая строка model/counterModel: одно утверждение (те же запреты, что O7), 3–90, кириллица.
  O11 OBSERVE   строки — состояния, не команды/намерения/оценки: стоп-список; первое слово не инфинитив.
  O12 FALSIFY   нет нефальсифицируемых слов: достаточн, нормальн, естественн, оптимальн, хорош, плох, комфортн, удобн.
  O13 COVERAGE  по типу шага в model есть обязательные классы (контакт, позвоночник, голова, конечная точка, дыхание, темп, снаряд).
  O14 SPINE     в процедуре есть строка о нейтрали поясницы/спины; контуры разгибателей — «до нейтрали|до линии».
  O15 NOISE     нет «(вид …)», «т.е.», «например», «≈», латиницы, глифов.
  O16 CSHAPE    counterModel — те же требования формы, что model (проверяется O10–O12, O15).
  O17 NEGATION  строка counterModel не отрицание model: (a) лексически после снятия «не/нет/без»;
                (b) антонимически — тот же субъект + противоположное состояние по словарю;
                (c) семантически — вердикт судьи «независима» в oracle_verdicts.json по хешу (predicate, предикаты и model всего шага, строка).
                Предикаты оракулов шага входят в модель шага: контр-строка не может быть отрицанием предиката.
  O18 SPECIFIC  counterModel называет сегмент и отклонение: нет «ошибк/неправильн/неверн/плохо/техник».
  O19 CCOVER    по типу шага в counterModel есть обязательные классы (дрейф, дыхание, симптом, компенсация, рывок, снаряд).
  O20 UNIQUE    нет повторов внутри списков; model ∩ counterModel = ∅.
  O21 EFFECT    = O17(c): строка без вердикта «независима» не принимается.
  O22 REPORT    поимённый отчёт, код выхода 1 при любом провале.
  O24 ACTIVE    у шага поле active: список id целей ⊆ targets упражнения; непустой для move/hold/repeat, пустой допустим для setup/initial/exit/switch.
  O23 RECONSTRUCT кадр восстановим из строк шага (title + predicate + model) без домысливания: в каждом шаге заданы
                голова, корпус, таз, руки, ноги, точки опоры; положение относительно снаряда (если главное средство — не тело);
                для движения — направление и конечная точка; для удержания — длительность цифрами; для повтора — число;
                для доз «/сторона» — рабочая сторона или конечность названа (кроме шага настройки).

Использование: oracle_critic.py [--no-verdicts] [файл …]. Без файлов — data/*.json банки и static/data/exercises.jsonl.
Часть: {"<key>": {"steps": […]}} или {"<key>": {"procedure": {...}, "dose": "...", "contour": "..."}}.
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
VERDICTS_PATH = os.path.join(ROOT, "data", "oracle_verdicts.json")
SOURCES_PATH = os.path.join(ROOT, "data", "procedure_sources.json")

BAD_ATOM = [",", ";", " и ", " или ", "(", ")", " — ", " – ", "/", "т.е.", "например", "и т.д.", "≈", "▾", "▸", "→"]
WRAPPER = ["принят", "выполнен", "сделан", "готов", "завершён", "закончен", "правильн"]
COMMAND = ["держать", "держите", "следить", "следите", "стара", "не дава", "нужно", "надо", "должн", "контролир", "избега", "постара", "не допуск", "нельзя"]
EVAL = ["правильн", "удобн", "комфортн", "техник", "достаточн", "нормальн", "естественн", "оптимальн", "хорош", "плох", "аккуратн"]
VAGUE = ["ошибк", "неправильн", "неверн", "плохо", "техник"]
INF_RE = re.compile(r"(ть|чь|йти|сти|зти)(ся)?$")
NOUN_TH = {"рукоять", "рукояти", "мякоть", "челюсть", "кости", "кисти", "части", "пясти", "гости", "локоть", "ноготь", "путь", "грудь", "ладонь", "ступень", "кисть", "кость", "часть", "пясть", "ось", "плоть", "постель", "суть"}
class _Inf:
    def search(self, w):
        w = w.lower().replace("ё", "е")
        if not w or w in NOUN_TH or w.endswith("ость") or w.endswith("асть"): return None
        return INF_RE.search(w)
INF = _Inf()

CONTACT = r"(на полу|пол[ау]?\b|коврик|скамь|стоп[аыуе]|ладон|опор|сиден|спинк|рукоят|перекладин|педал|платформ|стен[аеуы]|валик|ремен|манжет|предплечь|колен[аио] на|локт[ия] на|кисти на|ступень|турник|брусь|стойк|носк[аи]|пятк)"
SPINE = r"(поясниц|спин[аеуы]|позвоночник|корпус|таз)"
HEAD = r"(голов|взгляд|затыл|подбород|шея|шеи|ухо|макушк)"
END = r"(до |градус|лини|уровн|каса|параллел|вертикал|горизонтал|нейтрал|упор|полн)"
BREATH = r"(дыхан|вдох|выдох)"
TEMPO = r"(темп|секунд|плавн|ровн|каденс|скорост)"
GEAR = r"(тренаж|стек|плит|гантел|блин|коврик|резин|слайдер|полотенц|стойк|эспандер|утяжелит|штанг|фиксатор|карабин|трос|манжет|сиден|спинк|упор|рукоят|педал|полотн|скамь|перекладин|турник|брусь|ремен|валик|блок|платформ|ступен)"
DRIFT = r"(к концу|с каждой|постепенно|со временем|к \d+|на последних|последни[ехй])"
SYMPTOM = r"(\bбол(ь|и|ью|ев|езн)|болит|жжен|прострел|онемен|покалыван|судорог|хруст|щелч|немеет|тянет в пояснице)"
COMPENS = r"(крен|разворач|проворач|уход|уезж|подним|опуск|качает|подворач|скруч|наклон|прогиб|округл|провис|смещ|сводятс|расход|перекат|перенос|подлом|заваливает|выпир|выдвиг|выдвин|выдвижен|отрыв|отход|отош|сгиб|разгиб|запрокид|втягивает|поднят|опущен|разворот|заваливан|сваливает|сваливают|откатыва|разъезжа|съезжа|скруглен|подвёрнут|подворот)"
JERK = r"(рывк|рывок|инерци|бросок|стук|падает|падают|падени|прыжк|махом|толчк|бьёт|удар|грохот|подпрыг|раскачк|темп|быстр|резк)"
R_HEAD = r"(голов|взгляд|подбород|затыл|шея|шеи|ухо|макушк|лицо|нос)"
R_TORSO = r"(корпус|спин[аеуы]|поясниц|грудн|позвоноч|рёбр|лопат)"
R_PELVIS = r"(таз|ягодиц|гребн|седалищ|лобок)"
R_ARMS = r"(рук[аиу]|ладон|локт|кист|хват|предплечь|плеч[аио]|пальц)"
R_LEGS = r"(ног[аиу]|бедр|колен|голен|стоп|пятк|носк|ступн)"
R_MOTION = r"(вниз|вверх|вперёд|назад|в сторон|внутрь|наружу|к груди|к плеч|к пол|к стен|к ягодиц|до |опуст|подн|тян|толк|жм|отвед|привед|сгиб|разгиб|поворот|наклон|скольз|шаг|подать|подат|вернуть|верн)"
R_SIDE = r"(со стороны|свободн|опорн|рабоч|(задн|передн|верхн|нижн)(яя|ей|ее|его|им|юю) (нога|ноги|ногой|стопа|стопы|колено|колена|голень|бедро|бедра|рука|руки|рукой|ладонь)|друг(ая|ой|ую) (рука|нога|сторон)|левая|правая|левой|правой|одн(а|ой) (рука|нога|рукой|ногой)|верхн(яя|ей) (рука|нога)|нижн(яя|ей) (рука|нога))"
R_GEAR = r"(тренаж|стек|сиден|спинк|упор|рукоят|педал|платформ|скамь|перекладин|турник|брусь|стен[аеуы]|блок|трос|манжет|гантел|блин|ремен|валик|полотенц|ступень|стойк|опор)"
GEAR_ANOM = r"(стук|провис|фиксатор|карабин|болтает|люфт|съезж|скольз|соскальз|грохот|падает|между плит|расстёгнут|не застёгнут|ослаб)"

# антонимические пары состояний (для одного субъекта)
ANTONYMS = [
    ("вертикал", "наклон"), ("вертикал", "крен"), ("вертикал", "завал"), ("плоск", "провис"), ("плоск", "прогиб"), ("плоск", "округл"),
    ("нейтрал", "прогиб"), ("нейтрал", "прогнут"), ("плоск", "прогнут"), ("нейтрал", "округл"), ("нейтрал", "провис"), ("нейтрал", "переразг"), ("нейтрал", "скруч"), ("нейтрал", "наклон"),
    ("прям", "согнут"), ("прям", "округл"), ("прям", "сгиба"), ("выпрямл", "согнут"), ("выпрямл", "сгиба"), ("разогнут", "согнут"),
    ("напряж", "мягк"), ("напряж", "расслаб"), ("сжат", "расслаб"), ("сжат", "раскрыт"), ("расслаб", "напряж"),
    ("на полу", "оторв"), ("на полу", "поднят"), ("на полу", "в воздухе"), ("прижат", "оторв"), ("прижат", "отрыв"), ("прижат", "отход"), ("прижат", "отош"), ("прижат", "поднят"), ("лежит", "отрыв"), ("на полу", "отрыв"), ("на полу", "отход"), ("касает", "отход"),
    ("неподвиж", "движ"), ("неподвиж", "качает"), ("неподвиж", "крут"), ("неподвиж", "повора"), ("неподвиж", "смещ"), ("неподвиж", "уход"), ("неподвиж", "раскач"),
    ("ровн", "задерж"), ("ровн", "рывк"), ("ровн", "сбивается"), ("ровн", "прерыв"), ("горизонтал", "наклон"), ("горизонтал", "перекош"), ("горизонтал", "выше"), ("горизонтал", "ниже"),
    ("под плеч", "впереди плеч"), ("под плеч", "позади плеч"), ("под плеч", "шире плеч"), ("над пятк", "за носок"), ("над пятк", "за носк"), ("над стоп", "внутрь"),
    ("разведен", "сведен"), ("сведен", "разведен"), ("опущен", "поднят"), ("поднят", "опущен"), ("опущены", "к ушам"), ("вниз", "к ушам"),
    ("вперёд", "наружу"), ("вперёд", "внутрь"), ("вперёд", "вбок"), ("вперёд", "в сторону"), ("натянут", "провис"), ("натянут", "ослаб"),
    ("сомкнут", "раскрыт"), ("закрыт", "открыт"), ("открыт", "закрыт"), ("вместе", "врозь"), ("вместе", "расход"), ("параллел", "сход"), ("параллел", "расход"), ("параллел", "внутрь"),
    ("на одной лини", "выше"), ("на одной лини", "ниже"), ("на лини", "выше"), ("на лини", "ниже"), ("в лини", "выше"), ("в лини", "ниже"),
    ("касает", "не каса"), ("касает", "отрыв"), ("в замке", "расцеп"), ("до нейтрали", "выше нейтрали"), ("до линии", "выше линии"), ("не выше", "выше"),
    ("под таз", "позади таз"), ("под таз", "впереди таз"), ("над таз", "впереди таз"), ("над таз", "позади таз"), ("под тазом", "уход"),
    ("медленн", "быстр"), ("медленн", "рывк"), ("медленн", "резк"), ("согнут", "выпрямл"), ("согнут", "прям"), ("согнут", "разогнут"), ("вперёд", "наруж"), ("вперёд", "развёрнут"), ("над пятк", "за носк"), ("под таз", "впереди"), ("под таз", "позади"), ("опущен", "к ушам"), ("опущены", "подтянут"), ("вниз", "подтянут"), ("плавн", "рывк"), ("плавн", "резк"), ("одинаков", "разн"), ("симметр", "асимметр"),
    ("шире", "уже"), ("уже", "шире"), ("вниз", "вверх"), ("вверх", "вниз"), ("внутрь", "наружу"), ("наружу", "внутрь"), ("назад", "вперёд"),
    ("дыхание ровное", "задержка"), ("выдох", "задержк"), ("стоит", "движ"), ("стоит", "уход"), ("лежит", "оторв"), ("лежит", "поднят"),
]
STOP_SUBJ = {"на", "в", "к", "по", "с", "у", "от", "до", "над", "под", "за", "из", "оба", "обе", "вся", "весь", "все"}


def norm(s):
    s = s.lower().replace("ё", "е")
    s = re.sub(r"\b(не|нет|без)\b", "", s)
    return re.sub(r"[^а-я0-9]", "", s)


def subject(s):
    w = [x for x in re.sub(r"[^а-яё ]", "", s.lower()).split() if x not in STOP_SUBJ]
    if not w: return ""
    return w[0][:5] if len(w[0]) > 5 else w[0]


def _has(stem, text):
    stem = stem.replace("ё", "е")
    return re.search(r"(?<![а-я])" + re.escape(stem), text) is not None


def antonym(m, c):
    """Тот же субъект + пара противоположных состояний (в любом направлении), стемы по началу слова."""
    ml, cl = m.lower().replace("ё", "е"), c.lower().replace("ё", "е")
    if subject(m) != subject(c): return False
    for a, b in ANTONYMS:
        for x, y in ((a, b), (b, a)):
            if _has(x, ml) and _has(y, cl) and not _has(x, cl) and not _has(y, ml): return True
    return False


def vhash(predicate, model, line):
    return hashlib.sha1(("\n".join([predicate] + list(model) + [line])).encode("utf-8")).hexdigest()


def step_type(title):
    t = title.lower()
    if t.startswith("сменить сторон"): return "switch"
    if re.match(r"(удерж|удержив)", t): return "hold"
    if re.match(r"(повтор)", t): return "repeat"
    if t.startswith("сменить направлен"): return "move"
    if re.match(r"(настро|закреп|выстав|надеть|взять|установ|подобр|выбрать|застегн|отрегул|перекин|положить резин|закрепить)", t): return "setup"
    if re.match(r"(принять|встать|лечь|сесть|повиснуть|занять|выйти в|стать|опереться|упереться|расположиться|разместиться|поставить стоп|поставить ног|прислониться)", t): return "initial"
    if re.match(r"(вернуть|сойти|слезть|отпустить|встать с|снять|остановить|замедлить|завершить|поставить стек|отстегн|спрыг|перейти на другую)", t): return "exit"
    if re.match(r"(выйти|опустить|положить|поставить)", t) and re.search(r"(на пол\b|на пятки|стек|плит|на стопку|на раму|из положения|из виса|из упора|из планки|из приседа|снаряд|гантел|блин|на подставку)", t): return "exit"
    return "move"


def dose_numbers(dose):
    """Числа дозы, которые обязаны встретиться цифрами в шагах: секунды, минуты, повторы, шаги, метры."""
    if not dose: return set(), None
    d = dose.replace("–", "-")
    kind = "sec" if re.search(r"\d\s*с\b|\bс\b|сек|мин", d) else "reps"
    nums = set()
    if "×" in d:
        parts = d.split("×")
        # «3×12-15», «3×30с», «10с × 5/сторона», «2×20 шагов»
        for p in parts[1:] if not re.search(r"\d+\s*с\s*$|\d+с$", parts[0].strip()) else parts:
            for n in re.findall(r"\d+(?:[.,]\d+)?", p): nums.add(n)
        if re.search(r"\d+с\s*$", parts[0].strip()):  # legacy «10с × 5»
            nums.add(re.findall(r"\d+", parts[0])[0])
    else:
        for n in re.findall(r"\d+(?:[.,]\d+)?", d): nums.add(n)
    out = set()
    for n in nums:
        if "." in n or "," in n:
            a, b = re.split(r"[.,]", n); out.add(a); out.add(str(int(int(b) * 6)))  # 5.5 мин → 5 и 30
        else: out.add(n)
    return out, kind


def check(key, rec, rows, verdicts, sources, use_verdicts=True):
    def fail(rule, msg): rows.append((rule, f"{key}: {msg}"))
    proc = rec.get("procedure"); dose = rec.get("dose", "") or ""; contour = (rec.get("contour") or rec.get("contour_id") or "")
    if not isinstance(proc, dict) or set(proc) != {"steps"} or not isinstance(proc["steps"], list) or len(proc["steps"]) < 2:
        fail("O1 PRESENT", "procedure.steps отсутствует или < 2"); return
    steps = proc["steps"]
    if use_verdicts and key not in sources: fail("O5 SOURCE", "нет источника")
    all_pred = []; all_text = []; spine_ok = False; erector_ok = False
    for si, st in enumerate(steps, 1):
        if not isinstance(st, dict) or set(st) - {"active"} != {"title", "oracles"} or not isinstance(st["oracles"], list) or not st["oracles"]:
            fail("O1 PRESENT", f"шаг {si}: форма шага"); continue
        act = st.get("active")
        tg = {x["id"] for x in (rec.get("targets") or []) if isinstance(x, dict)} if rec.get("targets") else None
        if act is None: fail("O24 ACTIVE", f"шаг {si}: нет поля active")
        else:
            if not isinstance(act, list) or len(set(act)) != len(act): fail("O24 ACTIVE", f"шаг {si}: active не список без повторов")
            elif tg is not None and not set(act) <= tg: fail("O24 ACTIVE", f"шаг {si}: active вне targets: {sorted(set(act)-tg)}")
            if step_type(st["title"]) in ("move", "hold", "repeat") and not act: fail("O24 ACTIVE", f"шаг {si}: active пуст в шаге {step_type(st['title'])}")
        t = st["title"]; w = t.split()[0].lower() if t.strip() else ""
        if not INF.search(w) or "," in t or not (3 <= len(t) <= 60) or re.search(r"[A-Za-z]", t): fail("O6 TITLE", f"шаг {si}: {t!r}")
        typ = step_type(t); all_text.append(t)
        m_all = []; c_all = []
        step_model = [x for o in st["oracles"] if isinstance(o, dict) for x in (o.get("model") or []) if isinstance(x, str)]
        # предикаты шага — тоже утверждения модели шага: контр-строка не может быть их отрицанием
        step_model = [o["predicate"] for o in st["oracles"] if isinstance(o, dict) and isinstance(o.get("predicate"), str)] + step_model
        step_mn = {norm(x) for x in step_model}
        for oi, o in enumerate(st["oracles"], 1):
            tag = f"шаг {si} оракул {oi}"
            if not isinstance(o, dict) or set(o) != {"predicate", "model", "counterModel"}: fail("O1 PRESENT", f"{tag}: форма оракула"); continue
            p, m, c = o["predicate"], o["model"], o["counterModel"]
            if not (isinstance(m, list) and isinstance(c, list) and m and c and all(isinstance(x, str) for x in m + c)): fail("O1 PRESENT", f"{tag}: model/counterModel"); continue
            all_text.append(p); all_pred.append(norm(p))
            if any(b in p for b in BAD_ATOM) or not (3 <= len(p) <= 90) or re.search(r"[A-Za-z]", p) or len(p.split()) < 2: fail("O7 PREDICATE", f"{tag}: {p!r}")
            if any(b in p.lower() for b in WRAPPER): fail("O8 WRAPPER", f"{tag}: {p!r}")
            if norm(p) in {norm(x) for x in m + c}: fail("O9 DISJOINT", f"{tag}: predicate повторяет строку списка")
            for lst, nm in ((m, "model"), (c, "counterModel")):
                for s in lst:
                    low = s.lower()
                    if any(b in s for b in BAD_ATOM) or not (3 <= len(s) <= 90): fail("O10 ATOMIC", f"{tag} {nm}: {s!r}")
                    if re.search(r"[A-Za-z]", s) or re.search(r"вид (сбоку|спереди|сзади|сверху)", low): fail("O15 NOISE", f"{tag} {nm}: {s!r}")
                    if any(b in low for b in COMMAND) or INF.search(low.split()[0] if low.split() else ""): fail("O11 OBSERVE", f"{tag} {nm}: {s!r}")
                    if any(b in low for b in EVAL): fail("O12 FALSIFY", f"{tag} {nm}: {s!r}")
                    if nm == "counterModel" and any(b in low for b in VAGUE): fail("O18 SPECIFIC", f"{tag}: {s!r}")
                if len(set(lst)) != len(lst): fail("O20 UNIQUE", f"{tag} {nm}: повторы")
            if {norm(x) for x in m} & {norm(x) for x in c}: fail("O20 UNIQUE", f"{tag}: общие строки model/counterModel")
            for s in c:
                if norm(s) in step_mn: fail("O17 NEGATION", f"{tag}: {s!r} — лексическое отрицание строки model шага")
                for x in step_model:
                    if antonym(x, s): fail("O17 NEGATION", f"{tag}: {s!r} — антоним строки model шага {x!r}"); break
                if use_verdicts and verdicts.get(vhash(p, step_model, s)) != "independent": fail("O21 EFFECT", f"{tag}: {s!r} — нет вердикта «независима»")
            m_all += m; c_all += c
        mt = " ".join(x.lower() for x in m_all + [t] + [o["predicate"] for o in st["oracles"] if isinstance(o, dict)]); ct = " ".join(x.lower() for x in c_all)
        if re.search(SPINE + r".*(нейтрал|плоск|прям|прижат|ровн)|(нейтрал|плоск|прям|прижат).*" + SPINE, mt): spine_ok = True
        if re.search(r"до (нейтрали|линии)", mt): erector_ok = True
        # O13 покрытие model по типу шага
        need = {"setup": [("снаряд", GEAR)], "initial": [("контакт", CONTACT), ("позвоночник", SPINE), ("голова", HEAD)],
                "move": [("позвоночник", SPINE), ("конечная точка", END)], "hold": [("позвоночник", SPINE), ("дыхание", BREATH), ("длительность", r"\d+ ?(секунд|минут)")],
                "repeat": [("темп", TEMPO), ("число повторов", r"\d+")], "exit": [("контакт", CONTACT)], "switch": [("контакт", CONTACT)]}[typ]
        for name, rx in need:
            if not re.search(rx, mt): fail("O13 COVERAGE", f"шаг {si} [{typ}] model: нет класса «{name}»")
        # O23 восстановимость кадра
        rtxt = (t + " " + mt).lower()
        gear_main = rec.get("equipment")
        if isinstance(gear_main, list): has_gear = any(isinstance(x, dict) and x.get("role") == "главное" and x.get("id") != "body" for x in gear_main)  # главное средство — не тело
        else: has_gear = bool(gear_main) and gear_main != "вес тела"
        need23 = [("голова", R_HEAD), ("корпус", R_TORSO), ("таз", R_PELVIS), ("руки", R_ARMS), ("ноги", R_LEGS), ("опора", CONTACT)]
        if has_gear: need23.append(("снаряд", R_GEAR))
        if typ == "move": need23 += [("направление", R_MOTION), ("конечная точка", END)]
        if typ == "hold": need23.append(("длительность", r"\d+ ?(секунд|минут)"))
        if typ == "repeat": need23.append(("число повторов", r"\d+"))
        if ("/сторона" in dose or "каждая нога" in dose) and typ != "setup": need23.append(("сторона", R_SIDE))
        for name, rx in need23:
            if not re.search(rx, rtxt): fail("O23 RECONSTRUCT", f"шаг {si} [{typ}]: не задано «{name}»")
        # O19 покрытие counterModel по типу шага
        needc = {"hold": [("дрейф", DRIFT), ("дыхание", BREATH), ("симптом", SYMPTOM)], "move": [("компенсация", COMPENS), ("рывок/темп", JERK)],
                 "repeat": [("дрейф", DRIFT), ("компенсация", COMPENS)], "setup": [("аномалия снаряда", GEAR_ANOM)], "initial": [("компенсация", COMPENS)],
                 "exit": [("рывок/темп", JERK)], "switch": []}[typ]
        if re.search(r"поясниц", mt) and typ in ("move", "hold", "repeat"): needc = needc + [("симптом", SYMPTOM)]
        for name, rx in needc:
            if not re.search(rx, ct): fail("O19 CCOVER", f"шаг {si} [{typ}] counterModel: нет класса «{name}»")
    # O2 CYCLE
    titles = [s["title"].lower() for s in steps if isinstance(s, dict) and "title" in s]
    if titles:
        if step_type(titles[0]) not in ("setup", "initial"): fail("O2 CYCLE", f"первый шаг не установка/исходное: {titles[0]!r}")
        side = "/сторона" in dose or "каждая нога" in dose or "каждой ногой" in dose
        last_switch = titles[-1].startswith("сменить сторон")
        if side != last_switch: fail("O2 CYCLE", f"«Сменить сторону» последним: {last_switch}, доза {dose!r}")
        if any(re.search(r"(сменить сторон|перейти на другую сторон|другой сторон|другую ногу|другой ногой|другой рукой|другую руку)", t) for t in titles) and not side:
            fail("O2 CYCLE", f"есть смена стороны, а доза без «/сторона»: {dose!r}")
        if "в каждую сторону" in dose and not any(t.startswith("сменить направлен") for t in titles): fail("O2 CYCLE", f"нет шага «Сменить направление» при дозе {dose!r}")
        types = [step_type(t) for t in titles]
        nums, kind = dose_numbers(dose)
        if kind == "sec" and "hold" not in types: fail("O2 CYCLE", "нет шага удержания при секундной дозе")
        if kind == "reps" and "repeat" not in types and "hold" not in types: fail("O2 CYCLE", "нет шага повтора при повторной дозе")
        txt = " ".join(all_text)
        for n in nums:
            if not re.search(r"(?<!\d)" + re.escape(n) + r"(?!\d)", txt): fail("O3 DOSE", f"число дозы {n} ({dose}) не встречается в title/predicate")
    if len(all_pred) != len(set(all_pred)): fail("O4 DISTINCT", "повторяющиеся предикаты")
    if not spine_ok: fail("O14 SPINE", "нет строки о нейтрали поясницы/спины")
    if "erector" in str(contour) or "разгибател" in str(contour).lower() or "разгибател" in str(rec.get("contour_title", "")).lower():
        if not erector_ok: fail("O14 SPINE", "контур разгибателей: нет «до нейтрали|до линии»")


def iter_records(path):
    if path.endswith(".jsonl"):
        for line in open(path, encoding="utf-8"):
            e = json.loads(line); yield f"plan:{e['id']}", e
        return
    D = json.load(open(path, encoding="utf-8"))
    if isinstance(D, dict) and "zones" in D:
        bank = os.path.basename(path).replace(".json", "")
        for z in D["zones"]:
            for c in z["contours"]:
                for e in c["bank"]:
                    e = dict(e); e["contour"] = c["id"]; e["contour_title"] = c["title"]; yield f"{bank}:{e['id']}", e
    elif isinstance(D, dict):
        lt = os.path.join(ROOT, "data", "links_targets.json"); LT = json.load(open(lt, encoding="utf-8")) if os.path.exists(lt) else {}
        for k, v in D.items():
            if isinstance(v, dict) and "targets" not in v and k in LT: v = dict(v, targets=LT[k])
            yield k, v
    else:
        for e in D: yield e.get("key") or e.get("id"), e


def main(argv):
    use_verdicts = "--no-verdicts" not in argv
    files = [a for a in argv if not a.startswith("--")] or [os.path.join(ROOT, "data", f) for f in ("strength.json", "calisthenics.json", "stretch.json")] + [os.path.join(ROOT, "static", "data", "exercises.jsonl")]
    verdicts = json.load(open(VERDICTS_PATH, encoding="utf-8")) if os.path.exists(VERDICTS_PATH) else {}
    sources = json.load(open(SOURCES_PATH, encoding="utf-8")) if os.path.exists(SOURCES_PATH) else {}
    rows = []; n = 0
    for f in files:
        for key, rec in iter_records(f):
            n += 1; check(key, rec, rows, verdicts, sources, use_verdicts)
    print(f"ЗАПИСЕЙ: {n}   ВЕРДИКТОВ: {len(verdicts)}   {'(без судьи)' if not use_verdicts else ''}")
    from collections import Counter
    cnt = Counter(r for r, _ in rows)
    for r, m in rows: print(f"  FAIL  {r}  {m}")
    for r, c in sorted(cnt.items()): print(f"  {r}: {c}")
    print(f"ПРОВАЛЕНО: {len(rows)}")
    return 1 if rows else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
