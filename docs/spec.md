# Detailed Specification

この文書は、`docs/requirements.md` を上位要件として、初期実装の詳細仕様を定義する。
README や既存実装に本書と異なる記述がある場合、`docs/requirements.md` と本書を優先する。

## 1. 初期実装方針

初期実装の主言語は C# / .NET 10 とする。

### 1.1 技術方針

- Target Framework は `net10.0` とする。
- C# の言語バージョンは .NET 10 SDK 付属の既定値を使用する。
- ローカル検証基盤は .NET Aspire AppHost を中心に構成する。
- 初期マイルストーンは Phase 0: ローカル Aspire Dashboard 疎通確認とする。
- 初期実装では Langfuse 連携を直接実装しない。Langfuse は Phase 1 の後続マイルストーンで扱う。

### 1.2 .NET 側の責務

.NET 側は、以下の補助基盤を提供する。

- Aspire Dashboard を起動し、VS Code GitHub Copilot Chat からの OTLP 疎通を確認する AppHost
- VS Code settings と GitHub Copilot CLI 用環境変数のサンプルを生成・検証する補助 CLI
- 検証手順、期待する Resource Attributes、確認証跡の記録形式を管理するドキュメントまたは fixture

初期実装では、生 OTel データの独自受信、独自ストレージ、独自可視化 UI は実装しない。

## 2. 初期コンポーネント

### 2.1 AppHost

AppHost は、Phase 0 のローカル疎通確認を支援するための .NET Aspire AppHost である。

AppHost は以下を満たす。

- ローカルで Aspire Dashboard を起動できる。
- VS Code GitHub Copilot Chat の OTLP HTTP exporter から送信先として利用できる endpoint を確認できる。
- Agent invocation、LLM call、tool call、token usage、duration、error、content capture の確認に使える。

AppHost は、OTLP の独自 receiver を実装してはならない。
OTel の受信・表示は Aspire Dashboard の機能を利用する。

Phase 0 の主手順では `http` launch profile を使用する。

```powershell
dotnet run --project src\CopilotAgentObservability.AppHost\CopilotAgentObservability.AppHost.csproj --launch-profile http
```

Phase 0 の AppHost は以下のローカル URL を使用する。

| 用途 | URL |
| --- | --- |
| Aspire Dashboard frontend | `http://localhost:15090` |
| Aspire Dashboard OTLP/gRPC endpoint | `http://localhost:19163` |
| Aspire Dashboard OTLP/HTTP endpoint | `http://localhost:19164` |

VS Code GitHub Copilot Chat の `otlp-http` exporter には、Aspire Dashboard OTLP/HTTP endpoint を指定する。
VS Code / GitHub Copilot Chat extension は Node/Electron 側の HTTP client で OTLP を送信するため、`https` profile のローカル開発証明書を信頼できず export に失敗する場合がある。
Phase 0 のローカル疎通確認では、この TLS 要因を避けるため `http` profile を既定手順とする。
`https` profile の URL は `http` profile とは別に固定されており、frontend は `https://localhost:17100`、OTLP/gRPC は `https://localhost:21024`、OTLP/HTTP は `https://localhost:21025` である。
ローカル疎通確認では、開発用途に限り `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` を設定し、OTLP API key header を要求しない。
この無認証設定は Phase 0 のローカル検証専用であり、本番展開や共有環境の方針ではない。

### 2.2 Config CLI

Config CLI は、開発者が Phase 0 の検証に必要な設定を再現しやすくするための補助 CLI である。

Config CLI は以下を提供する。

- VS Code settings JSON のサンプル出力
- VS Code GitHub Copilot Chat 用 PowerShell 環境変数スクリプトのサンプル出力
- VS Code GitHub Copilot Chat の file exporter 診断用 settings JSON のサンプル出力
- PowerShell 用 GitHub Copilot CLI 環境変数スクリプトのサンプル出力
- `OTEL_RESOURCE_ATTRIBUTES` の必須キー欠落チェック
- `client.kind` と `experiment.id` の推奨値チェック

Config CLI は、ユーザー環境の VS Code settings や shell profile を自動編集してはならない。
出力されたサンプルを適用するかどうかは利用者が判断する。

