# ISO/IEC 25010:2023 Quality Model Assessment

This internal assessment uses the ISO/IEC 25010:2023 product quality characteristics as a reference. It is not certification or formal conformity evidence.

| Characteristic | Evidence | Status | Gap / risk | Next test or metric |
|---|---|---|---|---|
| Functional suitability | analysis engine and 144 passing tests, including schema/runtime/end-to-end external-evidence regressions | Observed | Control semantics remain intentionally bounded by central per-key metadata | Golden-report and property tests |
| Performance efficiency | Small local data set | UNVERIFIED | No benchmarks or input-size limits | Records/second and peak memory benchmark |
| Compatibility | Node/TypeScript project, macOS local run, Linux CI definition | Partially observed | Current CI execution not verified in this run | CI matrix evidence |
| Interaction capability | README commands and generated reports | Observed | No usability study | Time-to-first-report task test |
| Reliability | deterministic inputs, error exits, tests | Partially observed | No fault-injection or recovery testing | Malformed/unavailable input matrix |
| Security | threat model, secret scan, pinned Actions, runtime fail-closed evidence gate with schema-parity tests and zero-advisory package audit in this run | Observed | External settings, collector identity and runtime controls remain unverified | Code scanning and provider evidence refresh |
| Maintainability | strict TypeScript, modular validation, tests | Observed | Some scripts retain duplicated types | Static duplication and coverage report |
| Flexibility | JSON/CSV/Markdown outputs and domain templates | Partially observed | Provider model is deliberately bounded | Add provider adapter contract tests |
| Safety | No safety-critical runtime is established | Not applicable to observed scope | Reassess if used for automated enforcement | Human-approval and fail-safe analysis |

Classification: Category A for the ISO reference; repository ratings are Category C internal assessment. Evidence level: Level A for the model and Level D for the assessment. Approval status: Proposta.
