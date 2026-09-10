"""
КРИТИК ПЛАНА.

Каждая проверка привязана к ЦЕЛИ и к ИСТОЧНИКУ. Порог без источника
в оценку не попадает. Уровни доказательности:
  A — руководство / мета-анализ
  B — РКИ / клинический протокол
  C — экспертная методика (не РКИ)
  U — ограничение от пользователя или его врача (не доказательство, но обязательное)
"""
import json, sys
from collections import defaultdict

import os as _os
_D=_os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))),"data")
PLAN = json.load(open(_os.path.join(_D,"plan.json")))

EVIDENCE = {
  "E1": ("A", "ACSM Position Stand 2026, обзор 137 систематических обзоров: все крупные группы ≥2 раз/нед; ~10 подходов на группу в неделю для гипертрофии; ≥2 подходов на упражнение; тип оборудования не важен"),
  "E2": ("A", "ВОЗ 2020: 150–300 мин умеренной аэробной нагрузки в неделю; силовая на все крупные группы ≥2 дней в неделю"),
  "E3": ("C", "McGill — выносливость туловища вместо силы; Big 3 закрывает переднюю/боковую/заднюю плоскости; избегать сгибания поясницы под нагрузкой; при непереносимости сгибания не тянуть поясницу"),
  "E4": ("B", "Kulig 2009 Phys Ther; Cochrane Ostelo 2008/2014; протокол OSU после дискэктомии; РКИ после спондилодеза (PMC6006840): изометрия туловища в нейтрали, удержания 15→30 с, укрепление туловища и нижних конечностей"),
  "E5": ("A", "Williams 2017 Sports Med: периодизированный тренинг > непериодизированного по 1ПМ; непериодизированный стагнирует после ~6 недель"),
  "E6": ("A", "Warneke 2024 J Sport Health Sci; Simic 2013: статическая растяжка >60 с перед изолированным тестом силы снижает её; запрет растяжки в динамической разминке не доказан; хроническая статическая растяжка даёт умеренно-большой прирост гибкости, у малоподвижных — и силы"),
  "E7": ("U", "Хирург, 2021: не поднимать свободный вес >10 кг, тренажёры вместо штанги"),
  "E8": ("U", "Пользователь: ягодичные — приоритет, в каждом занятии; занятие 60–70 мин; база не меняется, пул ротируется без повторов"),
  "E9": ("A", "Lempke 2018 J Sport Rehabil (обзор 5 РКИ): PNF не превосходит статику по амплитуде сгибания бедра, оба эффективны; Delphi-консенсус 2025 J Sport Health Sci: значимый прирост ROM у всех типов растяжки, большие эффекты у статической и PNF"),
}

GOALS = {
  "glutes": "Рост ягодичных",
  "lumbar_stiffness": "Жёсткость поясницы",
  "hip_mobility": "Подвижность тазобедренных",
  "body_composition": "Состав тела (масса / жир)",
  "constraints": "Ограничения и бюджет",
  "secondary": "Вторичные: сила, выносливость, гибкость",
  "structure": "Структура: оси, режимы, база/пул",
}

results = []
def rec(goal, ev, name, ok, detail):
    results.append((goal, ev, name, ok, detail))

T = PLAN["timing"]; B = PLAN["base"]; P = PLAN["pool"]; M = PLAN["meta"]

# ---------------- ротация: 2 недели × 3 занятия, round-robin по слотам ----------------
def build_rotation():
    n = M["sessions_per_week"] * M["rotation_weeks"]
    sessions = []
    idx = defaultdict(int)
    for s in range(n):
        picks = {}
        for slot, spec in P.items():
            k = spec["pick"]
            items = spec["items"]
            chosen = []
            if slot == "GH":
                planes = PLAN["hip_planes"]
                pl = planes[idx["GH_plane"] % len(planes)]; idx["GH_plane"] += 1
                cand = [x for x in items if x["hip_plane"] == pl]
                chosen.append(cand[idx["GH_"+pl] % len(cand)]); idx["GH_"+pl] += 1
            elif slot == "S":
                lat = [x for x in items if x.get("plane") == "lateral"]
                oth = [x for x in items if x.get("plane") != "lateral"]
                chosen.append(lat[idx["S_lat"] % len(lat)]); idx["S_lat"] += 1
                chosen.append(oth[idx["S_oth"] % len(oth)]); idx["S_oth"] += 1
            else:
                for _ in range(k):
                    chosen.append(items[idx[slot] % len(items)])
                    idx[slot] += 1
            picks[slot] = chosen
        sessions.append(picks)
    return sessions

ROT = build_rotation()

