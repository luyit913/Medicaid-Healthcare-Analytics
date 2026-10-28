-- Calendar self-joins prevent missing months/years from turning LAG into a false YoY.
CREATE VIEW enrollment_monthly_kpi AS
SELECT e.*, CASE WHEN p.medicaid>0 THEN 100.0*(e.medicaid-p.medicaid)/p.medicaid END AS yoy_pct,
 CASE WHEN m.medicaid>0 THEN 100.0*(e.medicaid-m.medicaid)/m.medicaid END AS mom_pct
FROM fact_enrollment e
LEFT JOIN fact_enrollment p ON p.state_code=e.state_code AND p.month=date(e.month,'-1 year')
LEFT JOIN fact_enrollment m ON m.state_code=e.state_code AND m.month=date(e.month,'-1 month');
CREATE VIEW enrollment_annual AS
SELECT state_code,CAST(substr(month,1,4) AS INTEGER) AS year,COUNT(medicaid) AS valid_months,
 CASE WHEN COUNT(medicaid)=12 THEN AVG(medicaid) END AS avg_month_end_medicaid,
 CASE WHEN COUNT(adult)=12 THEN AVG(adult) END AS avg_month_end_adult,
 SUM(CASE WHEN version='P' THEN 1 ELSE 0 END) AS preliminary_months
FROM fact_enrollment GROUP BY state_code,substr(month,1,4);
CREATE VIEW enrollment_annual_kpi AS
SELECT e.*,CASE WHEN p.avg_month_end_medicaid>0 THEN 100.0*(e.avg_month_end_medicaid-p.avg_month_end_medicaid)/p.avg_month_end_medicaid END AS yoy_pct
FROM enrollment_annual e LEFT JOIN enrollment_annual p ON p.state_code=e.state_code AND p.year=e.year-1;
CREATE VIEW quality_map AS
SELECT q.*,s.state_name,r.trend_tier,r.review_reason
FROM fact_quality q JOIN dim_state s USING(state_code) JOIN quality_review r USING(state_code,measure_id)
WHERE q.map_eligible=1;
CREATE VIEW quality_primary_trend AS
SELECT * FROM quality_map WHERE trend_tier='primary';
CREATE VIEW quality_caution_trend AS
SELECT * FROM quality_map WHERE trend_tier IN ('primary','caution');
CREATE VIEW quality_trend_kpi AS
WITH series AS (
 SELECT q.*,LAG(rate) OVER(PARTITION BY state_code,measure_id ORDER BY report_year) AS previous_rate,
 LAG(report_year) OVER(PARTITION BY state_code,measure_id ORDER BY report_year) AS previous_year
 FROM quality_primary_trend q)
SELECT *,CASE WHEN report_year=previous_year+1 THEN rate-previous_rate END AS change_pp FROM series;
-- Nominal reference year, not the full BCS lookback window. Ecological only.
CREATE VIEW comparison_exploratory AS
SELECT q.*,e.avg_month_end_medicaid,e.yoy_pct AS enrollment_yoy_pct,e.valid_months,
 'nominal reference year; not identical people or denominators; non-causal' AS comparison_note
FROM quality_map q JOIN enrollment_annual_kpi e ON e.state_code=q.state_code AND e.year=q.reference_year
WHERE e.valid_months=12;
CREATE VIEW quality_coverage AS
SELECT report_year,measure_id,COUNT(*) AS included_states,100.0*COUNT(*)/(SELECT COUNT(*) FROM dim_state) AS coverage_pct
FROM quality_map GROUP BY report_year,measure_id;
CREATE VIEW enrollment_growth_rank AS
SELECT *,DENSE_RANK() OVER(PARTITION BY year ORDER BY yoy_pct DESC) AS growth_rank FROM enrollment_annual_kpi WHERE yoy_pct IS NOT NULL AND year BETWEEN 2022 AND 2024;
