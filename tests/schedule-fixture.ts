import type {Row,Term} from '../packages/core/types'
import type {ScheduleSection} from '../packages/core/schedule-api'
export function scheduleFixture(terms:Term[],rows:Row[]) {
  const checkedAt=new Date().toISOString();
  const catalog=[...new Map(rows.map(r=>[r.subjCode+' '+r.courseNumbDisplay,{key:r.subjCode+' '+r.courseNumbDisplay,subject:String(r.subjCode),number:String(r.courseNumbDisplay),title:String(r.courseTitle)}])).values()];
  const text=(r:Row,k:string)=>r[k]===null||r[k]===undefined?null:String(r[k]);
  const count=(r:Row,k:string)=>text(r,k) && /^[+-]?\d+$/.test(text(r,k)!)?Number(r[k]):null;
  const sections:ScheduleSection[]=[...new Set(rows.map(r=>String(r.crn)))].map(crn=>{
    const list=rows.filter(r=>String(r.crn)===crn),r=list[0];
    return {crn,courseKey:r.subjCode+' '+r.courseNumbDisplay,units:text(r,'creditHrLow'),information:{},
      instructors:[...new Set(list.map(r=>text(r,'pfaName')))].map((name,i)=>({name,role:'primary',assignmentId:crn+'-'+i})),
      meetings:list.map(r=>({startDate:text(r,'ptrmStartDate'),endDate:text(r,'ptrmEndDate'),beginTime:text(r,'beginTime'),endTime:text(r,'endTime'),days:['mon','tue','wed','thu','fri','sat','sun'].filter(d=>!!r[d+'Day']),formatCode:text(r,'schdCode'),formatDescription:text(r,'schdDesc'),campus:text(r,'campDesc'),building:text(r,'bldgDesc'),room:text(r,'roomCode'),sourceFields:{}})),
      availability:{statusCode:text(r,'fwSectOpenInd'),enrolled:count(r,'enrl'),capacity:count(r,'maxEnrl'),seatsAvailable:count(r,'seatsAvail'),waitlistCount:count(r,'waitCount'),waitlistCapacity:count(r,'waitCapacity'),waitlistAvailable:count(r,'waitAvail')}};
  });
  return (request:Request):Response=>{
    const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean),term=parts[2];
    const meta={term,catalogVersion:'fixture-catalog',availabilityVersion:'fixture-seats',sourceCheckedAt:checkedAt,stale:false};
    let data:unknown;
    if(url.pathname==='/v1/terms') data=terms.map(t=>({termCode:t.termCode,name:t.termName}));
    else if(parts[3]==='manifest')data=meta;
    else if(parts[3]==='catalog')data=catalog;
    else if(parts[3]==='courses'&&parts[5]==='sections')data=sections.filter(s=>s.courseKey===decodeURIComponent(parts[4]));
    else if(parts[3]==='availability')data=sections.filter(s=>url.searchParams.get('crns')?.split(',').includes(s.crn)).map(s=>({crn:s.crn,availability:s.availability}));
    else throw new Error('Unexpected fixture schedule request');
    return Response.json({data,meta});
  };
}
