# Requirements: GitHub Copilot Chat / CLI の OTel データを活用した Agent / MCP / Skills / CLI 改善基盤

この文書は 要件定義と、詳細仕様化前に確認した判断を管理する。
プロダクト仕様・実装方針・優先順位の正は `docs/spec.md` とし、矛盾がある場合は原則 `docs/spec.md` を優先する。

以下、そのまま `requirements.md` として渡せる粒度で出力します。
公開事例としては、**VS Code Copilot Chat / Copilot CLI → OTel → Langfuse** はかなり近い技術記事が既にあります。特に Copilot CLI の記事は「Skills やカスタマイズ効果を OTel で定量評価する」という今回の目的にかなり近いです。([Zenn][1])

---

## 1. 背景

GitHub Copilot Chat および GitHub Copilot CLI は OpenTelemetry による観測データの出力に対応している。
VS Code Copilot Chat は traces / metrics / events を出力でき、agent interaction、LLM call、tool execution、token usage を観測できる。出力されるシグナル名・属性は OTel GenAI Semantic Conventions に従う。([Visual Studio Code][2])

GitHub Copilot CLI も OpenTelemetry による traces / metrics の出力に対応しており、agent interactions、LLM calls、tool executions、token usage を観測できる。こちらも OTel GenAI Semantic Conventions に従う。([GitHub Docs][3])

本プロジェクトでは、これらの OTel データを収集・分析し、GitHub Copilot の利用量把握ではなく、**Agent / MCP / Skills / CLI の設計改善**に利用する。

---

## 2. 目的

本基盤の目的は、GitHub Copilot Chat / GitHub Copilot CLI の実行過程を OTel で収集し、エージェントの効率化・デバッグ・トークン改善に活用することである。

具体的には、以下を実現する。

* Agent / MCP / Skills / CLI の挙動を trace 単位で確認できるようにする
* LLM 呼び出し回数、tool call、tool arguments、tool results、token usage、duration、error を分析できるようにする
* トークン消費や tool call の無駄を検出できるようにする
* Instructions / Skills / Agent 定義 / MCP tool schema / CLI wrapper の改善候補を抽出できるようにする
* 改善前後を `experiment.id` 等で比較し、定量評価できるようにする
* 将来的には、観測データを改善エージェントに読ませ、改善レポートおよび修正差分を生成させる

---

## 3. 非目的

以下は本プロジェクトの主目的ではない。

* 組織全体の Copilot 利用量把握
* 課金・コスト配賦
* 経営向け利用状況ダッシュボード
* 監査ログ基盤
* DLP / 機密情報検査
* Claude Code の本番収集
* Visual Studio 2026 の収集

利用状況の追跡は GitHub 公式 API で十分に実施可能なため、本基盤では主目的に含めない。

Claude Code は本番収集対象ではなく、可観測性設計や運用事例の参考として扱う。

---

## 4. 対象

### 4.1 収集対象

| 対象                          | 扱い   | 備考                                                                  |
| --------------------------- | ---- | ------------------------------------------------------------------- |
| VS Code GitHub Copilot Chat | 必須   | Agent mode / tool execution / prompt / response / token usage の観測対象 |
| GitHub Copilot CLI          | 必須   | CLI 経由の agent 実行、tool call、subagent、token usage の観測対象               |
| Claude Code                 | 参考のみ | 本PoCの直接収集対象外                                                        |
| Visual Studio 2026          | 対象外  | 今回は VS Code と CLI に限定                                               |

---

## 5. 基本方針

### 5.1 利用状況追跡ではなく、Agent改善を主目的にする

利用者数、利用回数、日次アクティブユーザーなどの集計は本基盤の主目的ではない。

本基盤では、以下のような問いに答えることを重視する。

* なぜこの Agent は tool call が多いのか
* なぜ同じファイルを何度も読み直しているのか
* なぜ `search` / `grep` / `rg` / `readFile` 相当の探索が過剰なのか
* なぜ MCP tool の引数を誤るのか
* tool result が長すぎて token を浪費していないか
* system prompt / instructions が肥大化していないか
* Skills 化したことで token / turn count / tool call count は減ったか
* CLI 経由の実行は VS Code Chat と比べて効率が悪くないか
* 改善前後で trace duration、input tokens、tool call count、error rate が改善したか

---

