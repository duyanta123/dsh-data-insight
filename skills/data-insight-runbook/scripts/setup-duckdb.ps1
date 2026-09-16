# setup-duckdb.ps1 — 安装 DuckDB CLI（可选依赖，用于 dsh-data-insight 直连数据库路径）
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/setup-duckdb.ps1            # 安装最新稳定版
#   powershell -ExecutionPolicy Bypass -File scripts/setup-duckdb.ps1 -Version 1.5.5   # 指定版本
#
# 安装位置：$env:LOCALAPPDATA\DuckDB\cli\duckdb.exe，并写入用户 PATH（持久）。
# 安全红线由 runbook 保证：调用时一律 -readonly，连接串走环境变量。

param(
  [string]$Version = ""   # 留空则自动取 duckdb.org 最新稳定版
)

$ErrorActionPreference = "Stop"

function Get-LatestVersion {
  try {
    $v = (Invoke-WebRequest -Uri "https://duckdb.org/data/latest_stable_version.txt" -UseBasicParsing -TimeoutSec 20).Content.Trim()
    if ($v -match '^\d+\.\d+\.\d+$') { return $v }
  } catch {
    Write-Warning "无法获取最新版本号：$($_.Exception.Message)"
  }
  return "1.5.5"
}

if (-not $Version) { $Version = Get-LatestVersion }
Write-Host "目标 DuckDB 版本：$Version"

$installDir = Join-Path $env:LOCALAPPDATA "DuckDB\cli"
$exe = Join-Path $installDir "duckdb.exe"

# 已安装且版本匹配则跳过
if (Test-Path $exe) {
  $installed = (& $exe --version 2>$null | Select-Object -First 1)
  if ($installed -match [regex]::Escape($Version)) {
    Write-Host "已安装 DuckDB $Version（$exe）"
    Write-Host "确认 PATH 已包含：$installDir"
    exit 0
  }
}

# ── 方案 1：winget ──────────────────────────────────────────────────────────
$winget = Get-Command winget -ErrorAction SilentlyContinue
if ($winget) {
  Write-Host "尝试 winget 安装 DuckDB.cli $Version ..."
  winget install --id DuckDB.cli --version $Version --accept-source-agreements --accept-package-agreements --silent
  if ($LASTEXITCODE -eq 0) {
    Write-Host "winget 安装完成。若 PATH 未更新，请重开终端或手动添加：$installDir"
    exit 0
  }
  Write-Warning "winget 安装未成功（exit $LASTEXITCODE），回退到直接下载。"
}

# ── 方案 2：直接下载 GitHub release ────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
$zip = Join-Path $env:TEMP "duckdb_cli-windows-amd64-$Version.zip"
$url = "https://github.com/duckdb/duckdb/releases/download/v$Version/duckdb_cli-windows-amd64.zip"

Write-Host "下载 $url ..."
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 120

Write-Host "解压到 $installDir ..."
Expand-Archive -Path $zip -DestinationPath $installDir -Force
Remove-Item $zip -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $exe)) {
  Write-Error "安装失败：未找到 $exe。请手动从 https://duckdb.org/docs/stable/clients/cli/overview 安装。"
  exit 1
}

# ── 写入用户 PATH（持久）───────────────────────────────────────────────────
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
  Write-Host "已写入用户 PATH：$installDir（重开终端后生效）"
}

# ── 验证 ───────────────────────────────────────────────────────────────────
Write-Host "验证安装："
& $exe --version
Write-Host "`n完成。用法示例（只读）："
Write-Host "  duckdb -readonly -csv -c ""SELECT * FROM read_csv_auto('data.csv') LIMIT 100"""
Write-Host "  duckdb -readonly -csv -c ""SELECT ... LIMIT 5000"" `"`$env:DATA_INSIGHT_DB_URL`""
