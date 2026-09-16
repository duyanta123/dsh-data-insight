#!/usr/bin/env node
/**
 * csv-profile.mjs — 零依赖 CSV 数据探查脚本（纯 Node 内建，不 spawn 子进程）。
 *
 * 用途：读取一个 CSV/TSV 文件，输出结构化探查报告（schema / 缺失值 /
 * 值分布 / 重复行 / 数值统计 / 异常值），供 data-insight-runbook 阶段 1 使用。
 *
 * 用法：
 *   node csv-profile.mjs <file> [--sep <分隔符>] [--encoding <utf8|utf16le|latin1>] [--limit <N>] [--json]
 *
 * 说明：
 *   - 默认自动探测分隔符（, \t ;）。
 *   - 编码默认 utf8；GBK 文件请先转码（PowerShell:  Get-Content -Encoding GBK file | Set-Content -Encoding UTF8 out）。
 *   - --limit 限制读取行数（默认 0 = 全部），用于超大数据集抽样探查。
 */

import { readFileSync } from "node:fs";

// ── 参数解析 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const limit = Number(getArg("--limit", "0")) || 0;
const encoding = getArg("--encoding", "utf8");
const asJson = args.includes("--json");
const forcedSep = getArg("--sep", null);

if (!file) {
  console.error("用法: node csv-profile.mjs <file> [--sep <分隔符>] [--encoding utf8|utf16le|latin1] [--limit N] [--json]");
  process.exit(2);
}

// ── 读取与编码 ─────────────────────────────────────────────────────────────
let text;
try {
  const buf = readFileSync(file);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) text = buf.slice(3).toString(encoding);
  else text = buf.toString(encoding);
} catch (e) {
  console.error(`读取失败: ${e.message}`);
  process.exit(1);
}

// ── 分隔符探测 ──────────────────────────────────────────────────────────────
function detectSep(line) {
  if (forcedSep) return forcedSep;
  const cands = [",", "\t", ";", "|"];
  // 只在引号外计数
  let best = ",";
  let bestCount = -1;
  for (const c of cands) {
    let count = 0;
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === c && !inQ) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

// ── CSV 解析（支持引号包裹与转义引号）──────────────────────────────────────
function parseCsv(text, sep) {
  const rows = [];
  let field = "";
  let row = [];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === sep) {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
      } else field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

const sampleLine = text.split(/\r?\n/).find((l) => l.trim() !== "") || "";
const sep = detectSep(sampleLine);
const rows = parseCsv(text, sep);
if (rows.length === 0) {
  console.error("未解析到数据行。");
  process.exit(1);
}

const header = rows[0].map((h) => h.trim());
let data = rows.slice(1);
if (limit > 0) data = data.slice(0, limit);
const nRows = data.length;
const nCols = header.length;

// ── 类型推断 ────────────────────────────────────────────────────────────────
const numRe = /^[-+]?\d[\d,]*(\.\d+)?$/;
const dateRe = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
const boolRe = /^(true|false|yes|no|是|否|y|n)$/i;

function inferType(vals) {
  const nonEmpty = vals.filter((v) => v.trim() !== "");
  if (nonEmpty.length === 0) return "empty";
  if (nonEmpty.every((v) => numRe.test(v.replace(/,/g, "")))) return "number";
  if (nonEmpty.every((v) => dateRe.test(v.trim()))) return "date";
  if (nonEmpty.every((v) => boolRe.test(v.trim()))) return "boolean";
  return "text";
}

function toNum(v) {
  return Number(v.replace(/,/g, ""));
}

// ── 统计计算 ────────────────────────────────────────────────────────────────
function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base] + (sorted[base + 1] !== undefined ? (sorted[base + 1] - sorted[base]) * rest : 0);
}
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

