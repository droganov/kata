#!/usr/bin/env python3
"""Критик связей упражнение ↔ средства/цели.
L1 EQUIP    equipment ≥1; ровно одно главное; все id существуют; mat не используется.
L2 ROLE_E   роли ∈ {главное, вспомогательное}; главное — не среда и не инвентарь-мелочь? (главное может быть body).
L3 TARGET   targets ≥1; ≥1 основная; роли ∈ {основная, вспомогательная, стабилизатор}; id существуют; без повторов.
L4 KIND     kind целей согласован с осью записи.
L5 NAME     имя упражнения не упоминает устройство, которого нет в equipment (гантел/скамь/турник/брусь/блок/тренаж/полотенц/ремн/валик/стен/проём/ступень/резин/слайдер/эспандер/блин/утяжелит).
L6 SAME     одинаковые имена → одинаковые связи.
L7 RENAME   rename — null или кириллица без скобок/латиницы, ≠ старому имени.
L8 SYM      (для банков) устройство.exercises ↔ упражнение.equipment симметричны.
Использование: links_critic.py parts/x.out.json  — часть; без аргументов — data/*.json банки + static/data/exercises.jsonl + data/equipment.jsonl.
"""
import json, os, re, sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE); D=os.path.join(ROOT,"data")
EQ={json.loads(l)["id"]:json.loads(l) for l in open(os.path.join(D,"equipment.jsonl"),encoding="utf-8")}
TG={json.loads(l)["id"]:json.loads(l) for l in open(os.path.join(D,"targets.jsonl"),encoding="utf-8")}
_tp=os.path.join(D,"links_todo.json")
TODO={r["key"]:r for r in json.load(open(_tp,encoding="utf-8"))} if os.path.exists(_tp) else {}
NAME_GEAR=[("гантел","dumbbells"),("скамь",None),("турник","pullup_bar"),("брусь",None),("блок",None),("тренаж",None),("полотенц","towel"),("ремн","strap"),("ремен","strap"),("валик","foam_roller"),("стен","wall"),("проём","doorframe"),("ступень",None),("резин",None),("слайдер","sliders"),("эспандер","grip_trainer"),("блин","plate"),("утяжелит","ankle_weights"),("смит","smith"),("гравитрон","assisted_dip_chin"),("кроссовер",None)]
AXIS_KIND={"warmup_cardio":{"система"},"warmup":{"сустав"},"strength":{"мышца"},"static":{"мышца"},"stretch":{"мышца"}}
def check(key,rec,rows):
    def fail(r,m): rows.append((r,f"{key}: {m}"))
    t=TODO.get(key); name=rec.get("name") or (t["name"] if t else key); axis=rec.get("axis") or (t["axis"] if t else "")
    eq=rec.get("equipment") or []; tg=rec.get("targets") or []
    if not eq: fail("L1 EQUIP","нет средств"); 
    mains=[e for e in eq if e.get("role")=="главное"]
    if len(mains)!=1: fail("L1 EQUIP",f"главных: {len(mains)}")
    for e in eq:
        if e.get("id") not in EQ: fail("L1 EQUIP",f"неизвестное устройство {e.get('id')!r}")
        if e.get("id")=="mat": fail("L1 EQUIP","mat не используется")
        if e.get("role") not in ("главное","вспомогательное"): fail("L2 ROLE_E",f"роль {e.get('role')!r}")
    if len({e.get("id") for e in eq})!=len(eq): fail("L1 EQUIP","повтор устройства")
    if not tg: fail("L3 TARGET","нет целей")
    if not any(x.get("role")=="основная" for x in tg): fail("L3 TARGET","нет основной цели")
    for x in tg:
        if x.get("id") not in TG: fail("L3 TARGET",f"неизвестная цель {x.get('id')!r}"); continue
        if x.get("role") not in ("основная","вспомогательная","стабилизатор"): fail("L3 TARGET",f"роль {x.get('role')!r}")
        if TG[x["id"]]["kind"] not in AXIS_KIND.get(axis,{"мышца"}): fail("L4 KIND",f"{x['id']} kind={TG[x['id']]['kind']} при оси {axis}")
    if len({x.get("id") for x in tg})!=len(tg): fail("L3 TARGET","повтор цели")
    low=(rec.get("rename") or name).lower(); ids={e.get("id") for e in eq}; kinds={EQ[i]["kind"] for i in ids if i in EQ}
    for w,dev in NAME_GEAR:
        if re.search(r"(?<![а-яё])"+w, low):
            ok = (dev in ids) if dev else any((w=="скамь" and i.startswith(("bench","preacher","roman","nordic"))) or (w=="брусь" and i in("dip_bars","assisted_dip_chin")) or (w in("блок","тренаж","кроссовер","резин","ступень") and (EQ[i]["kind"]=="тренажёр" or i in("band","mini_band","stairs_step","step_platform","box"))) for i in ids)
            if not ok: fail("L5 NAME",f"имя упоминает «{w}», в средствах нет: {sorted(ids)}")
    rn=rec.get("rename")
    if rn is not None and (not isinstance(rn,str) or re.search(r"[A-Za-z()]",rn) or rn==name or len(rn)<5): fail("L7 RENAME",f"rename {rn!r}")
def main(argv):
    rows=[]; n=0
    if argv:
        for f in argv:
            P=json.load(open(f,encoding="utf-8")); byname={}
            for k,rec in P.items():
                n+=1; check(k,rec,rows)
                nm=TODO[k]["name"] if k in TODO else k
                sig=json.dumps({"e":sorted((e["id"],e["role"]) for e in rec.get("equipment",[])),"t":sorted((x["id"],x["role"]) for x in rec.get("targets",[]))},ensure_ascii=False)
                if nm in byname and byname[nm]!=sig: rows.append(("L6 SAME",f"{k}: связи отличаются от одноимённой записи"))
                byname.setdefault(nm,sig)
    else:
        seen={}
        for bank in ("strength","calisthenics","stretch"):
            B=json.load(open(os.path.join(D,f"{bank}.json"),encoding="utf-8"))
            for z in B["zones"]:
                for c in z["contours"]:
                    for e in c["bank"]:
                        n+=1; k=f"{bank}:{e['id']}"; e=dict(e); e["axis"]={"strength":"strength","calisthenics":"static","stretch":"stretch"}[bank]
                        check(k,e,rows); seen[k]={x["id"] for x in e.get("equipment",[])}
        for l in open(os.path.join(ROOT,"static","data","exercises.jsonl"),encoding="utf-8"):
            e=json.loads(l); n+=1; k=f"plan:{e['id']}"; check(k,e,rows); seen[k]={x["id"] for x in e.get("equipment",[])}
        for dev in EQ.values():
            for k in dev.get("exercises",[]):
                if k in seen and dev["id"] not in seen[k]: rows.append(("L8 SYM",f"{dev['id']} → {k}, обратной связи нет"))
        for k,ids in seen.items():
            for i in ids:
                if k not in EQ[i].get("exercises",[]): rows.append(("L8 SYM",f"{k} → {i}, устройство не знает упражнения"))
    print(f"ЗАПИСЕЙ: {n}")
    for r,m in rows: print(f"  FAIL  {r}  {m}")
    print(f"ПРОВАЛЕНО: {len(rows)}"); return 1 if rows else 0
if __name__=="__main__": sys.exit(main(sys.argv[1:]))
