# M5: VS Code Direct Telemetry Validation

## Goal

Validate that VS Code GitHub Copilot Chat can send telemetry directly to the
repository-hosted receiver without Langfuse.

## Scope

- Configure VS Code for `raw-local-receiver`.
- Run a synthetic or approved test workflow.
- Confirm receiver raw output.
- Confirm `normalize-raw` can produce measurement output from the received data.

## Verification Evidence

- Date and machine environment.
- `CAO_COLLECTION_PROFILE=raw-local-receiver`.
- VS Code / extension version where available.
- Receiver command and local bind address.
- Non-secret receiver endpoint shape.
- Client kind.
- Raw store path or raw OTLP file path, recorded as local runtime output.
- Trace id or raw record identifier.
- Confirmation that Langfuse was not required.
- Confirmed items and unconfirmed items.
- Confirmed and unconfirmed telemetry signals.
