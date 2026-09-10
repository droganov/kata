#!/usr/bin/env python3
"""Собирает app/static/data/{days,exercises}.jsonl из program-handover/plan.json
и проверяет их по JSON Schema. program-handover — только чтение.

Ротация и минуты занятия — дословная копия build_rotation()/session_minutes()
из program-handover/plan_critic.py (импортировать нельзя: скрипт пишет отчёт в handover).
Сверка с plan_critic_report.txt — в конце.
"""
import ast, json, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))          # app/tools
APP = os.path.dirname(HERE)                                  # app
HANDOVER = os.path.join(os.path.dirname(APP), "program-handover")   # ../program-handover, только чтение
DATA = os.path.join(APP, "static", "data")
SCHEMA = os.path.join(APP, "schema")

SRC = os.path.join(APP, "data")
PLAN = json.load(open(os.path.join(SRC, "plan.json")))
T = PLAN["timing"]; B = PLAN["base"]; P = PLAN["pool"]; M = PLAN["meta"]

AXIS_TITLE = {"warmup_cardio": "Разогрев", "warmup": "Разминка", "strength": "Силовой",
              "static": "Калистеника", "stretch": "Растяжка"}
AXIS_SLOTS = {"warmup_cardio": [k for k, v in P.items() if v.get("axis") == "warmup_cardio"], "warmup": [k for k, v in P.items() if v.get("axis") == "warmup"], "strength": ["K", "Z", "J", "T", "D"], "static": ["S"], "stretch": ["GH", "G"]}
SLOT_AXIS = {s: a for a, ss in AXIS_SLOTS.items() for s in ss}

# Разогрев: в plan.json позиции нет, текст — из axes.md
CARDIO = {"id": "cardio_general", "name": "Эллипс / велотренажёр / дорожка в горку — по очереди",
          "axis": "warmup_cardio", "origin": "base", "mode": "cardio",
          "dose": f'{T["warmup_general_min"]} мин', "sec": T["warmup_general_min"] * 60}

# build2.py: методика для старых картинок → id позиции в plan.json
BUILD2_MAP = {
    "img2/d1_legpress.png": "leg_press", "img2/d1_hipthrust.png": "glute_bridge_m",
    "img2/d1_dbbench.png": "db_bench", "img2/d1_row.png": "row_chest_sup",
    "img2/d1_press.png": "db_seated_press", "img2/d1_pulldown.png": "lat_pd_wide",
    "img2/d2_legext.png": "leg_ext", "img2/d2_legcurl.png": "leg_curl_seated",
    "img2/d2_chestpress.png": "chest_press_m", "img2/d2_machinerow.png": "row_machine",
    "img2/d2_ohp.png": "ohp_m", "img2/d2_pulldown_under.png": "lat_pd_under",
}


# ---------------------------------------------------------------- копия из plan_critic.py
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
                chosen.append(cand[idx["GH_" + pl] % len(cand)]); idx["GH_" + pl] += 1
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
# ----------------------------------------------------------------


def build2_methods():
    """Тексты методики из build2.py: ex(n, title, sets, img, cap, method) → {id: {text, caption}}."""
    src = open(os.path.join(HANDOVER, "build2.py"), encoding="utf-8").read()
    out = {}
    for node in ast.walk(ast.parse(src)):
        if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "ex":
            a = [x.value for x in node.args if isinstance(x, ast.Constant)]
            img, cap, method = a[3], a[4], a[5]
            out[BUILD2_MAP[img]] = {"text": method, "caption": cap, "source": f"program-handover/build2.py ({img})"}
    return out


def dose_of(it, slot=None):
    if "dose" in it:
        return it["dose"]
    if "sets" in it:
        return f'{it["sets"]}×{it["reps"]}'
    if slot and "sets" in slot:
        return f'{slot["sets"]}×{slot["reps"]}'
    if slot and slot.get("mode") == "static_stretch":
        return "40с × 2"          # слот G: доза не в plan.json, взята из axes.md
    raise KeyError(it["id"])


