# Detailed Specification

この文書は、`docs/requirements.md` を上位要件として、現在の実装・検証フェーズの詳細仕様を定義する。
README や既存実装に本書と異なる記述がある場合、`docs/requirements.md` と本書を優先する。

## 1. 現在のフェーズ

現在の主作業は Phase 1: ローカル Langfuse PoC である。

Phase 0: ローカル Aspire Dashboard 疎通確認は完了済み背景として扱う。
Phase 0 では、VS Code GitHub Copilot Chat から Aspire Dashboard へ OTLP HTTP 送信できることを確認し、Node/Electron 側のローカル開発証明書問題を避けるため `http` launch profile を主手順とした。

Phase 1 では、ローカル self-host Langfuse に VS Code GitHub Copilot Chat と GitHub Copilot CLI の OTel を直接送信し、Langfuse 上で trace、prompt、response、tool call、token usage を確認する。
Phase 1 の主目的は、VS Code GitHub Copilot Chat / GitHub Copilot CLI の公式 OTel 出力を Langfuse に取り込み、trace / prompt / response / tool call / token usage を確認することである。

VS Code Agent Debug / Chat Debug View は、開発者が個別セッションを調査するための手動デバッグ機能として扱う。
本リポジトリでは、同等機能の UI や VS Code 内部ログ解析機能を実装しない。

## 2. Phase 1 の既定構成

### 2.1 実行基盤

Phase 1 の既定 PoC 実行基盤は Docker Desktop 上の Langfuse self-host Docker Compose とする。
Langfuse self-host 構成は Langfuse v3 の公式 Docker Compose 手順を前提にする。

既定 URL は以下とする。

| 用途 | URL |
| --- | --- |
| Langfuse UI | `http://localhost:3000` |
| Langfuse OTLP endpoint | `http://localhost:3000/api/public/otel` |
| Langfuse OTLP traces endpoint | `http://localhost:3000/api/public/otel/v1/traces` |

Docker Desktop を既定とする。
WSL2 Docker は Windows 側 VS Code / Copilot CLI から `localhost:3000` に到達できることを別途確認できる場合の代替候補とする。
社内サーバーは複数端末検証や組織展開の候補であり、Phase 1 の既定にはしない。

### 2.2 送信方式

Phase 1 では、VS Code GitHub Copilot Chat / GitHub Copilot CLI から Langfuse に直接 OTLP HTTP 送信する。
OTel Collector は Phase 1 の必須構成にしない。

Langfuse 向け OTLP 送信では HTTP を使用する。
Langfuse OTel integration は gRPC を未サポートとしているため、gRPC は Phase 1 の送信方式にしない。

### 2.3 認証

Langfuse の OTLP endpoint は Basic Auth を要求する。
Langfuse の public key と secret key を `public:secret` 形式で Base64 encode し、`OTEL_EXPORTER_OTLP_HEADERS` に設定する。

```powershell
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("<public-key>:<secret-key>"))
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel"
$env:OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $auth,x-langfuse-ingestion-version=4"
```

signal-specific 設定が必要な exporter では、trace endpoint と trace headers を使用する。

```powershell
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("<public-key>:<secret-key>"))
$env:OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:3000/api/public/otel/v1/traces"
$env:OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Basic $auth,x-langfuse-ingestion-version=4"
```

認証情報は repository に保存しない。
API key、Base64 化済み header、Langfuse 管理者パスワード、Docker Compose の secret は commit してはならない。

## 3. クライアント設定

### 3.1 VS Code GitHub Copilot Chat

VS Code GitHub Copilot Chat の OTel 設定では、Phase 1 の Langfuse OTLP endpoint を指定する。

```json
{
  "github.copilot.chat.otel.enabled": true,
  "github.copilot.chat.otel.exporterType": "otlp-http",
  "github.copilot.chat.otel.otlpEndpoint": "http://localhost:3000/api/public/otel",
  "github.copilot.chat.otel.captureContent": true
}
```

認証 header は VS Code settings だけで表現できない場合があるため、環境変数で渡す。
VS Code GitHub Copilot Chat では環境変数が settings より優先されるため、手動ライブ確認では VS Code プロセスに渡された OTel 関連環境変数も確認対象にする。

```powershell
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("<public-key>:<secret-key>"))
$env:COPILOT_OTEL_ENABLED="true"
$env:COPILOT_OTEL_ENDPOINT="http://localhost:3000/api/public/otel"
$env:COPILOT_OTEL_CAPTURE_CONTENT="true"
$env:OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $auth,x-langfuse-ingestion-version=4"
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=example-user,user.email=user@example.com,team.id=platform,department=engineering,client.kind=vscode-copilot-chat,experiment.id=baseline"
```

### 3.2 GitHub Copilot CLI

GitHub Copilot CLI では、以下の環境変数を使用する。

