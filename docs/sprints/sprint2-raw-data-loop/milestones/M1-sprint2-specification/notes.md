# M1 Notes

## 2026-06-04 Sprint2 readiness check

- `docs/requirements.md` は、Sprint2 で Langfuse に依存しない raw JSON 保持基盤を検討するとしているが、正式採用時は同文書の更新が必要としている。
- `docs/spec.md` は、Sprint2 の schema、migration、CLI interface、運用手順を正式仕様として未確定としている。
- `docs/sprints/sprint2-raw-data-loop/README.md` の raw record は候補であり、実装 schema ではない。
- 既存 Config CLI は Langfuse export 風の sanitized JSON から measurement CSV / JSON を生成できる。
- 既存改善支援 loop は diagnosis record 入力以降を deterministic に扱うが、raw trace または measurement から diagnosis を自動生成する実装はない。
- Config CLI project は現時点で追加 package dependency を持たないため、SQLite 採用は明示的な dependency 判断を伴う。
- AppHost は空であり、現行仕様では raw store / DB / worker を AppHost に追加しない方針である。

## 2026-06-05 User answers

- Sprint2 MVP では、`diagnose` は引き続き人間分類 diagnosis record の validation とする。
- trace から failure category / anti-pattern 候補を自動抽出する診断機能は Sprint2 MVP に含めない。
- trace からの自動診断は Sprint3 あたりの後続要求として忘れないように、`docs/sprints/sprint3-trace-diagnosis/` に候補メモを作成する。
