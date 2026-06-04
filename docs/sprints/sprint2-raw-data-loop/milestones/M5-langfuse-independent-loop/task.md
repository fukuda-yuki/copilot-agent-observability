# M5: Langfuse 非依存 loop

## 目的

M4 の normalized dataset を使い、Langfuse が起動していなくても既存の改善支援 workflow に接続できることを確認する。

M5 は既存 CLI の接続確認を扱う。
trace からの自動診断、改善案の自動採用、自動実装、repository 修正、patch / diff 生成、commit / push / pull request 作成、自動勝敗決定は扱わない。

## 完了条件

- [ ] synthetic raw OTLP fixture から `ingest-raw` を実行できる
- [ ] raw store から `normalize-raw` を実行できる
- [ ] normalized dataset と synthetic diagnosis record を使い、`validate-diagnoses` を実行できる
- [ ] `generate-improvement-proposals` を実行できる
- [ ] `evaluate-improvement-proposals` を実行できる
- [ ] `generate-decision-template` または `record-human-decisions` を実行できる
- [ ] E2E test は synthetic fixture と temp output だけで完結し、live Copilot / live Langfuse に依存しない
- [ ] `diagnose` は人間分類 diagnosis record の validation に留め、trace から自動診断しない
- [ ] `dotnet build CopilotAgentObservability.slnx` を実行する
- [ ] `dotnet test CopilotAgentObservability.slnx` を実行する
- [ ] 必要なレビューを `review.md` に記録する

## タスク分解

1. M4 output を既存 diagnosis / proposal / evaluation / decision workflow の入力にできる最小 fixture を用意する。
2. raw telemetry 由来の measurement と人間分類 diagnosis record の対応に必要な `trace_id` / `task_id` を確認する。
3. CLI chain の E2E test を追加し、Langfuse 未起動でも完結することを確認する。
4. 自動診断や repository 修正に見える処理が混入していないかレビューする。

## 検証記録

- 未実施。