### 2.3 Docs / Fixtures

Docs / Fixtures は、検証手順と期待結果を共有するための補助資料である。

以下を含める。

- Phase 0 の実行手順
- VS Code GitHub Copilot Chat から Aspire Dashboard に送信する設定例
- GitHub Copilot CLI の環境変数設定例
- 必須 Resource Attributes の一覧
- 手動ライブ確認の証跡として記録すべき項目

## 3. 外部インターフェース

### 3.1 VS Code GitHub Copilot Chat 設定

Phase 0 では、以下の VS Code settings key を扱う。

```json
{
  "github.copilot.chat.otel.enabled": true,
  "github.copilot.chat.otel.exporterType": "otlp-http",
  "github.copilot.chat.otel.otlpEndpoint": "http://localhost:19164",
  "github.copilot.chat.otel.captureContent": true
}
```

`github.copilot.chat.otel.otlpEndpoint` の値は、実際に利用する Aspire Dashboard の OTLP endpoint に合わせて更新する。
上記 URL は AppHost の `http` launch profile に合わせた Phase 0 の既定値である。
Langfuse の `http://localhost:3000/api/public/otel` は Phase 1 以降の候補であり、Phase 0 の Aspire Dashboard 送信先としては使用しない。

`github.copilot.chat.otel.captureContent=true` を有効にすると、prompt、response、system prompt、tool schema、tool arguments、tool results が span attributes に含まれ得る。
この設定は機密情報やソースコードを収集し得るため、Phase 0 の信頼できるローカル環境でのみ有効化する。

VS Code GitHub Copilot Chat の OTel 設定では、VS Code settings だけでなく環境変数も扱う。
環境変数が設定されている場合、settings に指定した endpoint や captureContent の値だけでは実際の exporter 設定を判断できないため、Phase 0 の手動ライブ確認では環境変数の有無も確認対象とする。

VS Code GitHub Copilot Chat に Phase 0 の Resource Attributes を付与して起動する場合は、以下の PowerShell 環境変数を使用する。

```powershell
$env:COPILOT_OTEL_ENABLED="true"
$env:COPILOT_OTEL_ENDPOINT="http://localhost:19164"
$env:COPILOT_OTEL_CAPTURE_CONTENT="true"
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=example-user,user.email=user@example.com,team.id=platform,department=engineering,client.kind=vscode-copilot-chat,experiment.id=baseline"
```

Dashboard に trace が表示されない場合は、OTLP export 経路と Copilot Chat の OTel emit 自体を分離するため、file exporter 診断を使用する。

```json
{
  "github.copilot.chat.otel.enabled": true,
  "github.copilot.chat.otel.exporterType": "file",
  "github.copilot.chat.otel.outfile": "tmp/copilot-chat-otel.jsonl",
  "github.copilot.chat.otel.captureContent": true
}
```

file exporter でも出力ファイルが作成または更新されない場合は、Dashboard/AppHost 以前に、VS Code 側で OTel emit が発生していない、または設定が有効化されていない状態として扱う。
file exporter で出力されるが Dashboard に telemetry が出ない場合は、OTLP endpoint、protocol、TLS、headers、環境変数優先、exporter error を優先して調査する。
`https` profile を使っている場合は、Node/Electron 側のローカル開発証明書信頼エラーを疑い、`http` profile で再確認する。
OTLP Logs は Aspire Dashboard の Console Logs ではなく Structured Logs で確認する。
Console Logs は AppHost 管理リソースの stdout/stderr を確認する画面である。
file exporter 出力に `scopeSpans` がなく logs または metrics のみが含まれる場合、Traces 画面に表示されないことがある。

### 3.2 GitHub Copilot CLI 環境変数

Phase 0 では、以下の環境変数を扱う。

```powershell
$env:COPILOT_OTEL_ENABLED="true"
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:19164"
$env:OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT="true"
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=example-user,user.email=user@example.com,team.id=platform,department=engineering,client.kind=copilot-cli,experiment.id=baseline"
```

`OTEL_EXPORTER_OTLP_ENDPOINT` の値は、実際の OTLP endpoint に合わせて更新する。
Config CLI はサンプル出力と検証を提供するが、環境変数を永続化してはならない。

