# M5 Review: Langfuse 非依存 loop

## Scope

- Sprint2 M5 Langfuse 非依存 loop.
- Existing CLI chain from raw OTLP ingest through normalized dataset, human-classified diagnosis validation, proposal generation, proposal evaluation, decision template generation, and human decision recording.

## Changed Files

- `tests/CopilotAgentObservability.ConfigCli.Tests/LangfuseIndependentLoopTests.cs`
- `tests/CopilotAgentObservability.ConfigCli.Tests/TestData/m5-diagnoses.synthetic.json`
- `docs/sprints/sprint2-raw-data-loop/milestones/M5-langfuse-independent-loop/task.md`
- `docs/sprints/sprint2-raw-data-loop/milestones/M5-langfuse-independent-loop/review.md`

## Review Findings

- Spec compliance: M5 adds E2E coverage only. It does not add a CLI command, public schema, dependency, HTTP receiver, daemon, Langfuse API dependency, or live Copilot dependency.
- Functional correctness: The E2E test ingests `raw-otlp.synthetic.json` into a temp SQLite DB, normalizes from the DB, asserts the normalized row matches the M5 human diagnosis fixture on `trace_id`, `task_id`, `client_kind`, and `task_run_index`, then runs the existing diagnosis / proposal / evaluation / human decision workflow to completion.
- Diagnosis boundary: The diagnosis input is a human-classified synthetic fixture. No trace-to-diagnosis extraction, failure category inference, or anti-pattern inference was added.
- Data handling: The E2E test asserts known unsafe synthetic prompt, token, identity, and unknown span content from the raw fixture does not appear in workflow outputs.
- Maintainability: The change follows existing xUnit and temp-directory patterns and keeps the CLI implementation unchanged.

## Tests

- `LangfuseIndependentLoopTests.EndToEnd_RawStoreThroughHumanDecision_UsesSyntheticFixturesOnly` covers the M5 synthetic loop.
- `dotnet build CopilotAgentObservability.slnx`: passed, warning 0 / error 0.
- `dotnet test CopilotAgentObservability.slnx`: passed, 159 tests.

## Residual Risk

- M5 proves deterministic synthetic wiring only. It does not prove live Copilot emission shape, live Langfuse availability, or real data masking.
