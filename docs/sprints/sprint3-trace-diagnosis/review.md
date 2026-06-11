# Sprint3 Review

## 2026-06-12: requirements alignment review

Scope reviewed:

- `docs/requirements.md`
- `docs/spec.md`
- `docs/task.md`
- `docs/sprints/sprint3-trace-diagnosis/README.md`

Findings:

- No implementation code was changed.
- Sprint3 is now defined as requirements/planning work for deterministic trace diagnosis candidates and human-review readiness.
- M11-M22 and M23-M27 historical boundaries remain documented as earlier phases, while Sprint3 adds deterministic candidate generation before the human-review pipeline.
- Sensitive content is allowed only in explicit opt-in local output and remains disallowed in repository documents, fixtures, and review records.
- Repository-changing auto-improvement remains deferred to Sprint4 or later.

Residual risk:

- The command names, candidate schema, content evidence schema, and readiness decision schema still need to be finalized before implementation.
- The Sprint4 repository modification safety model is intentionally unresolved.

## 2026-06-12: source-of-truth follow-up review

Finding addressed:

- Concern: `docs/spec.md` contained Sprint3 candidate / auto-decision schema details while Sprint3 README still listed unresolved open questions.
- Resolution: `docs/spec.md` was reduced to high-level confirmed scope and safety boundary. Candidate command and schema details remain sprint-local until finalized.

Implementation-start decisions recorded:

- Use a candidate-specific diagnosis command and candidate-specific schema before mapping to M24 diagnosis records.
- Use a separate readiness decision schema instead of extending M27 human decision records.

Validation:

- `dotnet run --project src\CopilotAgentObservability.ConfigCli -- --help` succeeded.
- `dotnet build CopilotAgentObservability.slnx` succeeded.
- `aspire start --non-interactive --format Json` succeeded.
- `aspire ps --format Json` showed the AppHost running.
- `aspire describe --format Json` returned an empty resource graph.
- `aspire stop --non-interactive` stopped the AppHost successfully.

## 2026-06-12: M1 review

Finding:

- M1 command and schema details are now sprint-local under `milestones/M1-candidate-schema-and-command-boundary/`.

Decision summary:

- Candidate generation uses dedicated commands and schemas before any M24 / M25 / M27 mapping.
- Sensitive full content is stored only in opt-in local bundles under `tmp/sprint3-sensitive/<run_id>/`.
- Automated verification remains synthetic-only.

Residual risk:

- M2 must finalize deterministic rule ids, rule behavior, and sensitive bundle read contract before implementation.

## 2026-06-12: Claude finding follow-up review

Findings accepted:

- The previous Sprint3 name overstated the implemented mechanism.
- `--include-sensitive-content` had a write shape but no read contract.
- `auto-approved` had no Sprint3 consumer.
- Candidate pipeline to M24-M27 connection was deferred without a milestone.
- Initial `rule_id` and `decision_rule_id` sets were not defined.
- `requirements.md` could be read as including auto-improvement implementation in Sprint3.
- Startup check did not include `dotnet test`.

Resolution:

- Renamed Sprint3 to Deterministic Trace Diagnosis Candidate Pipeline.
- Added M2-M5 milestones.
- Added initial deterministic rule tables and sensitive bundle read contract to M1 command boundary.
- Removed `auto-approved` from Sprint3 output states and reserved automatic adoption for Sprint4 or later safety planning.
- Updated `requirements.md`, `spec.md`, and `task.md` to stop Sprint3 at human-review readiness.
- Ran and recorded `dotnet test CopilotAgentObservability.slnx`; 173 tests passed.
