#!/bin/sh
# setup-duckdb.sh — 安装 DuckDB CLI（可选依赖，用于 dsh-data-insight 直连数据库路径；macOS / Linux）
#
# 用法：
#   sh scripts/setup-duckdb.sh                    # 安装最新稳定版
#   sh scripts/setup-duckdb.sh 1.5.5              # 指定版本
#
# 安装位置：$HOME/.local/bin/duckdb，并提示加入 PATH。
# 安全红线由 runbook 保证：连接库一律 -readonly，连接串走环境变量 DATA_INSIGHT_DB_URL。

set -eu

VERSION="${1:-}"

get_latest_version() {
  v=$(curl -fsSL --max-time 20 https://duckdb.org/data/latest_stable_version.txt 2>/dev/null || true)
  case "$v" in
    [0-9]*.[0-9]*.[0-9]*) echo "$v" ;;
    *) echo "1.5.5" ;;
  esac
}

[ -z "$VERSION" ] && VERSION=$(get_latest_version)
echo "目标 DuckDB 版本：$VERSION"

INSTALL_DIR="$HOME/.local/bin"
EXE="$INSTALL_DIR/duckdb"

# 已安装且版本匹配则跳过
if [ -x "$EXE" ]; then
  installed=$("$EXE" --version 2>/dev/null | head -n 1 || true)
  case "$installed" in
    "v$VERSION "*|*" $VERSION "*)
      echo "已安装 DuckDB $VERSION（$EXE）"
      exit 0
      ;;
  esac
fi

# ── 方案 1：macOS 用 Homebrew ────────────────────────────────────────────────
if command -v brew >/dev/null 2>&1; then
  echo "尝试 brew 安装 duckdb ..."
  if brew install duckdb; then
    echo "brew 安装完成。验证："
    duckdb --version
    exit 0
  fi
  echo "brew 安装未成功，回退到直接下载。" >&2
fi

# ── 方案 2：直接下载 GitHub release ─────────────────────────────────────────
OS=$(uname -s)
ARCH=$(uname -m)
case "$OS:$ARCH" in
  Darwin:*) ASSET="duckdb_cli-osx-universal.zip" ;;
  Linux:x86_64) ASSET="duckdb_cli-linux-amd64.zip" ;;
  Linux:arm64|Linux:aarch64) ASSET="duckdb_cli-linux-arm64.zip" ;;
  *)
    echo "不支持的平台：$OS $ARCH。请手动安装：https://duckdb.org/docs/stable/clients/cli/overview" >&2
    exit 1
    ;;
esac

URL="https://github.com/duckdb/duckdb/releases/download/v$VERSION/$ASSET"
mkdir -p "$INSTALL_DIR"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "下载 $URL ..."
curl -fSL --max-time 120 -o "$TMP/duckdb.zip" "$URL"

unzip -o "$TMP/duckdb.zip" -d "$TMP" >/dev/null
mv "$TMP/duckdb" "$EXE"
chmod +x "$EXE"

# ── PATH 提示（不擅改 shell 配置）──────────────────────────────────────────
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo "提示：$INSTALL_DIR 不在 PATH。请在 ~/.profile 或 ~/.zshrc 添加："
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    ;;
esac

echo "验证安装："
"$EXE" --version
echo ""
echo "完成。用法示例（只读）："
echo "  duckdb -csv -c \"SELECT * FROM read_csv_auto('data.csv') LIMIT 100\""
echo "  duckdb -readonly -csv -c \"SELECT ... LIMIT 5000\" \"\$DATA_INSIGHT_DB_URL\""
