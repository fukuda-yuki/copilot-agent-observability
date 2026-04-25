# Knowledge Notes

この文書は実装時の補助知識、外部制約、検証メモを置く場所である。
プロダクト仕様・実装方針・優先順位の正は `docs/spec.md` とし、この文書は source of truth ではない。
`README.md` はプロジェクト背景・全体像・初期構想の参考資料として扱う。

## 2026-04-25: 初期実装方針の確認

- 初期実装の主言語は C# / .NET 10 とする。
- 初期マイルストーンは Phase 0: ローカル Aspire Dashboard 疎通確認を優先する。
- .NET 側の役割は Aspire AppHost と設定生成・検証用の補助 CLI とする。
- README と `docs/requirements.md` にズレがある場合は、`docs/requirements.md` を優先し、README 修正は後続タスクとして扱う。
