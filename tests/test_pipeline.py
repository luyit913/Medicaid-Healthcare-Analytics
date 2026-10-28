import importlib.util,unittest,sqlite3,tempfile,contextlib,io,csv
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('etl',ROOT/'src/run_etl.py');etl=importlib.util.module_from_spec(spec);spec.loader.exec_module(etl)
class Rules(unittest.TestCase):
 def test_special_tokens(self):
  self.assertEqual(etl.numeric('DS'),(None,'suppressed'))
  self.assertEqual(etl.numeric('ND'),(None,'no_combined_denominator'))
  self.assertEqual(etl.numeric('71.0'),(71.0,'numeric'))
  with self.assertRaises(ValueError):etl.numeric('unexpected')
 def test_version_no_coalescing(self):
  p={'State Abbreviation':'WA','Reporting Period':'202201','Preliminary or Updated':'P','Final Report':'N','adult':'99'}
  u={**p,'Preliminary or Updated':'U','Final Report':'Y','adult':''}
  self.assertEqual(etl.select_version([p,u])[0]['adult'],'')
  self.assertEqual(etl.select_version([p])[0],p)
  with self.assertRaises(ValueError):etl.select_version([u,u])
  with self.assertRaises(ValueError):etl.select_version([{**u,'Final Report':'N'}])
 def test_sql_missing_month_and_calendar_yoy(self):
  d=sqlite3.connect(':memory:');d.executescript((ROOT/'sql/schema.sql').read_text());d.execute('INSERT INTO dim_state VALUES ("WA","Washington")')
  for year in [2021,2022,2024]:
   for m in range(1,13 if year!=2022 else 12):
    date=f'{year}-{m:02}-01';d.execute('INSERT INTO dim_date VALUES (?,?,?)',(date,year,m));d.execute('INSERT INTO fact_enrollment VALUES (?,?,?,?,?,?,?,?,?,?,?)',('WA',date,100,20,120,None,'U','Y','','test',1))
  d.executescript((ROOT/'sql/views.sql').read_text())
  self.assertIsNone(d.execute('SELECT avg_month_end_medicaid FROM enrollment_annual WHERE year=2022').fetchone()[0])
  self.assertIsNone(d.execute('SELECT yoy_pct FROM enrollment_annual_kpi WHERE year=2024').fetchone()[0]);d.close()
class Integration(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();cls.out=Path(cls.tmp.name)
  with contextlib.redirect_stdout(io.StringIO()):etl.pipeline(ROOT/'data/raw',cls.out)
  cls.db=sqlite3.connect(cls.out/'medicaid.sqlite')
 @classmethod
 def tearDownClass(cls):cls.db.close();cls.tmp.cleanup()
 def test_dc(self):
  self.assertGreater(self.db.execute("SELECT COUNT(*) FROM fact_quality WHERE state_raw='Dist. of Col.' AND state_code='DC'").fetchone()[0],0)
 def test_scope_and_fixed_cohorts(self):
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM enrollment_annual WHERE year BETWEEN 2022 AND 2024 AND valid_months=12').fetchone()[0],153)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM quality_primary_trend WHERE measure_id="BCS-AD"').fetchone()[0],0)
  self.assertFalse(self.db.execute('SELECT state_code,measure_id FROM quality_primary_trend GROUP BY 1,2 HAVING COUNT(*)!=3').fetchall())
 def test_suppressed_denominator_preserves_rate(self):
  self.assertGreater(self.db.execute("SELECT COUNT(*) FROM quality_map WHERE denominator_status='no_combined_denominator' AND rate IS NOT NULL").fetchone()[0],0)
 def test_component_age_deviation_exclusion(self):
  self.assertEqual(self.db.execute("SELECT COUNT(*) FROM quality_map WHERE state_code='TN' AND measure_id='CBP-AD' AND report_year=2025").fetchone()[0],0)
 def test_outputs_reproducible(self):
  for f in self.out.glob('*.csv'):
   self.assertEqual(f.read_bytes(),(ROOT/'data/processed'/f.name).read_bytes(),f.name)
if __name__=='__main__':unittest.main(verbosity=2)
