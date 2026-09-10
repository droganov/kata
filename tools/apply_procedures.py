#!/usr/bin/env python3
"""Вшивает процедуры (data/procedures.json: {"<bank>:<id>" | "plan:<id>": {"steps": […]}}) в банки data/*.json
и исправленные дозы (data/dose_by_key.json) в банки и plan.json. Записи plan.json получают процедуру в build_data по ключу plan:<id>."""
import json, os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE); D=os.path.join(ROOT,"data")
P=json.load(open(os.path.join(D,"procedures.json"),encoding="utf-8"))
DOSE=json.load(open(os.path.join(D,"dose_by_key.json"),encoding="utf-8"))
tot=miss=fixed=0
for bank in ("strength","calisthenics","stretch"):
    p=os.path.join(D,f"{bank}.json"); B=json.load(open(p,encoding="utf-8"))
    for z in B["zones"]:
        for c in z["contours"]:
            for e in c["bank"]:
                tot+=1; k=f"{bank}:{e['id']}"
                if k in P: e["procedure"]=P[k]
                else: miss+=1; print("НЕТ ПРОЦЕДУРЫ:",k)
                if k in DOSE and e["dose"]!=DOSE[k]: e["dose"]=DOSE[k]; fixed+=1
    json.dump(B,open(p,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
pp=os.path.join(D,"plan.json"); PL=json.load(open(pp,encoding="utf-8")); pf=0
def fix(it):
    global pf
    k=f"plan:{it['id']}"
    if k in DOSE and it.get("dose") and it["dose"]!=DOSE[k]: it["dose"]=DOSE[k]; pf+=1
for items in PL["base"].values():
    for it in items: fix(it)
for s in PL["pool"].values():
    for it in s["items"]: fix(it)
json.dump(PL,open(pp,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
print(f"банки: {tot} записей, без процедуры: {miss}, доз исправлено: банки {fixed}, plan {pf}")
sys.exit(1 if miss else 0)
