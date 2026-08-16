# 发布与分发指南（PUBLISHING）

本文档记录 `dsh-data-insight` 从源码到分发的完整步骤，供维护者在有网终端执行。

## 当前状态（构建侧已就绪）

- 包结构 14 个文件已建成；`node --check`、JSON、插件 API、SKILL.md frontmatter 均已校验通过。
- `csv-profile.mjs` 已在 `examples/sample-sales.csv` 上跑通。
- `setup-duckdb.ps1` 语法校验通过（UTF-8 BOM），版本探测数据源 `duckdb.org/data/latest_stable_version.txt` 实测返回 `1.5.5`。
- 已 `git init` + 初始 commit（本地 `main` 分支）。
- npm 包名 `dsh-data-insight` 已确认未被占用（`npm view` 返回 404）。

## 前置条件

- 一个有网、能访问 github.com 与 registry.npmjs.org 的终端。
- 已登录 npm：`npm login`（需要 npm 账号 + 2FA）。
- GitHub 账号（用于建仓库与 push）。

## 步骤 1：发布到 GitHub

```powershell
# 1) 浏览器打开 https://github.com/new，仓库名 dsh-data-insight，公开，
#    不要勾选 "Initialize with README / .gitignore / license"（本地已有）。
cd D:\Agent预设\UI\dsh-data-insight
git remote add origin https://github.com/<你的用户名>/dsh-data-insight.git
git push -u origin main
```

推送后打一个版本 tag（可选但推荐，供 `dsh plugin add github:...#vX.Y.Z` 引用）：

```powershell
git tag v0.1.0
git push origin v0.1.0
```

## 步骤 2：发布到 npm

```powershell
cd D:\Agent预设\UI\dsh-data-insight
npm view dsh-data-insight version   # 再次确认包名可用（应 404）
npm login                           # 首次需要；已登录可跳过
npm publish --access public
```

## 步骤 3：安装到 profile（二选一）

发布后，任选一种分发形态安装：

```powershell
# npm 形态
dsh plugin --profile web add dsh-data-insight

# GitHub 形态（与 dsh-preset-scaffold 一致）
dsh plugin --profile web add github:<你的用户名>/dsh-data-insight#v0.1.0
```

> 本地开发期可用 `file:` 链接（无需发布）：
> 在 profile 的 `package.json` 里加 `"dsh-data-insight": "file:D:/Agent预设/UI/dsh-data-insight"`，
> 并在 `dsh.profile.bundles` 数组加 `"dsh-data-insight"`，然后 `pnpm install`。

## 步骤 4：验证

1. 重启 profile（`dsh web` 重开），技能列表应出现 `data-insight-runbook`。
2. 说「分析 examples/sample-sales.csv 出报告」，确认五阶段执行并产出报告。
3. 可选：`scripts/setup-duckdb.ps1` 装 DuckDB 后，验证直连只读查询。

## 常见问题

- **`npm publish` 报 403/404**：包名被占或未登录；用 `npm whoami` 检查登录态。
- **`dsh plugin add` 报找不到包**：确认包已发布且 profile 的 `dsh.profile.bundles` 含包名。
- **技能没出现**：重启 profile 才加载 bundle patch；确认 `cordis.patch.yml` 随包发布（`files` 字段已包含）。
- **DuckDB 直连被拒**：runbook 强制 `-readonly`；连接串走环境变量 `DATA_INSIGHT_DB_URL`，不要写进命令/报告。

## 本地开发循环（改技能内容后）

1. 改 `skills/`、`docs/`、`scripts/` 下的文件。
2. 本地 `file:` 链接形态下，改 `skills/` 无需重装（FileSystemSkillProvider 会 watch 技能根）。
3. 改 `plugin/index.js` / `cordis.patch.yml` / `package.json` 后需 `pnpm install` 并重启 profile。
4. 提交前：`node --check scripts/csv-profile.mjs`、PowerShell 语法校验、`git status` 确认。
