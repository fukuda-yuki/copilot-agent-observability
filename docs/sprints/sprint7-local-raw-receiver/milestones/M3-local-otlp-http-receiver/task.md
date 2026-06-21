# M3: Local OTLP HTTP Receiver

## Goal

Implement the local OTLP HTTP receiver for `raw-local-receiver`.

## Scope

- Receive OTLP HTTP telemetry from local clients.
- Bind only to loopback local development endpoints unless a later security
  decision allows broader exposure.
- Accept at least trace payloads on the standard OTLP HTTP `/v1/traces` path
  needed for VS Code Copilot Chat validation.
- Return deterministic errors for unsupported payloads.
- Avoid storing secrets in repository files.

## Verification

- Unit tests cover accepted synthetic OTLP payloads.
- Unit tests cover invalid payload handling.
- `dotnet build CopilotAgentObservability.slnx`
- `dotnet test CopilotAgentObservability.slnx`
