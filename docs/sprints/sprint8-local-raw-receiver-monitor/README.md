# Sprint8: Local Raw Receiver Monitor

Sprint8 (issue #25) builds a **Local Ingestion Monitor**: a single ASP.NET Core
process that receives OTLP HTTP/protobuf telemetry directly from VS Code GitHub
Copilot Chat, persists it to the SQLite raw store, produces sanitized monitor
projections, and surfaces a local browser UI for confirming that ingestion is
healthy — without exposing raw prompt / response / tool data.

It is **not** a Langfuse replacement or a raw trace viewer. It confirms:
receiver started, telemetry received, raw store persisted, trace projection
succeeded, and no ingestion / projection errors.

## Decision

Initial shape is a **local modular monolith** (`CopilotAgentObservability.LocalMonitor`,
ASP.NET Core / Kestrel, loopback-only bind), reusing shared modules extracted
from the existing Config CLI. See [`../../decisions.md`](../../decisions.md)
D019 and issue #25 for the architecture decision and safety boundary.

## Scope

- Extract shared OTLP / raw-telemetry / normalization / SQLite components so the
  monitor and the Config CLI share one implementation (M1).
- ASP.NET Core receiver host with deterministic HTTP errors and a request body
  size limit (M2).
- Bounded-channel ingestion queue with a single SQLite writer worker and
  graceful shutdown (M3).
- Sanitized `monitor_ingestions` / `monitor_traces` projections with cursor
  pagination — list retrieval must not load all raw payloads (M4).
- Local Web UI (Overview / Live Ingestions / Traces / Diagnostics) + SSE (M5).
- Security and live VS Code validation (M6).

## Non-goals

- Replacing Langfuse; raw JSON / prompt / response / tool viewers.
- Remote / shared deployment, multi-user auth.
- IIS as the initial required host, Windows Service, packaged exe, tray app.
- Aspire AppHost orchestration; PostgreSQL migration.
- Breaking the normalized measurement, candidate, or dashboard dataset schemas.

## Safety Boundary

The receiver may receive raw prompt, response, system prompt, tool
arguments/results, source paths, identity attributes, and credential-like
strings. Therefore: loopback-only bind, CORS disabled, request body size limit,
no raw body in logs, no raw payload returned through UI / API / SSE, no DB full
path or Windows user name in the UI, and a Content Security Policy. The
repository-safe output boundary is unchanged.

## Milestones

| Milestone | Scope | Status |
| --- | --- | --- |
| M1 Shared Component Extraction | Extract `Telemetry` + `Persistence.Sqlite` projects; keep Config CLI behavior and tests green. | **Implemented** |
| M2 ASP.NET Core Receiver Host | LocalMonitor project, Kestrel loopback, `POST /v1/traces`, request size limit, deterministic HTTP errors. | Pending |
| M3 Ingestion Queue + SQLite Concurrency | Bounded channel, single writer worker, WAL, schema versioning, cursor query, graceful shutdown. | Pending |
| M4 Monitor Projection | `monitor_ingestions` / `monitor_traces`, ProjectionWorker, startup catch-up, retry/failure state, raw non-exposure. | Pending |
| M5 Web UI + SSE | Overview / Live Ingestions / Traces / Diagnostics; SSE event stream with reconnect/gap recovery. | Pending |
| M6 Security + Live Validation | Non-loopback rejection, raw non-display/non-logging, CSP, oversized rejection, restart recovery, real VS Code validation. | Pending |

## Current Status

M1 (Shared Component Extraction) is implemented. See
[`milestones/M1-shared-component-extraction/plan.md`](milestones/M1-shared-component-extraction/plan.md)
for the accepted plan (challenge-reviewed via `/codex:adversarial-review`),
[`pre-implementation-review.md`](pre-implementation-review.md) for the original
static review, and [`handoff-fix-worklist.md`](handoff-fix-worklist.md) for the
validated findings (B1–B3, T4–T7, NU1903).

Implemented in M1:

- New `CopilotAgentObservability.Telemetry` class library (`Otlp/`,
  `RawTelemetry/`, `Normalization/`) holding the OTLP protobuf/JSON converters,
  attribute converter, raw ingestor, raw record model, measurement normalizer,
  and measurement sanitizer.
- New `CopilotAgentObservability.Persistence.Sqlite` class library holding the
  SQLite raw store (relocated as-is; behavior unchanged).
- Dependency direction `Telemetry <- Persistence.Sqlite <- ConfigCli`;
  extracted types stay `internal` with `InternalsVisibleTo`.
- T4 fix: the duplicated OTLP attribute conversion in `RawOtlpIngestor` now
  calls the shared `OtlpAttributeConverter`.
- NU1903 high-severity package vulnerabilities resolved: `MessagePack` 2.5.302
  (AppHost), `SQLitePCLRaw.bundle_e_sqlite3` 3.0.3 (Persistence.Sqlite).

Validation:

- `dotnet build CopilotAgentObservability.slnx`: 0 errors, 0 warnings,
  0 NU1903 vulnerable-package entries across all five projects.
- `dotnet test CopilotAgentObservability.slnx`: 291 passing, 0 failing,
  0 skipped (Config CLI external behavior unchanged).

Deferred (carried into later milestones, recorded in D019):

- B1 / B2 / B3 receiver-host robustness — absorbed by the ASP.NET Core host
  (M2/M3); the Sprint7 HttpListener host is untouched.
- T5 / T6 store behavior (schema-once / single writer / projection query) —
  M3/M4; the store was relocated without behavior changes.
- T7 single-threaded accept loop — superseded by the M3 channel/worker model.
- `Telemetry/Monitoring/` (monitor summary sanitization) — created in M4.

Still unconfirmed (inherited from Sprint7):

- Live VS Code GitHub Copilot Chat telemetry against the receiver, and the
  VS Code / extension version evidence (Sprint8 M6).
