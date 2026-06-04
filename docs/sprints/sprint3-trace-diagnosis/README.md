# Sprint3: Trace Diagnosis Candidate

Sprint3 は、Sprint2 MVP から外す trace からの自動診断を後続要求として記録するための候補 sprint である。

この文書は正式仕様ではない。
実装する場合は、先に `../../requirements.md` と `../../spec.md` に必要な仕様変更を反映する。

## 背景

Sprint2 M1 では、raw telemetry store と normalized dataset を優先する。
`diagnose` は引き続き、人間が分類した diagnosis record の validation として扱う。

trace から failure category / anti-pattern 候補を自動抽出する機能は、判定ロジック、品質基準、false positive / false negative、説明責任、human review 境界を別途定義する必要があるため、Sprint2 MVP には含めない。

## 後続要求候補

- normalized dataset または raw trace から、failure category 候補を deterministic に抽出できるかを検討する。
- anti-pattern 候補の抽出は、M23 taxonomy と M24 diagnosis record schema に接続する。
- 自動診断結果は採用判断ではなく、人間分類の補助候補として扱う。
- 出力には実 prompt / response content、tool arguments / results、credential、secret、Base64 header、実 user identity を含めない。
- 自動採用、自動改善実装、repository 修正、patch / diff 生成、commit / push / pull request 作成、自動勝敗決定は引き続き非スコープとする。

## 未決事項

- 入力は raw store、normalized dataset、またはその両方のどれにするか。
- deterministic rule のみで開始するか、LLM-assisted diagnosis を後続候補に分離するか。
- 候補抽出の precision / recall をどう評価するか。
- human review workflow へ渡す前の confidence、evidence summary、required human checks をどう表現するか。
- Sprint2 の raw store / normalize 実装完了後、どの milestone から着手するか。
