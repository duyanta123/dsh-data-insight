# dsh-data-insight

[English](README.md) | 简体中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4c1d95)](https://github.com/topics/dsh-plugin)
[![CI](https://github.com/duyanta123/dsh-data-insight/actions/workflows/ci.yml/badge.svg)](https://github.com/duyanta123/dsh-data-insight/actions/workflows/ci.yml)
[![dsh-index](https://img.shields.io/badge/dsh--index-dsh--data--insight-blue)](https://dsh-index.xlings.org/packages/dsh-data-insight/)
[![version](https://img.shields.io/badge/version-0.1.4-green)](CHANGELOG.md)

DSH（DeepSeek Harness）**数据洞察技能插件**：把原始数据变成「业务结论 + 指标数据 + 图表」的结构化 Markdown 分析报告。

纯指令型技能插件，零依赖、零构建。计算由宿主已提供的文件 / Shell 工具驱动的 LLM 完成，包内附带一个零依赖的 CSV 探查脚本与完整图表 / 报告规范。

## 定位

dsh-data-insight 处理「数据 → 报告」这一步：输入数据源，产出可审查的 Markdown 报告；不负责数据写入或清洗落盘，也不负责把数据发送到任何外部服务。

它回答：
- 这份数据的整体情况是什么（schema / 缺失 / 重复 / 分布）？
- 核心指标是多少，同比环比怎么变化？
- TopN 和异常值有哪些（Z-score / IQR）？
- 结论背后的数字是什么，能否复算？

严谨性保障（写入报告模板的硬门槛）：结论必有数字支撑、事实与推断分离、口径可复现、不编造数据。

## 安装

作为 DSH 插件（推荐）：

```sh
dsh plugin --profile web add "github:duyanta123/dsh-data-insight#v0.1.4"
```

或从 npm 安装：

```sh
npm install dsh-data-insight
```

或手动两步（在目标 profile 目录下）：`package.json` 的 `dependencies` 加 `"dsh-data-insight": "^0.1.4"`，`dsh.profile.bundles` 数组加 `"dsh-data-insight"`。

兼容性分层：独立 CSV / DuckDB 脚本可运行在 Node.js >= 18；作为 DSH 0.1.5-rc.2 插件验证统一使用 Node.js >= 22.19。运行 `npm run test:compat` 可执行隔离 profile 的 add、dump-config 和启动 smoke test。

重启 profile 后，技能 `data-insight-runbook` 出现在技能列表即可用。

## 快速开始

### 1. 作为 DSH 技能使用

在会话中说「分析这份 CSV 出报告」「看看这个数据」「帮我算一下指标」并附上数据源（文件路径 / 粘贴表格 / DuckDB 连接），模型会加载 `data-insight-runbook` 并按五阶段执行：输入受理 → 数据探查 → 指标计算 → 图表呈现 → 报告产出（每阶段带硬门槛）。产物是一份 Markdown 报告，落盘到工作区。

### 2. 作为独立探查脚本使用

```sh
node skills/data-insight-runbook/scripts/csv-profile.mjs skills/data-insight-runbook/examples/sample-sales.csv
```

会输出该 CSV 的探查报告（schema / 缺失 / 分布 / 异常），对应完整报告样例见 [examples/sample-report.md](skills/data-insight-runbook/examples/sample-report.md)。

### 3. DuckDB 直连（可选）

默认零依赖；如需直连数据库，安装 [DuckDB](https://duckdb.org/) 单文件 CLI（加入 PATH）。可使用安装脚本：Windows `skills/data-insight-runbook/scripts/setup-duckdb.ps1`，macOS/Linux `skills/data-insight-runbook/scripts/setup-duckdb.sh`。

```sh
# CSV/Parquet 直接查：无库文件，不加 -readonly（v1.5.5 实测 -readonly 打不开内存库会报错）
duckdb -csv -c "SELECT * FROM read_csv_auto('data.csv') LIMIT 100"
# 库文件 / 远程库：连接串走环境变量，强制只读（POSIX shell 为 "$DATA_INSIGHT_DB_URL"）
duckdb -readonly -csv -c "SELECT ... LIMIT 5000" "$env:DATA_INSIGHT_DB_URL"
```

## CLI 参数

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `<file>` | - | 要探查的 CSV 文件路径 |
| `--sep <分隔符>` | 自动探测 | 字段分隔符（自动识别 `,`、`\t`、`;`） |
| `--encoding <enc>` | utf8 | 文件编码：utf8 / utf16le / latin1（GBK 文件请先转码） |
| `--limit <N>` | 0（全部） | 限制读取行数，用于超大数据集抽样探查 |
| `--json` | - | 以 JSON 输出探查结果 |

## 输出

五阶段流水线的最终产物是一份 Markdown 分析报告，固定骨架见 [docs/report-template.md](skills/data-insight-runbook/docs/report-template.md)：

- **核心结论**（每条带数字支撑与交叉引用）
- **数据概况**（schema、缺失、重复、处置记录）
- **指标明细**（汇总统计、同环比、TopN、异常值）
- **趋势与对比**（三通道图表：Markdown 表格 + 数字为主，Mermaid / ASCII 条形图兜底）
- **口径与复算说明**（事实与推断分离）

## 安全边界

- **探查只读**：CSV 探查脚本只读取输入文件，不写入、不联网。
- **DuckDB 红线**：连接库一律 `-readonly`（写语句会被拦截）；连接串走环境变量 `DATA_INSIGHT_DB_URL`，不写进命令、配置或报告；查询默认 `LIMIT 5000`。
- **不编造数据**：报告结论必须有数字支撑，缺失数据如实标注。

## 排障

**DuckDB 报 `Cannot launch in-memory database in read-only mode`？**
无库文件查询（CSV/Parquet）不要加 `-readonly`，见上方示例；`-readonly` 仅用于库文件 / 远程库。

**`duckdb: command not found`？**
CLI 未安装或不在 PATH，运行对应平台安装脚本（`skills/data-insight-runbook/scripts/setup-duckdb.ps1` / `setup-duckdb.sh`）后重开终端。

**CSV 中文乱码？**
优先 UTF-8（带 BOM 也能正确处理）；GBK 编码文件先用 `iconv -f GBK -t UTF-8` 转码再探查。

**指标结论与预期不符？**
先用 `node skills/data-insight-runbook/scripts/csv-profile.mjs <file>` 看探查报告里的缺失值 / 重复行 / 异常值分布——样例数据实测中发现过单行脏数据驱动整体暴增、重复行抬高计数、缺失值拉低均值三类问题，探查阶段都能暴露。

**Mermaid 图在本地 Markdown 预览不渲染？**
`file://` 协议下 CDN 加载的 mermaid.js 受同源策略限制，用 Typora 等本地渲染编辑器打开，或参考 [docs/chart-spec.md](skills/data-insight-runbook/docs/chart-spec.md) 换用 Markdown 表格 / ASCII 条形图通道。

**升级 DSH 宿主到 0.1.5 系后旧会话打不开？**
Session format V3 迁移不可逆，属宿主行为；升级宿主前请先备份会话日志（见 [CHANGELOG.md](CHANGELOG.md) 0.1.4 条目）。

## 文档

- [docs/chart-spec.md](skills/data-insight-runbook/docs/chart-spec.md) — 三通道图表规范与示例（含 DSH Web GUI 不渲染 Mermaid 的警告）
- [docs/report-template.md](skills/data-insight-runbook/docs/report-template.md) — 报告骨架 + 严谨性检查清单
- [examples/](skills/data-insight-runbook/examples/) — 样例 CSV 与完整样例报告
- [CHANGELOG.md](CHANGELOG.md) — 版本变更记录
- [PLUGIN-MAINTENANCE.md](PLUGIN-MAINTENANCE.md) — 本仓维护规则

## License

[MIT](LICENSE)
