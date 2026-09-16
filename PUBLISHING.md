# Publishing

> 本文是 dsh-data-insight 的发布手册，结构遵循工作区顶层 docs/PUBLISHING-TEMPLATE.md 模板（该文件位于插件仓库之外，不在本仓库内）；其他插件仓库的 PUBLISHING.md 同构。

## 1. 命名与分发身份

- npm 包名：`dsh-data-insight`（与 GitHub 仓库名一致，2026-09 首发时经 `npm view` 确认未占用）。
- GitHub 仓库名：`duyanta123/dsh-data-insight`。
- exports 仅根路径（`./plugin/index.js`），无 bin 命令、无子路径导出。
- cordis.patch.yml 插件行 id/name 为 `dsh-data-insight`。
- README 双语：`README.md` 为英文、`README.zh-CN.md` 为中文，顶部互链；两者章节结构必须一致，改动描述时同步更新。

## 2. 发布前检查清单

1. 运行 `npm test`（`node --test test/csv-profile.test.mjs`，当前 10 例，全绿）。
2. 运行 `node --check skills/data-insight-runbook/scripts/csv-profile.mjs` 与 `npm run test:compat`。
3. 改动过 DuckDB 命令时，真机验证**两个模式**：无库文件（内存库，不加 `-readonly`）与有库文件（`-readonly` 只读）。历史教训：DuckDB v1.5.5 实测内存库加 `-readonly` 会报错。
4. 运行 `npm pack --dry-run`，确认包含 `plugin/index.js`、`cordis.patch.yml`、`skills/`（技能目录自包含：`SKILL.md` + `docs/` + `scripts/` + `examples/` 均在其下）、双语 `README.md`/`README.zh-CN.md`、`CHANGELOG.md`、`PUBLISHING.md`、`LICENSE`。
5. 版本一致性核对：`package.json` version、`CHANGELOG.md` 发布段、git tag 三处一致。
6. 版本徽章同步：双语 README 的 version 徽章、安装示例 tag、手动安装依赖版本指向最新发布版本。

## 3. DSH bundle 契约（对齐 2026-09 现行契约）

- `package.json` 声明 `dsh.bundle.patch: ./cordis.patch.yml`——harness 只激活声明该字段的包。
- `cordis.patch.yml` 为 config-tree `- insert:` 补丁格式；harness 加载 `main`（`plugin/index.js`）。
- `plugin/index.js` 经官方 `@deepseek-ai/dsh-skill-filesystem` 的 `FileSystemSkillProvider` 注册 `skills/` 为技能根（includeDefaultRoots: false）。
- `skills/data-insight-runbook/SKILL.md` frontmatter 必填 `name`（kebab-case）+ `description`。
- 安装契约：`dsh plugin --profile <profile> add "github:owner/repo#ref"`；兼容基线 `@deepseek-ai/dsh@0.1.5-rc.2`（Node >= 22.19）。

## 4. 发布渠道

### GitHub

1. push `main`，确认 CI 全绿（ubuntu + windows × Node 22 回归 + Node 22.19 DSH compat job）。
2. 打 tag `v0.x.y`（与 `package.json` version 一致，如当前 `v0.1.5`）并推送。
3. 给仓库添加 GitHub topic `dsh-plugin`（awesome 收录门槛之一）。

### npm

1. `npm login`（需要 npm 账号 + 2FA）。
2. `npm publish --access public`（`prepublishOnly` 会先跑 `npm test`）。
3. 发布后核对 `npm view dsh-data-insight version` 与 dist-tags。

### awesome 列表收录（已收录，改描述时同步）

- awesome-dsh-plugin：同步 `data/plugins/duyanta123__dsh-data-insight.yml` 的描述与分类。
- awesome-deepseek-harness：同步 README 条目（真实仓库 + 一句话 + 链接，en/zh 同 PR）。
- dsh-index：已收录（`https://dsh-index.xlings.org/packages/dsh-data-insight/`），技能元数据变更时同步提交。

## 5. 安装验证（发布后）

1. 重启 profile（`dsh web` 重开），技能列表应出现 `data-insight-runbook`。
2. 说「分析 skills/data-insight-runbook/examples/sample-sales.csv 出报告」，确认五阶段执行并产出报告。
3. 可选：`skills/data-insight-runbook/scripts/setup-duckdb.ps1` 装 DuckDB 后，验证直连只读查询。

## 6. 常见问题

- **`npm publish` 报 403/404**：包名被占或未登录；用 `npm whoami` 检查登录态。
- **`dsh plugin add` 报找不到包**：确认包已发布且 profile 的 `dsh.profile.bundles` 含包名。
- **技能没出现**：重启 profile 才加载 bundle patch；确认 `cordis.patch.yml` 随包发布（`files` 字段已包含）。
- **DuckDB 直连被拒**：runbook 强制 `-readonly`；连接串走环境变量 `DATA_INSIGHT_DB_URL`，不要写进命令/报告。
