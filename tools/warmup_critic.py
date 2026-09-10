#!/usr/bin/env python3
"""Критик разминки — гоняется ДО показа. Схема: зона → сустав {pick, bank}.
R1 SRP        одна запись = одно движение: в имени нет склейки (« и », «+», «/»), одна доза.
R2 UNIQUE     нет одного движения под двумя именами; id уникальны.
R3 COVERAGE   у каждого сустава каждой зоны банк ≥ pick и pick ≥ 1 — ни один сустав не пропущен.
R4 NAMES      только русские имена, без латиницы.
R5 DOSE       формат дозы: N | N/сторона | по N в каждую сторону[, каждая нога] | N с | N шагов
R6 DYNAMIC    sec задан и ≤ 60 — удержаний нет.
R7 SPINE      нет наклонов корпуса вперёд, скручиваний, гиперэкстензий, становой.
R8 TIME       время занятия = Σ по суставам pick × средний sec банка ≤ бюджет.
R9 NO_GEAR    ничего кроме тела: нет палок, резинок, стен, проёмов, опор, гантелей, скамей, валиков.
"""
import json, os, re, sys
HERE=os.path.dirname(os.path.abspath(__file__))
W=json.load(open(os.path.join(os.path.dirname(HERE),"data","warmup.json"),encoding="utf-8"))
DOSE=re.compile(r"^(\d+|\d+/сторона|по \d+ в каждую сторону(, каждая нога)?|\d+ с|\d+ шагов)$")
SPINE=["наклон корпуса","наклоны корпуса","наклон туловища","скручиван","гиперэкстенз","становая","кошка"]
GEAR=["палк","резинк","стен","проём","опор","гантел","скамь","валик","ремн","тренаж","блок"]
rows=[]
def chk(c,ok,w): rows.append((c,ok,w))
ids={}; names={}; total=0; n_sess=0; n_bank=0
for z in W["zones"]:
    for j in z["joints"]:
        b=j["bank"]; p=j["pick"]
        chk("R3 COVERAGE", p>=1 and len(b)>=p, f"{z['title']} / {j['title']}: pick {p}, банк {len(b)}")
        n_sess+=p; n_bank+=len(b)
        total+=p*sum(e["sec"] for e in b)/len(b)
        for e in b:
            nm=e["name"]; low=nm.lower()
            chk("R1 SRP", not any(g in nm for g in [" и ","+","/"]), f"{nm!r}: склейка в имени")
            chk("R1 SRP", "+" not in e["dose"], f"{nm!r}: составная доза")
            norm=re.sub(r"[^а-яё]","",low)
            chk("R2 UNIQUE", e["id"] not in ids, f"id {e['id']} дубль")
            chk("R2 UNIQUE", norm not in names, f"{nm!r} = {names.get(norm)!r}")
            ids[e["id"]]=nm; names[norm]=nm
            chk("R4 NAMES", not re.search(r"[A-Za-z]",nm), f"{nm!r}: латиница")
            chk("R5 DOSE", bool(DOSE.match(e["dose"])), f"{nm!r}: доза {e['dose']!r}")
            chk("R6 DYNAMIC", 0<e.get("sec",0)<=60, f"{nm!r}: sec={e.get('sec')}")
            chk("R7 SPINE", not any(s in low for s in SPINE), f"{nm!r}: запрещённый паттерн")
            chk("R9 NO_GEAR", not any(g in low for g in GEAR), f"{nm!r}: снаряд/опора")
chk("R8 TIME", total<=W["session_budget_sec"], f"{total:.0f} с при бюджете {W['session_budget_sec']} с")
bad=[r for r in rows if not r[1]]
print(f"БАНК: {n_bank}   В ЗАНЯТИИ: {n_sess}   ВРЕМЯ: {total:.0f} с / {W['session_budget_sec']}")
for c,ok,w in bad: print(f"  FAIL  {c}  {w}")
print(f"ПРОВАЛЕНО: {len(bad)}")
sys.exit(1 if bad else 0)
