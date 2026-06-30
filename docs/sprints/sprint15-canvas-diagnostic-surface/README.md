# Sprint15: Canvas Diagnostic Surface

Sprint15 raises the GitHub Copilot app **Canvas adapter** from the Sprint11
"thin action helper" into a **Local Monitor reuse-type diagnostic surface**.
The goal is that a user who opens the Canvas can immediately tell the Local
Monitor connection state and the next action, can pick a trace from a line that
carries decision-supporting fields, and can dispatch a Copilot analysis with a
clear focus — **without reimplementing the Local Monitor UI inside the Canvas
extension**.

```text
NG: the Canvas adapter reimplements the Local Monitor UI as a second monitor
OK: the Canvas adapter reuses the Local Monitor view model / endpoint / projection
    and presents a Canvas-shaped diagnostic surface
```

> **Sprint number correction.** This work was filed as a "Sprint12 parent
> Issue". The repository's Sprint12 (Monitor UX Redesign, D032/D033) is already
> complete, Sprint13 is complete, and Sprint14 is in progress. To avoid a number
> collision this Epic is created as **Sprint15** (D036).

This is a parent Epic. It is split into child issues A–E. Only **child A**
(helper UX, display boundary unchanged) is implemented in this sprint; B–E are
specified here and deferred to later sprints.

## Controlling guidance

The Canvas extension remains the repository-local project-scoped extension at
`.github/extensions/otel-monitor-canvas/`. The `/create-canvas` skill at
`.github/skills/create-canvas/SKILL.md` is the controlling workflow; it must not
be replaced with a `.github/prompts/*.prompt.md` file. Decisions D029, D030, and
D036 govern this sprint. Boundary rules are in
[security-data-boundaries.md](../../specifications/security-data-boundaries.md).

## Principle: reuse, do not reimplement

1. Reuse the existing Local Monitor sanitized API / projection.
2. If Canvas needs data the monitor does not yet project, add a **reusable**
   sanitized view model / endpoint on the Local Monitor side (shared with the
   Razor pages), not a Canvas-only data store.
3. Do not put heavy UI logic inside the Canvas extension.
4. The Canvas helper HTML stays a lightweight shell; diagnostic data comes from
   the Local Monitor projection.

## Boundary (unchanged by child A)

- Canvas action responses stay **bounded DTOs**. They never include raw prompt /
  response bodies, tool arguments / results, PII, credentials, tokens, local
  sensitive paths, or raw OTLP payloads.
- Extension-owned servers bind to `127.0.0.1`, close in `onClose()`, and use a
  per-launch token. Diagnostics use `session.send()` / no `console.log()`. No
  CDN / remote fetch.
- No raw / local detail bodies in GitHub Issues / PRs / repo docs / static
  dashboard / GitHub Pages / CI artifacts, in the Canvas extension logs, or in
  committed output.
- Whether a Canvas surface may show a prompt / response preview is **child D**'s
  separate design decision and is **not** enabled by child A.

## Child issues

### A. Canvas helper UX improvement — **implemented this sprint**

Display boundary unchanged. Improve only the look and the operation path of the
extension-owned helper page.

- Decision-supporting trace line (not just `trace_id — status — spans:N`):
  status / primary model / span count / tool call count / token total /
  duration / time / shortened trace id. All fields come from the existing
  `compactTrace`-shaped sanitized `/api/monitor/traces` proxy — **no new
  endpoint**.
- Japanese focus labels (遅い原因 / トークン消費 / キャッシュ効率 / エラー原因),
  keeping the enum values `latency` / `tokens` / `cache` / `errors` and the
  action names unchanged.
- Japanese button / heading text (e.g. `Copilotでこのトレースを分析`).
- Concrete health / error guidance: distinguish `ready` / `not_ready` /
  `unreachable`; show the `/health/ready` URL, a start command, DB path / port /
  URL configuration hints, and the monitor base URL the extension references.
- Collapse the raw health response by default.

Feasibility: high.

### B. Canvas dashboard view — **design confirmed (D037), implemented this sprint (M2)**

New sanitized aggregate endpoint `GET /api/monitor/summary?limit=N` (default
50, range 1–200, no cursor pagination) built from `IMonitorProjectionStore` and
a new shared `MonitorSummaryService`, consumed by both the Razor `Index`
PageModel (replacing its inline highlight computation) and the Canvas adapter.
Response: `scope` (limit/trace_count), `latest_trace` / `top_token_trace` /
`error_trace` (`compactTrace`-shaped), `per_model_summary` /
`per_client_kind_summary` (model or client_kind, trace_count, total_tokens,
error_count; null grouped as `"unknown"`). `readiness` is intentionally
excluded — `/health/ready` stays the single source of truth. See D037 for the
full resolved contract.

Feasibility: medium–high (confirmed).

### C. Canvas trace detail view — **design confirmed (D037), implemented this sprint (M3)**

Scoped down from "render the full trace detail" to a **minimal summary card**:
a new token-protected route `GET /api/trace-detail/:traceId` on the
Canvas-extension-owned loopback server (not a new Local Monitor endpoint)
returns `compactTrace` fields plus `cache_hit_rate` and `primary_model`. The
helper page renders this as a card (status / model / tokens / duration / cache
hit rate) when a trace is selected, plus a "Local Monitorで詳細を見る" deep
link. Span tree and per-turn cache detail are NOT rendered in Canvas — deep
investigation stays on the existing "Copilotでこのトレースを分析" dispatch
path. This avoids reimplementing the Local Monitor's tree/timeline/cache tab UI
(D030).

