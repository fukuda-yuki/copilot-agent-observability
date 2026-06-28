# Sprint9 M6 Live Validation

Validates the **raw-default-on** posture and the new agent-execution surfaces
(trace-detail page + per-span read API) against a real GitHub Copilot client.

- **Part A — GitHub Copilot CLI:** **COMPLETE** (2026-06-28).
- **Part B — VS Code GitHub Copilot Chat:** **PENDING USER** (human-gated; the
  agent cannot drive the VS Code extension UI — checklist below).

Repository safety: no raw prompt, response, tool arguments/results, credentials,
or sensitive local paths are recorded here. The monitor DB and run logs live
under a scratch directory and are not committed. The resource attributes use the
ConfigCli placeholder `user.email=user@example.com` (synthetic PII), recorded
deliberately to demonstrate that PII is excluded from the sanitized surfaces.

---

## Part A — GitHub Copilot CLI (COMPLETE, 2026-06-28)

Date: 2026-06-28
Environment: Windows 11 Pro 10.0.26200, PowerShell 7
.NET SDK: 10.0.300-preview.0.26177.108
GitHub Copilot CLI version: **1.0.65** (standalone `copilot`, not the `gh copilot` extension)
Monitor command: `dotnet run --project src\CopilotAgentObservability.LocalMonitor -- --db <scratch>\m6-live.db --url http://127.0.0.1:4320`
Monitor port: **4320**
`--sanitized-only`: **off** (raw-default-on posture under test)
Collection profile: `raw-local-receiver` (CLI default endpoint 4319 overridden to the monitor at 4320)
Client kind: **copilot-cli**

Environment variables applied (from `profile-copilot-cli-env --profile
raw-local-receiver`, with the endpoint overridden to the monitor port):

```
COPILOT_OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4320
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true
OTEL_RESOURCE_ATTRIBUTES=user.id=example-user,user.email=user@example.com,team.id=platform,department=engineering,client.kind=copilot-cli,experiment.id=baseline
```

Copilot CLI command run (in an isolated scratch working directory):

```
copilot -C <scratch>\copilot-work --allow-all-tools --no-color -p "Create a file named notes.txt ... then read it back and run a shell command to print the current directory. Keep it brief."
```

CLI result: exit code 0; the run used `Edit` (apply_patch), `Read` (view), and a
`powershell` shell command, and reported token usage (↑ 46.3k / ↓ 403).

### Evidence — endpoint shape and ids

- Trace ID: `6301f12dc148a6fedb547736fb11fa63`
- Raw record IDs: `1`, `2` (telemetry arrived as two OTLP exports for the one trace)
- `GET /health/ready` → `200`, all checks pass, `degraded_reasons: []`.

`GET /api/monitor/traces` (sanitized rollup) for the trace:

| field | value |
| --- | --- |
| `client_kind` | `copilot-cli` |
| `span_count` | 7 |
| `tool_call_count` | 3 |
| `turn_count` | 3 |
| `agent_invocation_count` | 1 |
| `error_count` | 0 |
| `total_tokens` | 46684 |

### Evidence — sub-agent child-span hierarchy (confirmed)

`GET /api/monitor/traces/6301f12dc148a6fedb547736fb11fa63/spans` (sanitized,
per-span). All six leaf spans link to the single `invoke_agent` span via
`parent_span_id`:

| span_id | parent_span_id | operation | category | tool_name | total_tokens |
| --- | --- | --- | --- | --- | --- |
| `4ede521a93656294` | *(root)* | invoke_agent | agent_invocation | | 46684 |
| `e6e84eb0dc842aae` | `4ede521a93656294` | chat | llm_call | | 15379 |
| `d5329fde760c8fc1` | `4ede521a93656294` | chat | llm_call | | 15601 |
| `53491cef65086cdf` | `4ede521a93656294` | chat | llm_call | | 15704 |
| `8de677d735cc6c04` | `4ede521a93656294` | execute_tool | tool_call | apply_patch | |
| `740a0d3944659c6b` | `4ede521a93656294` | execute_tool | tool_call | view | |
| `ab9650c8a9626307` | `4ede521a93656294` | execute_tool | tool_call | powershell | |

### Token rollup (no double count) — confirmed

Per-turn tokens come from the three `chat` spans (15379 / 15601 / 15704). The
trace-level `total_tokens` is the `invoke_agent` agent-level total (46684), taken
from the agent span — not re-summed on top of the `chat` per-call tokens. This
matches the no-double-count rule.