## 6. 推奨アーキテクチャ

### 6.1 Phase 0: ローカル疎通確認

最初はローカル一台で疎通確認する。

```text
VS Code GitHub Copilot Chat
        ↓ OTLP
Aspire Dashboard
```

目的は以下。

* OTel が出力されることを確認する
* trace tree が見えることを確認する
* `invoke_agent` / `chat` / `execute_tool` の階層が確認できることを確認する
* content capture 有効時に prompt / response / tool arguments / tool results が取得できることを確認する

VS Code 公式ドキュメントでは、Aspire Dashboard は local development 向けの最も簡単な選択肢として紹介されている。([Visual Studio Code][2])

### 6.2 Phase 1: ローカル Langfuse PoC

本命の PoC では Langfuse を使用する。

```text
VS Code GitHub Copilot Chat
GitHub Copilot CLI
        ↓ OTLP
Langfuse
```

Langfuse は open-source LLM observability platform であり、OTLP ingestion と OTel GenAI Semantic Conventions 対応が公式ドキュメントでも示されている。([Visual Studio Code][2])

この Phase では以下を確認する。

* VS Code Copilot Chat の trace が Langfuse に入る
* Copilot CLI の trace が Langfuse に入る
* prompt / response / tool arguments / tool results が確認できる
* token usage が確認できる
* tool call の名前、引数、結果、duration、error が確認できる
* `experiment.id` による baseline / 改善版の比較ができる

### 6.3 Phase 2: 組織展開向け Collector 構成

組織展開時は、クライアントから Langfuse に直接送信せず、OTel Collector を中継する。

```text
各ユーザー端末
  ├─ VS Code GitHub Copilot Chat
  └─ GitHub Copilot CLI
        ↓ OTLP
社内 OTel Collector
        ↓
Langfuse
```

将来的には必要に応じて以下に fan-out する。

```text
社内 OTel Collector
  ├─ Langfuse
  ├─ Grafana / Tempo
  ├─ Loki
  └─ 集計用DB
```

Collector を挟む理由は以下。

* 認証を集約できる
* マスキング処理を後付けしやすい
* サンプリングを制御できる
* 送信先を切り替えやすい
* Langfuse と Grafana 等に同時送信しやすい
* 組織・チーム属性を付与しやすい
* 将来 Claude Code 等を追加しやすい

---

## 7. 可視化・分析基盤の方針

### 7.1 第一候補: Langfuse

今回の目的では、Grafana より Langfuse を優先する。

理由は、本基盤の目的が SRE 的なメトリクス監視ではなく、LLM Agent の実行過程の分析であるため。

Langfuse で重視する分析対象は以下。

* trace tree
* prompt
* response
* system prompt
* tool schema
* tool arguments
* tool results
* token usage
* duration
* error
* evaluation score
* experiment / dataset

Langfuse の GitHub リポジトリでは、Langfuse は LLM observability、metrics、evals、prompt management、datasets などを提供する open source LLM engineering platform と説明されている。([GitHub][4])

### 7.2 Grafana / Tempo / Loki / Mimir の扱い

Grafana 系は初期PoCの第一候補にはしない。

ただし、将来的に以下が必要になった場合は追加する。

* tool別 p95 latency
* tool別 error rate
* 日次 token 推移
* client.kind 別の trace duration 推移
* team.id 別の aggregate metrics
* 長期メトリクス監視
* アラート

### 7.3 PostgreSQL の扱い

PostgreSQL は生 OTel の主ストレージとしては扱わない。

利用する場合は、以下の用途に限定する。

* 集計済みサマリ
* 改善レポートの保存
* trace id と改善チケットの対応管理
* 実験条件と結果の管理
* マスキング済みデータの検索用テーブル

---

## 8. 収集要件

### 8.1 共通で収集する情報

PoC では最大収集を前提にする。

収集対象は以下。

* trace
* metrics
* events
* prompt content
* response content
* system prompt
* tool schema
* tool arguments
* tool results
* token usage
* model information
* duration
* error information
* session id
* user id
* team id
* client kind
* experiment id

### 8.2 VS Code GitHub Copilot Chat

VS Code Copilot Chat では以下を有効化する。

