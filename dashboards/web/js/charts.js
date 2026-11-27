/** Shared Plotly styling and accessible chart-level failures. */
export const colors={blue:'#168cff',navy:'#16324f',orange:'#d97706',grid:'#e5ebf1'};
export const axis={automargin:true,gridcolor:colors.grid,zerolinecolor:'#9aaabd',tickfont:{size:12}};
export async function plot(id,traces,layout={}) {
 const el=document.getElementById(id);
 try {
  if(!window.Plotly)throw new Error('Chart library unavailable. Check your internet connection and refresh.');
  if(el.dataset.ready==='empty'||el.dataset.ready==='error')el.replaceChildren();
  await Plotly.react(el,traces,{autosize:true,paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Segoe UI, Arial, sans-serif',color:colors.navy,size:13},margin:{l:58,r:25,t:18,b:52},showlegend:false,...layout},{responsive:true,displaylogo:false,displayModeBar:false});
  el.dataset.ready='true';
 } catch(error){el.replaceChildren();el.textContent='Unable to display chart. Check your connection and refresh.';el.dataset.ready='error';console.error(id,error);}
 return el;
}
export function empty(id,message){const el=document.getElementById(id);if(window.Plotly && el.data)Plotly.purge(el);el.replaceChildren();const p=document.createElement('p');p.className='empty-message';p.textContent=message;el.append(p);el.dataset.ready='empty';}
export function map(id,rows,{diverging=false}={}) {
 const limit=Math.max(...rows.map(r=>Math.abs(r.value)),0.01);
 return plot(id,[{type:'choropleth',locationmode:'USA-states',locations:rows.map(r=>r.state),z:rows.map(r=>r.value),text:rows.map(r=>r.name||r.state),zmin:diverging?-limit:0,zmax:diverging?limit:1,colorscale:diverging?[[0,colors.orange],[0.5,'#f7f7f7'],[1,'#1565c0']]:[[0,'#d9ecff'],[1,'#0879df']],marker:{line:{color:'#94a3b8',width:0.5}},colorbar:{tickformat:'.0%',thickness:10,len:0.7},hovertemplate:'%{text}<br>%{z:.1%}<extra></extra>'}],{margin:{l:0,r:0,t:0,b:0},geo:{scope:'usa',projection:{type:'albers usa'},showland:true,landcolor:'#d5d9de',showsubunits:true,subunitcolor:'#ffffff',bgcolor:'rgba(0,0,0,0)'},height:310});
}
export function bars(id,rows,{quality=false,height=270}={}){
 return plot(id,[{type:'bar',orientation:'h',y:rows.map(r=>r.state),x:rows.map(r=>r.value),text:rows.map(r=>r.name||r.state),marker:{color:rows.map(r=>quality||r.value>=0?colors.blue:colors.orange)},texttemplate:'%{x:.1%}',textposition:'outside',cliponaxis:false,hovertemplate:'%{text}<br>%{x:.2%}<extra></extra>'}],{height,margin:{l:42,r:64,t:8,b:40},xaxis:{...axis,tickformat:'.0%',rangemode:'tozero',...(quality?{range:[0,1.14]}:{})},yaxis:{...axis,autorange:'reversed',type:'category',showgrid:false}});
}
