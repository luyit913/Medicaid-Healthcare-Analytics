-- Open the generated SQLite database in your VS Code database extension.
-- Alternatively, run run_sql.py to execute this file without an extension.

-- Single-year reporting coverage for each selected measure.
SELECT *
FROM quality_coverage
ORDER BY measure_id, report_year;

-- Count primary and additional caution states separately.
SELECT measure_id, trend_tier, COUNT(*) AS state_count
FROM quality_review
GROUP BY measure_id, trend_tier
ORDER BY measure_id, trend_tier;

-- Annual enrollment growth ranking for the final analysis year.
SELECT state_code, year, yoy_pct, growth_rank
FROM enrollment_growth_rank
WHERE year = 2024
ORDER BY growth_rank, state_code;

-- Inspect Washington's annual enrollment, excluding the baseline-only year.
SELECT *
FROM enrollment_annual_kpi
WHERE state_code = 'WA' AND year BETWEEN 2022 AND 2024
ORDER BY year;
