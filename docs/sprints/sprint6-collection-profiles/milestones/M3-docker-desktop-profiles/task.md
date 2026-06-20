# M3: Docker Desktop Profiles

## Goal

Support and validate Docker Desktop based profiles.

## Scope

- `docker-desktop-langfuse`
- `docker-desktop-collector-langfuse`

## Requirements

- Langfuse direct profile targets local Langfuse OTLP HTTP.
- Collector profile targets local Collector OTLP HTTP and lets Collector attach
  Langfuse authorization.
- Collector example validation uses dummy credentials only.

## Verification

- Unit tests verify generated endpoints and placeholder credentials.
- Collector example passes:

```powershell
$env:LANGFUSE_AUTH="dummy"
docker compose -f infra\otel-collector\docker-compose.example.yml config
```

- Live validation records date, profile value, client kind, endpoint, and trace
  or raw record evidence.

## Validation Notes

2026-06-20 local validation covered profile output, Docker Desktop endpoint
reachability, Collector startup, and synthetic OTLP receiver behavior.

- `docker-desktop-langfuse` profile output targets local Langfuse OTLP HTTP.
- `docker-desktop-collector-langfuse` profile output targets local Collector
  OTLP HTTP and does not emit Langfuse authorization headers to the client.
- Local Langfuse Web was reachable at `localhost:3000`.
- Local Collector was reachable at `localhost:4318`.
- Synthetic OTLP JSON posted to `http://localhost:4318/v1/traces` returned
  `200 {"partialSuccess":{}}`.
- Collector attempted to export to Langfuse and received `401 Unauthorized`
  because validation used dummy `LANGFUSE_AUTH`.

Remaining live evidence:

- Re-run with a real local Langfuse project credential supplied outside the
  repository, then record the resulting trace id or raw record identifier for
  `docker-desktop-langfuse`.
- Re-run the Collector path with a real local Langfuse project credential
  supplied outside the repository, then record the resulting trace id or raw
  record identifier for `docker-desktop-collector-langfuse`.
