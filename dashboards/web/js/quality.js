import {qualityRows,cohort} from './metrics.js';
import {plot,map,bars,empty,axis,colors} from './charts.js';
export async function renderQuality(data,state){
 const rows=qualityRows(data.quality,state.reportingYear,state.measure).map(r=>({state:r.state_code,name:r.state_name,value:r.rate/100}));
 const trend=cohort(data.primary,state.measure);
 const line=trend.count?plot('quality-trend',[{type:'scatter',mode:'lines+markers+text',x:trend.series.map(r=>r.year),y:trend.series.map(r=>r.rate),text:trend.series.map(r=>r.rate===null?'':(r.rate*100).toFixed(1)+'%'),textposition:'top center',line:{color:colors.blue,width:3},marker:{size:8},connectgaps:false,hovertemplate:'Reporting year %{x}<br>Median: %{y:.1%}<extra></extra>'}],{height:310,xaxis:{...axis,dtick:1,tickformat:'d'},yaxis:{...axis,tickformat:'.0%'},margin:{l:48,r:32,t:32,b:40}}):empty('quality-trend','No states meet primary comparability criteria across 2023–2025 for this measure. A comparable trend cannot be shown.');
 await Promise.all([line,map('quality-map',rows),bars('quality-ranking',rows.sort((a,b)=>b.value-a.value||a.state.localeCompare(b.state)),{quality:true,height:Math.max(500,rows.length*25+60)})]);
}
