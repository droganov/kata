#!/usr/bin/env python3
"""Критик силового банка (data/strength.json): зона → контур → банк.
R1 SRP        одно движение на запись: нет « и », «+», «/» в имени; одна доза.
R2 UNIQUE     id и нормализованные имена уникальны.
R3 COVERAGE   у каждого контура банк ≥1 (зона с allow_empty — WARN с причиной, не FAIL).
R4 NAMES      без латиницы.
R5 DOSE       N×a–b | N×a–b/сторона | N×N | N×N/сторона | N×N м/сторона | N×N шагов/сторона
R6 MODE       mode == loaded.
R7 SPINE      флаги axial/lumbar_flex/lumbar_ext == False; в имени нет: становая, румынск, наклоне, гиперэкстенз,
              скручиван, гуд-морнинг, гакк, присед со штангой, стоя над головой, дровосек, ролик, лёжа на животе (сгибание голени).
R8 WEIGHT     free_weight → kg_max ≤ 10; есть средство вида «свободный вес» ⇔ free_weight == True.
"""
import json, os, re, sys
HERE=os.path.dirname(os.path.abspath(__file__))
D=json.load(open(os.path.join(os.path.dirname(HERE),"data","strength.json"),encoding="utf-8"))
DOSE=re.compile(r"^\d+×(\d+(–\d+)?)( м| шагов)?(/сторона)?$")
SPINE=["становая","в наклоне","скручиван","гуд-морнинг","гакк","присед со штангой","стоя над головой","дровосек","ролик","переразгиб"]
EQ={__import__("json").loads(l)["id"]:__import__("json").loads(l) for l in open(os.path.join(os.path.dirname(HERE),"data","equipment.jsonl"),encoding="utf-8")}
def main_eq(e):
    m=[x for x in (e.get("equipment") or []) if x.get("role")=="главное"]
    return EQ.get(m[0]["id"]) if m else None
rows=[]; warn=[]
def chk(c,ok,w): rows.append((c,ok,w))
ids={}; names={}; n=0
for z in D["zones"]:
    for c in z["contours"]:
        b=c["bank"]
        if not b:
            (warn if z.get("allow_empty") else rows).append(("R3 COVERAGE", False, f"{z['title']} / {c['title']}: банк пуст" + (f" — {z['reason']}" if z.get("allow_empty") else "")))
        for e in b:
            n+=1; nm=e["name"]; low=nm.lower()
            chk("R1 SRP", not any(g in nm for g in [" и ","+","/"]), f"{nm!r}: склейка в имени")
            norm=re.sub(r"[^а-яё]","",low)
            chk("R2 UNIQUE", e["id"] not in ids, f"id {e['id']} дубль ({ids.get(e['id'])!r})")
            chk("R2 UNIQUE", norm not in names, f"{nm!r} = {names.get(norm)!r}")
            ids[e["id"]]=nm; names[norm]=nm
            chk("R4 NAMES", not re.search(r"[A-Za-z]",nm), f"{nm!r}: латиница")
            chk("R5 DOSE", bool(DOSE.match(e["dose"])), f"{nm!r}: доза {e['dose']!r}")
            chk("R6 MODE", e.get("mode")=="loaded", f"{nm!r}: mode={e.get('mode')}")
            chk("R7 SPINE", not (e["axial"] or e["lumbar_flex"] or e["lumbar_ext"]), f"{nm!r}: флаг спины")
            chk("R7 SPINE", not any(s in low for s in SPINE), f"{nm!r}: запрещённый паттерн")
            if c["id"].startswith("erectors"):
                txt=(nm+" "+e.get("note","")).lower()
                chk("R7 SPINE", ("до нейтрали" in txt) or ("нейтральн" in txt) or ("не прогибается" in txt), f"{nm!r}: контур разгибателей требует амплитуду до нейтрали в имени/заметке")
                chk("R8 WEIGHT", (not e["free_weight"]) or e.get("kg_max",99)<=10, f"{nm!r}: контур разгибателей — внешний вес ≤10 кг")
            fw=e["free_weight"]; me=main_eq(e); eq=me["id"] if me else ""
            chk("R8 WEIGHT", (not fw) or e.get("kg_max",99)<=10, f"{nm!r}: свободный вес > 10 кг")
            has_fw=any(EQ.get(x["id"],{}).get("kind")=="свободный вес" for x in e.get("equipment",[]))
            chk("R8 WEIGHT", fw == has_fw, f"{nm!r}: средства {[x['id'] for x in e.get('equipment',[])]}, free_weight={fw}")
bad=[r for r in rows if not r[1]]
print(f"ЗОН: {len(D['zones'])}   ЗАПИСЕЙ: {n}   ИСКЛЮЧЕНО ПО ПРАВИЛАМ: {len(D['excluded'])}")
for c,ok,w in bad: print(f"  FAIL  {c}  {w}")
for c,ok,w in warn: print(f"  WARN  {c}  {w}")
print(f"ПРОВАЛЕНО: {len(bad)}")
sys.exit(1 if bad else 0)
