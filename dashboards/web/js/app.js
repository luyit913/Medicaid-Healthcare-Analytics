import {renderEnrollment} from './enrollment.js';
import {renderQuality} from './quality.js';
import {renderComparison} from './comparison.js';
import {createStore} from './state.js';
import {loadData,loadFilterOptions} from './data.js';
import {annualValue,enrollmentYoY,qualityRows,cohort,pairedRows,formatPercent,formatEnrollment} from './metrics.js';
const store = createStore();
const $ = id => document.getElementById(id);
const pages = {enrollment:'Enrollment Overview', quality:'Healthcare Quality Explorer', comparison:'Enrollment & Quality Comparison'};
let options, data;
let drawing=false, pending=null;
async function scheduleCharts(state){
 pending=state;if(drawing)return;drawing=true;
 try{while(pending){const current=pending;pending=null;
 if(current.page==='enrollment')await renderEnrollment(data,current);
 else if(current.page==='quality')await renderQuality(data,current);
 else await renderComparison(data,current,code=>store.set({selectedComparisonState:code}));
 }}catch(error){$('error-text').textContent='Chart rendering failed: '+error.message;$('error').hidden=false;}
 finally{drawing=false;}
}
function fillSelect(element, choices, selected) {
  element.replaceChildren(...choices.map(choice => {
    const item = typeof choice === 'object' ? choice : {value:choice,label:String(choice)};
    const option = document.createElement('option');
    option.value = item.value; option.textContent = item.label; return option;
  }));
  element.value = String(selected);
}
function render(state) {
  const enrollment = state.page === 'enrollment';
  document.querySelectorAll('[data-page]').forEach(button => {
    if (button.dataset.page === state.page) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  Object.keys(pages).forEach(page => $(page).hidden = page !== state.page);
  $('page-title').textContent = pages[state.page];
  document.title = `${pages[state.page]} | Medicaid Healthcare Analytics`;
  $('eyebrow').textContent = enrollment ? 'Enrollment · 2022–2024' : 'Quality reporting · 2023–2025';
  $('year-label').textContent = enrollment ? 'Enrollment year' : 'Reporting year';
  $('state-filter').hidden = !enrollment;
  $('measure-filter').hidden = enrollment;
  $('context-text').textContent = enrollment ? `${state.state} · Enrollment year ${state.enrollmentYear}` : `${state.measure} · Quality reporting year ${state.reportingYear}`;
  $('monthly-title').textContent = `Monthly Enrollment Trend · ${state.state}`;
  $('map-title').textContent = `Enrollment Change by State · ${state.enrollmentYear}`;
  $('alignment').textContent = `Quality report ${state.reportingYear} · Enrollment reference year ${state.reportingYear-1}`;
  if (data) {
    const put=(selector,values)=>document.querySelectorAll(selector).forEach((el,i)=>el.textContent=values[i]);
    put('#enrollment .metric',[formatEnrollment(annualValue(data.annual,state.enrollmentYear,state.state)),formatPercent(enrollmentYoY(data.annual,state.enrollmentYear,state.state),2)]);
    const count=new Set(qualityRows(data.quality,state.reportingYear,state.measure).map(r=>r.state_code)).size;
    const trend=cohort(data.primary,state.measure);
    put('#quality .metric',[String(count),formatPercent(count/51),String(trend.count)]);
    put('#comparison .metric',[String(new Set(pairedRows(data.comparison,state.reportingYear,state.measure).map(r=>r.state_code)).size)]);
    document.querySelector('#quality .kpis .panel:last-child p').textContent=trend.count?`Fixed primary cohort · 2023–2025`:'No states meet primary comparability criteria for 2023–2025.';
  }
  if(data)scheduleCharts(state);
  if (options) {
    fillSelect($('year'),enrollment?options.enrollmentYears:options.reportingYears,enrollment?state.enrollmentYear:state.reportingYear);
    fillSelect($('state'),options.states,state.state);
    fillSelect($('measure'),options.measures,state.measure);
  }
}
async function initialize() {
  $('error').hidden = true;
  $('status').textContent = 'Loading filter options from the reviewed data…';
  try {
    if (location.protocol === 'file:') throw new Error('Open this page with VS Code Live Server rather than double-clicking the HTML file.');
    data = await loadData();
    options = await loadFilterOptions(data);
    ['year','state','measure','reset'].forEach(id => $(id).disabled = false);
    render(store.get());
    $('status').textContent = `Data loaded from processed CSVs · ${options.states.length} geographic units · ${options.measures.length} quality measures${window.Plotly?'':' · Chart library unavailable; check your connection and refresh'}`;
  } catch(error) {
    $('error-text').textContent = error.message;
    $('error').hidden = false;
    $('status').textContent = 'Filter options unavailable.';
  }
}
store.subscribe(render);
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click',()=>store.set({page:button.dataset.page})));
$('year').addEventListener('change',event=>store.set({[store.get().page==='enrollment'?'enrollmentYear':'reportingYear']:Number(event.target.value)}));
$('state').addEventListener('change',event=>store.set({state:event.target.value}));
$('measure').addEventListener('change',event=>store.set({measure:event.target.value}));
$('reset').addEventListener('click',()=>store.reset());
$('retry').addEventListener('click',initialize);
$('clear-selection').addEventListener('click',()=>store.set({selectedComparisonState:null}));
$('comparison-state').addEventListener('change',e=>store.set({selectedComparisonState:e.target.value||null}));
render(store.get());
// Wait for deferred CDN scripts before using their globals.
if (document.readyState === 'complete') initialize();
else window.addEventListener('load',initialize,{once:true});
