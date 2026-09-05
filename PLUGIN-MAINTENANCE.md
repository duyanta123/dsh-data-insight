# dsh-data-insight 维护规则（Maintenance Runbook）

> 本文档是 dsh-data-insight 仓库的专属维护基准，与顶层 [PLUGIN-MAINTENANCE.md](../../docs/PLUGIN-MAINTENANCE.md) 通用规则配套使用。本文件聚焦本仓库的细节。
> 原则：**不改不动，要改就一步到位**——代码/技能、测试、CHANGELOG、版本号、tag 一起改，不留下半成品版本。

## 1. 仓库概况

| 项 | 值 |
|---|---|
| 类型 | 数据型（原始数据 → 洞察报告） |
| 当前版本 | 0.1.2 |
| 分发状态 | dsh-index / awesome-dsh-plugin / awesome-deepseek-harness 已收录 |
| 运行时 | 零构建 ESM，`plugin/index.js` 由 harness 加载 |
| 核心脚本 | `scripts/csv-profile.mjs`（零依赖 CSV 探查）+ `scripts/setup-duckdb.ps1/.sh` |

## 2. 目录结构与职责

```text
dsh-data-insight/
├── package.json                    # npm 包 + dsh.bundle.patch + files 白名单
├── cordis.patch.yml                # DSH bundle patch
├── plugin/index.js                 # 注册技能根
├── skills/data-insight-runbook/SKILL.md   # 五阶段数据洞察 runbook
├── scripts/csv-profile.mjs         # 确定性 CSV 探查（正确性核心）
├── scripts/setup-duckdb.ps1/.sh    # 可选 DuckDB CLI 安装脚本（双平台）
├── docs/chart-spec.md              # 三通道图表规范（表格/Mermaid/ASCII）
├── docs/report-template.md         # 报告模板与严谨性检查清单
├── examples/                       # 样例 CSV 与样例报告
├── test/csv-profile.test.mjs       # node --test 契约测试（当前 10 例）
├── test/dsh-compat.test.mjs        # DSH 0.1.2-rc.1 宿主兼容性门禁
└── test/fixtures/                  # dirty.csv / ragged.csv / comma-numbers.csv
```

## 3. CI 与测试门禁

- **独立脚本回归**：`npm test`（=`node --test test/csv-profile.test.mjs`），当前 **10 例**；该矩阵只验证业务脚本。
- **DSH 宿主兼容**：`npm run test:compat` 固定 `@deepseek-ai/dsh@0.1.2-rc.1`，要求 Node >=22.19，执行临时 profile 的 add、dump-config 和有限时长启动。
- **GitHub Actions**：`.github/workflows/ci.yml` 保留业务回归，并增加 Node 22.19 compat job。
- 覆盖点：分隔符探测 / 引号与转义 / 千分位 / 混合类型降级 / 残缺行 / `--limit` / BOM / 退出码。

## 4. 一次完整变更的动作序列

1. 改代码 / 技能 / 文档
2. 补或更新 `test/csv-profile.test.mjs` 与对应 fixture
3. 更新 `CHANGELOG.md`（先写 `Unreleased`）
4. 本地跑 `npm test` 全绿
5. 有行为变更时改 `package.json` 的 `version`（semver）
6. 推送 `main`，GitHub Actions 全绿
7. 打 tag `v0.x.y` 并推送

## 5. 分场景维护细则

### 5.1 CSV 探查脚本变更（`csv-profile.mjs`）
- **高风险区**：分隔符探测、类型推断、编码处理、残缺行容错。
- 每次新增数据形态，必须补对应 fixture（如新的 dirty.csv / 特殊编码文件）与契约用例。
- 尤其注意 Windows 环境差异（GBK 编码、CRLF）与 macOS/Linux 环境的回归。

### 5.2 DuckDB 命令调整（⚠️ 最高风险区）
- **历史教训（0.1.1）**：DuckDB v1.5.5 实测，**无库文件时 CLI 打开内存库，`-readonly` 会报 `Cannot launch in-memory database in read-only mode`**；`-readonly` 仅用于库文件 / 远程库连接。
- **任何 DuckDB 命令变更必须真机验证两种模式**：
  1. 无库文件（内存库）
  2. 有库文件 / 远程库（只读，且写语句如 INSERT 应被拦截）
- 修改 `setup-duckdb.ps1` 时保持 UTF-8 BOM（Windows PowerShell 兼容）；新增平台脚本时与另一平台对齐。

### 5.3 runbook / 模板调整
- `skills/data-insight-runbook/SKILL.md` 的阶段 / 硬门槛变更，或 `docs/chart-spec.md`、`docs/report-template.md` 调整：确保与脚本实际输出和 DuckDB 命令一致。

### 5.4 元数据与打包
- 改动对外描述时同步：`README.md` 首段、`package.json` 的 `description`/`keywords`、awesome-dsh-plugin 的 `data/plugins/duyanta123__dsh-data-insight.yml`。
- `files` 白名单已含 `plugin/`、`cordis.patch.yml`、`skills/`、`docs/`、`scripts/`、`examples/`、`README.md`、`CHANGELOG.md`、`PUBLISHING.md`、`LICENSE`。

## 6. 版本与发布节奏

- 以 DuckDB / 平台差异修复为主，**patch 居多**；新增数据源形态（如支持 Parquet 独立读取）可为 minor。
- 发布动作：归并 `Unreleased` → 明确版本号 → 确认 `version` 与 tag 一致 → 打 `v0.x.y`。

## 7. 发布前清单

- [ ] `npm test` 全绿（10 例）
- [ ] 涉及 DuckDB 时，两种模式均已真机验证（内存库 / 只读库）
- [ ] `CHANGELOG.md` 已归并 `Unreleased`
- [ ] `npm run test:compat` 通过（DSH 0.1.2-rc.1 / Node 22.19+）
- [ ] `package.json` `version` 与 tag 一致
- [ ] `files` 字段包含所有应发布文件
- [ ] 对外描述若变，列表条目已同步（或已提交 PR）
- [ ] 推送 `main`，GitHub Actions 全绿
- [ ] 打并推送 tag `v0.x.y`
