# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 约定。

## [0.1.7] - 2026-10-24

### 新增
- `csv-profile.mjs` 数值列新增 **IQR（1.5×IQR 围栏）异常值对照**，与 Z-score（`|z|>3`）组成双口径：JSON 输出新增 `iqr` / `iqrFences` / `iqrOutliers` / `iqrOutlierCount` 字段，文本报告异常值段改为双口径并列并写明围栏。此前 README / SKILL.md / 报告模板承诺 IQR 对照而实现仅有 Z-score，本变更兑现承诺（契约测试扩至 14 例，新增「IQR 检出而 Z-score 漏检」用例）。
- `csv-profile.mjs` 新增 `--encoding` 合法值校验：仅接受 `utf8` / `utf16le` / `latin1`，非法值以退出码 2 拒绝并提示合法值（此前直接进入 `buf.toString` 抛未捕获异常）。
- `csv-profile.mjs` 支持 UTF-16LE BOM（`FF FE`）剥离，首列名不再带 U+FEFF；检测到 UTF-16BE BOM（`FE FF`）时明确报错退出码 1。
- `package.json` 新增 `engines: node >=18`（安装期下限，对齐兄弟仓库惯例；DSH 宿主路径的 Node >=22.19 下限仍由 `test:compat` 强制）。

### 变更
- DSH 宿主兼容基线从 `0.2.0-rc.2` 迁移到 `0.2.1-rc.2`：`npm run test:compat` 与 CI compat job 固定安装 `@deepseek-ai/dsh@0.2.1-rc.2` + 同版本 `@deepseek-ai/dsh-skill-filesystem`。全部门禁（隔离 profile 的本地 add、dump-config、npm pack 后打包件 add、有限时长启动冒烟）已在 0.2.1-rc.2 真机实测通过（Node v22.21.0 / Windows）；`SKILL.md` frontmatter `tags` 字段被静默忽略的假设在 0.2.1-rc.2 重验成立——启动冒烟无技能加载报错，且同版本 `dsh-skill-filesystem` 的 `parseSkillFile` 仅读取 `name` / `description` / `whenToUse` / `invocation` / `metadata`，未知字段不参与校验；插件代码零改动。
- `SKILL.md` 合入 `data-insight-runbook.zip`（外部分享导出版，2026-10-18）相对仓库版的 3 处改动：frontmatter 新增 `tags`（已核实 DSH `dsh-skill-filesystem` 0.2.0-rc.2 对未知 frontmatter 字段静默忽略，不影响技能加载）；DuckDB 安装指引在保留内置 `setup-duckdb.ps1/.sh` 的同时补官方文档与 winget/brew 命令；沙箱约束新增「包内脚本不发起网络请求」声明——按仓库实际口径改写为「除 DuckDB 安装脚本外」（安装脚本本身需从官方渠道下载 CLI，zip 版因未含脚本而无需此例外）。该 zip 为导出产物，已加入 `.gitignore`（`*.zip`），技能真源回归仓库。
- 文档补齐 `|` 分隔符探测（实现自始支持）：双语 README CLI 参数表、SKILL.md 阶段 1.1、脚本头注释。
- `PUBLISHING.md` exports 描述与 `package.json` 对齐（含 `./package.json` 导出）。
- 新增 `DSH-DATA-INSIGHT-开发计划.md`：回溯整理的开发计划（明确标注非原始计划，依据 CHANGELOG / 现行门禁整理），补齐作为审计基准的计划文档缺口。
- `PLUGIN-MAINTENANCE.md` 同步：目录树与维护细则（IQR 双口径联动、导出 zip 处置）、测试数与覆盖点更新。

## [0.1.6] - 2026-10-01