# ---------------- объём по группам за неделю (усреднённый по ротации) ----------------
def weekly_volume():
    vol = defaultdict(float)
    freq = defaultdict(set)          # группа -> занятия, где нагружена
    weeks = M["rotation_weeks"]
    for si, sess in enumerate(ROT):
        lifts = [(x, x["sets"]) for x in B["strength"]]
        for slot in ("K", "Z", "J", "T", "D"):
            for it in sess[slot]:
                lifts.append((it, P[slot]["sets"]))
        for it, sets in lifts:
            for mus, w in it["muscles"].items():
                vol[mus] += sets * (1.0 if w >= 0.5 else 0.5 * w * 2)  # прямой=1, косвенный=доля
                if w >= 0.3:
                    freq[mus].add(si)
    return {m: v / weeks for m, v in vol.items()}, {m: len(s) / weeks for m, s in freq.items()}

VOL, FREQ = weekly_volume()

# ---------------- время занятия ----------------
def session_minutes(sess):
    sec = sum(v["pick"] * v["sec_each"] for v in P.values() if v.get("axis") == "warmup_cardio") or T["warmup_general_min"] * 60
    sec += sum(x["sec"] for x in B["warmup"]) + sum(v["pick"] * v["sec_each"] for v in P.values() if v.get("axis") == "warmup")
    lifts = [x["sets"] for x in B["strength"]] + [P[s]["sets"] for s in ("K", "Z", "J", "T")] + [P["D"]["sets"]]
    n_ex = len(lifts)
    for i, sets in enumerate(lifts):
        rest = T["rest_sec_accessory"] if i == n_ex - 1 else T["rest_sec_strength"]
        sec += sets * (T["work_sec_per_set"] + rest)
    sec += n_ex * T["transition_sec"]
    sec += sum(x["sec"] for x in B["static"]) + sum(x["sec"] for x in sess["S"])
    sec += sum(x["sec"] for x in B["stretch"]) + P["GH"]["pick"] * P["GH"]["sec_each"] + P["G"]["pick"] * P["G"]["sec_each"]
    return sec / 60

MINUTES = [session_minutes(s) for s in ROT]

# ============================================================ ПРОВЕРКИ
# --- Ягодичные
base_glute_sets = sum(x["sets"] for x in B["strength"] if x["muscles"].get("glutes", 0) >= 0.5)
rec("glutes", "E8", "ягодичные в базе каждого занятия",
    base_glute_sets >= 3, f"{base_glute_sets} прямых подходов в базе")
tgt = PLAN["volume_targets"]["glutes"]
rec("glutes", "E1", "недельный объём ягодичных в коридоре",
    tgt["min"] <= VOL["glutes"] <= tgt["max"],
    f"{VOL['glutes']:.1f} подходов/нед (коридор {tgt['min']}–{tgt['max']}, ориентир ~10)")

# --- Поясница
missing = []
for i, sess in enumerate(ROT, 1):
    planes = {x["plane"] for x in B["static"]} | {x["plane"] for x in sess["S"]}
    if not {"anterior", "lateral", "posterior"} <= planes:
        missing.append(f"занятие {i}: {sorted(planes)}")
rec("lumbar_stiffness", "E3", "статика (база + пул) закрывает три плоскости в каждом занятии",
    not missing, "; ".join(missing) if missing else "все 6 занятий — передняя, боковая, задняя")
bad = []
for x in B["strength"]:
    if x["axial"] or x["lumbar_flex"] or x["lumbar_ext"]:
        bad.append(x["name"])
for slot in ("K", "Z", "J", "T", "D"):
    for it in P[slot]["items"]:
        if it["axial"] or it["lumbar_flex"] or it["lumbar_ext"]:
            bad.append(it["name"])
rec("lumbar_stiffness", "E3", "ни одного упражнения с осевой нагрузкой или сгибанием/переразгибанием поясницы",
    not bad, "нарушители: " + (", ".join(bad) if bad else "нет"))
rec("lumbar_stiffness", "E4", "статика — изометрия в нейтрали с прописанной прогрессией удержаний",
    "static" in PLAN["progression"] and "15с" in PLAN["progression"]["static"],
    PLAN["progression"]["static"])
flex_stretch = [g["name"] for g in P["G"]["items"] if "наклон" in g["name"].lower() and "стоя" in g["name"].lower()]
rec("lumbar_stiffness", "E3", "в растяжке нет сгибания поясницы (наклонов стоя)",
    not flex_stretch, ", ".join(flex_stretch) if flex_stretch else "нет")