```json
{
  "github.copilot.chat.otel.enabled": true,
  "github.copilot.chat.otel.exporterType": "otlp-http",
  "github.copilot.chat.otel.otlpEndpoint": "http://localhost:3000/api/public/otel",
  "github.copilot.chat.otel.captureContent": true
}
```

VS Code Copilot Chat は既定では prompt content、responses、tool arguments を収集しない。
`github.copilot.chat.otel.captureContent` または `COPILOT_OTEL_CAPTURE_CONTENT=true` を有効にすると、full prompt messages、response messages、system prompts、tool schemas、tool arguments、tool results が span attributes に含まれる。([Visual Studio Code][2])

### 8.3 GitHub Copilot CLI

Copilot CLI では以下の環境変数を使用する。

```powershell
$env:COPILOT_OTEL_ENABLED="true"
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel"
$env:OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT="true"
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=example-user,team.id=platform,client.kind=copilot-cli,experiment.id=baseline"
```

GitHub Copilot CLI の OTel は既定で off であり、`COPILOT_OTEL_ENABLED=true`、`OTEL_EXPORTER_OTLP_ENDPOINT`、または `COPILOT_OTEL_FILE_EXPORTER_PATH` のいずれかで有効化される。([GitHub Docs][5])

---

## 9. Resource Attributes 要件

### 9.1 必須属性

`OTEL_RESOURCE_ATTRIBUTES` に以下を設定する。

```text
user.id
user.email
team.id
department
client.kind
experiment.id
```

例:

```powershell
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=123456,user.email=user@example.com,team.id=platform,department=engineering,client.kind=vscode,experiment.id=baseline"
```

### 9.2 推奨属性

可能であれば以下も付与する。

```text
repo.name
workspace.name
agent.variant
skill.version
mcp.profile
task.category
```

例:

```powershell
$env:OTEL_RESOURCE_ATTRIBUTES="user.id=123456,team.id=platform,client.kind=vscode,repo.name=example-repo,agent.variant=default,skill.version=v1,experiment.id=baseline"
```

### 9.3 experiment.id の利用方針

Agent / Skills / MCP / CLI 改善では、改善前後の比較が必要になる。

そのため、以下のように `experiment.id` を設定する。

```text
baseline
skill-v1
skill-v2
mcp-result-shaping-v1
instructions-slim-v1
cli-wrapper-v1
```

比較対象の例:

```text
baseline vs skill-v2
baseline vs instructions-slim-v1
skill-v1 vs skill-v2
mcp-result-shaping-v1 vs mcp-result-shaping-v2
```

---

## 10. 分析ビュー要件

### 10.1 Agent Trace Review

目的:

```text
1回の依頼が、どのように実行されたかを trace tree で確認する。
```

見る情報:

* root span
* `invoke_agent`
* `chat`
* `execute_tool`
* tool name
* tool arguments
* tool results
* token usage
* duration
* error
* prompt
* response

確認する問い:

* 不要な tool call はないか
* 同じ tool call を繰り返していないか
* 同じファイルを何度も読んでいないか
* LLM 呼び出し回数が多すぎないか
* tool arguments は妥当か
* tool results は長すぎないか
* system prompt が肥大化していないか

---

### 10.2 Tool / MCP Quality

目的:

```text
MCP tool や内部 tool の品質を評価する。
```

見る情報:

* tool別 call count
* tool別 error count
* tool別 average duration
* tool別 p95 duration
* tool別 result size
* tool別 token impact
* tool別 repeated call
* tool別 permission result

確認する問い:

* tool description が曖昧ではないか
* tool schema が不足していないか
* tool result が冗長すぎないか
* tool を分割すべきか
* tool を統合すべきか
* 権限確認や permission error が多すぎないか
* timeout が多くないか

---

### 10.3 Prompt / Skill Effectiveness

目的:

```text
Instructions / Skills / Agent 定義の改善効果を評価する。
```

見る情報:

* `experiment.id`
* system prompt size
* prompt size
* input tokens
* output tokens
* turn count
* tool call count
* trace duration
* error count
* success / failure

確認する問い:

* Skill 化によって system prompt が軽くなったか
* tool call count は減ったか
* turn count は減ったか
* input tokens は減ったか
* 失敗率は増えていないか
* 応答品質は下がっていないか
* 代表タスクの再現性は上がったか

---

### 10.4 CLI Behavior

目的:

