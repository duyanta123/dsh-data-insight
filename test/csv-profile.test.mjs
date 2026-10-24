/**
 * csv-profile.test.mjs — csv-profile.mjs 的 CLI 契约测试（node:test，零依赖）。
 *
 * 说明：
 *   - 通过 spawnSync 直接调 CLI 并断言 --json 输出，测的是 runbook 实际使用的调用契约。
 *   - 运行环境（开发机 / CI）spawn 子进程没有问题；「不 spawn」红线仅约束 DSH 沙箱内的运行时脚本。
 *
 * 运行：node --test test/csv-profile.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skill = join(root, "skills", "data-insight-runbook");
const script = join(skill, "scripts", "csv-profile.mjs");
const fixtures = join(root, "test", "fixtures");

/** 跑 CLI，返回 { code, stdout, stderr, json } */
function run(...args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* 文本模式或报错时为 null */
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

const col = (report, name) => report.columnsDetail.find((c) => c.name === name);

test("样例 CSV：行数/列数/重复行/缺失/异常值全链路", () => {
  const { code, json } = run(join(skill, "examples", "sample-sales.csv"), "--json");
  assert.equal(code, 0);
  assert.equal(json.rows, 31);
  assert.equal(json.columns, 5);
  assert.equal(json.duplicateRows, 1);

  const orders = col(json, "orders");
  assert.equal(orders.type, "number");
  assert.equal(orders.missing, 3);
  assert.equal(orders.outlierCount, 1);
  assert.equal(orders.outliers[0].row, 26);
  assert.equal(orders.outliers[0].value, 900);
  // IQR 1.5× 对照（P25=38.5 / P75=106.25 → 围栏 -63.125 ~ 207.875，900 出上围栏）
  assert.equal(orders.iqrOutlierCount, 1);
  assert.equal(orders.iqrOutliers[0].row, 26);
  assert.equal(orders.iqrOutliers[0].value, 900);
  assert.equal(orders.iqrFences[1], 207.875);

  const revenue = col(json, "revenue");
  assert.equal(revenue.outliers[0].row, 26);
  assert.equal(revenue.outliers[0].value, 120000);
  assert.equal(revenue.iqrOutlierCount, 1);
  assert.equal(revenue.iqrOutliers[0].row, 26);

  assert.equal(col(json, "date").type, "date");
  assert.equal(col(json, "channel").type, "text");
});

test("引号内逗号与转义引号：解析为单值", () => {
  const { json } = run(join(fixtures, "dirty.csv"), "--json");
  const name = col(json, "name");
  assert.equal(name.type, "text");
  const topNames = name.top.map(([k]) => k);
  assert.ok(topNames.includes('Zhang, San'), "引号内逗号应保留在单值内");
  assert.ok(topNames.includes('Wang "Wu"'), '转义引号应还原为 "Wu"');
});

test("混合类型列降级为 text；不一致日期降级为 text；中英布尔识别为 boolean", () => {
  const { json } = run(join(fixtures, "dirty.csv"), "--json");
  assert.equal(col(json, "amount").type, "text", "数字+文本混合 → text");
  assert.equal(col(json, "date").type, "text", "日期格式不统一 → text");
  const flag = col(json, "flag");
  assert.equal(flag.type, "boolean");
  const freq = Object.fromEntries(flag.top);
  assert.equal(freq["是"], 2);
  assert.equal(freq["true"], 2);
});

test("千分位数字识别为 number 且按去逗号值统计", () => {
  const { json } = run(join(fixtures, "comma-numbers.csv"), "--json");
  const amount = col(json, "amount");
  assert.equal(amount.type, "number");
  assert.equal(amount.min, 12);
  assert.equal(amount.max, 9876);
  assert.equal(amount.missing, 0);
});

test("残缺行（少列/多列）不崩溃，少列计为缺失", () => {
  const { code, json } = run(join(fixtures, "ragged.csv"), "--json");
  assert.equal(code, 0);
  assert.equal(json.rows, 3);
  assert.equal(json.columns, 3);
  assert.equal(col(json, "c").missing, 1);
});

test("--limit 截断数据行", () => {
  const { json } = run(join(skill, "examples", "sample-sales.csv"), "--json", "--limit", "5");
  assert.equal(json.rows, 5);
});

test("TSV：制表符探测与解析（运行时生成，保证真实 TAB/CRLF）", () => {
  const f = join(tmpdir(), "di-test-tab.tsv");
  writeFileSync(f, "name\tcount\r\nAlice\t10\r\nBob\t20\r\n");
  try {
    const { json } = run(f, "--json");
    assert.equal(json.delimiter, "TAB");
    assert.equal(json.rows, 2);
    const count = col(json, "count");
    assert.equal(count.type, "number");
    assert.equal(count.min, 10);
    assert.equal(count.max, 20);
  } finally {
    rmSync(f, { force: true });
  }
});

test("UTF-8 BOM 剥离：首列名不带 \\uFEFF", () => {
  const f = join(tmpdir(), "di-test-bom.csv");
  writeFileSync(f, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("x,y\n1,2\n3,4\n", "utf8")]));
  try {
    const { json } = run(f, "--json");
    assert.equal(json.columns, 2);
    assert.ok(json.columnsDetail.some((c) => c.name === "x"), "BOM 应被剥离");
    assert.equal(json.rows, 2);
  } finally {
    rmSync(f, { force: true });
  }
});

