#!/usr/bin/env python3
"""Критик банка растяжки (data/stretch.json): зона → контур → банк.
R1 SRP      одно положение на запись: нет « и », «+», «/» в имени; одна доза.
R2 UNIQUE   id и нормализованные имена уникальны.
R3 COVERAGE у каждого контура банк ≥1.
R4 NAMES    без латиницы.
R5 DOSE     N×Nс | N×Nс/сторона — растяжка только статическая.
R6 MODE     mode == static.
R7 SPINE    флаги axial/lumbar_flex_loaded/lumbar_ext_loaded == False; в имени нет: наклон вперёд стоя, к ногам стоя, складк, плуг, кобра,
            верблюд, мостик, скручивания сидя. Поле spine ∈ {нейтраль, сгибание без нагрузки, разгибание без нагрузки, ротация без нагрузки, боковой наклон без нагрузки}.
R8 GEAR     главное средство — тело; снаряды и инвентарь только вспомогательные.
R9 ZONES    список зон (id, названия, порядок) совпадает с силовым банком.
R10 NOTE    у каждой записи есть заметка «как делать» (≥ 40 знаков).
"""
import json, os, re, sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
D=json.load(open(os.path.join(ROOT,"data","stretch.json"),encoding="utf-8"))
S=json.load(open(os.path.join(ROOT,"data","strength.json"),encoding="utf-8"))
DOSE=re.compile(r"^\d+×\d+с(/сторона)?$")
SPINE=["наклон вперёд стоя","к ногам стоя","складк","плуг","кобра","верблюд","мостик","скручивания сидя"]
SPINE_OK={"нейтраль","сгибание без нагрузки","разгибание без нагрузки","ротация без нагрузки","боковой наклон без нагрузки"}
GEAR={"вес тела","стена","скамья","опора","турник","валик","ремень","полотенце","ступенька"}
EQ={__import__("json").loads(l)["id"]:__import__("json").loads(l) for l in open(os.path.join(os.path.dirname(HERE),"data","equipment.jsonl"),encoding="utf-8")}
def main_eq(e):
    m=[x for x in (e.get("equipment") or []) if x.get("role")=="главное"]
    return EQ.get(m[0]["id"]) if m else None
rows=[]
def chk(c,ok,w): rows.append((c,ok,w))
ids={}; names={}; n=0
for z in D["zones"]:
    for c in z["contours"]:
        b=c["bank"]
        if not b: chk("R3 COVERAGE", False, f"{z['title']} / {c['title']}: банк пуст")
        for e in b:
            n+=1; nm=e["name"]; low=nm.lower()
            chk("R1 SRP", not any(g in nm for g in [" и ","+","/"]), f"{nm!r}: склейка в имени")
            norm=re.sub(r"[^а-яё]","",low)
            chk("R2 UNIQUE", e["id"] not in ids, f"id {e['id']} дубль ({ids.get(e['id'])!r})")
            chk("R2 UNIQUE", norm not in names, f"{nm!r} = {names.get(norm)!r}")
            ids[e["id"]]=nm; names[norm]=nm
            chk("R4 NAMES", not re.search(r"[A-Za-z]",nm), f"{nm!r}: латиница")
            chk("R5 DOSE", bool(DOSE.match(e["dose"])), f"{nm!r}: доза {e['dose']!r}")
            chk("R6 MODE", e.get("mode")=="static", f"{nm!r}: mode={e.get('mode')}")
            chk("R7 SPINE", not (e["axial"] or e["lumbar_flex_loaded"] or e["lumbar_ext_loaded"]), f"{nm!r}: флаг спины")
            chk("R7 SPINE", not any(s in low for s in SPINE), f"{nm!r}: запрещённый паттерн")
            chk("R7 SPINE", e.get("spine") in SPINE_OK, f"{nm!r}: spine={e.get('spine')!r}")
            me=main_eq(e)
            chk("R8 GEAR", me is not None and me["id"]=="body", f"{nm!r}: главное средство={me and me['id']}")
            chk("R10 NOTE", len(e.get("note",""))>=40, f"{nm!r}: нет заметки как делать")
chk("R9 ZONES", [z["id"] for z in D["zones"]]==[z["id"] for z in S["zones"]], f"зоны {[z['id'] for z in D['zones']]} ≠ силовой")
chk("R9 ZONES", [z["title"] for z in D["zones"]]==[z["title"] for z in S["zones"]], "названия зон ≠ силовой")
bad=[r for r in rows if not r[1]]
print(f"ЗОН: {len(D['zones'])}   ЗАПИСЕЙ: {n}   ИСКЛЮЧЕНО ПО ПРАВИЛАМ: {len(D['excluded'])}")
for c,ok,w in bad: print(f"  FAIL  {c}  {w}")
print(f"ПРОВАЛЕНО: {len(bad)}")
sys.exit(1 if bad else 0)
