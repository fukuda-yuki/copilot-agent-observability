# Sprint13 M6 - Validation And Closeout Review

## Automated validation

Run from repository root:

```powershell
dotnet build CopilotAgentObservability.slnx
pwsh scripts\test\install-playwright-chromium.ps1
dotnet test CopilotAgentObservability.slnx
```

Results:

- `dotnet build CopilotAgentObservability.slnx`: passed, 0 warnings, 0 errors.
- `pwsh scripts\test\install-playwright-chromium.ps1`: passed.
- `dotnet test CopilotAgentObservability.slnx`: passed, 301 ConfigCli + 272 LocalMonitor tests.
- `GitHub.Copilot.SDK` package restore/build: passed with version 1.0.4.
  Live signed-in .NET SDK invocation remains unverified.

## Coverage added

- Analysis persistence, lifecycle status, local raw result, and
  repository-safe summary tests.
- Raw analysis route tests for `--sanitized-only`, CSRF, .NET runner dispatch,
  absence of old bridge routes, and safe summary raw-marker exclusion.
- TraceDetail UI tests for the raw analysis action and sanitized-only omission.

## Live validation

Partially run in this environment. Evidence:
[live-validation.md](live-validation.md).

Confirmed:

- Local Monitor loopback startup, synthetic trace ingestion, TraceDetail
  availability, analysis run creation, and repository-safe summary raw-marker /
  PII exclusion.

Additional BYOK validation completed on 2026-06-30:

- The first BYOK attempt reached `sending_message` and failed with
  `I/O error: アクセスが拒否されました。 (os error 5)`.
- After setting a writable SDK `BaseDirectory`, BYOK analysis succeeded with
  result length `2338`.
- Safe summary remained free of synthetic raw markers and PII.

Remaining live checks:

- Invoke analysis with each internal raw/summary tool available to the SDK.
- Confirm raw tool data reaches Copilot only through the Local Monitor process.
