# Task Breakdown

この文書は `docs/spec.md` を実装・検証タスクに分解したチェックリストである。
現在の主作業は Phase 1: ローカル Langfuse PoC である。

## M0-M4: Phase 0 完了済み

- [x] .NET 10 ソリューション初期化
- [x] Aspire AppHost によるローカル Dashboard 起動確認
- [x] Config CLI による設定サンプル生成・Resource Attributes 検証
- [x] Phase 0 の `http` launch profile 方針を文書化
- [x] VS Code GitHub Copilot Chat から Aspire Dashboard への OTLP HTTP 表示をユーザー環境で確認
- [x] Phase 0 の未確認ライブ項目は既知制約として閉じ、Phase 1 の Langfuse 確認項目へ置き換える

## M5: Phase 1 ドキュメント再編

- [x] `docs/spec.md` を Phase 1: ローカル Langfuse PoC 中心に再構成する
- [x] `docs/task.md` を Phase 1 用チェックリストとして再作成する
- [x] `README.md` の現状フェーズと目的表現を Phase 1 に合わせる
- [x] `AGENTS.md` から存在しない計画文書への参照を削除する
- [x] `docs/requirements.md` の重複貼り付け残りを削除する
- [x] 完了済み review note を `docs/archive/review/` に移動する

## M6: Langfuse ローカル起動

- [x] Docker Desktop が起動していることを確認する
- [x] Langfuse 公式 repository を取得する
- [x] Docker Compose の secret をローカルで設定する
- [x] `docker compose up` で Langfuse self-host を起動する
- [x] `http://localhost:3000` で Langfuse UI に到達できることを確認する
- [x] 初期ユーザー、organization、project を作成する
- [x] project の public key / secret key を作成する
- [x] Langfuse 停止手順と Docker volume 削除手順を確認する

2026-05-04 時点で、`tmp/langfuse/.env` を作成し、`docker compose up -d --wait --wait-timeout 600` で Langfuse self-host を起動した。
`http://localhost:3000` への到達、`demo@langfuse.com` / `password` でのログイン、`Seed Org` / `Seed Project` の表示、`Project API Keys` 画面での API key 作成済み表示を確認した。
停止は `docker compose down`、volume 削除込みは `docker compose down -v` を使う。

## M7: Phase 1 クライアント設定

- [x] VS Code Agent Debug / Chat Debug View は手動デバッグ用途であり、Phase 1 の成果物にしないことを確認する
- [x] public key と secret key から Basic Auth header を生成する
- [x] `OTEL_EXPORTER_OTLP_HEADERS` に `Authorization=Basic <base64>` と `x-langfuse-ingestion-version=4` を設定する
- [x] signal-specific 設定が必要な場合に備え、`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` と `OTEL_EXPORTER_OTLP_TRACES_HEADERS` の値を確認する
- [x] VS Code GitHub Copilot Chat の OTel settings を Langfuse endpoint に合わせる
- [x] VS Code から Langfuse へ直接 OTLP HTTP 送信する設定を確認する
- [x] VS Code プロセスに渡す OTel 関連環境変数を確認する
- [x] GitHub Copilot CLI の OTel 環境変数を Langfuse endpoint に合わせる
- [x] Copilot CLI から Langfuse へ直接 OTLP HTTP 送信する設定を確認する
- [x] `OTEL_RESOURCE_ATTRIBUTES` に必須属性を設定する
- [x] `OTEL_RESOURCE_ATTRIBUTES` に `user.id`, `user.email`, `team.id`, `department`, `client.kind`, `experiment.id` を設定する
- [x] `client.kind=vscode-copilot-chat` と `client.kind=copilot-cli` を使い分ける
- [x] content capture を有効化し、合成データのみで検証する

2026-05-04 時点で、Config CLI に Phase 1 向けの `langfuse-*` 生成コマンドを追加した。VS Code プロセスへの実反映とライブ確認は M8 で未完了である。
`global.json` に `rollForward: latestFeature` と `allowPrerelease: true` を明示し、インストール済み SDK `10.0.300-preview.0.26177.108` で `dotnet build CopilotAgentObservability.slnx` と `dotnet test CopilotAgentObservability.slnx` が成功することを確認した。

