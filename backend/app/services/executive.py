"""Read-only PMO evidence captured atomically when creating an executive cut."""
from datetime import date
from decimal import Decimal
from fastapi import HTTPException
from . import master, scheduler

def capture(db, project_id, report_date):
    day=date.fromisoformat(str(report_date))
    items=[master.item(db,project_id,r['id']) for r in db.execute('SELECT id FROM master_items WHERE project_id=? AND archived=0 ORDER BY code',(project_id,)).fetchall()]
    work=[i for i in items if i['kind']=='Activity']
    parents={i['parent_id'] for i in work if i['parent_id']}
    leaves=[i for i in work if i['id'] not in parents and i['work_type'] not in ('Epic','Feature') and i['status'].lower() not in ('removed','retirado')]
    coverage=sum(i['progress'] is not None for i in leaves)
    actual=round(sum(i['progress'] for i in leaves)/len(leaves),2) if leaves and coverage==len(leaves) else None
    brief=lambda i:{k:i[k] for k in ('id','version','code','name','kind','status','owner_name','target_date','progress')}
    open_items=[i for i in items if i['status'].lower() not in scheduler.DONE]
    horizon = date.fromordinal(min(date.max.toordinal(), day.toordinal() + 30))
    upcoming=[brief(i) for i in open_items if i['kind']=='Milestone' and i['target_date'] and str(day)<=i['target_date']<=str(horizon)]
    budget={}
    for r in db.execute('SELECT currency,kind,SUM(amount_cents) total FROM budget_entries WHERE project_id=? AND archived=0 GROUP BY currency,kind',(project_id,)):
        budget.setdefault(r['currency'],{})[r['kind']]=format(Decimal(r['total'])/100,'.2f')
    approved=db.execute('SELECT currency,approved_cents,contingency_cents,version FROM budgets WHERE project_id=?',(project_id,)).fetchone()
    memberships=[dict(r) for r in db.execute('SELECT m.id,m.version,m.person_id,p.name,m.role,m.allocation,m.valid_from,m.valid_to FROM memberships m JOIN people p ON p.id=m.person_id WHERE m.project_id=? AND m.archived=0 AND (m.valid_from IS NULL OR m.valid_from<=?) AND (m.valid_to IS NULL OR m.valid_to>=?)',(project_id,str(day),str(day)))]
    events=[dict(r) for r in db.execute("SELECT id,version,title,date,related_id FROM events WHERE project_id=? AND archived=0 AND propose_executive=1 AND status!='Cancelado' AND date<=? ORDER BY date,id",(project_id,str(day)))]
    allowed={i['id'] for i in items}
    events=[e for e in events if e['related_id'] in allowed]
    try: schedule=scheduler.calculate(work,day)
    except HTTPException as exc:schedule={'errors':[str(exc.detail)],'rows':[],'finish':None,'changes':0}
    return {'version':1,'as_of':str(day),'source':'PMO','classification':{'facts':'AUTO','progress':'PROPUESTO','narrative':'MANUAL','semaphores':'MANUAL','planned':'MANUAL'},
        'progress':{'proposed':actual,'covered':coverage,'total':len(leaves),'rule':'Media simple de trabajos hoja operativos con avance explícito; excluye Epic, Feature y retirados. Sin línea base de avance planeado.'},
        'overdue':[brief(i) for i in open_items if i['target_date'] and i['target_date']<str(day)],
        'blocked':[brief(i) for i in open_items if i['status'].lower() in ('blocked','bloqueado')],
        'risks':[brief(i) for i in open_items if i['kind']=='Risk'],'upcoming_milestones':upcoming,
        'dependencies':[{'id':i['id'],'code':i['code'],'predecessors':i['dependencies']} for i in work if i['dependencies']],
        'budget':{'totals':budget,'baseline':dict(approved) if approved else None},'memberships':memberships,
        'periods':[dict(r) for r in db.execute('SELECT * FROM planning_periods WHERE project_id=? AND archived=0 ORDER BY start_date,name',(project_id,))],
        'documents':[dict(r) for r in db.execute('SELECT id,version,filename,sha256,author_id,related_id,source_id FROM documents WHERE project_id=? AND archived=0 ORDER BY filename,id',(project_id,))],
        'meeting_proposals':events,'schedule':{'anchor':str(day),'errors':schedule['errors'],'finish':schedule['finish'],'changes':schedule['changes'],'critical':[] if schedule['errors'] else [r for r in schedule['rows'] if r['critical']], 'label':'Modelo simulado; no es una desviación respecto a línea base'},
        'sources':[{'id':i['id'],'version':i['version']} for i in items]}
