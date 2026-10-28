# Final indicator selection methodology — v1 English edition

## Evidence boundary

This review uses the supplied three-year Quality CSVs, the 2023–2024 Quality dictionary, the Enrollment dictionary, the 2025 Adult Core Set list and summary, and the 2023–2025 trend-methods brief. Decisions are project analytical choices, not CMS certification of state-level comparability. Unresolved differences are explicitly assigned to caution or exclusion.

## Three selection layers

1. **Single-year display:** the target-age rate must cover a state or DC, have a valid numeric value, be marked Yes for official mean/median use, and have no disqualifying age or serious specification deviation. Yes identifies a representative record; it does not establish comparability. Review non-Yes component rows for the same state, year, and measure.
2. **Primary trend:** all three years pass single-year rules, with no important scope or methodology break identified from the combined evidence. Some label refinements remain disclosed inferences rather than proven equivalence.
3. **Caution trend:** all three years are available, but methodology changes, disclosure differences, or unresolved scope changes limit comparability. Keep this cohort distinct from the default primary trend.

Other combinations are excluded from fixed trends, although individual years may remain eligible. Establish a separate fixed cohort for each measure.

## Label changes versus substantive changes

- Medicaid becoming Medicaid (Title XIX), or abbreviated dual-eligible wording becoming a full label, can represent semantic refinement.
- For states such as Iowa, Louisiana, Missouri, and Minnesota, comments explicitly identify Other as Separate CHIP. Component evidence supports reporting reorganization. Do not generalize this mapping to every Other label.
- When a combined rate is split into Medicaid and Separate CHIP components and recombined, check component delivery systems and methodologies. Never add component and combined rates. A suppressed component does not automatically invalidate a published numeric combined rate.
- For some Medicaid-to-Title-XIX-plus-Expansion-CHIP changes, such as Alabama and Texas, continued delivery systems and methodology support a disclosed project inference of classification refinement. This does not prove identical enrollee sets.
- FFS additions in Arizona, Delaware, Ohio, and South Carolina, FFS/PCCM exclusions for Massachusetts CBP, and a new system in Utah are substantive changes supporting exclusion from default three-year trends.
- Identical Methodology labels can conceal changes in method composition or data systems. Colorado CBP was labeled Hybrid in 2023, but comments already described administrative data. Do not treat a later label change as proof of the first mixed-method use. Its 2025 composition change supports caution-only use.
- An MCO count change is not automatically a population break. Retain and disclose it when system definitions continue without explicit missing coverage. Use caution when completeness is uncertain, such as New Mexico changing from 3 to 2 MCOs.
- Omission of a prior dual-eligible exclusion note does not prove later inclusion. Review Population, delivery systems, and surrounding evidence together and preserve the reasoning.

## Important record-level exclusions

BCS/CBP in Florida, Indiana, and Ohio, and specified state-years elsewhere, use wider ages. Tennessee CBP's 2025 age deviation appears in the Medicaid component row and must not be overlooked.

Maine anchor-date/month rules and Oklahoma continuous-enrollment gap rules explicitly depart from specifications; the project applies strict exclusions to affected records. Idaho CBP in 2025 explicitly has incomplete data. West Virginia CBP in 2025 under-reports blood pressure readings. Maine CBP in 2025 lacks clinical data. Exclude these records from default display while retaining raw rates.

Unclear New Mexico age records in 2023 are excluded from strict project views rather than assigned an inferred target age. The record-exclusion dictionary is in `config/review_decisions.json`; source evidence and logical CSV row identifiers are in `quality_record_review.csv`.

## BCS interpretation

The CMS trend-methods brief labels BCS-AD as Trend. This project does not reject that indicator-level assessment. State-level Administrative/EHR/ECDS transitions may change data capture, so this version adopts a more conservative primary-cohort rule: BCS has no primary cohort and a 13-state caution cohort, with single-year comparison prioritized.

The four-state CBP primary cohort is not a national trend. The 17-state AMR cohort is also not nationally representative. CMS's 20-state publication threshold is not a certification this project has achieved.

## Inferred 2025 dictionary and special values

The supplied drug dictionary does not match the Quality schema. Under the agreed evidence boundary, infer 2025 definitions from earlier dictionaries and observed Quality records. Each field is labeled as inferred for 2025; special-value explanations in 2025 Notes are direct file evidence.

Parse State Rate statuses (including DS, NA, NR, and #) separately from denominator statuses such as ND and DNPR. A denominator may represent a Hybrid sample, an eligible population, or an unavailable value. Do not assume it always represents the complete eligible population or use it for national weighting.

DS in Notes does not automatically invalidate a numeric State Rate; a combined rate can remain numeric while its denominator or components are suppressed.

## Timing and integration

The nominal reference year is the report year minus one, based on the uploaded methods brief's general alignment of reporting years 2023–2025 with CY2022–2024. This is not a verified exact measurement window for every row. BCS has multiyear lookback.

The exploratory comparison retains `timing_basis` and `comparison_note`. Total Medicaid enrollment differs from the age- and condition-specific quality populations. Associations are descriptive state-level comparisons. Enrollment in 2021 supplies a YoY baseline; the principal enrollment window remains 2022–2024.

## Corrections relative to the earlier audit

The earlier audit relied on exact Population text equality. This version uses 153 explicit semantic decisions and record-level exclusions. The earlier state-name join could omit Dist. of Col.; this version maps it to DC and tests the mapping. The 2025 dictionary gap is handled through an explicitly inferred dictionary, not left as an unresolved requirement for an unavailable official definition.

## English edition

This edition translates documentation and review explanations without changing eligibility rules, decision tiers, raw evidence, source hashes, or numerical results. The workbook remains a static snapshot; executable decisions are held in the JSON configuration.
