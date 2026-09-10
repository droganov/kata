#!/usr/bin/env python3
"""Промпт раскадровки — детерминированно из собранных данных (static/data), без LLM.
Шаблон (холст, фигура, мышцы, снаряд, правило решения) — EN; строки оракулов, заголовки шагов и имя — как в данных (RU).
Мышцы — latin из targets.jsonl, снаряд — canon_en из equipment.jsonl.
Кадр = шаг; красным только step.active; каждая строка оракула получает id F{i}.O{j}.{P|M{k}|C{k}};
строки без визуальной формы (симптом/дыхание/дрейф/звук/темп/ощущение) помечаются «~» и не участвуют в правиле.
Вывод: static/data/prompts.json {ключ: текст}; ключ = strength:<id> | calisthenics:<id> | stretch:<id> | plan:<id>.
Запуск: storyboard_prompt.py [--check]  (--check: сверить с уже записанным файлом, не переписывать)."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); SD = os.path.join(ROOT, "static", "data")
sys.path.insert(0, HERE)
from oracle_critic import step_type, BREATH, DRIFT  # те же классы строк, что у критика

W, H = 1206, 2622
NV = (("symptom", r"(\bбол(ь\b|ью\b|и\b|ев|езн)|болит|жжен|прострел|онемен|покалыван|судорог|хруст|щелч|немеет|тянет в|дрожь|головокруж|пульс|тошнот)"), ("breathing", BREATH), ("drift", DRIFT), ("sound", r"(звук|стук|скрип|грохот|люфт|болтает|тишин|бесшумн|без звука|шум|расстёгнут|ослаб)"),
      ("tempo", r"(темп|плавн|ритм|каденс|скорост|медленн|быстр|рывк|рывок|резк|инерци|толчк|непрерывн|длится|за две секунды|за три секунды)"),
      ("sensation", r"(ощущ|чувств|натяжен|терпим|распредел|своим весом|собственн(ый|ым) вес|усили|напряжен|расслаб|тяжест|восстанав|отдых|комфорт)"))
FRONT = r"(ширин|симметр|на одной высоте|на одном уровне|на уровне|лопат|хват|ладон|кист|локт|колен[аи] (внутрь|наружу|сход|расход)|ух[ао]|уши|уш[аи]|вбок|в сторон|об[ае] |обе|оба|лев|прав|к плеч|ключиц|гриф|рукоят)"
SIDE = r"(вертикал|поясниц|позвоноч|нейтрал|наклон|угол|градус|над пятк|голен|корпус|груд|макушк|голов|взгляд|подбород|затыл|таз|бедр|параллел|вперёд|назад|над стоп|над колен)"
POSTERIOR = ("latissimus", "trapezius", "rhomboid", "erector", "gluteus", "biceps femoris", "semitendinosus", "semimembranosus", "posterior", "teres", "gastrocnemius", "soleus", "multifidus", "levator", "splenius", "infraspinatus", "supraspinatus", "quadratus")
BILATERAL = ("erector spinae", "transversus abdominis", "rectus abdominis", "diaphragm", "multifidus")
STOP = ("draft", "redraw", "regenerate", "edit", "verify", "check", "output", "reference", "existing", "previous", "identical", "expected", "assess", "apply", "change", "again", "your own", "finish", "fail", "decide", "find in", "composition")


def cls(s):
    l = s.lower()
    for name, rx in NV:
        if re.search(rx, l): return name
    return None


def views(lines, posterior):
    t = " ".join(lines).lower()
    f, s = bool(re.search(FRONT, t)), bool(re.search(SIDE, t))
    coronal = "rear view" if posterior else "front view"
    if f and s: return f"left half of the tile {coronal}, right half side view from the figure's left"
    if s: return "side view from the figure's left"
    return coronal


def build(rec, EQ, TG):
    steps = rec["procedure"]["steps"]; n = len(steps); dose = rec.get("dose") or ""
    unilateral = "/сторона" in dose or "каждая нога" in dose
    tg = {x["id"]: x for x in rec["targets"]}
    prim = [TG[x["id"]] for x in rec["targets"] if x["role"] == "основная"]
    posterior = any(p in t["latin"].lower() for t in prim for p in POSTERIOR)
    main = [EQ[x["id"]] for x in rec["equipment"] if x["role"] == "главное"]; aux = [EQ[x["id"]] for x in rec["equipment"] if x["role"] != "главное"]
    cols = 2 if n % 2 == 0 else 1; rows = n // cols; tw, th = W // cols, H // rows
    L = []; DATA = set(); n_rule = 0; n_na = 0

    def mus(tid, side):
        name = TG[tid]["latin"]
        return name if not unilateral or name.lower() in BILATERAL else f"{side} {name}"

    L.append(f"STORYBOARD — {rec['name']} — dose {dose}"); DATA.add(0)
    L.append(f"{n} frames, one per step, numbered 1–{n}. Instructional anatomy illustration, neutral studio background.")
    L.append(f"CANVAS. One image {W}×{H} px, portrait. {n} tiles, {cols} column(s) × {rows} row(s), each {tw}×{th} px, edge to edge: zero gap, zero margin, zero border, nothing outside the tiles. Order left to right, top to bottom = frame 1 … {n}. The only text: the frame number in the top-left corner of each tile.")
    L.append("FIGURE. The same écorché mannequin in every frame: adult, gender-neutral, no clothing, no shoes, no hair, neutral face, translucent grey skin with muscles visible through it. One figure, one set of proportions, one scale in all frames.")
    L.append("MUSCLES. In each frame exactly the muscles listed under ACTIVE are solid saturated red; every other muscle neutral grey.")
    L.append("EQUIPMENT. MAIN: " + "; ".join(e["canon_en"] for e in main) + ("; AUXILIARY: " + "; ".join(e["canon_en"] for e in aux) if aux else "") + ". Catalog form; nothing else in the scene.")
    L.append("")
    side = "left"
    for i, s in enumerate(steps, 1):
        typ = step_type(s["title"])
        if typ == "switch": side = "right"
        L.append(f"FRAME {i} — {s['title']}"); DATA.add(len(L) - 1)
        act = [mus(a, side) for a in s.get("active", [])]
        L.append("  ACTIVE (solid red): " + ("; ".join(act) if act else "none") + ".")
        if unilateral: L.append(f"  WORKING SIDE: {side} (one-sided lines refer to the {side} side).")
        if typ in ("hold", "repeat"): L.append(f"  {typ.upper()} of frame {i - 1}: the ∀ lines of frame {i - 1} also hold here.")
        vis = []

        def put(lid, text, kind):
            nonlocal n_rule, n_na
            ind = "    " if kind == "P" else "      "
            if cls(text): n_na += 1; L.append(f"{ind}{lid} ~ {text}")
            else:
                n_rule += 1; L.append(f"{ind}{lid}  {text}")
                if kind != "C": vis.append(text)
            DATA.add(len(L) - 1)
        for j, o in enumerate(s["oracles"], 1):
            put(f"F{i}.O{j}.P", o["predicate"], "P")
            L.append("      ∀ true:")
            for k, m in enumerate(o["model"], 1): put(f"F{i}.O{j}.M{k}", m, "M")
            L.append("      ¬∃ none:")
            for k, c in enumerate(o["counterModel"], 1): put(f"F{i}.O{j}.C{k}", c, "C")
        L.append("  CAMERA: " + views(vis, posterior) + "; whole figure and equipment in the tile.")
        L.append("")
    L.append("DECISION RULE.")
    L.append("  1. A predicate or ∀ line is true of frame i when the drawing of frame i shows what it states. A ¬∃ line occurs in frame i when the drawing of frame i shows the sign it describes. Lines marked ~ (sensation, breathing, timing, sound, drift over time) have no visual form and take no part in the rule.")
    L.append("  2. Oracle F{i}.O{j} is satisfied by frame i when its predicate is true of frame i, every ∀ line is true of frame i, and no ¬∃ line occurs in frame i.")
    L.append("  3. Frame i is correct when every oracle of frame i is satisfied; the red muscles are exactly its ACTIVE list; the view matches its CAMERA line; for a HOLD or REPEAT frame the ∀ lines of the frame before it are also true of it.")
    L.append(f"  4. The picture is correct when CANVAS holds and every frame 1 … {n} is correct. Draw so that the picture is correct.")
    L.append(f"  Lines in the rule: {n_rule}; marked ~: {n_na}.")
    low = "\n".join(x for i, x in enumerate(L) if i not in DATA).lower()  # стоп-слова только в шаблоне; данные — дословно
    bad = [w for w in STOP if re.search(r"\b" + w + r"\b", low)]
    assert not bad, f"stop words in template: {bad}"
    return "\n".join(L)


def records():
    for ln in open(os.path.join(SD, "exercises.jsonl"), encoding="utf-8"):
        e = json.loads(ln); yield f"plan:{e['id']}", e
    for bank in ("strength", "calisthenics", "stretch"):
        B = json.load(open(os.path.join(SD, f"{bank}.json"), encoding="utf-8"))
        for z in B["zones"]:
            for c in z["contours"]:
                for e in c["bank"]: yield f"{bank}:{e['id']}", e


def main(argv):
    EQ = {json.loads(l)["id"]: json.loads(l) for l in open(os.path.join(SD, "equipment.jsonl"), encoding="utf-8")}
    TG = {json.loads(l)["id"]: json.loads(l) for l in open(os.path.join(SD, "targets.jsonl"), encoding="utf-8")}
    out = {k: build(r, EQ, TG) for k, r in records()}
    path = os.path.join(SD, "prompts.json")
    if "--check" in argv:
        old = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
        diff = [k for k in out if old.get(k) != out[k]] + [k for k in old if k not in out]
        print(f"ПРОМПТОВ: {len(out)}   РАСХОЖДЕНИЙ С ФАЙЛОМ: {len(diff)}"); return 1 if diff else 0
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"ПРОМПТОВ: {len(out)} → {os.path.relpath(path, ROOT)}"); return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
