# Sprint Index

この文書は repository 全体の sprint / roadmap index である。

プロダクト仕様・実装判断の正は `docs/spec.md` である。
ただし、`docs/requirements.md` を上位要件とし、`docs/spec.md` はその詳細仕様として扱う。
GitHub Issue は既定の作業単位にしない。ユーザーが明示的に作成・参照を指示した場合だけ使う。

## Sprint Index

| Sprint | 状態 | 概要 / 詳細 |
| --- | --- | --- |
| Sprint1: Langfuse PoC | 完了 | [docs/sprints/sprint1-langfuse-poc/](sprints/sprint1-langfuse-poc/) に M0-M28 と user-facing docs refresh までの PoC 資料を集約した |
| Sprint2: Raw Data Loop | アイデア | [docs/sprints/sprint2-raw-data-loop/](sprints/sprint2-raw-data-loop/) に raw telemetry store、normalized dataset、Langfuse 非依存改善ループの検討メモを置く |

## Roadmap

- Sprint1 は完了済みの参照資料として扱う。
- Sprint2 は idea-level の planning 資料であり、単独では正式仕様変更を意味しない。
- Sprint2 の内容を実装する場合は、先に `docs/requirements.md` と `docs/spec.md` へ必要な仕様変更を反映する。

## Follow-up

- raw JSON の保持基盤を SQLite 既定候補、PostgreSQL 将来候補として検討する。
- raw store から normalized dataset を生成し、既存の measurement schema と改善支援 CLI に接続する。
- Langfuse UI は source of truth ではなく dashboard / trace viewer として再位置づける。
- 共有環境、実データ、社内サーバー検証が必要になった場合は、retention、アクセス権、masking / redaction、利用者周知を先に仕様化する。
