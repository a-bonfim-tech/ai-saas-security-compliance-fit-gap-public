# Analysis Engine Test Notes

This repository currently uses a lightweight TypeScript analysis engine.

## Manual Validation Steps

Run:

~~~bash
pnpm typecheck
pnpm analyze
~~~

Expected result:

- TypeScript validation completes successfully.
- Markdown report is generated at `reports/fit-gap-analysis.md`.
- JSON report is generated at `reports/json/fit-gap-analysis.json`.
- CSV report is generated at `reports/csv/fit-gap-analysis.csv`.

## Expected Behavior

The engine should:

1. Read `controls/control-catalog.json`.
2. Read `evidence/evidence-register.json`.
3. Compare expected evidence against available evidence.
4. Classify each control as `Evidence Sufficient`, `Evidence Partial`, or `Evidence Gap`.
5. Assign a basic risk rating.
6. Generate Markdown, JSON, and CSV outputs.

## Future Automated Tests

Future versions should include automated unit tests for:

- Status calculation.
- Risk calculation.
- Evidence matching.
- Markdown generation.
- JSON schema validation.
- CSV export formatting.
