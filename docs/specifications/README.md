# Implementation Specifications

このディレクトリは Copilot Agent Observability の実装仕様正本です。
上位要件は [../requirements.md](../requirements.md)、仕様索引は [../spec.md](../spec.md) を参照してください。

## Layers

| Layer | Spec |
| --- | --- |
| Telemetry ingestion | [layers/telemetry-ingestion.md](layers/telemetry-ingestion.md) |
| Raw store and normalization | [layers/raw-store-normalization.md](layers/raw-store-normalization.md) |
| Candidate pipeline | [layers/candidate-pipeline.md](layers/candidate-pipeline.md) |
| Dashboard publishing | [layers/dashboard-publishing.md](layers/dashboard-publishing.md) |

## Interfaces

| Interface | Spec |
| --- | --- |
| Config CLI | [interfaces/config-cli.md](interfaces/config-cli.md) |
| Dashboard dataset | [interfaces/dashboard-dataset.md](interfaces/dashboard-dataset.md) |
| Security and data boundaries | [security-data-boundaries.md](security-data-boundaries.md) |

## Change Rule

Public behavior or schema changes must update:

1. Relevant spec file in this directory.
2. User-facing guide when user workflow changes.
3. Tests covering the changed contract.
4. `docs/requirements.md` or `docs/spec.md` when the product scope changes.
