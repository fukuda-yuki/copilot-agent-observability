# Raw Store And Normalization Specification

## Scope

This layer converts saved raw OTLP JSON into repository-local deterministic datasets.
It does not run a network receiver and does not require Langfuse UI.

## Input

Accepted input:

- saved raw OTLP JSON file。
- SQLite raw store created by `ingest-raw`。

Raw payloads may include prompt, response, tool arguments / results, path information, identity-bearing attributes, and credential-like strings.
Raw payloads must not be committed.

## Raw Store

Default local path:

```text
data/raw-store.db
```

`data/` is local runtime data.
The SQLite store is not a shared operational database.

Rejected for current scope:

- custom OTLP HTTP receiver。
- long-running local telemetry agent。
- PostgreSQL as default raw telemetry store。

## Commands

```text
config-cli ingest-raw <raw.json> --db <raw-store.db>
config-cli normalize-raw <raw-store.db|raw.json> [--csv <output.csv>] [--json <output.json>]
```

`normalize-raw` may read either a raw store or a raw OTLP JSON file.
At least one output option must be provided by commands that require output.

## Normalized Measurement Responsibilities

Normalization must:

- preserve trace-level reference IDs.
- derive `client_kind`, task and experiment attributes when present.
- classify common logical categories such as LLM call, tool call, permission, file operation, shell command, error, user interaction.
- handle unknown span names without failing only because span names drift.
- produce unknown span / attribute evidence for collection health.
- avoid copying raw prompt / response / tool arguments / tool results into repository-safe outputs.

## Validation

Use synthetic fixtures for automated tests.
Live Copilot execution is manual validation and must record environment, settings, trace id or equivalent identifier, confirmed items, and unconfirmed items.
