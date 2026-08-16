# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 约定。

## [0.1.0] - 2026-08-16

### 新增
- 主技能 `data-insight-runbook`：五阶段数据洞察流水线（受理 → 探查 → 指标 → 图表 → 报告），每阶段硬门槛。
- 四种数据源接入：CSV、粘贴表格、SQL 查询结果、DuckDB 直连（可选，强制只读）。
- 三通道图表规范（`docs/chart-spec.md`）：Markdown 表格 + Mermaid + ASCII。
- 报告模板与严谨性检查清单（`docs/report-template.md`）。
- 零依赖 CSV 探查脚本 `scripts/csv-profile.mjs`。
- 样例 CSV 与样例报告（`examples/`）。