2026-05-05 時点で、VS Code GitHub Copilot Chat と GitHub Copilot CLI の Langfuse 直接 OTLP HTTP 送信をユーザー環境で確認した。
VS Code 側は `client.kind=vscode-copilot-chat`、CLI 側は `client.kind=copilot-cli`、両方で `experiment.id=baseline` を Langfuse 上で確認した。
初回 CLI 側 trace にはローカル context 断片が含まれたため、追加で `C:\Users\mwam0\Documents\Codex\otel-synthetic-cli-check` の合成 fixture だけを置いたディレクトリで確認した。
追加確認 trace `c9d55a6b5571c7d8e8fa18e861c93db8` では、合成 fixture の `README.md` のみが読み取られ、旧リポジトリ名、`docs/memo.json`、`current_file_content`、`recently_viewed_code_snippets` は検出されなかった。

## M8: Phase 1 手動ライブ確認

- [x] VS Code GitHub Copilot Chat の trace が Langfuse に取り込まれることを確認する
- [x] GitHub Copilot CLI の trace または metrics が Langfuse に取り込まれることを確認する
- [x] prompt / response / tool arguments / tool results が確認できることを確認する
- [x] token usage、duration、error が確認できることを確認する
- [x] `client.kind=vscode-copilot-chat` と `client.kind=copilot-cli` を識別できることを確認する
- [x] `experiment.id=baseline` で trace を識別できることを確認する
- [x] VS Code Agent Debug View ではなく Langfuse 上の trace として確認できた証跡を記録する
- [x] 確認日時、実行環境、Langfuse 起動方式、設定値、trace id または識別情報、確認できた項目、未確認項目を記録する

2026-05-05 に、Docker Desktop 上の Langfuse self-host (`http://localhost:3000`) で手動ライブ確認を実施した。
VS Code trace `5d81e50cca0eb67ac68248a2b27e4f7d` では、`client.kind=vscode-copilot-chat`、`experiment.id=baseline`、prompt、response、tool span、duration、token usage を確認した。
代表値として root / agent duration は `1m 3s`、agent token usage は `144,297 -> 7,016 (sum 151,313)`、generation duration は `11.22s`、generation token usage は `26,353 -> 827 (sum 27,688)` だった。
CLI 側では `client.kind=copilot-cli`、`experiment.id=baseline`、service `github-copilot` / version `1.0.40`、latency `0.28s`、token usage `4,371 -> 3 (sum 4,374)` を確認した。
別の CLI agent trace として `invoke_agent`、latency `3.52s`、token usage `33,818 -> 120 (sum 33,980)` も確認した。
追加確認として、`C:\Users\mwam0\Documents\Codex\otel-synthetic-cli-check` に合成 fixture の `README.md` だけを置き、GitHub Copilot CLI を再実行した。
trace `c9d55a6b5571c7d8e8fa18e861c93db8` では、`client.kind=copilot-cli`、`experiment.id=baseline`、service `github-copilot` / version `1.0.40`、prompt / response、tool span、duration、token usage を確認した。
同 trace の observation は `invoke_agent`、`chat gpt-5.3-codex`、`report_intent`、`view`、`chat gpt-5.3-codex` で、`view` は `C:\Users\mwam0\Documents\Codex\otel-synthetic-cli-check\README.md` のみを読んだ。
ClickHouse 上の検索で、同 trace 内の旧リポジトリ名、`docs/memo.json`、`current_file_content`、`recently_viewed_code_snippets` は 0 件、synthetic path は 3 件、`Synthetic Fixture` は 2 件だった。
代表値として `invoke_agent` の latency は `8799ms`、token usage は `16,921 -> 233 (total 34,034)`、最終 generation の latency は `1997ms`、token usage は `192 -> 57 (total 17,046)` だった。

## Follow-up

- [ ] Config CLI の既定 endpoint が古い Phase 0 HTTPS 系の値のままなので、別タスクで Phase 0 HTTP endpoint または Phase 1 Langfuse endpoint へ切り替えるか判断する
- [ ] Phase 1 で直接送信が安定しない場合、OTel Collector 経由送信を次フェーズとして仕様化する
- [ ] 実データ、共有環境、社内サーバー検証が必要になった場合、retention、アクセス権、masking / redaction、利用者周知を先に仕様化する
