# Sprint9 BUG_ISSUE — Staged Review Findings

Staged, feature-by-feature review of Sprint9 (Local Ingestion Monitor —
Agent Execution Detail), recorded after a parallel review by Claude per-feature
sub-agents and a Codex `/codex:review` branch review (`main...HEAD`).

Each finding below was **independently verified against the source by the main
agent** before being recorded here; sub-agent / Codex claims that did not hold up
are listed in each file's "Evaluated but not filed" section.

Scope reviewed: branch `sprint9-monitor-agent-execution-view` vs `main`
(56 files, +5479/-560). Source of truth: `docs/requirements.md` →
`docs/spec.md` → `docs/specifications/` → `docs/sprints/.../README.md`.

## Files (by feature unit)

| File | Feature unit | Filed findings (max severity) |
| --- | --- | --- |
| [M2-span-projection.md](M2-span-projection.md) | M2 — Sanitized per-span projection + token rollup + sanitization | 5 (High) |
| [M3-storage-migration.md](M3-storage-migration.md) | M3 — Storage + additive migration + backfill | 3 (High) |
| [M5-agent-execution-ui.md](M5-agent-execution-ui.md) | M5 — Agent-execution UI + raw default | 4 (Medium) |
| [M6-security-live-validation.md](M6-security-live-validation.md) | M6 — Security boundary + live validation | 1 (Medium) |
| [codex_adversarial_review.md](codex_adversarial_review.md) | Codex Adversarial Review (Raw Output) | 5 (High) |

**M4 — Sanitized read API:** reviewed (Claude sub-agent + Codex); **no valid
defect found** (sanitized-only invariant holds, cursor pagination stable on the
unique PK, invalid query → 400). No file filed.

## Severity legend

- **High** — incorrect headline data or a reliability failure that can persist
  silently; should be fixed before relying on the feature.
- **Medium** — real correctness/robustness gap on an edge or upgrade path;
  fix recommended.
- **Low** — minor robustness / hygiene / usability; safe to defer.

Confidence and the finding's source (Claude sub-agent and/or Codex review) are
noted per finding.
