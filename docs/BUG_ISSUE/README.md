# Sprint9 BUG_ISSUE - Fix Backlog

This directory is the staged bug backlog for Sprint9 (Local Ingestion Monitor -
Agent Execution Detail). It is organized for the next step:

1. pick one feature unit;
2. write a focused fix plan from the relevant bug cards;
3. implement and validate that unit before moving to the next unit.

Scope reviewed: branch `sprint9-monitor-agent-execution-view` vs `main`
(56 files, +5479/-560). Source of truth: `docs/requirements.md` ->
`docs/spec.md` -> `docs/specifications/` -> current Sprint9 sprint docs.

Each filed finding was independently checked against source before being
recorded. Claims that did not hold up stay in each file's "Evaluated but not
filed" section and are not part of the fix backlog.

## Recommended Fix Order

1. **M2 / M3 projection correctness**
   - Fix headline token rollup and poison/backfill projection gaps first.
   - These affect whether the monitor can be trusted.
2. **M5 trace-detail raw rendering**
   - Fix missing/unsafe raw-detail behavior after projection data is reliable.
3. **M6 milestone evidence consistency**
   - Reconcile the human-gated live-validation documents after the functional
     fixes and validation state are clear.
4. **Low-severity polish**
   - Batch only if already touching the same files.

## Fix Cards

| Card | Feature unit | Severity | Status | Plan boundary |
| --- | --- | --- | --- | --- |
| [M2-1](M2-span-projection.md#M2-1) | Token rollup | High | Open | Select the root `invoke_agent` by span hierarchy, then add a child-before-root regression. |
| [M2-2](M2-span-projection.md#M2-2) | Token rollup | Medium | Open | Treat any emitted usage component as agent-level usage and preserve `total_tokens`. |
| [M3-1](M3-storage-migration.md#M3-1) | Span backfill readiness | High | Open | Surface span backlog/failures without necessarily making them readiness-gating. |
| [M3-2](M3-storage-migration.md#M3-2) | Span projection robustness | Medium | Open | Drop or quarantine trace-less spans and stamp span projection complete for the record. |
| [M5-1](M5-agent-execution-ui.md#M5-1) | Trace-detail raw lookup | Medium | Open | Resolve raw records for a trace through `monitor_spans.raw_record_id`, not only `raw_records.trace_id`. |
| [M5-4](M5-agent-execution-ui.md#M5-4) | Trace-detail raw rendering | Medium | Open | Bound inline raw rendering and link to the single-record raw route for full payloads. |
| [M6-1](M6-security-live-validation.md#M6-1) | Live-validation docs | Medium | Open | Make `live-validation.md`, milestone `plan.md`, `review.md`, and Sprint README agree. Requires human confirmation if Part B is marked complete. |
| [M2-3](M2-span-projection.md#M2-3) | Turn-count semantics | Low | Decide | Decide whether `turn_count` means all LLM spans or root-agent turns; update spec before changing behavior. |
| [M2-4](M2-span-projection.md#M2-4) | Error type sanitization | Low | Open | Use an enum/token policy for `error_type` rather than the generic free-form secret heuristic. |
| [M2-5](M2-span-projection.md#M2-5) | Finish reason sanitization | Low | Open | Drop malformed raw finish-reason text; only store string tokens. |
| [M3-3](M3-storage-migration.md#M3-3) | Span query performance | Low | Defer | Optional composite index if span volumes grow. |
| [M5-2](M5-agent-execution-ui.md#M5-2) | Raw-bearing route headers | Low | Open | Set `Cache-Control: no-store` before raw-bearing route early returns. |
| [M5-3](M5-agent-execution-ui.md#M5-3) | Trace-detail busy handling | Low | Open | Map `PersistenceBusyException` to `503 persistence_busy`, consistent with APIs. |

## Feature Files

| File | Purpose | Active cards |
| --- | --- | --- |
| [M2-span-projection.md](M2-span-projection.md) | Projection builder, token rollup, field sanitization | M2-1 through M2-5 |
| [M3-storage-migration.md](M3-storage-migration.md) | Additive migration, span backfill, projection progress | M3-1 through M3-3 |
| [M5-agent-execution-ui.md](M5-agent-execution-ui.md) | Trace-detail page, raw default behavior, raw lookup/rendering | M5-1 through M5-4 |
| [M6-security-live-validation.md](M6-security-live-validation.md) | Security boundary validation records and human-gated live evidence | M6-1 |
| [codex_adversarial_review.md](codex_adversarial_review.md) | Raw Codex review output retained as evidence | Duplicate source for M2-1, M3-1, M3-2, M5-1, M5-4 |

**M4 - Sanitized read API:** reviewed by sub-agent and Codex; no valid defect
was filed. The sanitized-only invariant, cursor pagination on the unique key,
and invalid-query `400` behavior held during review.

## Fix Card Template

When creating a repair plan from one of these cards, keep the plan at this
granularity:

- **Problem:** one observable defect, not a theme.
- **Source of truth:** requirement/spec line or sprint acceptance item.
- **Touched surface:** smallest production files and tests needed.
- **Regression fixture:** synthetic input that failed before the fix.
- **Validation:** targeted test first, then repository-required build/test if
  code or workflow changed.

## Severity Legend

- **High** - incorrect headline data or a reliability failure that can persist
  silently; fix before relying on the feature.
- **Medium** - real correctness or robustness gap on an edge or upgrade path;
  fix recommended.
- **Low** - minor robustness, hygiene, performance, or usability; safe to defer
  unless already touching the same file.
