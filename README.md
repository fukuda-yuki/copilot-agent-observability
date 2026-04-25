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

