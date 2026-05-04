# Knowledge Notes

この文書は実装時の補助知識、外部制約、検証メモを置く場所である。
プロダクト仕様・実装方針・優先順位の正は `docs/spec.md` とし、この文書は source of truth ではない。
`README.md` はプロジェクト背景・全体像・初期構想の参考資料として扱う。

## 現在の前提

- 現在の主作業は Phase 1: ローカル Langfuse PoC である。
- Phase 0: ローカル Aspire Dashboard 疎通確認は完了済み背景として扱う。
- Phase 1 の既定構成は Docker Desktop 上の Langfuse self-host Docker Compose とする。
- Phase 1 では VS Code GitHub Copilot Chat / GitHub Copilot CLI から Langfuse OTLP HTTP endpoint へ直接送信し、OTel Collector は必須にしない。
- Phase 1 では content capture を有効化するが、投入データは合成データまたは検証用データを基本にする。

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
- Phase 0 の AppHost 主手順は当初 `https` launch profile とし、Aspire Dashboard frontend は `https://localhost:17100`、OTLP/HTTP endpoint は `https://localhost:21025` とした。
- VS Code GitHub Copilot Chat の `otlp-http` 送信先は当初 `github.copilot.chat.otel.otlpEndpoint=https://localhost:21025` とした。
- ローカル疎通確認では `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` を採用し、OTLP API key header なしで送信できる構成にした。この設定は Phase 0 のローカル開発専用であり、共有環境や本番方針ではない。
- `http` launch profile は Aspire の未暗号化トランスポート制約によりそのままでは起動しないため、使用時に備えて `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true` を設定した。後続検証で VS Code GitHub Copilot Chat からの送信には `http` profile を主手順に変更した。
- M2 検証として `dotnet build CopilotAgentObservability.slnx` が成功した。
- M2 起動確認として `dotnet run --project src\CopilotAgentObservability.AppHost\CopilotAgentObservability.AppHost.csproj --launch-profile https` を実行し、`https://localhost:17100` が HTTP 200 を返すことを確認した。確認後、起動した AppHost プロセスは停止した。

## 2026-04-25: M3 Config CLI 実装結果
- Config CLI に `vscode-settings`、`copilot-cli-env`、`validate-resource-attributes` を追加した。
- M3 の出力既定値は当時の Phase 0 仕様に従い、OTLP endpoint は `https://localhost:21025`、Copilot CLI の `client.kind` は `copilot-cli`、`experiment.id` は `baseline` とした。
- `validate-resource-attributes` は必須キー欠落と不正な `key=value` 形式を error、推奨値外の `client.kind` と `experiment.id` を warning として扱う。
- M3 検証として `dotnet build CopilotAgentObservability.slnx` と `dotnet test CopilotAgentObservability.slnx` が成功した。

## 2026-04-25: M4 検証結果
- `dotnet build CopilotAgentObservability.slnx` は成功した。警告 0、エラー 0。
- `dotnet test CopilotAgentObservability.slnx --no-build` は成功した。Config CLI tests は 18 件合格、失敗 0、スキップ 0。
- `dotnet run --project src\CopilotAgentObservability.AppHost\CopilotAgentObservability.AppHost.csproj --launch-profile https` で AppHost を起動し、`https://localhost:17100` が HTTP 200 を返すことを確認した。確認後、起動した AppHost プロセスは停止した。
- VS Code GitHub Copilot Chat からの trace 取り込み、span tree、token usage、duration、error、prompt / response / tool arguments / tool results、`client.kind=vscode-copilot-chat`、`experiment.id=baseline` は、このセッションから VS Code Copilot Chat を操作して実送信できないため未確認。
- 手動ライブ確認では、確認日時、VS Code version、GitHub Copilot Chat extension version、設定値、実行した依頼内容、Aspire Dashboard 上の trace id または識別情報、確認できた項目、未確認項目と理由を記録する。