```powershell
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("<public-key>:<secret-key>"))
$env:COPILOT_OTEL_ENABLED="true"
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel"
$env:OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $auth,x-langfuse-ingestion-version=4"
$env:OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT="true"
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=example-user,user.email=user@example.com,team.id=platform,department=engineering,client.kind=copilot-cli,experiment.id=baseline"
```

必要に応じて、GitHub Copilot CLI の file exporter を診断用途に使用する。
file exporter は OTLP export 経路と Copilot CLI の OTel emit 自体を切り分けるための補助であり、Phase 1 の主送信経路ではない。

## 4. Resource Attributes

Phase 1 でも Phase 0 と同じ必須 Resource Attributes を維持する。

```text
user.id
user.email
team.id
department
client.kind
experiment.id
```

`client.kind` の推奨値は以下とする。

```text
vscode-copilot-chat
copilot-cli
```

`experiment.id` の初期推奨値は `baseline` とする。

必要に応じて、以下の推奨属性を追加する。

```text
repo.name
workspace.name
agent.variant
skill.version
mcp.profile
cli.wrapper.version
task.category
```

## 5. セキュリティとデータ扱い

Phase 1 はローカル限定 PoC とし、Langfuse に投入するデータは合成データまたは検証用データを基本とする。
実データ、機密情報、顧客データ、秘密情報を含む prompt / response / tool arguments / tool results は投入しない。

Phase 1 では content capture を有効化するが、masking / redaction 実装は行わない。
masking / redaction が必要になる実データ検証や共有環境検証は Phase 1 の既定スコープ外とする。

Phase 1 の保持期間は、content capture データと full trace を 30 日上限の目安とする。
不要になったローカル Langfuse データは Docker volume の削除を含む手順で削除できる状態にする。

共有環境や社内サーバーで運用する場合は、アクセス権、削除方法、保持期間、利用者周知を別途定義してから実施する。

## 6. 非スコープ

Phase 1 の既定スコープでは以下を扱わない。

- Config CLI の既定 endpoint 変更
- Docker Compose ファイルの repository 追加
- OTel Collector 経由送信
- PostgreSQL / Ingestion API による生 OTel データ保存
- Collector での masking / redaction、sampling、属性付与
- 端末常駐 Collector.Agent / Collector.Tray / Collector.Updater
- 社内サーバーまたは共有環境での Langfuse 運用
- TLS 終端、SSO、共有アクセス権
- 実データを使う検証
- 独自 OTLP receiver
- 独自ログ収集エージェント
- 生 OTel データの独自ストレージ
- 独自可視化 UI
- VS Code Agent Debug View 相当の UI
- VS Code workspaceStorage / chatSessions 監視を主方式にすること
- VS Code 内部ログやローカル履歴の解析
- 改善案生成
- 改善効果判定
- patch / diff 生成
- commit / push / pull request 自動化

これらが必要になった場合は、実装前に `docs/spec.md` を更新する。

## 7. 検証方針

### 7.1 自動検証

今回の Phase 1 ドキュメント再編ではコードを変更しないため、`dotnet build` / `dotnet test` は必須にしない。
Config CLI、AppHost、プロジェクトファイル、依存関係に触れた場合は、`dotnet build CopilotAgentObservability.slnx` と `dotnet test CopilotAgentObservability.slnx` を実行する。

### 7.2 ローカル起動確認

ローカル起動確認では以下を確認する。

- Docker Desktop が起動している。
- Langfuse self-host Docker Compose が起動する。
- `http://localhost:3000` で Langfuse UI に到達できる。
- 初期ユーザー、organization、project、API key を作成できる。
- 不要になったデータを Docker volume ごと削除できる手順を確認できる。

### 7.3 手動ライブ確認

Copilot 実行に依存する挙動は、自動テストだけで保証しない。
Phase 1 の手動ライブ確認では、Langfuse UI で以下を確認する。

- VS Code GitHub Copilot Chat の trace が取り込まれる。
- GitHub Copilot CLI の trace または metrics が取り込まれる。
- prompt、response、tool arguments、tool results が確認できる。
- token usage、duration、error が確認できる。
- `client.kind` と `experiment.id` で trace を識別できる。

手動ライブ確認を実施した場合は、確認日時、実行環境、Langfuse 起動方式、設定値、Langfuse trace id または識別情報、確認できた項目、未確認項目を記録する。

## 8. 参考資料

- [VS Code: Monitor agent usage with OpenTelemetry](https://code.visualstudio.com/docs/copilot/guides/monitoring-agents)
- [GitHub Docs: GitHub Copilot CLI command reference](https://docs.github.com/ja/enterprise-cloud%40latest/copilot/reference/copilot-cli-reference/cli-command-reference)
- [Langfuse: OpenTelemetry for LLM Observability](https://langfuse.com/integrations/native/opentelemetry)
- [Langfuse: Docker Compose self-host deployment](https://langfuse.com/self-hosting/deployment/docker-compose)
