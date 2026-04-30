# copilot-agent-observability

GitHub Copilot Chat / Copilot CLI の OpenTelemetry (OTel) データを収集・分析し、
Agent / MCP / Skills / CLI の改善に活用するための検証リポジトリです。

## 目的

- Copilot 実行過程を trace 単位で可視化する
- tool call、token usage、duration、error を分析する
- Instructions / Skills / Agent / MCP / CLI の改善候補を抽出する
- 改善前後を `experiment.id` で比較し、定量評価する

## 対象範囲

- 必須: VS Code GitHub Copilot Chat
- 必須: GitHub Copilot CLI
- 参考: Claude Code（本PoCの直接収集対象外）
- 対象外: Visual Studio 2026

## 現状フェーズ

現在は Phase 0: ローカル Aspire Dashboard 疎通確認です。
VS Code GitHub Copilot Chat からの OTLP 送信確認では、ローカル開発証明書による TLS 失敗を避けるため `http` launch profile を使用します。

```powershell
dotnet run --project src\CopilotAgentObservability.AppHost\CopilotAgentObservability.AppHost.csproj --launch-profile http
```

| 用途 | URL |
| --- | --- |
| Aspire Dashboard frontend | `http://localhost:15090` |
| Aspire Dashboard OTLP/HTTP endpoint | `http://localhost:19164` |

VS Code settings の送信先は `github.copilot.chat.otel.otlpEndpoint=http://localhost:19164` とします。
OTLP Logs は Dashboard の Console Logs ではなく Structured Logs で確認します。

