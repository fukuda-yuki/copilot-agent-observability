# M3 Review

## Result

Partial local validation completed. Final live trace evidence is blocked until a
real local Langfuse project credential is supplied outside the repository.

## Scope Reviewed

- `docker-desktop-langfuse` Config CLI profile output.
- `docker-desktop-collector-langfuse` Config CLI profile output.
- Docker Desktop Langfuse endpoint reachability.
- Docker Desktop Collector startup and OTLP HTTP receiver behavior.
- Secret handling for local validation.

## Validation

- `dotnet test tests\CopilotAgentObservability.ConfigCli.Tests\CopilotAgentObservability.ConfigCli.Tests.csproj --filter "FullyQualifiedName~ConfigSamplesTests|FullyQualifiedName~CliApplicationTests"` succeeded with 61 passed tests.
- `dotnet run --project src\CopilotAgentObservability.ConfigCli -- profile-vscode-env --profile docker-desktop-langfuse` emitted `$env:CAO_COLLECTION_PROFILE="docker-desktop-langfuse"` and `http://localhost:3000/api/public/otel`.
- `dotnet run --project src\CopilotAgentObservability.ConfigCli -- profile-vscode-env --profile docker-desktop-collector-langfuse` emitted `$env:CAO_COLLECTION_PROFILE="docker-desktop-collector-langfuse"` and `http://localhost:4318` without client-side Langfuse authorization headers.
- `$env:LANGFUSE_AUTH="dummy"; docker compose -f infra\otel-collector\docker-compose.example.yml config` succeeded.
- `$env:LANGFUSE_AUTH="dummy"; docker compose -f infra\otel-collector\docker-compose.example.yml up -d` started `otel-collector-otel-collector-1`.
- `Test-NetConnection localhost -Port 3000` succeeded.
- `Test-NetConnection localhost -Port 4318` succeeded.
- Posting synthetic OTLP JSON to `http://localhost:4318/v1/traces` returned `200 {"partialSuccess":{}}`.
- Direct POST to `http://localhost:3000/api/public/otel/v1/traces` with dummy auth returned `401 Unauthorized`.
- Collector logs showed export to `http://host.docker.internal:3000/api/public/otel/v1/traces` failed with `401 Unauthorized`, as expected for dummy auth.

## Findings

- No blocking issue was found in generated profile endpoints or placeholder handling.
- The Collector route receives OTLP HTTP locally and attempts to relay to Langfuse.
- The final Sprint6 M3 live validation evidence still needs a real trace id or raw record identifier generated with non-repository Langfuse credentials.

## Residual Risk

- The direct Langfuse and Collector relay paths have not yet been proven end to
  end with real Langfuse ingestion, because no real credential was used.
