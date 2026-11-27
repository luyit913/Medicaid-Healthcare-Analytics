import {numberOrNull} from './metrics.js';
async function readCSV(filename, requiredFields) {
  const url = new URL(`../../../data/processed/${filename}`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${filename} (HTTP ${response.status}). Open the project root in Live Server and keep data/processed in place.`);
  const result = window.Papa.parse(await response.text(), {header:true,skipEmptyLines:'greedy',dynamicTyping:false});
  if (result.errors.length) throw new Error(`CSV parsing failed: ${filename}.`);
  if (requiredFields.some(field => !result.meta.fields.includes(field))) throw new Error(`Required columns are missing from ${filename}.`);
  return result.data;
}
export async function loadFilterOptions(data) {
  if (!window.Papa) throw new Error('The CSV library could not load. Check your internet connection and retry.');
  const {annual,quality} = data;
  const unique = values => [...new Set(values)].sort();
  const names = new Map(quality.map(row => [row.state_code,row.state_name]));
  return {
    enrollmentYears:unique(annual.map(row=>Number(row.year)).filter(year=>year>=2022 && year<=2024)),
    states:unique(annual.map(row=>row.state_code)).map(code=>({value:code,label:names.has(code)?`${code} · ${names.get(code)}`:code})),
    reportingYears:unique(quality.map(row=>Number(row.report_year))),
    measures:unique(quality.map(row=>row.measure_id))
  };
}

export async function loadData() {
  if (!window.Papa) throw new Error('The CSV library could not load. Check your connection and retry.');
  const definitions = {
    annual:['enrollment_annual_kpi.csv',['year','valid_months','avg_month_end_medicaid','yoy_pct'],['state_code','year']],
    monthly:['enrollment_monthly_kpi.csv',['medicaid','yoy_pct','mom_pct'],['state_code','month']],
    quality:['quality_map.csv',['report_year','reference_year','rate'],['state_code','report_year','measure_id']],
    primary:['quality_primary_trend.csv',['report_year','reference_year','rate'],['state_code','report_year','measure_id']],
    comparison:['comparison_exploratory.csv',['report_year','reference_year','rate','enrollment_yoy_pct','valid_months'],['state_code','report_year','measure_id']]
  };
  const entries=await Promise.all(Object.entries(definitions).map(async([name,[file,numerics,keys]])=>{
    const rows=await readCSV(file,[...new Set([...numerics,...keys])]);
    const seen=new Set();
    for(const row of rows){
      const key=keys.map(k=>row[k]).join('|');
      if(seen.has(key))throw new Error(`Duplicate key in ${file}: ${key}`);
      seen.add(key);
      for(const field of numerics)row[field]=numberOrNull(row[field]);
      if('rate' in row && row.rate!==null && (row.rate<0 || row.rate>100))throw new Error(`Rate outside 0-100 in ${file}.`);
    }
    return [name,rows];
  }));
  return Object.fromEntries(entries);
}
