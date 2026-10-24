# dsh-data-insight 开发计划

> 定位：把原始数据（CSV 文件 / 粘贴表格 / SQL 查询结果 / DuckDB 直连数据库）变成「业务结论 + 指标数据 + 图表」的结构化 Markdown 分析报告，供 DSH 宿主内的 data-insight-runbook 技能执行。
>
> 核心原则：每个数字必须有口径、每条结论必须有数字支撑、事实与推断分离、报告可复现、不编造数据。

## 0. 文档性质说明（必读）

**本文档为 2026-10-24 回溯整理的开发计划，不是开发前写就的原始计划**——本项目开发期（2026-08）未单独成文计划文档，属仓库管理疏漏。全文依据以下可查证材料整理，作为后续演进的审计基准：

- `CHANGELOG.md` v0.1.0–v0.1.6 的发布记录（含各版本日期与改动性质）；
- `skills/data-insight-runbook/SKILL.md` 的五阶段 runbook 与硬门槛；
- `test/csv-profile.test.mjs`（契约测试）与 `test/dsh-compat.test.mjs`（宿主兼容门禁）的实际断言；
- `PLUGIN-MAINTENANCE.md`（本仓维护规则）与工作区顶层 `docs/PLUGIN-MAINTENANCE.md`（维护节奏总纲）。

其中「实施历史」按已发布版本如实回溯，「验收标准」为现行真实门禁（可运行核验）；二者均不以任何方式虚构开发前的计划状态。

## 1. 项目概览

### 1.1 产品定位

dsh-data-insight 处理「数据 → 报告」这一步：输入数据源，产出可审查的 Markdown 报告。它回答：

- 这份数据的整体情况是什么（schema / 缺失 / 重复 / 分布）？
- 核心指标是多少，同比环比怎么变化？
- TopN 和异常值有哪些（Z-score |z|>3 与 1.5×IQR 双口径对照）？
- 结论背后的数字是什么，能否复算？

一句话定位：纯指令型技能插件，零依赖、零构建；计算由宿主已提供的文件 / Shell 工具驱动的 LLM 完成，包内附带零依赖 CSV 探查脚本（`skills/data-insight-runbook/scripts/csv-profile.mjs`）与完整图表 / 报告规范。

### 1.2 非目标

- 不写数据或清洗结果回存储（探查脚本只读输入文件）；
- 不把用户数据发送到任何外部服务；
- 不负责宿主会话 / 遥测 / 代码分析（这些由其他 DSH 插件承担）；
- 不做无依据的归因推断（推断必须标注依据与置信度）。

## 2. 执行原则（贯穿全程，违反即返工）

1. **每个数字必须有口径**：时间范围、过滤条件、聚合方式、计算公式都要写清楚。
2. **每条结论必须有数字支撑**：禁止无依据的推断；结论引用的数字必须在正文或附录可查到。
3. **区分事实与推断**：数据事实与模型推断分开标注，推断要给出依据与置信度。
4. **报告可复现**：附录记录原始数据、处理步骤、算法参数，任何人能按附录重算得到同样数字。
5. **不编造数据**：探查不到的数字不猜；缺失值按规则处置并如实记录。

## 3. 阶段划分（五阶段流水线，每阶段硬门槛）

| 阶段 | 内容 | 硬门槛 |
|---|---|---|
| 0 输入受理 | 识别数据源（CSV / 粘贴表格 / DuckDB 直连），确认口径（目标 / 指标定义 / 时间范围 / 维度 / 过滤） | 数据已加载 + 口径已确认 |
| 1 数据探查 | `csv-profile.mjs` 探查 schema、缺失、分布、脏数据；异常处置决定写进附录 | 探查记录完成，异常数据有处置决定 |
| 2 指标计算 | 汇总统计、同环比（基准期规则写死）、TopN（默认 5）、异常值（Z-score 与 IQR 双口径） | 每个输出数字都有明确口径与计算公式 |
| 3 图表呈现 | 三通道：Markdown 表格 + 数字（主）→ Mermaid（次，需渲染器）→ ASCII 条形图（兜底）；禁止手写 SVG | 图中每个数据点都能在正文或附录表格找到 |
| 4 报告产出 | 按 `docs/report-template.md` 骨架落盘 Markdown，过严谨性检查清单（8 项） | 检查清单全过；核心结论 3–5 条且每条带数字 |

异常值口径（阶段 2）：Z-score `|z| > 3` 判定异常，同时给出 IQR（1.5×IQR 围栏）对照；报告列出「值 + 所属维度 + 判定依据」。

## 4. 实施历史（按已发布版本回溯，依据 CHANGELOG）

