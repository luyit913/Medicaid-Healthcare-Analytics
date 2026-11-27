/** Pure calculations. Percentages are fractions internally; CSV percentages are divided by 100. */
export function numberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid numeric value: ${value}`);
  return n;
}
export function annualValue(rows, year, state) {
  const selected = rows.filter(r=>r.year===year && (!state || r.state_code===state));
  const valid = selected.filter(r=>r.valid_months===12 && r.avg_month_end_medicaid!==null);
  return valid.length ? valid.reduce((sum,r)=>sum+r.avg_month_end_medicaid,0) : null;
}
export function enrollmentYoY(rows, year, state) {
  const current=annualValue(rows,year,state), previous=annualValue(rows,year-1,state);
  return current===null || previous===null || previous===0 ? null : (current-previous)/previous;
}
export function monthlySeries(rows,year,state) {
  return Array.from({length:12},(_,i)=>{
    const month=`${year}-${String(i+1).padStart(2,'0')}-01`;
    const valid=rows.filter(r=>r.month===month && (!state||r.state_code===state) && r.medicaid!==null);
    return {month,value:valid.length?valid.reduce((s,r)=>s+r.medicaid,0):null};
  });
}
export function qualityRows(rows,year,measure) {
  return rows.filter(r=>r.report_year===year && r.measure_id===measure && r.rate!==null);
}
export function median(values) {
  const v=values.filter(x=>x!==null && Number.isFinite(x)).sort((a,b)=>a-b), n=v.length;
  return n ? (n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2) : null;
}
export function cohort(rows,measure) {
  const selected=rows.filter(r=>r.measure_id===measure);
  return {count:new Set(selected.map(r=>r.state_code)).size,series:[2023,2024,2025].map(year=>{
    const rate=median(selected.filter(r=>r.report_year===year).map(r=>r.rate));
    return {year,rate:rate===null?null:rate/100};
  })};
}
export function pairedRows(rows,year,measure) {
  return qualityRows(rows,year,measure).filter(r=>r.enrollment_yoy_pct!==null && r.valid_months===12);
}
export function rankings(rows,year,descending=true,n=5) {
  const values=rows.filter(r=>r.year===year).map(r=>({state:r.state_code,value:enrollmentYoY(rows,year,r.state_code)})).filter(r=>r.value!==null).sort((a,b)=>(descending?b.value-a.value:a.value-b.value)||a.state.localeCompare(b.state));
  if(values.length<=n)return values;
  const cutoff=values[n-1].value;
  return values.filter(r=>descending?r.value>=cutoff:r.value<=cutoff);
}
export const formatPercent=(value,digits=1)=>value===null?'Not available':new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
export const formatEnrollment=value=>value===null?'Not available':`${(value/1000000).toFixed(2)}M`;