### Sanitization / security boundary — confirmed live

- **PII excluded from sanitized surfaces:** the synthetic PII
  (`user@example.com`, `example-user`) is **absent** from
  `/api/monitor/ingestions`, `/api/monitor/traces`, and
  `/api/monitor/traces/{traceId}/spans`.
- **Real tool names sanitized and kept:** `apply_patch`, `view`, `powershell`
  passed the free-form-name guard and appear in the projection.
- **Raw-bearing route serves raw with `no-store`:** `GET /traces/1/raw` →
  `200`, `Cache-Control: no-store`, and (by design, on this raw-bearing route)
  the raw payload does contain the resource-level PII email.
- **Raw-bearing route rejects cross-site:** `GET /traces/1/raw` with
  `Sec-Fetch-Site: cross-site` → `403`.
- **Trace-detail page:** `GET /traces/6301f12dc148a6fedb547736fb11fa63` →
  `200`, `Cache-Control: no-store`.

### Confirmed

- HTTP/protobuf telemetry from GitHub Copilot CLI 1.0.65 reached the monitor at
  `127.0.0.1:4320` under the raw-default-on posture.
- The agent-execution **child-span hierarchy** is observable: one `invoke_agent`
  parent with `chat` + `execute_tool` children linked by `parent_span_id`.
- Real tool / LLM / token emission projected into sanitized rows; PII excluded
  from every sanitized read surface; raw + `no-store` + cross-site `403` enforced
  on the raw-bearing routes.

### Not covered by this CLI run (honest scope)

- **MCP tool spans** (`mcp_tool_name` / `mcp_server_hash`): the CLI run used
  built-in tools only; no MCP server was invoked, so the MCP path was not
  exercised live here. (It is covered by the synthetic per-attribute
  sanitization tests, and is a candidate for Part B.)
- **Nested sub-agent** (a child `invoke_agent` under the parent `invoke_agent`):
  this run emitted a single top-level `invoke_agent`. The *agent → tool/LLM*
  child hierarchy is confirmed; a *nested agent → sub-agent* hierarchy is best
  exercised via VS Code Copilot Chat (Part B).
- Metrics / logs OTLP signals were not observed (traces only).

---

## Part B — VS Code GitHub Copilot Chat (PENDING USER)

Human-gated: the agent cannot drive the VS Code extension UI, so the user runs
this. Steps:

1. Start the monitor (raw-default-on), port 4320:
   ```powershell
   dotnet run --project src\CopilotAgentObservability.LocalMonitor -- --db data\m6-live-vscode.db --url http://127.0.0.1:4320
   ```
   Wait for `GET http://127.0.0.1:4320/health/ready` → `200 ready`.
2. Generate + apply the VS Code env, then launch VS Code from the same session:
   ```powershell
   dotnet run --project src\CopilotAgentObservability.ConfigCli -- profile-vscode-env --profile raw-local-receiver --target monitor
   # paste the printed env block into the session, then:
   code .
   ```
   Confirm `client.kind=vscode-copilot-chat` and endpoint `http://127.0.0.1:4320`.
3. In Copilot Chat **agent mode**, run a task that delegates to a sub-agent and
   calls at least one tool (and, if available, an MCP tool) so the trace contains
   a nested `invoke_agent` and `mcp_tool_name` spans.
4. Verify in the monitor and **fill in the evidence fields below**:
   - [ ] datetime
   - [ ] VS Code version + GitHub Copilot Chat extension version
   - [ ] monitor port (expect 4320) and `--sanitized-only` off
   - [ ] trace id(s) / raw record id(s)
   - [ ] `/api/monitor/traces` shows `agent_invocation_count ≥ 1` and `tool_call_count ≥ 1`
   - [ ] `/api/monitor/traces/{traceId}/spans` shows the **sub-agent child-span
     hierarchy** (child spans' `parent_span_id` link to the parent `invoke_agent`;
     ideally a nested `invoke_agent` under `invoke_agent`)
   - [ ] (if MCP used) `mcp_tool_name` present and sanitized; `mcp_server_hash`
     is a hash only
   - [ ] PII (`user.email`) absent from `/api/monitor/*`; present only on
     `GET /traces/{rawRecordId}/raw` and the trace-detail page, both with
     `Cache-Control: no-store`
   - [ ] cross-site fetch of a raw-bearing route → `403`

Record the filled evidence here (sanitized only — no raw prompts/responses/PII
values, and the monitor DB is a runtime artifact, not committed).
