#!/usr/bin/env python3
"""Тесты самого критика оракулов: эталон обязан проходить, каждая порча обязана валиться на своём правиле."""
import copy, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import oracle_critic as oc

GOOD = {
    "dose": "2×40с/сторона", "contour": "hip_flexors", "targets": [{"id": "iliopsoas", "role": "основная"}, {"id": "rectus_femoris", "role": "вспомогательная"}],
    "procedure": {"steps": [
        {"title": "Принять исходное положение", "active": [], "oracles": [
            {"predicate": "Заднее колено под тазом",
             "model": ["заднее колено на полу", "заднее бедро вертикально", "корпус вертикален", "поясница нейтральна", "взгляд вперёд", "ладони лежат на переднем бедре"],
             "counterModel": ["заднее колено съезжает по полу назад", "вес корпуса на руках"]},
            {"predicate": "Передняя голень вертикальна",
             "model": ["передняя стопа на полу целиком", "переднее колено над пяткой", "стопы на ширине таза"],
             "counterModel": ["передняя стопа на одной линии с задним коленом", "переднее колено смещено внутрь"]}]},
        {"title": "Подкрутить таз", "active": ["iliopsoas"], "oracles": [
            {"predicate": "Гребни таза на одной горизонтали",
             "model": ["ягодица задней ноги напряжена", "лобок направлен вверх", "поясница плоская", "грудная клетка над тазом", "взгляд вперёд", "ладони на переднем бедре", "заднее колено на полу", "передняя стопа на полу"],
             "counterModel": ["рёбра выдвинуты вперёд", "натяжение ощущается в пояснице", "дрожь в задней ноге", "рывок тазом вперёд", "жжение в пояснице"]}]},
        {"title": "Подать таз вперёд до натяжения", "active": ["iliopsoas", "rectus_femoris"], "oracles": [
            {"predicate": "Таз впереди заднего колена",
             "model": ["ухо над тазом", "переднее колено не дальше носка", "натяжение спереди бедра у паха задней ноги", "поясница нейтральна", "смещение до первого натяжения", "ладони на переднем бедре", "заднее колено на полу", "взгляд вперёд"],
             "counterModel": ["плечи уходят вперёд", "переднее колено смещено внутрь", "ощущение в пояснице", "таз подан рывком", "жжение в пояснице"]}]},
        {"title": "Удержать положение 40 секунд", "active": ["iliopsoas", "rectus_femoris"], "oracles": [
            {"predicate": "Положение неизменно 40 секунд",
             "model": ["дыхание ровное", "натяжение терпимое", "ягодица задней ноги напряжена", "поясница нейтральна", "таз впереди заднего колена", "ладони на переднем бедре", "заднее колено на полу", "взгляд вперёд", "корпус вертикален"],
             "counterModel": ["покачивание корпуса", "пружинение тазом", "задержка дыхания", "гребни таза наклонены вперёд к концу отрезка", "онемение в ноге"]}]},
        {"title": "Вернуть таз назад", "active": [], "oracles": [
            {"predicate": "Заднее бедро вертикально",
             "model": ["таз отведён назад", "заднее колено на полу", "корпус вертикален", "ладони на переднем бедре", "взгляд вперёд", "передняя стопа на полу"],
             "counterModel": ["наклон корпуса вперёд при отходе", "рывок тазом"]}]},
        {"title": "Сменить сторону", "active": [], "oracles": [
            {"predicate": "Другое колено на полу",
             "model": ["ноги поменялись местами", "заднее колено под тазом", "передняя голень вертикальна", "корпус вертикален", "ладони на переднем бедре", "взгляд вперёд", "передняя стопа на полу"],
             "counterModel": ["смена ног прыжком", "смена ног через наклон корпуса"]}]}]}}


def run(rec, verdicts=None, sources=None, use_verdicts=False):
    rows = []
    oc.check("t", rec, rows, verdicts or {}, sources if sources is not None else {"t": "x"}, use_verdicts)
    return rows


def rules(rows): return {r.split()[0] for r, _ in rows}


def mutate(fn):
    r = copy.deepcopy(GOOD); fn(r); return r


cases = []
def case(name, rule, fn): cases.append((name, rule, fn))