| 版本 | 日期 | 内容（摘自 CHANGELOG 对应条目） | 性质 |
|---|---|---|---|
| 0.1.0 | 2026-08-16 | 主技能五阶段流水线；四种数据源接入；三通道图表规范；报告模板与严谨性检查清单；`csv-profile.mjs`；`setup-duckdb.ps1`；样例 CSV / 报告；PUBLISHING.md | 首发功能 |
| 0.1.1 | 2026-08-16 | 修复 DuckDB 直连：无库文件查询去掉 `-readonly`（v1.5.5 实测内存库加 `-readonly` 报错）；新增 `setup-duckdb.sh`；新增 `csv-profile.mjs` 契约测试（10 例）与 CLI 缺失引导 | 修复 + 测试 |
| 0.1.2 | 2026-09-02 | GitHub Actions CI；`.editorconfig`；README 排障章节；fixtures 说明文档 | 工程化 |
| 0.1.3 | 2026-09-06 | DSH 宿主兼容门禁 `test:compat`（当时基线 0.1.2-rc.1）+ Windows/Ubuntu Node 22.19 CI；README 兼容分层说明；`prepublishOnly` 钩子 | 门禁 |
| 0.1.4 | 2026-09-11 | 兼容基线迁移至 0.1.5-rc.2（插件代码零改动）；提示 Session format V3 迁移不可逆（宿主行为） | 基线迁移 |
| 0.1.5 | 2026-09-17 | 修复技能资源路径：`docs/`、`scripts/`、`examples/` 移入 `skills/data-insight-runbook/` 使 SKILL.md 相对路径可达（harness 按技能目录解析）；compat 测试新增资源可达性回归断言 | 回归修复 |
| 0.1.6 | 2026-10-01 | 兼容基线迁移至 0.2.0-rc.2（全部门禁实测通过，插件代码零改动） | 基线迁移 |
| 0.1.7 | 2026-10-24 | `csv-profile.mjs` 补齐 IQR（1.5×IQR 围栏）异常值对照、`--encoding` 白名单校验、UTF-16LE BOM 剥离（BE 明确报错）；`package.json` 声明 `engines`；SKILL.md 合入外部分享导出版的 tags / DuckDB 官方文档安装指引 / 无网络声明；文档补齐 `|` 分隔符；契约测试扩至 14 例；兼容基线迁移至 0.2.1-rc.2 | 缺口补齐 + 基线迁移 |

历史教训（已固化为规则或回归测试）：

- **DuckDB 双模式**（0.1.1）：无库文件（内存库）不加 `-readonly`，库文件 / 远程库强制 `-readonly`——任何 DuckDB 命令变更必须真机验证两种模式（`PLUGIN-MAINTENANCE.md` §5.2）。
- **技能资源自包含**（0.1.5）：SKILL.md 相对路径按技能目录解析，资源不得放在技能目录之外——`test/dsh-compat.test.mjs` 的 `assertSkillResourcesResolve` 持续拦截。

## 5. 验收标准（现行真实门禁，均可运行核验）

- [ ] `npm test` 全绿（`node --test test/csv-profile.test.mjs`，当前 14 例：分隔符探测 / 引号与转义 / 千分位 / 混合类型降级 / 残缺行 / `--limit` / UTF-8 与 UTF-16LE BOM / IQR 对照 / `--encoding` 校验 / 退出码）。
- [ ] `node --check skills/data-insight-runbook/scripts/csv-profile.mjs` 通过。
- [ ] `npm run test:compat` 通过：固定 `@deepseek-ai/dsh@0.2.1-rc.2` + 同版本 `dsh-skill-filesystem`，Node >= 22.19，覆盖隔离 profile 的本地 add、dump-config、npm pack 后打包件 add、有限时长启动冒烟。
- [ ] 涉及 DuckDB 命令改动时，两种模式（无库文件内存库 / 有库文件只读）真机验证通过。
- [ ] `npm pack --dry-run` 内容核对：`plugin/index.js`、`cordis.patch.yml`、`skills/`（自包含）、双语 README、`CHANGELOG.md`、`PUBLISHING.md`、`LICENSE`。
- [ ] 版本三处一致（`package.json` / CHANGELOG 发布段 / git tag），双语 README 结构一致、徽章与安装示例同步。
- [ ] 文档-实现一致：README 双语 / SKILL.md / `docs/report-template.md` / 样例报告中承诺的能力与口径（含异常值双口径、分隔符探测、编码支持）均与脚本实际行为一致。

## 6. 后续演进

- 发布节奏与分场景维护细则见 `PLUGIN-MAINTENANCE.md`（§5、§6）：patch 居多（DuckDB / 平台差异修复为主），新增数据源形态（如 Parquet 独立读取）可升 minor。
- 兼容基线跟随 DSH 上游，迁移时插件代码预期零改动（0.1.4 / 0.1.6 两次迁移均如此），以 `test:compat` 实测为准。