def exercises():
    """Все позиции plan.json без потери полей + разогрев."""
    out = []
    for axis, items in B.items():
        for it in items:
            rec = {"id": it["id"], "name": it["name"], "axis": axis, "origin": "base"}
            rec.update({k: v for k, v in it.items() if k not in ("id", "name")})
            rec["dose"] = dose_of(it)
            out.append(rec)
    for slot, spec in P.items():
        for it in spec["items"]:
            rec = {"id": it["id"], "name": it["name"], "axis": SLOT_AXIS[slot], "origin": "pool", "slot": slot}
            if spec.get("zone"): rec["zone"] = spec["zone"]
            if spec.get("joint"): rec["joint"] = spec["joint"]
            rec.update({k: v for k, v in it.items() if k not in ("id", "name")})
            rec.setdefault("mode", spec.get("mode"))
            rec["dose"] = dose_of(it, spec)
            out.append(rec)
    ids = [x["id"] for x in out]
    assert len(ids) == len(set(ids)), "дубли id"
    PROC = json.load(open(os.path.join(SRC, "procedures.json"), encoding="utf-8"))
    DOSE = json.load(open(os.path.join(SRC, "dose_by_key.json"), encoding="utf-8"))
    missing = [x["id"] for x in out if f"plan:{x['id']}" not in PROC]
    assert not missing, f"нет процедуры: {missing}"
    LINKS = json.load(open(os.path.join(SRC, "links.json"), encoding="utf-8"))
    nolink = [x["id"] for x in out if f"plan:{x['id']}" not in LINKS]
    assert not nolink, f"нет связей: {nolink}"
    for x in out:
        x["procedure"] = PROC[f"plan:{x['id']}"]
        x["dose"] = DOSE.get(f"plan:{x['id']}", x["dose"])
        x["equipment"] = LINKS[f"plan:{x['id']}"]["equipment"]
        x["targets"] = LINKS[f"plan:{x['id']}"]["targets"]
    return out


def item_of(ex, instr):
    txt = ""
    parts = []
    if ex.get("note"):
        parts.append(ex["note"])
    if ex.get("method"):
        parts.append(ex["method"])
    if ex["id"] in instr:
        parts.append(instr[ex["id"]]["text"])
    txt = "\n\n".join(parts)
    return {"id": ex["id"], "name": ex["name"], "dose": ex["dose"], "images": [], "instructions": txt}


def days(EX, instr):
    by_id = {x["id"]: x for x in EX}
    rot = build_rotation()
    mins = [session_minutes(s) for s in rot]
    out = []
    for i, sess in enumerate(rot, 1):
        w = (i - 1) // M["sessions_per_week"] + 1
        d = (i - 1) % M["sessions_per_week"] + 1
        axes = []
        for axis in ("warmup_cardio", "warmup", "strength", "static", "stretch"):
            slots = []
            if True:
                base_items = [item_of(by_id[x["id"]], instr) for x in B[axis]]
                if base_items:
                    slots.append({"id": "BASE", "kind": "base", "label": "БАЗА", "items": base_items})
                for slot in AXIS_SLOTS[axis]:
                    picks = [item_of(by_id[x["id"]], instr) for x in sess[slot]]
                    sl = {"id": slot, "kind": "pool", "label": P[slot]["label"], "items": picks}
                    if P[slot].get("zone"): sl["zone"] = P[slot]["zone"]
                    if P[slot].get("joint"): sl["joint"] = P[slot]["joint"]
                    if P[slot].get("unit"): sl["unit"] = P[slot]["unit"]
                    slots.append(sl)
            axes.append({"id": axis, "title": AXIS_TITLE[axis], "slots": slots})
        out.append({"id": f"w{w}d{d}", "index": i, "title": f"День {i}", "minutes": int(round(mins[i - 1])), "axes": axes})
    return out, mins


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def validate(path, schema_path):
    import jsonschema
    schema = json.load(open(schema_path))
    sd = os.path.dirname(schema_path)
    store = {n: json.load(open(os.path.join(sd, n))) for n in ("oracle.schema.json", "step.schema.json", "procedure.schema.json", "links.schema.json")}
    resolver = jsonschema.RefResolver.from_schema(schema, store=store)
    V = jsonschema.Draft7Validator(schema, resolver=resolver)
    n = bad = 0
    for ln, line in enumerate(open(path, encoding="utf-8"), 1):
        n += 1
        errs = sorted(V.iter_errors(json.loads(line)), key=lambda e: e.path)
        for e in errs:
            bad += 1
            print(f"  {os.path.basename(path)}:{ln} {'/'.join(map(str, e.path))}: {e.message}")
    return n, bad


