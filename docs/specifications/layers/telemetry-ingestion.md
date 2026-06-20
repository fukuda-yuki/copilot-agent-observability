# Telemetry Ingestion Specification

## Scope

Telemetry ingestion covers OTel configuration samples and accepted client sources.
It does not define raw store schema, candidate generation, or dashboard rendering.

## Supported Sources

Required:

- VS Code GitHub Copilot Chat。
- GitHub Copilot CLI。

Optional:

- Codex App / app-server。
- OpenTelemetry Collector as relay。

Reference-only:

- Claude Code examples。
- Visual Studio client family。

## Collection Profiles

Telemetry ingestion must support explicit profile selection before generating user-facing setup instructions or CLI configuration output.

Initial profile names:

```text
raw-only
docker-desktop
wsl2-docker-engine
collector-only
```

Profile responsibilities:

| Profile | Runtime requirement | Output responsibility |
| --- | --- | --- |
| `raw-only` | No Langfuse, Docker Desktop, WSL2 Docker Engine, Collector, receiver, or daemon | Document how to run file-based raw data loop from saved raw OTLP JSON |
| `docker-desktop` | Docker Desktop | Generate Langfuse direct and optional Collector relay settings for local self-host use |
| `wsl2-docker-engine` | WSL2 Docker Engine | Proposed only until Windows host / WSL2 endpoint, volume, and credential behavior are specified |
| `collector-only` | Collector runtime selected by another profile or environment | Generate client settings that target Collector receiver endpoints |

The selected profile must be treated as part of the operator intent.
If prerequisites for that profile are missing, commands and docs must report the missing prerequisite instead of substituting another profile.
Automatic environment probing may be used for diagnostics only; it must not change generated configuration without explicit user selection.

Concrete Config CLI flags, defaults, and compatibility behavior are defined by [../interfaces/config-cli.md](../interfaces/config-cli.md) before implementation.

## Langfuse Direct Path

Default direct endpoint:

```text
http://localhost:3000/api/public/otel
```

Trace-specific endpoint:

```text
http://localhost:3000/api/public/otel/v1/traces
```

Langfuse requires Basic Auth.
Credentials are passed through local environment variables or user-level config, never repository files.

## Collector Relay Path

Collector relay is optional.

Default local receiver:

```text
http://localhost:4318
localhost:4317
```

Collector may attach Langfuse authorization headers so clients do not store Langfuse credentials.
The repository example handles trace pipeline only.
Masking, sampling, TLS, SSO, and shared operation require separate product / security decisions.

## Resource Attributes

Required:

```text
user.id
user.email
team.id
department
client.kind
experiment.id
```

Recommended `client.kind` values:

```text
vscode-copilot-chat
copilot-cli
codex-app
```

Recommended:

```text
repo.name
workspace.name
task.id
task.category
task.run_index
experiment.condition
prompt.version
repo.snapshot
agent.variant
skill.version
mcp.profile
cli.wrapper.version
```

## Codex App Boundary

Codex App / app-server OTel routing config belongs in user-level `~/.codex/config.toml`.
Project-local `.codex/config.toml` is not a routing source of truth.

## Aspire AppHost Boundary

The Aspire AppHost is retained for build coverage and historical local dashboard connectivity context.
Do not add Langfuse, Collector, Config CLI, ServiceDefaults, Web app, DB, Redis, or Worker resources by default.
If resources are added later, define MCP exposure and sensitive telemetry exclusions before implementation.
