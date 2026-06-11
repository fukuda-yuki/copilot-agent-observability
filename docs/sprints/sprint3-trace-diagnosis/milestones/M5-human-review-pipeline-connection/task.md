# M5: human-review pipeline connection

## 目的

Sprint3 candidate pipeline を既存 M24-M27 human-review pipeline に接続する方法を決め、未接続の parallel pipeline を残さない。

## 完了条件

- [ ] diagnosis candidate から M24 diagnosis record へ変換するか、M24-M27 の一部を Sprint3 schema で置き換えるかを決めている。
- [ ] 変換する場合は、列 mapping、落とす列、保持する `evidence_ref`、human review status の扱いを定義している。
- [ ] 置き換える場合は、既存 command の compatibility / obsolescence 判断を記録している。
- [ ] Sprint3 の完了条件に、candidate output が人間レビュー workflow で消費できることを含めている。
- [ ] `docs/spec.md` と `docs/task.md` を確定結果に同期している。

## 検証

- Documentation-only の場合は link / schema consistency を確認する。
- command や code behavior を変更した場合は `dotnet build CopilotAgentObservability.slnx` と `dotnet test CopilotAgentObservability.slnx` を実行する。