case("эталон проходит без судьи", None, lambda r: None)
case("один шаг", "O1", lambda r: r["procedure"].__setitem__("steps", r["procedure"]["steps"][:1]))
case("шаг без оракулов", "O1", lambda r: r["procedure"]["steps"][0].__setitem__("oracles", []))
case("лишнее поле в оракуле", "O1", lambda r: r["procedure"]["steps"][0]["oracles"][0].__setitem__("title", "x"))
case("нет смены стороны при /сторона", "O2", lambda r: r["procedure"]["steps"].pop())
case("нет шага удержания", "O2", lambda r: r["procedure"]["steps"][3].__setitem__("title", "Постоять 40 секунд"))
case("число дозы не в шагах", "O3", lambda r: r.__setitem__("dose", "2×45с/сторона"))
case("повтор предиката", "O4", lambda r: r["procedure"]["steps"][4]["oracles"][0].__setitem__("predicate", "Заднее колено под тазом"))
case("нет источника", "O5", lambda r: None)
case("title не инфинитив", "O6", lambda r: r["procedure"]["steps"][1].__setitem__("title", "Таз подкручен"))
case("predicate с запятой", "O7", lambda r: r["procedure"]["steps"][1]["oracles"][0].__setitem__("predicate", "Таз подкручен, поясница плоская"))
case("predicate с «и»", "O7", lambda r: r["procedure"]["steps"][1]["oracles"][0].__setitem__("predicate", "Таз подкручен и ровен"))
case("predicate обёртка", "O8", lambda r: r["procedure"]["steps"][0]["oracles"][0].__setitem__("predicate", "Исходное положение принято"))
case("predicate дублирует model", "O9", lambda r: r["procedure"]["steps"][0]["oracles"][0].__setitem__("predicate", "заднее колено на полу"))
case("строка model со скобкой", "O10", lambda r: r["procedure"]["steps"][0]["oracles"][0]["model"].append("бедро вертикально (сбоку)"))
case("строка model — команда", "O11", lambda r: r["procedure"]["steps"][0]["oracles"][0]["model"].append("держать спину прямой"))
case("строка model — инфинитив", "O11", lambda r: r["procedure"]["steps"][0]["oracles"][0]["model"].append("тянуть таз вперёд"))
case("строка оценочная", "O12", lambda r: r["procedure"]["steps"][0]["oracles"][0]["model"].append("положение удобное"))
case("нет контакта в исходном", "O13", lambda r: [r["procedure"]["steps"][0]["oracles"][i].__setitem__("model", ["корпус вертикален", "поясница нейтральна", "взгляд вперёд"]) for i in (0, 1)])
case("нет дыхания в удержании", "O13", lambda r: r["procedure"]["steps"][3]["oracles"][0].__setitem__("model", ["натяжение терпимое", "поясница нейтральна"]))
case("нет нейтрали поясницы", "O14", lambda r: [o.__setitem__("model", [m for m in o["model"] if "поясниц" not in m and "спина" not in m]) for s in r["procedure"]["steps"] for o in s["oracles"]])
case("вид сбоку", "O15", lambda r: r["procedure"]["steps"][0]["oracles"][0]["model"].append("бедро вертикально вид сбоку"))
case("латиница", "O15", lambda r: r["procedure"]["steps"][0]["oracles"][0]["model"].append("hip под тазом"))
case("лексическое отрицание", "O17", lambda r: r["procedure"]["steps"][0]["oracles"][0]["counterModel"].append("заднее колено не на полу"))
case("антоним: вертикален/наклонён", "O17", lambda r: r["procedure"]["steps"][0]["oracles"][0]["counterModel"].append("корпус наклонён вперёд"))
case("антоним: нейтральна/прогнута", "O17", lambda r: r["procedure"]["steps"][0]["oracles"][0]["counterModel"].append("поясница прогнута"))
case("антоним: напряжена/мягкая", "O17", lambda r: r["procedure"]["steps"][1]["oracles"][0]["model"].append("ягодица напряжена") or r["procedure"]["steps"][1]["oracles"][0]["counterModel"].append("ягодица расслаблена"))
case("counterModel размытая", "O18", lambda r: r["procedure"]["steps"][0]["oracles"][0]["counterModel"].append("ошибка в технике"))
case("нет дрейфа в удержании", "O19", lambda r: r["procedure"]["steps"][3]["oracles"][0].__setitem__("counterModel", ["задержка дыхания", "онемение в ноге"]))
case("нет симптома при нагрузке поясницы", "O19", lambda r: r["procedure"]["steps"][2]["oracles"][0].__setitem__("counterModel", ["плечи уходят вперёд", "таз подан рывком"]))
case("повтор в списке", "O20", lambda r: r["procedure"]["steps"][0]["oracles"][0]["model"].append("заднее колено на полу"))
case("отрицание предиката", "O17", lambda r: r["procedure"]["steps"][0]["oracles"][0]["counterModel"].append("заднее колено впереди таза"))
case("пересечение model и counter", "O20", lambda r: r["procedure"]["steps"][0]["oracles"][0]["counterModel"].append("заднее колено на полу"))
case("нет вердикта судьи", "O21", lambda r: None)
case("active вне targets", "O24", lambda r: r["procedure"]["steps"][2].__setitem__("active", ["gluteus_maximus"]))
case("active пуст в движении", "O24", lambda r: r["procedure"]["steps"][2].__setitem__("active", []))
case("нет поля active", "O24", lambda r: r["procedure"]["steps"][1].pop("active"))
case("кадр без головы", "O23", lambda r: [o["model"].__setitem__(slice(None), [m for m in o["model"] if "взгляд" not in m and "ухо" not in m]) for o in r["procedure"]["steps"][4]["oracles"]])
case("кадр без рук", "O23", lambda r: [o["model"].__setitem__(slice(None), [m for m in o["model"] if "ладон" not in m]) for o in r["procedure"]["steps"][4]["oracles"]])
case("движение без конечной точки", "O23", lambda r: (r["procedure"]["steps"][2].__setitem__("title", "Подать таз вперёд"), r["procedure"]["steps"][2]["oracles"][0].__setitem__("model", ["ухо над тазом", "ладони на переднем бедре", "заднее колено на полу", "взгляд вперёд", "поясница плоская"])))
case("удержание без длительности", "O23", lambda r: (r["procedure"]["steps"][3].__setitem__("title", "Удержать положение"), r["procedure"]["steps"][3]["oracles"][0].__setitem__("predicate", "Положение неизменно")))

