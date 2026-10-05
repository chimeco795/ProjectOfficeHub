"""Hierarchy and dependency rules shared by planning and the master catalog."""
from fastapi import HTTPException

AGILE={'Epic':[], 'Feature':['Epic'], 'EnablerFeature':['Epic'], 'UserStory':['Feature','EnablerFeature'],
    'EnablerUserStory':['Feature','EnablerFeature'], 'Task':['UserStory','EnablerUserStory','Feature'],
    'Bug':['Feature','UserStory'], 'Issue':['Feature','UserStory']}
WATERFALL={'Phase':[], 'Deliverable':['Phase'], 'Activity':['Deliverable'], 'Document':['Deliverable','Activity'],
    'Evidence':['Activity','Document'], 'Task':['Activity'], 'Issue':['Phase','Deliverable','Activity','Document']}

def validate(db,project_id,value,identity):
    if value.kind!='Activity':
        if value.parent_id or value.dependencies or value.iteration_id or value.release_id:
            raise HTTPException(422,'La jerarquÃ­a y precedencias corresponden a actividades de planificaciÃ³n')
        return
    methodology=db.execute('SELECT methodology FROM projects WHERE id=?',(project_id,)).fetchone()[0]
    rules=AGILE if methodology=='Agile' else WATERFALL if methodology=='Waterfall' else {k:list(set(AGILE.get(k,[])+WATERFALL.get(k,[]))) for k in set(AGILE)|set(WATERFALL)}
    # Generic Activity stays available for legacy weekly activities in every methodology.
    if value.work_type not in rules and value.work_type!='Activity':raise HTTPException(422,'Tipo incompatible con la metodologÃ­a del proyecto')
    nodes={r['id']:dict(r) for r in db.execute("SELECT id,parent_id,work_type FROM master_items WHERE project_id=? AND kind='Activity'",(project_id,))}
    if value.parent_id:
        parent=nodes.get(value.parent_id)
        if not parent or value.parent_id==identity:raise HTTPException(422,'Padre invÃ¡lido o ajeno al proyecto')
        if parent['work_type'] not in rules.get(value.work_type,[]):raise HTTPException(422,'Tipo de padre incompatible con la jerarquÃ­a')
        cursor=value.parent_id;seen={identity}
        while cursor:
            if cursor in seen:raise HTTPException(422,'La jerarquÃ­a formarÃ­a un ciclo')
            seen.add(cursor);cursor=nodes[cursor]['parent_id'] if cursor in nodes else None
    for child in nodes.values():
        if identity and child['parent_id']==identity and value.work_type not in rules.get(child['work_type'],[]):
            raise HTTPException(422,'El nuevo tipo es incompatible con sus hijos')
    for name,kind in [('iteration_id','Iteration'),('release_id','Release')]:
        pid=getattr(value,name)
        if pid and not db.execute('SELECT 1 FROM planning_periods WHERE id=? AND project_id=? AND kind=? AND archived=0',(pid,project_id,kind)).fetchone():
            raise HTTPException(422,'IteraciÃ³n o release invÃ¡lido, archivado o ajeno al proyecto')
    if len(value.dependencies)!=len(set(value.dependencies)):raise HTTPException(422,'Predecesores duplicados')
    for predecessor in value.dependencies:
        if predecessor not in nodes or predecessor==identity:raise HTTPException(422,'Predecesor invÃ¡lido o ajeno al proyecto')
    edges={key:[] for key in nodes}
    for edge in db.execute('SELECT d.* FROM work_dependencies d JOIN master_items m ON m.id=d.item_id WHERE m.project_id=?',(project_id,)):
        edges[edge['item_id']].append(edge['predecessor_id'])
    edges[identity]=value.dependencies
    visited=set();active=set()
    for root in edges:
        stack=[(root,False)]
        while stack:
            node,leaving=stack.pop()
            if leaving:
                active.remove(node);visited.add(node)
                continue
            if node in active:raise HTTPException(422,'Las precedencias formarían un ciclo')
            if node in visited:continue
            active.add(node);stack.append((node,True))
            stack.extend((parent,False) for parent in edges.get(node,[]))
