# Sprint10 M6 Live Validation

Status: Pending — user-gated. This is the only remaining Sprint10 completion
blocker after S10-1 and S10-2.

Sprint10 M6 automated validation can exercise the browser UI against synthetic
projected spans. It cannot prove real VS Code Copilot Chat emission shape,
hierarchy, cache-token emission, or model/token fields from a live user session.

## User Procedure

1. Start the Local Ingestion Monitor with the monitor target profile:

   ```powershell
   dotnet run --project src\CopilotAgentObservability.LocalMonitor -- --url http://127.0.0.1:4320
   ```

2. Configure VS Code Copilot Chat to send OTLP HTTP/protobuf telemetry to the
   monitor endpoint used by this repository's monitor profile.

3. Run a small Copilot Chat interaction that includes:
   - at least one chat / LLM turn;
   - at least one tool call;
   - if available, a cache-read or cache-creation token-bearing turn.

4. Open `http://127.0.0.1:4320/traces`, select the new trace, and inspect:
   - Summary tab;
   - Timeline tab with errors-only filter and tokens/time sort;
   - Flow Chart tab with span hierarchy;
   - Cache tab with trace-local cache metrics.

5. Report only sanitized evidence back to the repository:
   - command/date/environment summary;
   - whether Flow Chart rendered hierarchy;
   - whether Timeline and Cache tabs populated;
   - whether raw/PII stayed out of `/api/monitor/*` and SSE.

Do not commit raw prompts, raw outputs, tool arguments/results, user identifiers,
database files, screenshots containing raw/PII, or runtime artifacts.

## Current Evidence

No user-provided live VS Code Copilot Chat evidence has been recorded for
Sprint10 M6. This remains a completion blocker.

Automated follow-up evidence recorded on 2026-06-29:

- S10-1 fixed the synthetic `--sanitized-only` TraceDetail conflict: sanitized
  Summary / Timeline / Flow Chart / Cache tabs remain available, while raw
  previews and full raw links are absent.
- S10-2 fixed the Playwright bootstrap gap: Chromium is installed before the
  standard solution test command.
- `dotnet build CopilotAgentObservability.slnx` passed with 0 warnings and 0
  errors.
- `pwsh tests\CopilotAgentObservability.LocalMonitor.Tests\bin\Debug\net10.0\playwright.ps1 install chromium`
  completed successfully.
- `dotnet test CopilotAgentObservability.slnx` passed: 300 ConfigCli tests and
  248 LocalMonitor tests.

This automated evidence uses synthetic projected spans only and does not replace
the required live VS Code Copilot Chat validation.
