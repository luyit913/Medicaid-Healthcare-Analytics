import {pairedRows,formatPercent} from './metrics.js';
import {plot,empty,axis,colors} from './charts.js';
export function comparisonRows(data,state){return pairedRows(data.comparison,state.reportingYear,state.measure).slice().sort((a,b)=>a.state_name.localeCompare(b.state_name));}
export function renderTable(rows,selected){
 const select=document.getElementById('comparison-state');
 select.replaceChildren();const all=document.createElement('option');all.value='';all.textContent='All paired states';select.append(all);
 rows.forEach(r=>{const o=document.createElement('option');o.value=r.state_code;o.textContent=r.state_name;select.append(o);});select.value=selected||'';
 document.getElementById('clear-selection').disabled=!selected;
 const visible=selected?rows.filter(r=>r.state_code===selected):rows;
 document.getElementById('selection-note').textContent=selected?`Showing ${visible[0]?.state_name||selected}. Paired-state count includes all eligible states.`:`Showing all ${rows.length} paired states.`;
 const table=document.createElement('table');const cap=document.createElement('caption');cap.className='sr-only';cap.textContent='Enrollment and quality data for paired states';table.append(cap);
 const head=document.createElement('thead'),hr=document.createElement('tr');
 ['State','Quality reporting year','Enrollment year','Enrollment YoY change','Reported quality rate'].forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;hr.append(th);});head.append(hr);table.append(head);
 const body=document.createElement('tbody');visible.forEach(r=>{const tr=document.createElement('tr');[r.state_name,r.report_year,r.reference_year,formatPercent(r.enrollment_yoy_pct/100),formatPercent(r.rate/100)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});body.append(tr);});table.append(body);
 const host=document.getElementById('comparison-table');host.replaceChildren(table);if(!visible.length){const p=document.createElement('p');p.textContent='No paired data for this selection.';host.append(p);}
}
export async function renderComparison(data,state,onSelect){
 const rows=comparisonRows(data,state);renderTable(rows,state.selectedComparisonState);
 if(!rows.length){empty('comparison-scatter','No paired data for this selection.');return;}
 const el=await plot('comparison-scatter',[{type:'scatter',mode:'markers',x:rows.map(r=>r.enrollment_yoy_pct/100),y:rows.map(r=>r.rate/100),customdata:rows.map(r=>[r.state_code,r.state_name,r.report_year,r.reference_year]),marker:{size:rows.map(r=>r.state_code===state.selectedComparisonState?13:10),color:rows.map(r=>!state.selectedComparisonState||r.state_code===state.selectedComparisonState?colors.blue:'#bacddd'),line:{color:'#fff',width:1}},hovertemplate:'%{customdata[1]} (%{customdata[0]})<br>Enrollment change: %{x:.1%}<br>Quality rate: %{y:.1%}<br>Quality reporting year: %{customdata[2]}<br>Enrollment year: %{customdata[3]}<extra></extra>'}],{height:400,hovermode:'closest',clickmode:'event',xaxis:{...axis,tickformat:'.0%',title:{text:'Enrollment YoY change'}},yaxis:{...axis,tickformat:'.0%',range:[0,1.03],title:{text:'Reported quality rate'}},margin:{l:65,r:22,t:18,b:62}});
 if(el.dataset.ready==='true'){el.removeAllListeners('plotly_click');el.on('plotly_click',e=>{const code=e.points?.[0]?.customdata?.[0];if(code)onSelect(code===state.selectedComparisonState?null:code);});}
}