# --- Тазобедренные
hip_slots = [k for k, v in P.items() if v.get("axis") == "warmup" and v.get("joint") == "hip" and v["pick"] >= 1 and all(x["mode"] == "dynamic" for x in v["items"])]
st_hip = [x for x in B["stretch"] if x["goal"] == "hip_mobility" and x["mode"] == "static_stretch"]
rec("hip_mobility", "E6", "динамическая мобилизация тазобедренных до силовой — в каждом занятии",
    len(hip_slots) >= 1, f"слот тазобедренного сустава в разминке: {hip_slots}, pick {[P[k]['pick'] for k in hip_slots]}")
rec("hip_mobility", "E6", "статическая растяжка тазобедренных после силовой — в каждом занятии",
    len(st_hip) >= 2, f"{len(st_hip)} позиции в базе; хроническая статика даёт прирост гибкости")
long_pre = [x["name"] for x in B["warmup"] if x.get("mode") == "static" and x.get("sec", 0) > 60]
rec("hip_mobility", "E6", "перед силовой нет статических удержаний >60 с",
    not long_pre, ", ".join(long_pre) if long_pre else "нет — до силовой только динамика")

covered = set(x["hip_plane"] for x in B["stretch"])
per_sess = []
for sess in ROT:
    covered |= {x["hip_plane"] for x in sess["GH"]}
    per_sess.append(len(B["stretch"]) + len(sess["GH"]))
miss = [pl for pl in PLAN["hip_planes"] if pl not in covered]
rec("hip_mobility", "E6", "растяжка бедра покрывает все шесть направлений сустава за ротацию",
    not miss, "не покрыто: " + (", ".join(miss) if miss else "нет — сгибание, разгибание, отведение, приведение, внутренняя и наружная ротация"))
rec("hip_mobility", "E6", "в каждом занятии ≥3 растяжки бедра",
    min(per_sess) >= 3, f"по занятиям: {per_sess}")
rec("hip_mobility", "E9", "метод базовых растяжек бедра — статика или PNF (оба валидны, PNF не обязателен)",
    all(x.get("method") for x in B["stretch"]), "статика и PNF дают сопоставимый прирост амплитуды; PNF оставлен как вариант, не как требование")
rec("secondary", "E6", "гибкость: статическая растяжка присутствует в каждом занятии",
    len(B["stretch"]) + P["GH"]["pick"] + P["G"]["pick"] >= 3, f"{len(B['stretch'])} база + {P['GH']['pick']+P['G']['pick']} пул")

# --- Состав тела / гипертрофия
majors = ["glutes", "quads", "hamstrings", "back", "chest", "delts"]
low_freq = [m for m in majors if FREQ.get(m, 0) < 2]
rec("body_composition", "E1", "все крупные группы нагружены ≥2 занятий в неделю",
    not low_freq, "; ".join(f"{m}: {FREQ.get(m,0):.1f}×/нед" for m in majors))
out = []
for m, t in PLAN["volume_targets"].items():
    if m.startswith("_"): continue
    v = VOL.get(m, 0)
    if not (t["min"] <= v <= t["max"]):
        out.append(f"{m} {v:.1f} (нужно {t['min']}–{t['max']})")
rec("body_composition", "E1", "недельный объём каждой группы в коридоре",
    not out, "; ".join(out) if out else "все группы в коридоре")
sets_ok = all(x["sets"] >= 2 for x in B["strength"]) and all(P[s]["sets"] >= 2 for s in ("K", "Z", "J", "T", "D"))
rec("body_composition", "E1", "≥2 рабочих подходов на упражнение", sets_ok, "база 3, пул 3, добор 2")
rec("body_composition", "E5", "прописан механизм прогрессии (периодизация / двойная прогрессия)",
    bool(PLAN["progression"].get("base")) and bool(PLAN["progression"].get("pool")),
    PLAN["progression"]["base"])

# --- Ограничения
over = []
for slot in P.values():
    for it in slot["items"]:
        if it.get("free_weight") and it.get("kg_max", 999) > M["contraindications"]["free_weight_kg_max"]:
            over.append(it["name"])
rec("constraints", "E7", "свободный вес ≤10 кг во всех позициях", not over, ", ".join(over) if over else "все в пределах")
rec("constraints", "E8", "занятие укладывается в бюджет 60–70 мин",
    all(60 <= m <= M["session_budget_min"] for m in MINUTES),
    "по занятиям: " + ", ".join(f"{m:.0f}" for m in MINUTES) + " мин")
