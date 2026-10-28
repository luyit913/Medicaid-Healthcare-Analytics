"""Reproducible Medicaid portfolio ETL, Python 3.10+, standard library only.
Reviewed decisions are bound to source hashes. Never auto-adjudicate changed sources.
"""
from pathlib import Path
import argparse,csv,hashlib,json,math,sqlite3,tempfile,os,re,sys
ROOT=Path(__file__).resolve().parents[1]
MEASURES={'AMR-AD':('Asthma Medication Ratio','19–64'), 'BCS-AD':('Breast Cancer Screening','50–64'), 'CBP-AD':('Controlling High Blood Pressure','18–64')}
ALIASES={'Dist. of Col.':'District of Columbia','District Of Columbia':'District of Columbia','Washington, D.C.':'District of Columbia'}
TOKENS={'':'blank','DS':'suppressed','NA':'zero_denominator','NR':'not_reported','#':'denominator_under_30','DNPR':'denominator_not_public','ND':'no_combined_denominator','NPR':'not_public'}
def numeric(raw,missing_column=False):
 if missing_column:return None,'not_in_source_schema'
 x=str(raw).strip()
 if x in TOKENS:return None,TOKENS[x]
 try:
  n=float(x.replace(',',''))
  if not math.isfinite(n):raise ValueError(x)
  return n,'numeric'
 except ValueError:raise ValueError(f'Unrecognized numeric token {raw!r}; review source, do not silently coerce.')
def read_csv(path):
 with path.open(encoding='utf-8-sig',newline='') as f:
  rr=csv.DictReader(f);out=[]
  for rowno,r in enumerate(rr,2):
   if None in r or any(v is None for v in r.values()):raise ValueError(f'Malformed CSV {path.name}:{rowno}')
   r['_source_row']=rowno;out.append(r)
  return out

def write_csv(path,rows,headers=None):
 rows=list(rows)
 if not headers:headers=list(rows[0]) if rows else []
 with path.open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=headers);w.writeheader();w.writerows(rows)

def select_version(records):
 """Select one complete record; never coalesce fields across versions.
 Contradictory status pairs or multiple same-version rows fail for explicit review.
 """
 by={}
 for r in records:
  key=(r['State Abbreviation'],r['Reporting Period']);pair=(r['Preliminary or Updated'],r['Final Report'])
  if pair not in [('P','N'),('U','Y')]:raise ValueError(f'Unsupported version pair {key}: {pair}')
  g=by.setdefault(key,{})
  if pair in g:raise ValueError(f'Duplicate version {key}: {pair}')
  g[pair]=r
 return [g.get(('U','Y'),g.get(('P','N'))) for _,g in sorted(by.items())]

def is_target(r):
 c=r['Measure Abbreviation'];definition=r['Rate Definition']
 return c in MEASURES and ('Ages '+MEASURES[c][1].replace('–',' to ')) in definition

