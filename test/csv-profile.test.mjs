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
const script = join(root, "scripts", "csv-profile.mjs");
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
  const { code, json } = run(join(root, "examples", "sample-sales.csv"), "--json");
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

  const revenue = col(json, "revenue");
  assert.equal(revenue.outliers[0].row, 26);
  assert.equal(revenue.outliers[0].value, 120000);

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
  const { json } = run(join(root, "examples", "sample-sales.csv"), "--json", "--limit", "5");
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

test("文本模式输出为 Markdown 报告", () => {
  const { stdout } = run(join(root, "examples", "sample-sales.csv"));
  assert.ok(stdout.includes("# CSV 数据探查报告"));
  assert.ok(stdout.includes("## Schema 与质量"));
  assert.ok(stdout.includes("重复行：1"));
});

test("缺参数退出码 2；文件不存在退出码 1", () => {
  assert.equal(run().code, 2);
  assert.equal(run(join(tmpdir(), "di-no-such-file.csv"), "--json").code, 1);
});
