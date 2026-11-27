import {monthlySeries,enrollmentYoY,rankings} from './metrics.js';
import {plot,map,bars,axis,colors,empty} from './charts.js';
export async function renderEnrollment(data,state){
 const monthly=monthlySeries(data.monthly,state.enrollmentYear,state.state);
 const flags=data.monthly.filter(r=>r.state_code===state.state && Number(r.month.slice(0,4))===state.enrollmentYear);
 const line=monthly.some(r=>r.value!==null)?plot('monthly-chart',[{type:'scatter',mode:'lines+markers',x:monthly.map(r=>r.month),y:monthly.map(r=>r.value),customdata:monthly.map(r=>{const row=flags.find(x=>x.month===r.month);return row?`Version: ${row.version}; final report: ${row.final_report}`:'No record';}),line:{color:colors.blue,width:3},marker:{size:5},connectgaps:false,hovertemplate:'%{x|%B %Y}<br>Enrollment: %{y:,.0f}<br>%{customdata}<extra></extra>'}],{height:310,xaxis:{...axis,type:'date',dtick:'M1',tickformat:'%b'},yaxis:{...axis,tickformat:'.3s',title:{text:'Medicaid enrollment'}}}):empty('monthly-chart','No monthly data for this selection.');
 const values=data.annual.filter(r=>r.year===state.enrollmentYear).map(r=>({state:r.state_code,value:enrollmentYoY(data.annual,state.enrollmentYear,r.state_code)})).filter(r=>r.value!==null);
 await Promise.all([line,map('enrollment-map',values,{diverging:true}),bars('top-chart',rankings(data.annual,state.enrollmentYear,true)),bars('bottom-chart',rankings(data.annual,state.enrollmentYear,false))]);
}