```text
GitHub Copilot CLI の挙動を VS Code Copilot Chat と比較する。
```

見る情報:

* `client.kind=copilot-cli`
* command / shell 系 tool call
* file operation
* search / glob / grep 系 tool call
* permission span
* error
* token usage
* trace duration

確認する問い:

* CLI では探索過多になっていないか
* shell / git / test 実行が多すぎないか
* CLI 向け instructions が必要か
* CLI だけ失敗する workflow があるか
* CLI wrapper で環境変数や前提情報を補うべきか

---

## 11. Token Optimization Agent 要件

### 11.1 目的

Token Optimization Agent は、Langfuse / OTel の trace を読み取り、Agent / MCP / Skills / Instructions / CLI の改善候補を抽出する。

最終的には、改善レポート、修正案、必要に応じて修正差分を生成する。

### 11.2 入力

Token Optimization Agent は以下を入力とする。

* Langfuse trace
* Langfuse observation
* OTel span attributes
* OTel span events
* token usage
* tool call list
* tool arguments
* tool results
* prompt / response
* system prompt
* error information
* `experiment.id`
* 対象リポジトリの Agent / Skills / Instructions / MCP 定義

### 11.3 出力

Token Optimization Agent は以下を出力する。

* token waste analysis report
* tool call analysis report
* prompt / instruction bloat analysis
* MCP tool improvement suggestion
* Skill split / merge suggestion
* Agent definition improvement suggestion
* CLI wrapper improvement suggestion
* markdown report
* patch / diff
* improvement score

### 11.4 検出ルール

Token Optimization Agent は以下のパターンを検出する。

| 検出パターン                               | 問題                                    | 改善対象                                    |
| ------------------------------------ | ------------------------------------- | --------------------------------------- |
| system prompt が大きい                   | 常時読み込み情報が多すぎる                         | Instructions / Agent / Skills           |
| input tokens が大きい                    | 文脈が肥大化している                            | Instructions / Skills / context pruning |
| tool result が大きい                     | tool が返しすぎ                            | MCP tool result shaping                 |
| 同じ tool call が繰り返される                 | Agent が迷っている                          | Agent 手順 / tool description             |
| 同じファイルを何度も読む                         | 情報配置が悪い                               | README / AGENTS.md / repo map           |
| search / grep / glob が多い             | 探索コストが高い                              | docs / repo map / instructions          |
| turn count が多い                       | 判断基準が曖昧                               | Agent 定義 / completion criteria          |
| tool error が多い                       | schema / permission / description が悪い | MCP tool / CLI wrapper                  |
| permission span が多い                  | 操作設計が非効率                              | 権限設計 / allowed actions                  |
| output tokens が少なく input tokens が大きい | 過剰入力                                  | context pruning / instruction split     |

### 11.5 修正対象

Token Optimization Agent は以下のファイル・構成を修正候補とする。

* `.github/copilot-instructions.md`
* `AGENTS.md`
* `instructions/*.instructions.md`
* `skills/**/SKILL.md`
* `agents/*.agent.md`
* MCP tool schema
* MCP tool description
* MCP tool result shaping logic
* CLI wrapper script
* README
* task.md
* repo map / architecture docs

### 11.6 権限

Token Optimization Agent に許可する操作は以下。

| 操作              | 許可 |
| --------------- | -: |
| trace の読み取り     |  可 |
| 改善レポート作成        |  可 |
| 修正差分生成          |  可 |
| ローカルファイル修正      |  可 |
| commit          |  可 |
| push            | 禁止 |
| pull request 作成 | 禁止 |
| merge           | 禁止 |
| 本番反映            | 禁止 |

---

## 12. 評価ループ

改善は以下のループで行う。

```text
1. baseline の trace を取得する
2. Token Optimization Agent が trace を分析する
3. token waste / tool waste / instruction bloat を検出する
4. 改善案を作成する
5. Agent / Skills / MCP / Instructions / CLI wrapper を修正する
6. 同じ代表タスクを再実行する
7. 改善後 trace を取得する
8. baseline と改善後を比較する
9. token_efficiency score を算出する
10. 改善レポートを保存する
```

### 12.1 比較指標

改善前後で以下を比較する。

* input tokens
* output tokens
* total tokens
* cache read tokens
* trace duration
* LLM call count
* turn count
* tool call count
* repeated tool call count
* tool error count
* permission count
* success / failure
* tokens per successful task