def pipeline(raw,out):
 review=json.loads((ROOT/'config/review_decisions.json').read_text(encoding='utf-8'))
 required=['pi-dataset-september-2026-release.csv']+[f'{y}-child-and-adult-health-care-quality-measures.csv' for y in [2023,2024,2025]]
 for name in required:
  actual=hashlib.sha256((raw/name).read_bytes()).hexdigest()
  if actual!=review['source_sha256'][name]:raise ValueError(f'Source changed: {name}. Update semantic review and hashes before running.')
 eraw=read_csv(raw/required[0]);states={r['State Abbreviation']:r['State Name'] for r in eraw}
 if len(states)!=51:raise ValueError('Expected reviewed 50 states + DC source scope')
 names={v:k for k,v in states.items()}
 window=[r for r in eraw if r['Reporting Period'][:4] in ['2021','2022','2023','2024']]
 selected=select_version(window);en=[];log=[]
 for r in selected:
  period=r['Reporting Period'];year,month=int(period[:4]),int(period[4:]);assert len(period)==6 and 1<=month<=12
  vals=[]
  for col in ['Total Medicaid Enrollment','Total CHIP Enrollment','Total Medicaid and CHIP Enrollment','Total Adult Medicaid Enrollment']:
   n,status=numeric(r[col]);assert n is None or (n>=0 and n.is_integer()),(col,n)
   vals.append(None if n is None else int(n))
  if all(v is not None for v in vals[:3]) and vals[0]+vals[1]!=vals[2]:raise ValueError(f'Enrollment total mismatch {r}')
  feet={k:v for k,v in r.items() if 'footnotes' in k and v}
  en.append((r['State Abbreviation'],f'{year:04}-{month:02}-01',*vals,r['Preliminary or Updated'],r['Final Report'],json.dumps(feet,ensure_ascii=False),required[0],r['_source_row']))
 tmp=out/'medicaid.build.sqlite';tmp.unlink(missing_ok=True);db=sqlite3.connect(tmp);db.row_factory=sqlite3.Row
 db.executescript((ROOT/'sql/schema.sql').read_text());db.executemany('INSERT INTO dim_state VALUES (?,?)',sorted(states.items()))
 db.executemany('INSERT INTO dim_date VALUES (?,?,?)',[(f'{y}-{m:02}-01',y,m) for y in range(2021,2025) for m in range(1,13)])
 db.executemany('INSERT INTO dim_quality_measure VALUES (?,?,?,?,?)',[(k,v[0],v[1],'percent_0_100','higher') for k,v in MEASURES.items()]);db.executemany('INSERT INTO fact_enrollment VALUES ('+','.join('?'*11)+')',en)
 qr=[];all_raw=[];row_evidence=[];target_evidence=[]
 for y in [2023,2024,2025]:
  name=f'{y}-child-and-adult-health-care-quality-measures.csv'
  for r in read_csv(raw/name):
   c=r['Measure Abbreviation']
   if c not in MEASURES:continue
   rate,status=numeric(r['State Rate']);den,ds=numeric(r.get('Denominator',''),missing_column='Denominator' not in r)
   if rate is not None and not 0<=rate<=100:raise ValueError('Out-of-range quality percentage')
   st=ALIASES.get(r['State'],r['State']);sc=names.get(st);target=is_target(r);official=r['Rate Used in Calculating State Mean and Median']=='Yes'
   key=f'{st}|{c}|{y}';reason=review['record_exclusions'].get(key,'')
   reasons=[]
   if not sc:reasons.append('outside_50_states_DC')
   if not target:reasons.append('different_rate_or_age')
   if not official:reasons.append('not_official_representative')
   if rate is None:reasons.append(status)
   if reason:reasons.append(reason)
   eligible=int(not reasons);dk='not_available' if den is None else ('sample_or_eligible_population_unspecified' if 'Hybrid' in r['Methodology'] else 'reported_denominator_inferred')
   med,_=numeric(r['Median']);count,_=numeric(r['Number of States Reporting'])
   rid=f'{y}:{r["_source_row"]}'
   timing='nominal CY=Core Set year-1, inferred per CMS general convention; not exact lookback; BCS multi-year screening history'
   qr.append((rid,sc,r['State'],y,y-1,c,r['Rate Definition'],r['Population'],r['Methodology'],r['State Rate'],rate,status,r.get('Denominator',''),den,ds,dk,int(official),int(target),eligible,'; '.join(reasons),r['Notes'],r['State-Specific Comments'],name,r['_source_row'],med,count,timing))
   all_raw.append({**{k:v for k,v in r.items() if k!='_source_row'},'source_file':name,'source_row':r['_source_row']})
   if target:
    target_evidence.append(dict(record_id=rid,state=st,report_year=y,measure_id=c,population=r['Population'],methodology=r['Methodology'],state_rate_raw=r['State Rate'],denominator_raw=r.get('Denominator','not_in_source_schema'),official_selected=int(official),map_eligible=eligible,decision='include_with_scope_notes' if eligible else 'exclude_from_default',reason='; '.join(reasons) or 'Published representative; no disqualifying record limitation found; scope/method tooltip mandatory',notes=r['Notes'],state_comments=r['State-Specific Comments'],source_file=name,source_row=r['_source_row']))
 db.executemany('INSERT INTO fact_quality VALUES ('+','.join('?'*27)+')',qr)
 duplicates=db.execute('SELECT state_code,report_year,measure_id,COUNT(*) n FROM fact_quality WHERE map_eligible=1 GROUP BY 1,2,3 HAVING n>1').fetchall()
 if duplicates:raise ValueError(f'Multiple eligible representatives: {duplicates}')
 adjudicated=[]
 for r in review['reviews']:
  evidence=[x for x in target_evidence if x['state']==r['state'] and x['measure_id']==r['measure_id']]
  good=[x for x in evidence if x['map_eligible']]
  complete=len(good)==3 and {x['report_year'] for x in good}=={2023,2024,2025}
  tier=r['trend_tier'] if complete else 'exclude'
  reason=r['review_reason']+(' Eligible target rates are incomplete across the three years; exclude from the fixed cohort.' if not complete else '')
  db.execute('INSERT INTO quality_review VALUES (?,?,?,?)',(r['state_code'],r['measure_id'],tier,reason))
  rec=dict(state_code=r['state_code'],state=r['state'],measure_id=r['measure_id'],trend_tier=tier,complete_three_years=int(complete),review_reason=reason,review_basis=r['review_basis'])
  rec['population_review']='See measure-specific semantic review in review_reason; Other and CHIP labels are not automatically treated as equivalent.'
  methods={x['methodology'] for x in evidence if x['official_selected']}
  rec['methodology_label_change']=int(len(methods)>1)
  rec['record_limitations_present']=int(any(review['record_exclusions'].get(f"{r['state']}|{r['measure_id']}|{y}") for y in [2023,2024,2025]))
  for y in [2023,2024,2025]:
   g=[x for x in evidence if x['report_year']==y];chosen=[x for x in g if x['official_selected']]
   rec[f'{y}_map_eligible']=int(any(x['map_eligible'] for x in g));rec[f'{y}_representative_rows']='; '.join(x['record_id'] for x in chosen)
   rec[f'{y}_population']=' || '.join(x['population'] for x in chosen);rec[f'{y}_methodology']=' || '.join(x['methodology'] for x in chosen)
   rec[f'{y}_notes_and_components']='\n'.join(x['record_id']+': '+x['notes']+' '+x['state_comments'] for x in g)
  adjudicated.append(rec)
 db.executescript((ROOT/'sql/views.sql').read_text())
 assert not db.execute('PRAGMA foreign_key_check').fetchall()
 for view in ['quality_primary_trend','quality_caution_trend']:
  assert not db.execute(f'SELECT state_code,measure_id FROM {view} GROUP BY 1,2 HAVING COUNT(*)!=3').fetchall()
 assert db.execute('SELECT COUNT(*) FROM fact_enrollment WHERE month BETWEEN "2022-01-01" AND "2024-12-01"').fetchone()[0]==1836
 assert db.execute('SELECT COUNT(*) FROM enrollment_annual WHERE year BETWEEN 2022 AND 2024 AND valid_months=12').fetchone()[0]==153
 for name in ['enrollment_monthly_kpi','enrollment_annual_kpi','quality_map','quality_primary_trend','quality_caution_trend','quality_trend_kpi','comparison_exploratory','quality_coverage','enrollment_growth_rank']:
  cursor=db.execute(f'SELECT * FROM {name} ORDER BY 1,2');write_csv(out/(name+'.csv'),[dict(x) for x in cursor], [x[0] for x in cursor.description])
 write_csv(out/'final_indicator_selection.csv',adjudicated);write_csv(out/'quality_record_review.csv',target_evidence)
 headers=sorted(set().union(*(r.keys() for r in all_raw)));write_csv(out/'quality_all_selected_measures_raw.csv',all_raw,headers)
 write_csv(out/'enrollment_all_versions.csv',window)
 summary=[]
 for c in MEASURES:
  x={'measure_id':c,'target_age':MEASURES[c][1],'primary_states':db.execute('SELECT COUNT(*) FROM quality_review WHERE measure_id=? AND trend_tier="primary"',(c,)).fetchone()[0],'caution_additional_states':db.execute('SELECT COUNT(*) FROM quality_review WHERE measure_id=? AND trend_tier="caution"',(c,)).fetchone()[0]}
  for y in [2023,2024,2025]:x[f'map_{y}']=db.execute('SELECT COUNT(*) FROM quality_map WHERE measure_id=? AND report_year=?',(c,y)).fetchone()[0]
  summary.append(x)
 write_csv(out/'indicator_summary.csv',summary)
 counts={name:db.execute(f'SELECT COUNT(*) FROM {name}').fetchone()[0] for name in ['fact_enrollment','fact_quality','quality_map','quality_primary_trend','comparison_exploratory']}
 missing=db.execute('SELECT SUM(adult IS NULL),COUNT(*) FROM fact_enrollment WHERE month>="2022-01-01"').fetchone()
 report={'status':'passed','version':'1.0','reviewed_window':'2022–2024; 2021 baseline only','source_hashes':{n:review['source_sha256'][n] for n in required},'record_counts':counts,'adult_missing':missing[0],'adult_total':missing[1],'indicator_summary':summary,'checks':['source hashes match reviewed sources','supported P/N and U/Y pairs only','one record per state-month','nonnegative integer enrollment; totals reconcile','quality numeric tokens explicit; percent range validated','one default target representative per state-year-measure','all fixed-cohort states have 3 eligible years','153 complete target state-years','foreign keys valid'],'limitations':['2025 dictionary inferred, not official','reference year nominal, not identical observation window','analyst trend cohorts not CMS cohorts','cross-sectional rates not case-mix adjusted','denominator not used for weighting; hybrid may be sample size']}
 (out/'validation_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 db.commit();assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok';db.close();os.replace(tmp,out/'medicaid.sqlite')
 print(json.dumps(report,ensure_ascii=False,indent=2))

def main():
 a=argparse.ArgumentParser();a.add_argument('--raw-dir',type=Path,default=ROOT/'data/raw');a.add_argument('--out-dir',type=Path,default=ROOT/'data/processed');args=a.parse_args();args.out_dir.mkdir(parents=True,exist_ok=True)
 pipeline(args.raw_dir,args.out_dir)
if __name__=='__main__':main()
