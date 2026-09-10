#!/usr/bin/env python3
"""Критик банка калистеники (data/calisthenics.json): зона → контур → банк.
R1 SRP      одно движение на запись: нет « и », «+», «/» в имени; одна доза.
R2 UNIQUE   id и нормализованные имена уникальны.
R3 COVERAGE у каждого контура банк ≥1.
R4 NAMES    без латиницы.
R5 DOSE     N×Nс | N×N | N×a–b | … (/сторона, шагов).
R6 MODE     hold ⇔ доза в секундах; reps ⇔ доза в повторах/шагах.
R7 SPINE    флаги axial/lumbar_flex/lumbar_ext == False; в имени нет: подъём ног, подъём туловища, складк, сит-ап,
            лодочк, супермен, ролик, стойка на руках, стойка на голове, мостик, велосипед, ножниц, скручивания, наклон вперёд стоя.
            Контуры erectors_*: в имени/заметке «до нейтрали» / «нейтрал» / «не прогибается» / «до линии тела».
R8 GEAR     главное средство — тело, снаряд, инвентарь или среда (не тренажёр, не свободный вес).
R9 ZONES    список зон (id и порядок) совпадает с силовым банком.
"""
import json, os, re, sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
D=json.load(open(os.path.join(ROOT,"data","calisthenics.json"),encoding="utf-8"))
S=json.load(open(os.path.join(ROOT,"data","strength.json"),encoding="utf-8"))
DOSE=re.compile(r"^\d+×(\d+(–\d+)?)(с| м| шагов)?(/сторона)?$")
SPINE=["подъём ног","подъём туловища","складк","сит-ап","лодочк","супермен","ролик","стойка на руках","стойка на голове","мостик","велосипед","ножниц","скручивания","наклон вперёд стоя"]
GEAR={"вес тела","турник","брусья","скамья","стена","опора","ступенька","полотенце","римский стул"}
EQ={__import__("json").loads(l)["id"]:__import__("json").loads(l) for l in open(os.path.join(os.path.dirname(HERE),"data","equipment.jsonl"),encoding="utf-8")}
def main_eq(e):
    m=[x for x in (e.get("equipment") or []) if x.get("role")=="главное"]
    return EQ.get(m[0]["id"]) if m else None
rows=[]
def chk(c,ok,w): rows.append((c,ok,w))
ids={}; names={}; n=0; nh=0
for z in D["zones"]:
    for c in z["contours"]:
        b=c["bank"]
        if not b: chk("R3 COVERAGE", False, f"{z['title']} / {c['title']}: банк пуст")
        for e in b:
            n+=1; nm=e["name"]; low=nm.lower()
            chk("R1 SRP", not any(g in nm for g in [" и ","+","/"]) or nm.endswith("/сторона"), f"{nm!r}: склейка в имени")
            norm=re.sub(r"[^а-яё]","",low)
            chk("R2 UNIQUE", e["id"] not in ids, f"id {e['id']} дубль ({ids.get(e['id'])!r})")
            chk("R2 UNIQUE", norm not in names, f"{nm!r} = {names.get(norm)!r}")
            ids[e["id"]]=nm; names[norm]=nm
            chk("R4 NAMES", not re.search(r"[A-Za-z]",nm), f"{nm!r}: латиница")
            chk("R5 DOSE", bool(DOSE.match(e["dose"])), f"{nm!r}: доза {e['dose']!r}")
            sec=re.search(r"\d+с",e["dose"]) is not None
            chk("R6 MODE", e.get("mode") in ("hold","reps"), f"{nm!r}: mode={e.get('mode')}")
            chk("R6 MODE", (e.get("mode")=="hold")==sec, f"{nm!r}: mode={e.get('mode')} не сходится с дозой {e['dose']!r}")
            nh+= e.get("mode")=="hold"
            chk("R7 SPINE", not (e["axial"] or e["lumbar_flex"] or e["lumbar_ext"]), f"{nm!r}: флаг спины")
            chk("R7 SPINE", not any(s in low for s in SPINE), f"{nm!r}: запрещённый паттерн")
            if c["id"].startswith("erectors"):
                txt=(nm+" "+e.get("note","")).lower()
                chk("R7 SPINE", any(k in txt for k in ("до нейтрали","нейтрал","не прогибается","до линии тела")), f"{nm!r}: контур разгибателей требует амплитуду до нейтрали в имени/заметке")
            me=main_eq(e)
            chk("R8 GEAR", me is not None and me["kind"] in ("тело","снаряд","инвентарь","среда"), f"{nm!r}: главное средство={me and me['id']} kind={me and me['kind']}")
chk("R9 ZONES", [z["id"] for z in D["zones"]]==[z["id"] for z in S["zones"]], f"зоны {[z['id'] for z in D['zones']]} ≠ силовой {[z['id'] for z in S['zones']]}")
chk("R9 ZONES", [z["title"] for z in D["zones"]]==[z["title"] for z in S["zones"]], "названия зон ≠ силовой")
bad=[r for r in rows if not r[1]]
print(f"ЗОН: {len(D['zones'])}   ЗАПИСЕЙ: {n}   УДЕРЖАНИЙ: {nh}   ДИНАМИКИ: {n-nh}   ИСКЛЮЧЕНО ПО ПРАВИЛАМ: {len(D['excluded'])}")
for c,ok,w in bad: print(f"  FAIL  {c}  {w}")
print(f"ПРОВАЛЕНО: {len(bad)}")
sys.exit(1 if bad else 0)