### 3.3 必須 Resource Attributes

Phase 0 では、以下を必須 Resource Attributes とする。

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

## 4. 非スコープ

Phase 0 初期実装では以下を扱わない。

- 独自 OTLP receiver
- 生 OTel データの独自ストレージ
- 独自可視化 UI
- Langfuse self-host 構築
- OTel Collector
- masking / redaction 実装
- 改善案生成
- 改善効果判定
- patch / diff 生成
- commit / push / pull request 自動化

これらが必要になった場合は、実装前に `docs/spec.md` を更新する。

## 5. 検証方針

### 5.1 自動検証

自動検証では以下を確認する。

- `dotnet build` で .NET 10 ソリューション全体がビルドできる。
- `dotnet test` で Config CLI の設定生成・検証ロジックを確認できる。
- 必須 Resource Attributes の欠落を検出できる。
- `client.kind` と `experiment.id` の推奨値チェックが機能する。

### 5.2 ローカル起動確認

ローカル起動確認では以下を確認する。

- AppHost から Aspire Dashboard が起動する。
- VS Code GitHub Copilot Chat の OTLP endpoint として利用する URL を確認できる。
- `http://localhost:15090` で Aspire Dashboard frontend に到達できる。
- `http://localhost:19164` を VS Code GitHub Copilot Chat の OTLP/HTTP endpoint として設定できる。

### 5.3 手動ライブ確認

Copilot 実行に依存する挙動は、自動テストだけで保証しない。
以下は手動ライブ確認として扱う。

- VS Code GitHub Copilot Chat から trace が取り込まれること
- span tree を確認できること
- agent invocation、LLM call、tool call を確認できること
- token usage、duration、error を確認できること
- prompt、response、tool arguments、tool results を確認できること
- `client.kind=vscode-copilot-chat` と `experiment.id=baseline` を確認できること

手動ライブ確認を実施した場合は、確認日時、実行環境、設定値、確認できた項目、未確認項目を記録する。
設定値には、VS Code settings だけでなく、VS Code プロセスに渡された OTel 関連環境変数も含める。

Aspire Dashboard では、Traces 画面で対象 trace を開き、以下を確認する。

- trace tree の親子関係
- agent invocation、LLM call、tool call に対応する span または span event
- token usage、duration、error に対応する attributes または events
- content capture 有効時の prompt、response、tool arguments、tool results
- `client.kind=vscode-copilot-chat` と `experiment.id=baseline` を含む Resource Attributes

## 6. Phase 1: ローカル Langfuse PoC

Phase 1 では、ローカル self-host Langfuse に VS Code GitHub Copilot Chat と GitHub Copilot CLI の OTel を直接送信し、Langfuse 上で trace / prompt / response / tool call / token usage を確認する。

### 6.1 実行基盤

Phase 1 の既定 PoC 実行基盤は Docker Desktop 上の Langfuse self-host Docker Compose とする。
Langfuse self-host 構成は Langfuse v3 の公式 Docker Compose 手順を前提にする。

Phase 1 の既定 URL は以下とする。

| 用途 | URL |
| --- | --- |
| Langfuse UI | `http://localhost:3000` |
| Langfuse OTLP endpoint | `http://localhost:3000/api/public/otel` |
| Langfuse OTLP traces endpoint | `http://localhost:3000/api/public/otel/v1/traces` |

Docker Desktop は Phase 1 の既定とする。
WSL2 Docker は Windows 側 VS Code / Copilot CLI から `localhost:3000` に到達できることを別途確認できる場合の代替候補とする。
社内サーバーは複数端末検証や組織展開の候補であり、Phase 1 の既定にはしない。

### 6.2 送信方式と認証

Phase 1 では、VS Code GitHub Copilot Chat / GitHub Copilot CLI から Langfuse に直接 OTLP HTTP 送信する。
Langfuse 向け OTLP 送信では HTTP を使用し、gRPC は Phase 1 の送信方式にしない。

Langfuse の OTLP endpoint は Basic Auth を要求する。
Langfuse の public key と secret key を `public:secret` 形式で base64 encode し、以下のように `OTEL_EXPORTER_OTLP_HEADERS` に設定する。

