# M2: Dashboard Dataset Contract

## Status

In progress.

## Objective

Sprint4 dashboard の view / panel / metric 要件を、Grafana-first dashboard prototype と static report の両方で使える dashboard dataset contract に落とし込む。

## Scope

- dashboard dataset の CSV / JSON schema を定義する。
- normalized measurement、diagnosis candidate、improvement candidate、auto-decision record、human review records から dashboard dataset に渡す列を定義する。
- Run Overview、Agent / Tool Behavior、Prompt / Skill / Instructions、Baseline vs Variant、Diagnosis / Improvement Loop、Collection Health、Outcome Linkage Candidate の各 view が必要とする列を対応付ける。
- `trace_id`、candidate id、auto-decision id、`evidence_ref` などの drilldown reference を sanitized reference として定義する。
- raw prompt / response / tool arguments / tool results、credential、secret、Base64 header、実 user identity を dashboard dataset に既定保存しないことを schema レベルで明記する。
- Grafana JSON dashboard prototype に渡しやすい time bucket、dimension、metric、status distribution の列を定義する。

## Non-goals

- dashboard dataset 生成 CLI の実装。
- Grafana JSON dashboard の実装。
- synthetic dashboard data の作成。
- 本番 Grafana / Azure Managed Grafana / Application Insights / Tempo / Loki / Mimir の採用決定。
- GitHub / Notion / HR system との外部 ETL 実装。
- raw content の一覧表示。

## Acceptance Criteria

- CSV header と JSON object shape が定義されている。
- 各列の source、型、nullable 可否、PII / sensitive 扱いが定義されている。
- 各 view / panel が必要とする列との対応表が定義されている。
- normalized measurement と Sprint3 candidate outputs から導出できる列、M3 以降で fixture 追加が必要な列、将来候補の列が分離されている。
- Grafana-first dashboard prototype で使う time series / table / status distribution に必要な最小列が定義されている。
- Langfuse trace viewer / raw store / sensitive bundle への drilldown reference と、dashboard dataset に保存しない raw content の境界が定義されている。

## Verification

- Documentation review only for M2 planning.
- No product code or dependency changes are expected until a later implementation milestone.