### 变更
- DSH 宿主兼容基线从 `0.1.5-rc.2` 迁移到 `0.2.0-rc.2`：`npm run test:compat` 与 CI compat job 固定安装 `@deepseek-ai/dsh@0.2.0-rc.2` + 同版本 `@deepseek-ai/dsh-skill-filesystem`。全部门禁（隔离 profile 的本地 add、dump-config、npm pack 后打包件 add、有限时长启动冒烟）已在 0.2.0-rc.2 实测通过；上游 v0.2.0-rc.2 发布说明无插件 API / 技能 provider / 技能加载的破坏性变更，`FileSystemSkillProvider` 的 `providerName` / `includeDefaultRoots` / `customSkillDirs` 选项签名不变，插件代码零改动。
- 提示：`@deepseek-ai/dsh-skill-filesystem` 的 npm `latest` dist-tag 仍停留在 `0.0.1-rc.3`，官方经 `next` 标签分发新版本；本插件 peerDependency 为可选 `*`，不受影响。Node 最低要求维持 >= 22.19。

## [0.1.5] - 2026-09-17

### 修复
- **技能资源路径与 harness 的解析基准不一致，导致 `SKILL.md` 中全部相对路径失效。** harness 加载技能时注入「Base directory for this skill: `<skills>/<name>`」并指示按该基准解析相对路径，而 `docs/`、`scripts/`、`examples/` 原先位于包根，故 `SKILL.md` 里的 `scripts/csv-profile.mjs`、`docs/chart-spec.md`、`docs/report-template.md` 等引用在 agent 运行时一律解析到不存在的路径（阶段 1 的探查脚本与阶段 4 的报告骨架、图表规范因此全部不可达）。现将三者移入 `skills/data-insight-runbook/`，技能目录自包含；相对路径书写不变，`SKILL.md` 无需改动。
- `package.json` 的 `files` 字段随之移除包根 `docs/`、`scripts/`、`examples/` 条目（嵌套目录已由 `skills/` 递归包含，已用 `npm pack --dry-run` 验证）。
- 双语 README、`PUBLISHING.md` 中的路径引用与文档链接同步更新。
- `test/dsh-compat.test.mjs` 新增回归断言：技能引用的资源若存在于包内却位于技能目录之外，立即失败并给出修复指引——原测试只校验 `SKILL.md` frontmatter，未校验其引用的资源可达性，故未能拦住此问题。

### 变更
- **包内脚本路径变更（影响直接调用者）**：`csv-profile.mjs`、`setup-duckdb.ps1`/`setup-duckdb.sh` 与 `docs/`、`examples/` 现位于 `skills/data-insight-runbook/` 下。按 0.1.4 README 硬编码路径的调用需同步调整，例如 `node node_modules/dsh-data-insight/scripts/csv-profile.mjs` → `node node_modules/dsh-data-insight/skills/data-insight-runbook/scripts/csv-profile.mjs`。技能加载路径不受影响：`SKILL.md` 的相对路径写法与 DSH 侧安装方式均未变。
- `PLUGIN-MAINTENANCE.md` 的目录树、核心脚本引用与 `files` 白名单描述同步至新布局。

## [0.1.4] - 2026-09-11

### 变更
- DSH 宿主兼容基线从 `0.1.2-rc.1` 迁移到 `0.1.5-rc.2`：`npm run test:compat` 与 CI compat job 固定安装 `@deepseek-ai/dsh@0.1.5-rc.2` + 同版本 `@deepseek-ai/dsh-skill-filesystem`。上游 0.1.3~0.1.5 的破坏性变更（`SessionHandle`、异步 `agentLoop.create()`、Session format v2/v3、`ctx.agent` 移除、Inbox API 变更）均不涉及本插件使用的技能 provider 路径，插件代码零改动。
- 提示：DSH 宿主升级到 0.1.5 系后 Session format 迁移为 V3，不可逆；最终用户升级宿主前请备份会话日志。

## [0.1.3] - 2026-09-06

### 新增
- 固定 `@deepseek-ai/dsh@0.1.2-rc.1` 的 `npm run test:compat` 门禁及 Windows/Ubuntu Node 22.19 CI，覆盖隔离 profile 的 add、配置 dump 和有限时长启动。
- README 将依赖示例更新为 `^0.1.3`，并区分独立脚本与 DSH 宿主的 Node 兼容要求。
- `prepublishOnly` 钩子：npm 发布前自动运行测试门禁。

## [0.1.2] - 2026-09-02

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
