"""Calendar-day finish-to-start scheduling; simulation and application share a snapshot."""
import hashlib
import json
from collections import deque
from datetime import date, timedelta
from fastapi import HTTPException
from . import master

DONE={'closed','resolved','removed','cerrado','resuelto','retirado'}

def snapshot(db,project_id):
    master.require(db,'projects',project_id)
    return [master.item(db,project_id,r['id']) for r in db.execute("SELECT id FROM master_items WHERE project_id=? AND kind='Activity' ORDER BY id",(project_id,)).fetchall()]

def calculate(items,anchor):
    digest=hashlib.sha256(json.dumps(items,sort_keys=True,default=str).encode()).hexdigest()
    active={i['id']:i for i in items if not i['archived']}
    if len(active)>1000:raise HTTPException(422,'La simulación admite hasta 1000 trabajos activos')
    errors=[]
    for i in active.values():
        if not i['start_date'] or not i['target_date']:errors.append(f"{i['code']}: completa inicio y compromiso")
        for dep in i['dependencies']:
            if dep not in active:errors.append(f"{i['code']}: predecesor no disponible o archivado")
            elif i['status'].lower() in DONE and active[dep]['status'].lower() not in DONE:errors.append(f"{i['code']}: un trabajo terminado depende de trabajo pendiente; concilia los estados")
    if errors:return {'fingerprint':digest,'errors':errors,'rows':[],'finish':None,'changes':0}
    successors={key:[] for key in active};degree={key:len(i['dependencies']) for key,i in active.items()}
    for key,i in active.items():
        for dep in i['dependencies']:successors[dep].append(key)
    queue=deque(key for key,n in degree.items() if n==0);order=[]
    while queue:
        key=queue.popleft();order.append(key)
        for child in successors[key]:
            degree[child]-=1
            if degree[child]==0:queue.append(child)
    if len(order)!=len(active):raise HTTPException(422,'Las dependencias contienen un ciclo')
    starts={};ends={};durations={};fixed={}
    try:
        for key in order:
            i=active[key];original=date.fromisoformat(i['start_date']);finish=date.fromisoformat(i['target_date'])
            duration=(finish-original).days+1
            if duration<=0:raise HTTPException(422,'Hay un intervalo de fechas inválido')
            durations[key]=duration;fixed[key]=i['status'].lower() in DONE
            earliest=max([ends[d]+timedelta(days=1) for d in i['dependencies']],default=original)
            if fixed[key]:
                starts[key]=original;ends[key]=finish
                if earliest>original:errors.append(f"{i['code']}: un trabajo terminado tiene un conflicto de precedencia; revisa sus fechas")
            else:
                starts[key]=max(original,anchor,earliest)
                ends[key]=starts[key]+timedelta(days=duration-1)
        finish=max(ends.values(),default=None);latest={}
        for key in reversed(order):
            last=min([latest[s]-timedelta(days=1) for s in successors[key]],default=finish)
            latest[key]=last-timedelta(days=durations[key]-1)
        rows=[]
        for key in order:
            i=active[key];slack=(latest[key]-starts[key]).days
            rows.append({'id':key,'code':i['code'],'name':i['name'],'version':i['version'],'old_start':i['start_date'],'old_end':i['target_date'],
                'start':starts[key].isoformat(),'end':ends[key].isoformat(),'duration':durations[key],'slack':slack,'critical':slack==0 and not fixed[key],
                'fixed':fixed[key],'changed':starts[key].isoformat()!=i['start_date'] or ends[key].isoformat()!=i['target_date']})
    except (OverflowError,ValueError) as exc:raise HTTPException(422,'El calendario resultante excede las fechas admitidas') from exc
    return {'fingerprint':digest,'errors':errors,'rows':rows,'finish':finish.isoformat() if finish else None,'changes':sum(r['changed'] for r in rows)}
