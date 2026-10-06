from datetime import date
from decimal import Decimal
from fastapi import HTTPException

def capacity(people,memberships,start,end):
    if start>end or (end-start).days>365:raise HTTPException(422,'Selecciona un intervalo de 1 a 366 días')
    first,last=start.toordinal(),end.toordinal();result=[]
    for person in people:
        assignments=[];boundaries={first,last+1}
        for row in memberships:
            if row['person_id']!=person['id'] or row['archived']:continue
            lo=max(first,date.fromisoformat(row['valid_from']).toordinal() if row['valid_from'] else first)
            hi=min(last,date.fromisoformat(row['valid_to']).toordinal() if row['valid_to'] else last)
            if lo>hi:continue
            assignments.append((lo,hi,row));boundaries.update((lo,hi+1))
        points=sorted(boundaries);segments=[];peak=Decimal(0);overloaded=0;weighted=Decimal(0)
        for lo,stop in zip(points,points[1:]):
            current=[r for a,b,r in assignments if a<=lo<=b]
            total=sum((Decimal(str(r['allocation'])) for r in current),Decimal(0));days=stop-lo
            peak=max(peak,total);weighted+=total*days
            if total>100:overloaded+=days
            segments.append({'start':date.fromordinal(lo).isoformat(),'end':date.fromordinal(stop-1).isoformat(),'allocation':float(total),
                'assignments':[{'id':r['id'],'project_id':r['project_id'],'project_name':r['project_name'],'role':r['role'],'allocation':r['allocation']} for r in current]})
        result.append({'id':person['id'],'name':person['name'],'peak':float(peak),'average':round(float(weighted/(last-first+1)),2),'overloaded_days':overloaded,'segments':segments})
    return result
