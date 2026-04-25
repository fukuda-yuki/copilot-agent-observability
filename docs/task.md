# Task Breakdown

この文書は `docs/spec.md` を実装タスクに分解したチェックリストである。

## M0: 仕様・タスク整備

- [x] `README.md` を更新し、目的・対象範囲・ドキュメント参照先・現状フェーズを明記
- [x] `docs/spec.md` に C# / .NET 10 初期実装方針を追加
- [x] `docs/spec.md` に Phase 0: ローカル Aspire Dashboard 疎通確認の詳細仕様を追加
- [x] `docs/task.md` をマイルストーン形式に再構成
- [x] README と `docs/requirements.md` のズレは `docs/requirements.md` を優先し、README 修正を後続タスクとして明記

## M1: .NET 10 ソリューション初期化

- [x] `global.json` を追加し、.NET SDK 10 系を前提に固定する
- [x] ソリューションファイルを作成する
- [x] Aspire AppHost プロジェクトを作成する
- [x] Config CLI プロジェクトを作成する
- [x] Config CLI のテストプロジェクトを作成する
- [x] 全プロジェクトの Target Framework を `net10.0` にする
- [x] `dotnet build` が成功することを確認する

## M2: Aspire Phase 0 疎通基盤

- [x] AppHost から Aspire Dashboard をローカル起動できるようにする
- [x] VS Code GitHub Copilot Chat の OTLP endpoint として使う URL の確認手順を文書化する
- [x] trace tree の確認手順を文書化する
- [x] agent invocation、LLM call、tool call の確認手順を文書化する
- [x] token usage、duration、error の確認手順を文書化する
- [x] content capture 有効時の prompt / response / tool arguments / tool results の確認手順を文書化する
- [x] AppHost 起動確認を実施し、結果を記録する

## M3: 設定生成・検証 CLI

- [ ] VS Code settings JSON のサンプル出力コマンドを実装する
- [ ] PowerShell 用 GitHub Copilot CLI 環境変数スクリプトのサンプル出力コマンドを実装する
- [ ] `OTEL_RESOURCE_ATTRIBUTES` の必須キー欠落チェックを実装する
- [ ] `client.kind` の推奨値チェックを実装する
- [ ] `experiment.id` の推奨値チェックを実装する
- [ ] CLI がユーザー環境の設定ファイルや shell profile を自動編集しないことを確認する
- [ ] 設定生成と属性検証の単体テストを追加する
- [ ] `dotnet test` が成功することを確認する

## M4: 検証とレビュー

- [ ] `dotnet build` で .NET 10 ソリューション全体を検証する
- [ ] `dotnet test` で Config CLI の設定生成・検証ロジックを検証する
- [ ] Aspire Dashboard のローカル起動を確認する
- [ ] VS Code GitHub Copilot Chat から trace が取り込まれることを手動ライブ確認する
- [ ] span tree、token usage、duration、error を手動ライブ確認する
- [ ] prompt / response / tool arguments / tool results を手動ライブ確認する
- [ ] `client.kind=vscode-copilot-chat` と `experiment.id=baseline` を手動ライブ確認する
- [ ] 自動検証できない項目について、必要な証跡と未確認理由を記録する
- [ ] 変更規模に応じてレビューを実施し、必要であれば `docs/review/<milestone>.md` に記録する

## M5: Phase 1 準備

- [ ] Langfuse self-host 構成の候補を整理する
- [ ] Docker Desktop / WSL2 / 社内サーバーのどれを PoC 実行基盤にするか整理する
- [ ] Langfuse の OTLP endpoint と認証方式を整理する
- [ ] `OTEL_EXPORTER_OTLP_HEADERS` の扱いを整理する
- [ ] OTel Collector を Phase 1 で使うか整理する
- [ ] retention、アクセス権、削除方法の未決事項を整理する
- [ ] masking / redaction の必要範囲を整理する
- [ ] Phase 1 実装前に `docs/spec.md` を更新する

## Follow-up Documentation

- [ ] README の「改善候補を抽出する」「改善前後を定量評価する」という表現が `docs/requirements.md` の非目的とずれているため、別タスクで修正する