def main():
    instr = json.load(open(os.path.join(HERE, "instructions.json"), encoding="utf-8"))
    instr.pop("_comment", None)
    names_ru = json.load(open(os.path.join(HERE, "names_ru.json"), encoding="utf-8"))
    names_ru.pop("_comment", None)
    for k, v in build2_methods().items():
        assert k not in instr, k
        instr[k] = v
    EX = exercises()
    for e in EX:
        if e['id'] in names_ru:
            e['name'] = names_ru[e['id']]
    for e in EX:
        e['instructions'] = item_of(e, instr)['instructions']
    DAYS, mins = days(EX, instr)
    os.makedirs(DATA, exist_ok=True)
    write_jsonl(os.path.join(DATA, "exercises.jsonl"), EX)
    write_jsonl(os.path.join(DATA, "days.jsonl"), DAYS)
    # банк силового (инвентарь, правило выбора ещё не задано) — отдаём как есть
    import shutil
    for f in ("strength.json", "calisthenics.json", "stretch.json", "equipment.jsonl", "targets.jsonl"):
        shutil.copy(os.path.join(SRC, f), os.path.join(DATA, f))

    print("ВАЛИДАЦИЯ")
    total_bad = 0
    for f, s in (("exercises.jsonl", "exercise.schema.json"), ("days.jsonl", "day.schema.json"), ("equipment.jsonl", "equipment.schema.json"), ("targets.jsonl", "target.schema.json")):
        n, bad = validate(os.path.join(DATA, f), os.path.join(SCHEMA, s))
        total_bad += bad
        print(f"  {f}: {n} записей, ошибок {bad}")

    print("СВЕРКА С plan_critic_report.txt")
    rep = open(os.path.join(SRC, "plan_critic_report.txt"), encoding="utf-8").read()
    rep_min = [int(x) for x in re.findall(r"занятие \d: (\d+) мин", rep)]
    mine = [int(round(m)) for m in mins]
    print(f"  минуты: отчёт {rep_min} / сборка {mine} — {'совпадают' if rep_min == mine else 'РАСХОЖДЕНИЕ'}")
    total_bad += (rep_min != mine)

    print("ПОКРЫТИЕ")
    n_pos = len(EX)
    used = {it["id"] for d in DAYS for a in d["axes"] for s in a["slots"] for it in s["items"]}
    pool_ids = [x["id"] for x in EX if x["origin"] == "pool"]
    per_day = [sum(len(s["items"]) for a in d["axes"] for s in a["slots"]) for d in DAYS]
    picks = [it["id"] for d in DAYS for a in d["axes"] for s in a["slots"] if s["kind"] == "pool" for it in s["items"]]
    dup = [x for x in set(picks) if picks.count(x) > 1]
    with_instr = sum(1 for x in EX if item_of(x, instr)["instructions"])
    print(f"  позиций в exercises.jsonl: {n_pos} (база {sum(1 for x in EX if x['origin']=='base')}, пул {len(pool_ids)})")
    print(f"  позиций в дне: {per_day}")
    print(f"  из пула попало в ротацию: {len(used & set(pool_ids))} из {len(pool_ids)}; повторы за 2 недели: {dup or 'нет'}")
    print(f"  с методикой: {with_instr} из {n_pos}; без методики: {n_pos - with_instr}")
    print(f"  с картинками: 0 из {n_pos}")
    print("ПРОВАЛЕНО:", total_bad)
    return 1 if total_bad else 0


def links_gate():
    import subprocess
    r = subprocess.run([sys.executable, os.path.join(HERE, "links_critic.py")], capture_output=True, text=True)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr)
    if r.returncode != 0:
        print(r.stdout); raise SystemExit("СВЯЗИ: ПРОВАЛ — сборка отклонена")


def oracle_gate():
    """Ворота: ни одна запись без валидной процедуры и без вердикта судьи не проходит сборку."""
    import subprocess
    r = subprocess.run([sys.executable, os.path.join(HERE, "oracle_critic.py")], capture_output=True, text=True)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr)
    if r.returncode != 0:
        print(r.stdout); raise SystemExit("ОРАКУЛЫ: ПРОВАЛ — сборка отклонена")


if __name__ == "__main__":
    rc = main()
    if rc: sys.exit(rc)
    oracle_gate()
    links_gate()