## 2026-04-26: Phase 0 HTTPS endpoint 切り分け
- VS Code / VS Code Insiders の GitHub Copilot Chat OTel 設定で `endpoint=https://localhost:21025` が有効になっていることはログで確認できたが、Aspire Dashboard に telemetry が表示されなかった。
- PowerShell から `https://localhost:21025/v1/logs` と `/v1/traces` へ送信した人工 OTLP telemetry は HTTP 200 となり、Aspire Dashboard の Structured Logs / Traces に表示されたため、Dashboard の OTLP 受信自体は動作していた。
- Node/Electron 相当の `fetch` では `https://localhost:21025/v1/logs` が `DEPTH_ZERO_SELF_SIGNED_CERT` で失敗した。VS Code GitHub Copilot Chat extension の OTLP exporter は Node/Electron 側の HTTP client を使うため、`https` profile のローカル開発証明書を信頼できず export に失敗する可能性が高い。
- ユーザーの手動確認により、AppHost を `http` launch profile で起動し、VS Code settings の `github.copilot.chat.otel.otlpEndpoint` を `http://localhost:19164` に変更すると Dashboard に表示されることを確認した。
- Phase 0 の主手順は `http` launch profile に変更する。frontend は `http://localhost:15090`、OTLP/gRPC は `http://localhost:19163`、OTLP/HTTP は `http://localhost:19164` を使う。
- `consolelogs` は AppHost 管理リソースの stdout/stderr 用であり、OTLP Logs の確認先ではない。OTLP Logs は `structuredlogs` で確認する。
- `tmp\otel-chat-logs.jsonl` の file exporter 出力では `scopeSpans=0`、`scopeMetrics=16`、`spanContext` を持つ log record が確認された。ログに `spanContext` が付いていても Traces 画面に表示される span とは限らないため、signal 種別に応じて Traces / Structured Logs / Metrics を確認する。

## 2026-04-30: M5 Phase 1 準備
- ユーザー確認により、Phase 1 の既定 PoC 実行基盤は Docker Desktop 上の Langfuse self-host Docker Compose とした。
- Phase 1 の送信経路は VS Code GitHub Copilot Chat / GitHub Copilot CLI から Langfuse OTLP HTTP endpoint への直接送信とし、OTel Collector は必須にしない。
- Langfuse UI は `http://localhost:3000`、OTLP endpoint は `http://localhost:3000/api/public/otel`、trace-specific endpoint は `http://localhost:3000/api/public/otel/v1/traces` を既定候補とした。
- Langfuse 認証は public key と secret key を Basic Auth 化し、`OTEL_EXPORTER_OTLP_HEADERS` または `OTEL_EXPORTER_OTLP_TRACES_HEADERS` で渡す方針とした。
- content capture は Phase 1 でも有効化するが、ローカル限定 PoC とし、合成データまたは検証用データを基本にする。保持期間は 30 日上限を目安とする。

## 2026-04-30: M6 Langfuse ローカル起動準備
- `Get-Command docker`、`where.exe docker`、Docker Desktop 既定インストールパス、Docker 関連プロセス、`winget list --name Docker` を確認したが、この PowerShell 環境では Docker CLI / Docker Desktop を検出できなかった。
- `Get-NetTCPConnection -LocalPort 3000` では既存の 3000 番利用は検出されなかった。
- Langfuse 公式 repository を `tmp/langfuse` に shallow clone した。取得 commit は `81e1ba312088e9bf10245fd2999dea82862c7fbf`。
- Docker Compose の `# CHANGEME` に対応する local secret と、headless initialization 用の初期 user / organization / project / API key 値を `tmp/langfuse/.env` に生成した。`.env` は Langfuse repository 側で ignored であり、API key、管理者パスワード、secret 値は記録しない。
- `docker version`、`docker compose version`、`docker compose up` は `docker` コマンド不在により実行不可だった。
- Langfuse 公式 Docker Compose 手順では、通常停止は `docker compose down`、volume 削除込みの停止は `docker compose down -v` とされている。
