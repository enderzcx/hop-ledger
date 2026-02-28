# Pilot Stability Benchmark (2026-03-01)

- Scope: OpenClaw skill mode (`challenge -> session pay -> proof submit`)
- Rounds: 10
- Success: 10/10
- Parity pass: 10/10
- Environment: local backend `http://127.0.0.1:3001`

## Round Results

| Round | Artifact | requestId | runDigestMatch | Parity | txHash |
|---|---|---|---|---|---|
| 1 | `1772321926540` | `request_1772321914147_2e4bb9` | `True` | `True` | `0x27e9442693f0fe1b4e3a36e4049ac751a11dc89f989f65b775540c8fb5b7b521` |
| 2 | `1772321936406` | `request_1772321926654_a2400b` | `True` | `True` | `0x9009340d3d948c140862a1c792daec1892094735572a4c90bbe07968d401d9dc` |
| 3 | `1772321946037` | `request_1772321936518_587ac7` | `True` | `True` | `0x92a278103e4ca620653c8d08bd82273c91bb3e8713d62b40588ff775b4d301e0` |
| 4 | `1772321972582` | `request_1772321958844_00777b` | `True` | `True` | `0xdf3979568b9d81471d937384f093ca36c2bf59c9d503a6af9b73e996852370c9` |
| 5 | `1772321985517` | `request_1772321972703_8fb89a` | `True` | `True` | `0xd9cf5fc07691068e44ddc08ac655364e6a2928351f2817a521a62b5ff26403a9` |
| 6 | `1772321994190` | `request_1772321985627_e4d1d8` | `True` | `True` | `0x0f2ef1a8ddc22f97e44b374e559255f88bdaae85c4aa9b0a515a3d6678c2b5c8` |
| 7 | `1772322020274` | `request_1772322007639_dc6cf5` | `True` | `True` | `0x6693e387bfa080e17e5a7ffb5cf10183a5f8800ffce9c9e2bdd418caa7e861a8` |
| 8 | `1772322043573` | `request_1772322020417_ce3945` | `True` | `True` | `0xc049f4298c966629e69ce9bcc2f2735d0d8e078b4d981c64cdb4192db0f7461b` |
| 9 | `1772322052182` | `request_1772322043688_9e7ceb` | `True` | `True` | `0x41c8330d1f5e583c6241b0911c02e9a556a8968a956b03380214981873716811` |
| 10 | `1772322065696` | `request_1772322052285_275588` | `True` | `True` | `0xff7dd962efeaa197e1c6528be80448926851f859bfd6ed37324d9f7cbabbdb3f` |

## Failure Taxonomy

- No failures observed in this 10-round window.
- No digest mismatches observed.

## Artifacts

- Benchmark JSON: `artifacts/benchmarks/pilot-stability-2026-03-01.json`
- Per-run artifacts: `artifacts/pilot/<timestamp>/`