```powershell
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel"
$env:OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <base64-public-secret>,x-langfuse-ingestion-version=4"
```

signal-specific 設定が必要な exporter では、以下を使用する。

```powershell
$env:OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:3000/api/public/otel/v1/traces"
$env:OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Basic <base64-public-secret>,x-langfuse-ingestion-version=4"
```

VS Code GitHub Copilot Chat の settings で endpoint を指定する場合は、Phase 1 では Langfuse OTLP endpoint を指定する。
認証 header を VS Code settings だけで表現できない場合は、環境変数で header を渡す。

```json
{
  "github.copilot.chat.otel.enabled": true,
  "github.copilot.chat.otel.exporterType": "otlp-http",
  "github.copilot.chat.otel.otlpEndpoint": "http://localhost:3000/api/public/otel",
  "github.copilot.chat.otel.captureContent": true
}
```

### 6.3 Resource Attributes

Phase 1 でも Phase 0 と同じ必須 Resource Attributes を維持する。

```text
user.id
user.email
team.id
department
client.kind
experiment.id
```

`client.kind` の推奨値は `vscode-copilot-chat` と `copilot-cli` とする。
`experiment.id` の初期推奨値は `baseline` とする。

```powershell
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=example-user,user.email=user@example.com,team.id=platform,department=engineering,client.kind=copilot-cli,experiment.id=baseline"
```

### 6.4 OTel Collector の扱い

Phase 1 では OTel Collector を必須構成にしない。
直接送信を主経路とし、Collector は以下の場合の後続候補として扱う。

- 認証 header の注入をクライアント側だけで安定運用できない場合
- 複数 backend への fan-out が必要になった場合
- masking / redaction、sampling、属性付与を中継層で行う必要が出た場合
- Phase 2 の組織展開構成を検証する場合

Phase 1 で直接送信に失敗した場合でも、まず endpoint、protocol、headers、Basic Auth、環境変数優先順位、exporter error を切り分ける。
Collector を導入して恒久回避する場合は、導入前に本書を更新する。

### 6.5 retention、アクセス権、削除

Phase 1 はローカル限定 PoC とし、Langfuse に投入するデータは合成データまたは検証用データを基本とする。
実データ、機密情報、顧客データ、秘密情報を含む prompt / response / tool arguments / tool results は投入しない。

Phase 1 の保持期間は、content capture データと full trace を 30 日上限の目安とする。
不要になったローカル Langfuse データは Docker volume の削除を含む手順で削除できる状態にする。
共有環境や社内サーバーで運用する場合は、アクセス権、削除方法、保持期間、利用者周知を別途定義してから実施する。

### 6.6 masking / redaction

Phase 1 では masking / redaction 実装を行わない。
content capture は有効化するが、投入データをローカル検証用に制限することでリスクを抑える。
masking / redaction が必要になる実データ検証や共有環境検証は Phase 1 の既定スコープ外とする。

### 6.7 Phase 1 手動ライブ確認

Phase 1 の手動ライブ確認では、Langfuse UI で以下を確認する。

- VS Code GitHub Copilot Chat の trace が取り込まれること
- GitHub Copilot CLI の trace または metrics が取り込まれること
- prompt、response、tool arguments、tool results が確認できること
- token usage、duration、error が確認できること
- `client.kind` と `experiment.id` で trace を識別できること

手動ライブ確認を実施した場合は、確認日時、実行環境、Langfuse 起動方式、設定値、Langfuse trace id または識別情報、確認できた項目、未確認項目を記録する。

## 7. Phase 1 以降への持ち越し事項

以下は Phase 1 の直接送信 PoC では扱わず、必要になった時点で詳細仕様を更新してから実装する。

- 社内サーバーまたは共有環境での Langfuse 運用
- TLS 終端、SSO、共有アクセス権
- OTel Collector 経由送信
- Collector での masking / redaction、sampling、属性付与
- 本番展開時の retention、アクセス権、削除方法
- 実データを使う検証の条件
- Copilot CLI の実トレース確認結果に基づく追加仕様
