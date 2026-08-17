# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 约定。

## [Unreleased]

### 新增
- `package.json` 补充 `repository` / `bugs` / `homepage` 元数据。
- GitHub Actions CI（`.github/workflows/ci.yml`）：ubuntu + windows 矩阵运行 csv-profile 契约测试。
- `.editorconfig`：统一缩进 / 换行 / 编码基线（PowerShell 脚本保持 CRLF）。
- README「排障」章节：DuckDB 只读模式、CLI 缺失、GBK 编码、脏数据核对、Mermaid 本地渲染。
- `test/fixtures/README.md`：三个 fixture 的场景与验证点说明。

## [0.1.1] - 2026-08-16

### 修复
- DuckDB 直连调用方式（SKILL.md / README）：CSV/Parquet 无库查询去掉 `-readonly`——v1.5.5 实测不带库文件时 CLI 打开内存库，`-readonly` 会报 `Cannot launch in-memory database in read-only mode`；`-readonly` 保留用于库文件 / 远程库连接（实测 INSERT 等写语句被拦截）。

### 新增
- `scripts/setup-duckdb.sh`：macOS/Linux 安装脚本（brew / GitHub release / `~/.local/bin`），与 Windows 版 `setup-duckdb.ps1` 对齐。
- `test/csv-profile.test.mjs`：csv-profile CLI 契约测试（`node:test` 零依赖，10 例：分隔符探测 / 引号与转义 / 千分位 / 混合类型降级 / 残缺行 / `--limit` / BOM / 退出码），`npm test` 运行。
- runbook：CLI 缺失时引导运行对应平台的安装脚本。

## [0.1.0] - 2026-08-16

### 新增
- 主技能 `data-insight-runbook`：五阶段数据洞察流水线（受理 → 探查 → 指标 → 图表 → 报告），每阶段硬门槛。
- 四种数据源接入：CSV、粘贴表格、SQL 查询结果、DuckDB 直连（可选，强制只读）。
- 三通道图表规范（`docs/chart-spec.md`）：Markdown 表格 + Mermaid + ASCII。
- 报告模板与严谨性检查清单（`docs/report-template.md`）。
- 零依赖 CSV 探查脚本 `scripts/csv-profile.mjs`。
- 可选 DuckDB CLI 安装脚本 `scripts/setup-duckdb.ps1`（winget / GitHub 直链，UTF-8 BOM）。
- 样例 CSV 与样例报告（`examples/`）。
- 发布与分发指南 `PUBLISHING.md`。
