export function SortHeader({label,column,sort,onSort}:{label:string;column:string;sort:{key:string;descending:boolean};onSort:(key:string)=>void}) {
  const active=sort.key===column;
  return <th scope="col" aria-sort={active?(sort.descending?'descending':'ascending'):'none'}><button type="button" className="sort-header" onClick={()=>onSort(column)} title={'Ordenar por '+label}>{label}<span aria-hidden="true">{active?(sort.descending?'↓':'↑'):'↕'}</span></button></th>;
}