Feasibility: medium (confirmed; scope reduced from original proposal).

### D. Canvas raw preview boundary — **design confirmed (D037), implementation NOT started**

Resolved design: if built, raw preview is **server-rendered only** inside the
Canvas-owned loopback helper page — the extension fetches raw server-to-server
from the Local Monitor's existing raw-bearing route and embeds it as
`escapeHtml`-escaped inert text; the helper page's client-side JS never
receives raw as JSON (mirrors D020/D023/D032's "JS does not fetch raw" rule).
Same-origin, `Cache-Control: no-store`, and an explicit per-trace user action
apply; no raw by default. Canvas action responses stay bounded DTOs regardless.
**This is a design template, not an implementation go-ahead** — building it
requires a separate, explicit user decision to start a future milestone.

Feasibility: medium (design confirmed; implementation deferred pending explicit go-ahead).

### E. Session-to-trace correlation — **dropped (D037)**

Investigation of the OTel ingestion side found no stable identifier that
correlates a Copilot app session with a Local Monitor trace (`client_kind` is
a client type, not an instance; `conversation_id` is span-level and unstable;
`trace_id` has no session-level grouping). The GitHub Copilot SDK's
`CanvasProviderOpenRequest`/`InvokeActionRequest`/`CloseRequest` do carry a
`sessionId` field, but it has no corresponding OTel attribute on the ingestion
side. Auto-correlation would require adding a new resource/span attribute
(telemetry schema change, spec-first, and unconfirmed whether the Copilot
CLI/app would ever emit a matching value) — out of scope. Child E will not be
implemented; the manual trace dropdown shipped in child A is the permanent
selection mechanism.

## Recommended implementation order

A → B/C (parallel) → D → E(dropped). A changed no display boundary and shipped
first. B and C touch disjoint file sets (Local Monitor C# vs. the Canvas
extension) and were implemented in parallel once their designs were confirmed
(D037). D is design-confirmed but implementation is gated on an explicit future
go-ahead. E is dropped — no further work planned.

## Tech-debt prerequisite (F8)

`docs/task.md` records tech-debt F8: the Canvas contract test is
substring-matching only and cannot catch syntax errors or helper-server token /
request-shaping regressions, and JS-level executable smoke coverage should be
added **before** any major `extension.mjs` change. Child A is exactly such a
change, so F8 is handled first (milestone M1, step A0): extract the
side-effect-free pure functions into `canvas-helpers.mjs`, add a `node --test`
smoke, and wire `node --check` / `node --test` into the `dotnet test` gate.

## Acceptance criteria (parent Epic)

- The Canvas improvement direction is defined as a Local Monitor reuse-type
  diagnostic surface, not a re-implementation of the Local Monitor UI.
- Requirements are split into child issues A–E at an actionable granularity.
- Display-boundary-changing work (D) is separated from boundary-unchanged UX
  work (A).
- The implementation order is explicit.

Product conditions the Epic ultimately targets (across all children) are listed
in the parent Issue and carried by D036.

## Milestones

| Milestone | Scope | Status |
| --- | --- | --- |
| M1 Helper UX (child A) | F8 smoke scaffold (A0), decision-supporting trace line, Japanese focus / button / heading, concrete health/error guidance, collapsed health response, contract-test update. Display boundary unchanged. | Implemented; automated tests + self-review done. Live Canvas runtime validation pending (human-gated). |
| M2 Dashboard summary (child B) | `GET /api/monitor/summary`, shared `MonitorSummaryService`, Index PageModel refactor. See `milestones/M2-dashboard-summary/plan.md`. | Implemented this turn per D037. |
| M3 Trace detail card (child C) | Canvas-owned `GET /api/trace-detail/:traceId` route, helper-page summary card. See `milestones/M3-trace-detail-card/plan.md`. | Implemented this turn per D037. |
| Child D raw preview | Design confirmed (D037); no code change. | Not started — needs a separate explicit go-ahead. |
| Child E correlation | N/A | Dropped (D037) — no implementation planned. |

## Validation

```powershell
dotnet build CopilotAgentObservability.slnx
pwsh scripts\test\install-playwright-chromium.ps1
dotnet test CopilotAgentObservability.slnx
```

JS smoke (F8):

```powershell
node --check .github\extensions\otel-monitor-canvas\extension.mjs
node --check .github\extensions\otel-monitor-canvas\canvas-helpers.mjs
node --test .github\extensions\otel-monitor-canvas\canvas-helpers.test.mjs
```

Canvas runtime live validation (new UI text, decision-supporting trace list,
Japanese focus, health/error guidance, analyze trigger) is human-gated, like
Sprint11 M6, and recorded as pending. The completion bar for child A is the
automated test suite + `node --check` / `node --test` + recorded self-review.

## Non-goals

- Storing local detail bodies on GitHub, repository-safe dashboards, or CI
  artifacts.
- Emitting local detail bodies into Canvas extension logs.
- Adding an independent data store unrelated to the Local Monitor on the Canvas
  side.
- Re-implementing the Local Monitor UI inside the Canvas adapter.
- Returning to `--sanitized-only` as a Canvas prerequisite.

## Related

- Issue #39: run Copilot SDK raw analysis from the Local Monitor (Sprint13, D035).
- Sprint11 Canvas adapter PoC (D029, D030).
- Local Monitor raw / repository-safe boundary (D020, D023, D032,
  security-data-boundaries.md).