### 12.2 主指標

単純な token 削減だけを主指標にしない。

主指標は以下とする。

```text
tokens_per_successful_task
```

補助指標は以下。

```text
tool_calls_per_successful_task
turns_per_successful_task
duration_per_successful_task
errors_per_task
```

---

## 13. PoC 成功条件

### 13.1 OTel 収集の成功条件

* VS Code Copilot Chat の OTel 出力を取得できる
* GitHub Copilot CLI の OTel 出力を取得できる
* Langfuse に trace が取り込まれる
* `invoke_agent` / `chat` / `execute_tool` の span tree が見える
* prompt / response / tool arguments / tool results が見える
* token usage が見える
* `experiment.id` で trace を絞り込める

### 13.2 分析の成功条件

* 代表タスクの trace から token waste を3件以上検出できる
* tool call の過剰・重複・失敗を検出できる
* Instructions / Skills / MCP / CLI のどこを改善すべきか分類できる
* 改善レポートを markdown で出力できる
* 少なくとも1件について修正差分を生成できる

### 13.3 改善効果の成功条件

改善前後で以下のいずれかを達成する。

* input tokens が減少する
* tool call count が減少する
* turn count が減少する
* trace duration が短縮する
* tool error count が減少する
* tokens per successful task が改善する

---

## 14. 保持期間

初期PoCでは以下とする。

| データ                                               |      保持期間 |
| ------------------------------------------------- | --------: |
| prompt / response / tool arguments / tool results |       30日 |
| full trace                                        |       30日 |
| span metadata                                     |       90日 |
| aggregate metrics                                 |        1年 |
| 改善レポート                                            | 永続または手動削除 |
| 修正差分                                              |     Git管理 |

本番展開時には、マスキング済みデータの保持期間を別途定義する。

---

## 15. セキュリティ・機密情報の扱い

本要件定義では、機密情報のマスキング、DLP、同意取得、規程整備は詳細検討の対象外とする。

ただし、実装上は以下を後から追加できる構成とする。

* Collector での attribute filtering
* Collector での redaction
* Langfuse 送信前の masking
* trace sampling
* content capture の環境別切り替え
* 本番展開時の同意取得
* 保持期間ポリシー

VS Code Copilot Chat の content capture は、code、file contents、user prompts などの機密情報を含み得るため、trusted environment でのみ有効化すべきと公式ドキュメントでも注意されている。([Visual Studio Code][2])

---

## 16. 実装タスク案

### 16.1 Phase 0

* Aspire Dashboard をローカル起動する
* VS Code Copilot Chat の OTel を有効化する
* `captureContent=true` を有効化する
* trace tree を確認する
* 代表タスクを1〜3件実行する
* 取得できる span / attribute / event を整理する

### 16.2 Phase 1

* Langfuse をローカルまたは WSL2 上に構築する
* VS Code Copilot Chat から Langfuse に OTLP 送信する
* Copilot CLI から Langfuse に OTLP 送信する
* `OTEL_RESOURCE_ATTRIBUTES` を付与する
* `experiment.id` を付与する
* baseline trace を保存する

### 16.3 Phase 2

* 代表タスクセットを定義する
* baseline / 改善版を比較する
* Token Optimization Agent の分析プロンプトを作成する
* token waste 検出ルールを実装する
* 改善レポートを markdown 出力する
* 修正差分を生成する

### 16.4 Phase 3

* 社内 OTel Collector を構成する
* Collector 経由で Langfuse に送信する
* 認証方式を決める
* マスキング方式を決める
* 組織展開用の VS Code settings / 環境変数配布方式を決める

---

## 17. 未決事項

詳細仕様検討エージェントは以下を検討すること。

* Langfuse の self-host 構成
* WSL2 / Docker Desktop / 社内サーバーのどれを PoC 実行基盤にするか
* Copilot CLI の content capture 設定で取得できる具体的な属性
* VS Code Copilot Chat と Copilot CLI の属性差分
* Langfuse での trace 検索・export 方法
* Token Optimization Agent が Langfuse API を直接読むか、エクスポートJSONを読むか
* OTel Collector の設定
* 認証方式
* `OTEL_EXPORTER_OTLP_HEADERS` の配布方法
* `OTEL_RESOURCE_ATTRIBUTES` の自動生成方法
* user.id / user.email / team.id の付与方法
* 実験設計
* 代表タスクセット
* 改善レポートのフォーマット
* 修正差分生成の範囲
* commit ルール
* Push / PR 禁止の enforcement 方法