need = M["sessions_per_week"] * M["rotation_weeks"]
shallow = []
for sname, spec in P.items():
    if spec.get("allow_repeat"):
        continue
    if sname == "GH":
        for pl in PLAN["hip_planes"]:
            n = len([x for x in spec["items"] if x["hip_plane"] == pl])
            if n < 1: shallow.append(f"GH: направление {pl} пустое")
        continue
    if sname == "S":
        oth = [x for x in spec["items"] if x.get("plane") != "lateral"]
        if len(oth) < need: shallow.append(f"S (без боковых): {len(oth)}<{need}")
    elif len(spec["items"]) < need * spec["pick"]:
        shallow.append(f"{sname}: {len(spec['items'])}<{need*spec['pick']}")
rec("constraints", "E8", "глубина каждого слота хватает на 2 недели без повторов",
    not shallow, "; ".join(shallow) if shallow else "все слоты ≥ нужной глубины")

# --- Вторичные
gym_aer = T["warmup_general_min"] * M["sessions_per_week"]
w = PLAN.get("outside_gym", {}).get("walking", {})
out_aer = w.get("min_per_session", 0) * w.get("sessions_per_week", 0)
rec("secondary", "E2", "аэробная нагрузка 150–300 мин/нед закрыта планом (зал + вне зала)",
    150 <= gym_aer + out_aer <= 300,
    f"зал {gym_aer} мин + ходьба {out_aer} мин = {gym_aer+out_aer} мин/нед; внутри зала выносливость НЕ закрывается")



# ============================================================ СТРУКТУРА
AX = PLAN["axes"]
WARM = [k for k, v in P.items() if v.get("axis") == "warmup"]
CARD = [k for k, v in P.items() if v.get("axis") == "warmup_cardio"]
AXMAP = {"warmup_cardio":("warmup_cardio",CARD), "warmup":("warmup",WARM), "strength":("strength",["K","Z","J","T","D"]),
         "static":("static",["S"]), "stretch":("stretch",["GH","G"])}
for ax, (bkey, slots) in AXMAP.items():
    want = AX[ax]["mode"]
    wrong = [x["name"] for x in B[bkey] if x.get("mode") != want]
    for sl in slots:
        wrong += [f"{x['name']} (слот {sl})" for x in P[sl]["items"] if x.get("mode") != want]
    rec("structure", "E8", f"ось «{ax}»: все позиции в режиме {want}",
        not wrong, "чужие: " + (", ".join(wrong) if wrong else "нет"))
    nb = len(B[bkey]); npool = sum(P[sl]["pick"] for sl in slots)
    rec("structure", "E8", f"ось «{ax}»: {AX[ax]['base']} базы + {AX[ax]['pool']} пула",
        nb == AX[ax]["base"] and npool == AX[ax]["pool"], f"фактически {nb} + {npool}")

# ============================================================ ОТЧЁТ
def report():
    out = []
    out.append("КРИТИК ПЛАНА — отчёт\n" + "=" * 78)
    out.append("\nИСТОЧНИКИ")
    for k, (tier, txt) in EVIDENCE.items():
        out.append(f"  {k} [{tier}]  {txt}")
    out.append("\nПРОВЕРКИ ПО ЦЕЛЯМ\n" + "-" * 78)
    fails = 0
    for g, title in GOALS.items():
        out.append(f"\n{title}")
        for goal, ev, name, ok, det in results:
            if goal != g:
                continue
            tier = EVIDENCE[ev][0]
            tag = "PASS" if ok else "FAIL"
            if not ok:
                fails += 1
            out.append(f"  {tag}  [{ev}/{tier}]  {name}")
            out.append(f"         {det}")
    out.append("\nОБЪЁМ ПО ГРУППАМ, подходов в неделю (средний по ротации)\n" + "-" * 78)
    for m, t in PLAN["volume_targets"].items():
        if m.startswith("_"): continue
        v = VOL.get(m, 0); f = FREQ.get(m, 0)
        flag = "" if t["min"] <= v <= t["max"] else "  <-- вне коридора"
        out.append(f"  {m:<11} {v:5.1f}   частота {f:.1f}×/нед   коридор {t['min']}–{t['max']}{flag}")
    out.append("\nВРЕМЯ ЗАНЯТИЯ\n" + "-" * 78)
    for i, m in enumerate(MINUTES, 1):
        out.append(f"  занятие {i}: {m:.0f} мин")
    out.append("\n" + "=" * 78 + f"\nПРОВАЛЕНО: {fails}")
    return "\n".join(out), fails

if __name__ == "__main__":
    txt, fails = report()
    print(txt)
    open(_os.path.join(_D,"plan_critic_report.txt"),"w").write(txt)
    sys.exit(1 if fails else 0)
