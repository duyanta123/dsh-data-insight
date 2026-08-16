# dsh-data-insight

DSH（DeepSeek Harness）**数据洞察技能插件**：把原始数据变成「业务结论 + 指标数据 + 图表」的结构化 Markdown 分析报告。

纯指令型技能插件，零依赖、零构建。计算由宿主已提供的文件 / Shell 工具驱动的 LLM 完成，包内附带一个零依赖的 CSV 探查脚本与完整图表 / 报告规范。

## 功能

- **四种数据源**：CSV 文件、粘贴表格文本、SQL 查询结果、DuckDB 直连数据库（可选）。
- **五阶段流水线**（每阶段带硬门槛）：输入受理 → 数据探查 → 指标计算 → 图表呈现 → 报告产出。
- **三类指标**：汇总统计、同环比（基准期规则写死）、TopN、异常值（Z-score / IQR）。
- **三通道图表**（全零依赖）：Markdown 表格 + 数字 / Mermaid / ASCII 条形图。
- **严谨性保障**：结论必有数字支撑、事实与推断分离、口径可复现、不编造数据。

## 安装

```sh
dsh plugin --profile web add dsh-data-insight
```

或手动两步（在目标 profile 目录下）：

1. `package.json` 的 `dependencies` 加 `"dsh-data-insight": "^0.1.0"`；
2. `dsh.profile.bundles` 数组加 `"dsh-data-insight"`。

重启 profile 后，技能 `data-insight-runbook` 出现在技能列表即可用。

## 使用

在会话中说「分析这份 CSV 出报告」「看看这个数据」「帮我算一下指标」并附上数据源（文件路径 / 粘贴表格 / DuckDB 连接），模型会加载 `data-insight-runbook` 并按五阶段执行。产物是一份 Markdown 报告，落盘到工作区。

### 快速示例

```sh
node scripts/csv-profile.mjs examples/sample-sales.csv
```

会输出 `examples/sample-sales.csv` 的探查报告（schema / 缺失 / 分布 / 异常），对应报告样例见 `examples/sample-report.md`。

## 目录结构

```
dsh-data-insight/
├── plugin/index.js          # 插件入口：注册 skills/ 为技能根
├── cordis.patch.yml         # bundle patch（dsh plugin add 时注入）
├── skills/data-insight-runbook/SKILL.md   # 主技能：五阶段 runbook
├── docs/chart-spec.md       # 三通道图表规范与示例
├── docs/report-template.md  # 报告骨架 + 严谨性检查清单
├── scripts/csv-profile.mjs  # 零依赖 CSV 探查脚本
└── examples/                # 样例 CSV + 样例报告
```

## DuckDB 直连（可选）

默认零依赖；如需直连数据库，安装 [DuckDB](https://duckdb.org/) 单文件 CLI（加入 PATH）：

```sh
# 连接串走环境变量，强制只读
duckdb -readonly -csv -c "SELECT * FROM read_csv_auto('data.csv') LIMIT 100"
duckdb -readonly -csv -c "SELECT ... LIMIT 5000" "$env:DATA_INSIGHT_DB_URL"
```

安全红线：一律 `-readonly`；连接串走环境变量 `DATA_INSIGHT_DB_URL`；查询默认 `LIMIT 5000`。

## 参考文档

- `skills/data-insight-runbook/SKILL.md` — 完整流程与门槛
- `docs/chart-spec.md`、`docs/report-template.md` — 图表与报告规范
- `examples/` — 输入 / 输出样例

## 开源协议

[MIT](LICENSE)