---

# 参考: 近い公開リポジトリ・技術記事

## 1. VS Code 公式: Monitor agent usage with OpenTelemetry

VS Code Copilot Chat の OTel 設定、収集される signals、content capture、Aspire Dashboard / Jaeger / Langfuse 連携例がまとまっている。今回の VS Code 側 PoC の一次情報として最重要。([Visual Studio Code][2])

## 2. microsoft/vscode-copilot-chat の monitoring docs

VS Code Copilot Chat の GitHub 側ドキュメント。Langfuse 連携設定、remote collector with authentication、file output、console output などの例がある。([GitHub][6])

## 3. GitHub Docs: Copilot CLI command reference

Copilot CLI の OTel 公式情報。Copilot CLI が traces / metrics を出力し、GenAI Semantic Conventions に従うこと、OTel が有効化される条件が書かれている。([GitHub Docs][3])

## 4. Zenn: GitHub Copilot Chat エージェントの振る舞いを OTel で分析する

日本語の実践記事。OTel の signals、trace / metrics / logs-events の役割、Copilot Chat の観測の流れを把握するのに有用。([Zenn][7])

## 5. Zenn: GitHub Copilot CLI も OTel で観測する

今回の要件に最も近い記事。Copilot CLI の trace を Langfuse に流し、`invoke_agent`、`chat`、`execute_tool`、token usage、tool call metrics を観測している。さらに、Skills やカスタマイズ効果を token、turn count、tool call pattern、duration で定量評価できると述べており、今回の Token Optimization / Agent改善構想にかなり近い。([Zenn][1])

## 6. Langfuse OpenTelemetry integration

Langfuse の OTel / GenAI Semantic Conventions 対応、attribute mapping の公式情報。Langfuse 側の受け口と属性設計を詰める際に参照する。([Langfuse][8])

## 7. Langfuse GitHub repository

Langfuse 本体の公開リポジトリ。LLM observability、metrics、evals、prompt management、datasets を扱う open source LLM engineering platform として実装されている。([GitHub][4])

## 8. microsoft/vscode Issue: Agent Observability based on OpenTelemetry

VS Code / Copilot Chat の Agent Observability に関するメタissue。trace-based trajectory visualization、debugging、monitoring、post-run analysis、multi-session tracking など、今回の方向性に近い論点が含まれている。Claude Code / LangSmith / Keywords AI などの関連事例にも触れている。([GitHub][9])

[1]: https://zenn.dev/microsoft/articles/f439e06d07123e "GitHub Copilot CLI も OTel で観測する"
[2]: https://code.visualstudio.com/docs/copilot/guides/monitoring-agents "Monitor agent usage with OpenTelemetry"
[3]: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference "GitHub Copilot CLI command reference - GitHub Docs"
[4]: https://github.com/langfuse/langfuse "GitHub - langfuse/langfuse:  Open source LLM engineering platform: LLM Observability, metrics, evals, prompt management, playground, datasets. Integrates with OpenTelemetry, Langchain, OpenAI SDK, LiteLLM, and more. YC W23 · GitHub"
[5]: https://docs.github.com/ja/enterprise-cloud%40latest/copilot/reference/copilot-cli-reference/cli-command-reference?utm_source=chatgpt.com "GitHub Copilot CLI コマンド リファレンス"
[6]: https://github.com/microsoft/vscode-copilot-chat/blob/main/docs/monitoring/agent_monitoring.md "vscode-copilot-chat/docs/monitoring/agent_monitoring.md at main · microsoft/vscode-copilot-chat · GitHub"
[7]: https://zenn.dev/microsoft/articles/6b22d233a9f0a2 "GitHub Copilot Chat エージェントの振る舞いを OTel で分析する"
[8]: https://langfuse.com/integrations/native/opentelemetry "OpenTelemetry (OTEL) for LLM Observability - Langfuse"
[9]: https://github.com/microsoft/vscode/issues/293225 "Meta: Agent Observability based on OpenTelemetry · Issue #293225 · microsoft/vscode · GitHub"
