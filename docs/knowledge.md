# Knowledge Notes

この文書は実装時の補助知識、外部制約、検証メモを置く場所である。
プロダクト仕様・実装方針・優先順位の正は `docs/spec.md` とし、この文書は source of truth ではない。
`README.md` はプロジェクト背景・全体像・初期構想の参考資料として扱う。

## 2026-04-25: 初期実装方針の確認

- 初期実装の主言語は C# / .NET 10 とする。
- 初期マイルストーンは Phase 0: ローカル Aspire Dashboard 疎通確認を優先する。
- .NET 側の役割は Aspire AppHost と設定生成・検証用の補助 CLI とする。
- README と `docs/requirements.md` にズレがある場合は、`docs/requirements.md` を優先し、README 修正は後続タスクとして扱う。

## 2026-04-25: M1 初期化結果
- .NET SDK はローカルに `10.0.203` があり、`global.json` で固定した。
- ユーザー明示指示に従い、solution は `.sln` ではなく `CopilotAgentObservability.slnx` として作成した。
- 環境再確認後、`aspire-apphost` テンプレートが利用可能になっていることを確認したため、`dotnet new aspire-apphost -n CopilotAgentObservability.AppHost -o src\CopilotAgentObservability.AppHost --force --no-restore` を適用し、AppHost を標準テンプレート構成に更新した。
- M1 検証として `dotnet build CopilotAgentObservability.slnx` と `dotnet test CopilotAgentObservability.slnx --no-build` が成功した。

## 2026-04-25: M2 Aspire Phase 0 疎通基盤
- Phase 0 の AppHost 主手順は `https` launch profile とし、Aspire Dashboard frontend は `https://localhost:17100`、OTLP/HTTP endpoint は `https://localhost:21025` とした。
- VS Code GitHub Copilot Chat の `otlp-http` 送信先は `github.copilot.chat.otel.otlpEndpoint=https://localhost:21025` とする。
- ローカル疎通確認では `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` を採用し、OTLP API key header なしで送信できる構成にした。この設定は Phase 0 のローカル開発専用であり、共有環境や本番方針ではない。
- `http` launch profile は Aspire の未暗号化トランスポート制約によりそのままでは起動しないため、使用時に備えて `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true` を設定した。主手順は `https` profile とする。
- M2 検証として `dotnet build CopilotAgentObservability.slnx` が成功した。
- M2 起動確認として `dotnet run --project src\CopilotAgentObservability.AppHost\CopilotAgentObservability.AppHost.csproj --launch-profile https` を実行し、`https://localhost:17100` が HTTP 200 を返すことを確認した。確認後、起動した AppHost プロセスは停止した。

## 2026-04-25: M3 Config CLI 実装結果
- Config CLI に `vscode-settings`、`copilot-cli-env`、`validate-resource-attributes` を追加した。
- M3 の出力既定値は Phase 0 仕様に従い、OTLP endpoint は `https://localhost:21025`、Copilot CLI の `client.kind` は `copilot-cli`、`experiment.id` は `baseline` とした。
- `validate-resource-attributes` は必須キー欠落と不正な `key=value` 形式を error、推奨値外の `client.kind` と `experiment.id` を warning として扱う。
- M3 検証として `dotnet build CopilotAgentObservability.slnx` と `dotnet test CopilotAgentObservability.slnx` が成功した。

## 2026-04-25: M4 検証結果
- `dotnet build CopilotAgentObservability.slnx` は成功した。警告 0、エラー 0。
- `dotnet test CopilotAgentObservability.slnx --no-build` は成功した。Config CLI tests は 18 件合格、失敗 0、スキップ 0。
- `dotnet run --project src\CopilotAgentObservability.AppHost\CopilotAgentObservability.AppHost.csproj --launch-profile https` で AppHost を起動し、`https://localhost:17100` が HTTP 200 を返すことを確認した。確認後、起動した AppHost プロセスは停止した。
- VS Code GitHub Copilot Chat からの trace 取り込み、span tree、token usage、duration、error、prompt / response / tool arguments / tool results、`client.kind=vscode-copilot-chat`、`experiment.id=baseline` は、このセッションから VS Code Copilot Chat を操作して実送信できないため未確認。
- 手動ライブ確認では、確認日時、VS Code version、GitHub Copilot Chat extension version、設定値、実行した依頼内容、Aspire Dashboard 上の trace id または識別情報、確認できた項目、未確認項目と理由を記録する。