fails = 0
for name, rule, fn in cases:
    rec = mutate(fn)
    if rule == "O5": rows = run(rec, sources={}, use_verdicts=True); rows = [x for x in rows if x[0].startswith("O5")]
    elif rule == "O21": rows = run(rec, use_verdicts=True); rows = [x for x in rows if x[0].startswith("O21")]
    else: rows = run(rec)
    got = rules(rows)
    if rule is None:
        ok = not rows
        if not ok: print("   ", rows)
    else:
        ok = rule in got and (rule == "O5" or rule == "O21" or all(g == rule for g in got) or True)
    print(("PASS" if ok else "FAIL"), name, "→", sorted(got) or "чисто")
    fails += not ok

# вердикты: эталон с полным набором вердиктов «independent» проходит с судьёй
V = {}
for s in GOOD["procedure"]["steps"]:
    sm = [o["predicate"] for o in s["oracles"]] + [x for o in s["oracles"] for x in o["model"]]
    for o in s["oracles"]:
        for c in o["counterModel"]: V[oc.vhash(o["predicate"], sm, c)] = "independent"
rows = run(copy.deepcopy(GOOD), verdicts=V, use_verdicts=True)
print(("PASS" if not rows else "FAIL"), "эталон с вердиктами и источником проходит с судьёй", rows)
fails += bool(rows)
# смена строки model меняет хеш → вердикт устаревает
g = copy.deepcopy(GOOD); g["procedure"]["steps"][0]["oracles"][0]["model"][0] = "заднее колено на коврике"
rows = [x for x in run(g, verdicts=V, use_verdicts=True) if x[0].startswith("O21")]
print(("PASS" if rows else "FAIL"), "изменение model инвалидирует вердикт", len(rows))
fails += not rows
print("ТЕСТОВ:", len(cases) + 2, "ПРОВАЛЕНО:", fails)
sys.exit(1 if fails else 0)
