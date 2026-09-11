# dsh-data-insight

English | [简体中文](README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4c1d95)](https://github.com/topics/dsh-plugin)
[![CI](https://github.com/duyanta123/dsh-data-insight/actions/workflows/ci.yml/badge.svg)](https://github.com/duyanta123/dsh-data-insight/actions/workflows/ci.yml)
[![dsh-index](https://img.shields.io/badge/dsh--index-dsh--data--insight-blue)](https://dsh-index.xlings.org/packages/dsh-data-insight/)
[![version](https://img.shields.io/badge/version-0.1.4-green)](CHANGELOG.md)

A DSH (DeepSeek Harness) **data-insight skill plugin**: turns raw data into a structured Markdown analysis report of "business conclusions + metrics + charts".

A pure instruction-type skill plugin with zero dependencies and zero build. Computation is done by the LLM driven by the host's file/shell tools; the package ships a zero-dependency CSV profiling script and full chart/report specifications.

## Positioning

dsh-data-insight covers the "data → report" step: given a data source, it produces a reviewable Markdown report. It does not write or clean data back to storage, and it never sends data to any external service.

It answers:
- What does this data look like overall (schema / missing / duplicates / distribution)?
- What are the core metrics, and how do they change period over period?
- What are the TopN entries and outliers (Z-score / IQR)?
- What numbers back each conclusion, and can they be recomputed?

Rigor guarantees (hard gates baked into the report template): every conclusion backed by numbers, facts separated from inference, reproducible metrics definitions, no fabricated data.

## Installation

As a DSH plugin (recommended):

```sh
dsh plugin --profile web add "github:duyanta123/dsh-data-insight#v0.1.4"
```

Or from npm:

```sh
npm install dsh-data-insight
```

Or manually in two steps (in the target profile directory): add `"dsh-data-insight": "^0.1.4"` to `dependencies` in `package.json`, and add `"dsh-data-insight"` to the `dsh.profile.bundles` array.

Compatibility tiers: the standalone CSV / DuckDB scripts run on Node.js >= 18; as a DSH 0.1.5-rc.2 plugin it is verified with Node.js >= 22.19. Run `npm run test:compat` to execute an isolated-profile add, dump-config, and startup smoke test.

After restarting the profile, the `data-insight-runbook` skill appears in the skill list and is ready to use.

## Quick Start

### 1. Use as a DSH skill

Say "analyze this CSV and give me a report", "take a look at this data", or "compute these metrics for me" with a data source attached (file path / pasted table / DuckDB connection). The model loads `data-insight-runbook` and runs the five-stage pipeline: input intake → data profiling → metric computation → chart rendering → report output (hard gates at each stage). The deliverable is a Markdown report written to the workspace.

### 2. Use as a standalone profiling script

```sh
node scripts/csv-profile.mjs examples/sample-sales.csv
```

Prints a profiling report for the CSV (schema / missing / distribution / outliers); the corresponding full report sample is [examples/sample-report.md](examples/sample-report.md).

### 3. DuckDB direct connection (optional)

Zero dependencies by default; to query databases directly, install the [DuckDB](https://duckdb.org/) single-file CLI (on PATH). Install scripts: Windows `scripts/setup-duckdb.ps1`, macOS/Linux `scripts/setup-duckdb.sh`.

```sh
# Query CSV/Parquet directly: no database file, no -readonly (v1.5.5: -readonly fails on in-memory databases)
duckdb -csv -c "SELECT * FROM read_csv_auto('data.csv') LIMIT 100"
# Database file / remote DB: connection string via env var, forced read-only (POSIX shell: "$DATA_INSIGHT_DB_URL")
duckdb -readonly -csv -c "SELECT ... LIMIT 5000" "$env:DATA_INSIGHT_DB_URL"
```

## CLI Options

| Option | Default | Description |
| --- | --- | --- |
| `<file>` | - | Path to the CSV file to profile |
| `--sep <char>` | auto-detect | Field separator (auto-detects `,`, `\t`, `;`) |
| `--encoding <enc>` | utf8 | File encoding: utf8 / utf16le / latin1 (transcode GBK files first) |
| `--limit <N>` | 0 (all) | Limit rows read, for sampling very large datasets |
| `--json` | - | Output the profiling result as JSON |

## Output

The final artifact of the five-stage pipeline is a Markdown analysis report with a fixed skeleton defined in [docs/report-template.md](docs/report-template.md):

- **Core conclusions** (each backed by numbers with cross-references)
- **Data overview** (schema, missing values, duplicates, dispositions)
- **Metric details** (summary stats, period-over-period, TopN, outliers)
- **Trends & comparisons** (three-channel charts: Markdown tables + numbers first, Mermaid / ASCII bar charts as fallback)
- **Definitions & recomputation** (facts separated from inference)

## Safety Boundaries

- **Read-only profiling**: the CSV profiling script only reads its input file — no writes, no network.
- **DuckDB red lines**: database connections always use `-readonly` (write statements are blocked); connection strings go through the `DATA_INSIGHT_DB_URL` env var, never into commands, config, or reports; queries default to `LIMIT 5000`.
- **No fabricated data**: report conclusions must be backed by numbers; missing data is stated as-is.

## Troubleshooting

**DuckDB says `Cannot launch in-memory database in read-only mode`?**
Don't pass `-readonly` for file-less queries (CSV/Parquet) — see the example above; `-readonly` is only for database files / remote databases.

**`duckdb: command not found`?**
The CLI isn't installed or isn't on PATH; run the platform install script (`scripts/setup-duckdb.ps1` / `setup-duckdb.sh`) and reopen the terminal.

**Garbled Chinese text in CSV?**
Prefer UTF-8 (BOM is handled correctly); transcode GBK files first with `iconv -f GBK -t UTF-8`.

**Metrics don't match expectations?**
Run `node scripts/csv-profile.mjs <file>` first and check the profiling report's missing values / duplicate rows / outlier distribution — real-world sample data has surfaced three classes of issues (a single dirty row driving a spike, duplicates inflating counts, missing values dragging averages), all exposed at the profiling stage.

**Mermaid charts don't render in local Markdown preview?**
Over `file://`, CDN-loaded mermaid.js is blocked by same-origin policy; open with a local renderer such as Typora, or switch to the Markdown table / ASCII bar chart channels per [docs/chart-spec.md](docs/chart-spec.md).

**Old sessions won't open after upgrading the DSH host to 0.1.5.x?**
The Session format V3 migration is irreversible and is host behavior; back up session logs before upgrading the host (see the 0.1.4 entry in [CHANGELOG.md](CHANGELOG.md)).

## Documentation

- [docs/chart-spec.md](docs/chart-spec.md) — three-channel chart spec and examples (including the warning that the DSH Web GUI doesn't render Mermaid)
- [docs/report-template.md](docs/report-template.md) — report skeleton + rigor checklist
- [examples/](examples/) — sample CSV and full sample report
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [PLUGIN-MAINTENANCE.md](PLUGIN-MAINTENANCE.md) — repo maintenance runbook

## License

[MIT](LICENSE)