test("IQR 1.5× 对照：小样本重尾下 IQR 检出而 Z-score 漏检", () => {
  const f = join(tmpdir(), "di-test-iqr.csv");
  // 1..9 + 100：mean=14.5, std≈28.60 → z(100)≈2.99 不到 3；P25=3.25 / P75=7.75 → 上围栏 14.5，100 出围栏
  writeFileSync(f, "v\n1\n2\n3\n4\n5\n6\n7\n8\n9\n100\n");
  try {
    const { code, json } = run(f, "--json");
    assert.equal(code, 0);
    const v = col(json, "v");
    assert.equal(v.type, "number");
    assert.equal(v.outlierCount, 0, "Z-score |z|>3 不应检出");
    assert.equal(v.iqr, 4.5);
    assert.equal(v.iqrFences[0], -3.5);
    assert.equal(v.iqrFences[1], 14.5);
    assert.equal(v.iqrOutlierCount, 1, "IQR 对照应检出 100");
    assert.equal(v.iqrOutliers[0].value, 100);
  } finally {
    rmSync(f, { force: true });
  }
});

test("utf16le：FF FE BOM 剥离，首列名不带 U+FEFF", () => {
  const f = join(tmpdir(), "di-test-utf16le.csv");
  writeFileSync(f, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("name,qty\n甲,1\n乙,2\n", "utf16le")]));
  try {
    const { code, json } = run(f, "--json", "--encoding", "utf16le");
    assert.equal(code, 0);
    assert.ok(json.columnsDetail.some((c) => c.name === "name"), "UTF-16LE BOM 应被剥离");
    assert.equal(json.rows, 2);
    assert.equal(col(json, "qty").max, 2);
  } finally {
    rmSync(f, { force: true });
  }
});

test("utf16le：UTF-16BE BOM（FE FF）明确报错并退出码 1", () => {
  const f = join(tmpdir(), "di-test-utf16be.csv");
  writeFileSync(f, Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from("name,qty\n1,2\n", "utf16le")]));
  try {
    const { code, stderr } = run(f, "--json", "--encoding", "utf16le");
    assert.equal(code, 1);
    assert.ok(stderr.includes("UTF-16BE"), "应提示 BE 不受支持");
  } finally {
    rmSync(f, { force: true });
  }
});

test("无效 --encoding 以退出码 2 拒绝并提示合法值", () => {
  const r = run(join(skill, "examples", "sample-sales.csv"), "--json", "--encoding", "gbk");
  assert.equal(r.code, 2);
  assert.ok(r.stderr.includes("utf8|utf16le|latin1"));
});

test("文本模式输出为 Markdown 报告", () => {
  const { stdout } = run(join(skill, "examples", "sample-sales.csv"));
  assert.ok(stdout.includes("# CSV 数据探查报告"));
  assert.ok(stdout.includes("## Schema 与质量"));
  assert.ok(stdout.includes("重复行：1"));
  assert.ok(stdout.includes("## 数值异常值（Z-score |z|>3；IQR 1.5×IQR 对照）"), "异常值段应为双口径");
  assert.ok(stdout.includes("IQR（P25−1.5×IQR / P75+1.5×IQR）"), "说明行应写明 IQR 口径");
});

test("缺参数退出码 2；文件不存在退出码 1", () => {
  assert.equal(run().code, 2);
  assert.equal(run(join(tmpdir(), "di-no-such-file.csv"), "--json").code, 1);
});
