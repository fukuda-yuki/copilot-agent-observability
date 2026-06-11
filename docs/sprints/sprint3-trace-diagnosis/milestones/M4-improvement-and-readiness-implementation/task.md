# M4: improvement and readiness implementation

## 目的

`generate-improvement-candidates` と `generate-auto-decisions` を実装し、diagnosis candidate を人間レビューへ渡せる deterministic readiness record に変換する。

## 完了条件

- [ ] `generate-improvement-candidates` が diagnosis candidate CSV / JSON から proposal candidate を生成できる。
- [ ] `generate-auto-decisions` が `needs-human-review` または `blocked` のみを出力する。
- [ ] `auto-approved`、`handoff-to-implementation`、repository 修正、patch / diff、commit / PR を出力しない。
- [ ] blocked 条件として sensitive data risk と scope overreach を検出する。
- [ ] synthetic fixture で review-ready と blocked の両方を検証している。

## 検証

- `dotnet build CopilotAgentObservability.slnx`
- `dotnet test CopilotAgentObservability.slnx`
