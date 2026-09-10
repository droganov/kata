#!/usr/bin/env python3
"""Вшивает связи (data/links.json: {key: {equipment, targets, rename}}) в банки data/*.json и plan.json (имена).
Записи plan.json получают equipment/targets в build_data по ключу plan:<id>."""
import json, os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE); D=os.path.join(ROOT,"data")
L=json.load(open(os.path.join(D,"links.json"),encoding="utf-8"))
tot=miss=ren=0
for bank in ("strength","calisthenics","stretch"):
    p=os.path.join(D,f"{bank}.json"); B=json.load(open(p,encoding="utf-8"))
    for z in B["zones"]:
        for c in z["contours"]:
            for e in c["bank"]:
                tot+=1; k=f"{bank}:{e['id']}"
                if k not in L: miss+=1; print("НЕТ СВЯЗЕЙ:",k); continue
                e["equipment"]=L[k]["equipment"]; e["targets"]=L[k]["targets"]
                if L[k].get("rename"): e["name"]=L[k]["rename"]; ren+=1
    json.dump(B,open(p,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
pp=os.path.join(D,"plan.json"); PL=json.load(open(pp,encoding="utf-8")); pr=0
def fix(it):
    global pr
    k=f"plan:{it['id']}"
    if k in L and L[k].get("rename") and it["name"]!=L[k]["rename"]: it["name"]=L[k]["rename"]; pr+=1
for items in PL["base"].values():
    for it in items: fix(it)
for s in PL["pool"].values():
    for it in s["items"]: fix(it)
json.dump(PL,open(pp,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
# names_ru: переопределения имён по id не должны перебивать rename
nr=os.path.join(HERE,"names_ru.json")
if os.path.exists(nr):
    N=json.load(open(nr,encoding="utf-8")); ch=0
    for k,v in L.items():
        if k.startswith("plan:") and v.get("rename") and k[5:] in N: N[k[5:]]=v["rename"]; ch+=1
    json.dump(N,open(nr,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("names_ru обновлено:",ch)
print(f"банки: {tot}, без связей: {miss}, переименовано в банках: {ren}, в plan: {pr}")
sys.exit(1 if miss else 0)