const cols = header.map((name, i) => {
  const vals = data.map((r) => (r[i] !== undefined ? r[i].trim() : ""));
  const type = inferType(vals);
  const missing = vals.filter((v) => v === "").length;
  const missingRate = nRows ? ((missing / nRows) * 100).toFixed(1) : "0.0";
  const info = { name, type, missing, missingRate };
  if (type === "number") {
    const nums = vals.filter((v) => v.trim() !== "").map(toNum).sort((a, b) => a - b);
    info.min = nums[0];
    info.max = nums[nums.length - 1];
    info.mean = mean(nums);
    info.median = quantile(nums, 0.5);
    info.stddev = stddev(nums);
    info.p25 = quantile(nums, 0.25);
    info.p75 = quantile(nums, 0.75);
    info.p90 = quantile(nums, 0.9);
    // Z-score 异常值 (|z| > 3)
    const m = info.mean;
    const s = info.stddev || 1;
    const outliers = [];
    vals.forEach((v, idx) => {
      if (v.trim() === "") return;
      const x = toNum(v);
      if (Math.abs((x - m) / s) > 3) outliers.push({ row: idx + 2, value: x });
    });
    info.outliers = outliers.slice(0, 20);
    info.outlierCount = outliers.length;
  } else if (type === "text") {
    const freq = new Map();
    vals.forEach((v) => {
      if (v.trim() === "") return;
      freq.set(v, (freq.get(v) || 0) + 1);
    });
    info.unique = freq.size;
    info.top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  } else if (type === "date") {
    const dates = vals.filter((v) => v.trim() !== "").map((v) => v.trim());
    info.min = dates.sort()[0];
    info.max = dates.sort()[dates.length - 1];
    info.unique = new Set(dates).size;
  } else if (type === "boolean") {
    const freq = new Map();
    vals.forEach((v) => {
      if (v.trim() === "") return;
      freq.set(v.trim().toLowerCase(), (freq.get(v.trim().toLowerCase()) || 0) + 1);
    });
    info.top = [...freq.entries()];
  }
  return info;
});

// ── 重复行 ──────────────────────────────────────────────────────────────────
const seen = new Set();
let dupCount = 0;
data.forEach((r) => {
  const key = r.join("\u0001");
  if (seen.has(key)) dupCount++;
  else seen.add(key);
});

// ── 输出 ────────────────────────────────────────────────────────────────────
const fmt = (n) => (typeof n === "number" ? (Math.round(n * 100) / 100).toLocaleString() : String(n ?? ""));
const report = {
  file,
  encoding,
  delimiter: sep === "\t" ? "TAB" : sep,
  rows: nRows,
  columns: nCols,
  duplicateRows: dupCount,
  columnsDetail: cols,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const out = [];
out.push(`# CSV 数据探查报告`);
out.push(``);
out.push(`- 文件：\`${file}\``);
out.push(`- 编码：${encoding}　分隔符：${report.delimiter}`);
out.push(`- 数据行数（不含表头）：${nRows}　列数：${nCols}　重复行：${dupCount}`);
out.push(``);
out.push(`## Schema 与质量`);
out.push(`| 列名 | 类型 | 缺失数 | 缺失率 | 摘要 |`);
out.push(`|---|---|---|---|---|`);
for (const c of cols) {
  let summary = "";
  if (c.type === "number")
    summary = `min=${fmt(c.min)} max=${fmt(c.max)} mean=${fmt(c.mean)} median=${fmt(c.median)} std=${fmt(c.stddev)} P25=${fmt(c.p25)} P75=${fmt(c.p75)} P90=${fmt(c.p90)}`;
  else if (c.type === "text")
    summary = `唯一值=${c.unique} Top=${(c.top || []).map(([k, v]) => `${k}(${v})`).join(", ")}`;
  else if (c.type === "date") summary = `范围=${c.min} ~ ${c.max} 唯一值=${c.unique}`;
  else if (c.type === "boolean") summary = (c.top || []).map(([k, v]) => `${k}=${v}`).join(", ");
  else summary = "（全空列）";
  out.push(`| ${c.name} | ${c.type} | ${c.missing} | ${c.missingRate}% | ${summary} |`);
}
out.push(``);
const hasOutliers = cols.some((c) => c.type === "number" && c.outlierCount > 0);
if (hasOutliers) {
  out.push(`## 数值异常值（Z-score |z|>3）`);
  for (const c of cols) {
    if (c.type === "number" && c.outlierCount > 0) {
      out.push(`- **${c.name}**：${c.outlierCount} 个异常值，示例：${c.outliers.map((o) => `行${o.row}=${fmt(o.value)}`).join(", ")}`);
    }
  }
  out.push(``);
}
out.push(`> 说明：缺失值按空字符串判定；数值型已去除千分位逗号。GBK 文件请先转码为 UTF-8。`);
console.log(out.join("\n"));
