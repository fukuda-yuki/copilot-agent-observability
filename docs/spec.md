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

Phase 0 の主手順では `https` launch profile を使用する。

```powershell
dotnet run --project src\CopilotAgentObservability.AppHost\CopilotAgentObservability.AppHost.csproj --launch-profile https
```

Phase 0 の AppHost は以下のローカル URL を使用する。

| 用途 | URL |
| --- | --- |
| Aspire Dashboard frontend | `https://localhost:17100` |
| Aspire Dashboard OTLP/gRPC endpoint | `https://localhost:21024` |
| Aspire Dashboard OTLP/HTTP endpoint | `https://localhost:21025` |

VS Code GitHub Copilot Chat の `otlp-http` exporter には、Aspire Dashboard OTLP/HTTP endpoint を指定する。
ローカル疎通確認では、開発用途に限り `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` を設定し、OTLP API key header を要求しない。
この無認証設定は Phase 0 のローカル検証専用であり、本番展開や共有環境の方針ではない。

### 2.2 Config CLI

Config CLI は、開発者が Phase 0 の検証に必要な設定を再現しやすくするための補助 CLI である。

Config CLI は以下を提供する。

- VS Code settings JSON のサンプル出力
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
  "github.copilot.chat.otel.otlpEndpoint": "https://localhost:21025",
  "github.copilot.chat.otel.captureContent": true
}
```

`github.copilot.chat.otel.otlpEndpoint` の値は、実際に利用する Aspire Dashboard の OTLP endpoint に合わせて更新する。
上記 URL は AppHost の `https` launch profile に合わせた Phase 0 の既定値である。
Langfuse の `http://localhost:3000/api/public/otel` は Phase 1 以降の候補であり、Phase 0 の Aspire Dashboard 送信先としては使用しない。

`github.copilot.chat.otel.captureContent=true` を有効にすると、prompt、response、system prompt、tool schema、tool arguments、tool results が span attributes に含まれ得る。
この設定は機密情報やソースコードを収集し得るため、Phase 0 の信頼できるローカル環境でのみ有効化する。

### 3.2 GitHub Copilot CLI 環境変数

Phase 0 では、以下の環境変数を扱う。

```powershell
$env:COPILOT_OTEL_ENABLED="true"
$env:OTEL_EXPORTER_OTLP_ENDPOINT="https://localhost:21025"
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

初期実装では以下を扱わない。

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
- `https://localhost:17100` で Aspire Dashboard frontend に到達できる。
- `https://localhost:21025` を VS Code GitHub Copilot Chat の OTLP/HTTP endpoint として設定できる。

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

Aspire Dashboard では、Traces 画面で対象 trace を開き、以下を確認する。

- trace tree の親子関係
- agent invocation、LLM call、tool call に対応する span または span event
- token usage、duration、error に対応する attributes または events
- content capture 有効時の prompt、response、tool arguments、tool results
- `client.kind=vscode-copilot-chat` と `experiment.id=baseline` を含む Resource Attributes

## 6. Phase 1 への持ち越し事項

以下は Phase 1 開始前に詳細仕様を更新してから実装する。

- Langfuse self-host 構成
- Docker Desktop / WSL2 / 社内サーバーのどれを PoC 実行基盤にするか
- Langfuse の OTLP endpoint と認証方式
- `OTEL_EXPORTER_OTLP_HEADERS` の扱い
- OTel Collector を使用するか
- retention、アクセス権、削除方法
- masking / redaction の必要範囲
- Copilot CLI の実トレース確認を Phase 0 後半で行うか Phase 1 に含めるか
