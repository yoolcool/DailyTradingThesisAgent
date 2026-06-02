const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(filePath) {
  assert(fs.existsSync(filePath), `Missing file: ${filePath}`);
  const text = fs.readFileSync(filePath, "utf8");
  assert(text.trim().length > 0, `Empty file: ${filePath}`);
  return text;
}

function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  assert(fs.existsSync(filePath), `Missing data file: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sumRiskPenalty(summary) {
  return (summary?.items || []).reduce((sum, item) => sum + Number(item.penalty || 0), 0);
}

function main() {
  const markdown = readText(path.join(REPORTS_DIR, "latest.md"));
  const html = readText(path.join(REPORTS_DIR, "latest.html"));
  const chartsDir = path.join(REPORTS_DIR, "charts");

  assert(markdown.includes("REAL DATA TEST") || markdown.includes("MOCK DATA"), "Report missing data mode banner");
  assert(html.includes("REAL DATA TEST") || html.includes("MOCK DATA"), "HTML missing data mode banner");
  assert(!markdown.includes("\uFFFD") && !html.includes("\uFFFD"), "Report contains replacement characters");

  for (const snippet of [
    "moneyFlowScore(1차)",
    "moneyFlowScore(최종)",
    "최종 원점수:",
    "최종 표시 점수:",
    "cap 적용:",
    "계산식:",
    "리스크 패널티 산정 근거",
    "Nasdaq-100 전체 moneyFlowScore(1차) 표",
    "| 순위 | 티커 | 이름 | moneyFlowScore(1차) | 최종 표시 점수 | 최종 원점수 |",
    "Nasdaq-100 전체 moneyFlowScore(1차) 표 펼치기"
  ]) {
    assert(markdown.includes(snippet), `Markdown missing required snippet: ${snippet}`);
  }

  for (const snippet of [
    "moneyFlowScore(최종) 산정 근거 보기",
    "리스크 패널티 산정 근거 보기",
    "data-stock-universe-table",
    "table-scroll",
    "<details"
  ]) {
    assert(html.includes(snippet), `HTML missing required snippet: ${snippet}`);
  }

  assert(fs.existsSync(chartsDir), "Missing reports/charts directory");
  const chartFiles = fs.readdirSync(chartsDir).filter((name) => name.endsWith(".png"));
  assert(chartFiles.length > 0, "No chart images were generated");
  assert(html.includes('<img class="chart"'), "HTML card charts are not linked");

  for (const file of [
    "src/data/newsProvider.js",
    "src/data/optionsProvider.js",
    "src/data/etfHoldingsProvider.js",
    "src/data/liquidityProvider.js",
    "src/data/nasdaq100Universe.js",
    ".env.example",
    "config/nasdaq100Fallback.json",
    "data/latest-report.json"
  ]) {
    assert(fs.existsSync(path.join(ROOT, file)), `Missing provider/env file: ${file}`);
  }

  const marketData = readJson("market_data_real.json");
  assert((marketData.universe?.stockUniverseCount || 0) >= 90, "Market data missing expanded Nasdaq-100 universe count");

  const latestSnapshot = readJson("latest-report.json");
  const scanResults = latestSnapshot.stockUniverseScan?.results || [];
  assert(scanResults.length >= 90, "Snapshot missing stockUniverseScan results");
  assert(scanResults[0].moneyFlowScoreInitial >= scanResults.at(-1).moneyFlowScoreInitial, "Snapshot stockUniverseScan results should be sorted by initial score");

  const scoredItems = [
    ...(latestSnapshot.stockActionCandidates || []),
    ...(latestSnapshot.etfActionCandidates || []),
    ...(latestSnapshot.stockEntryCandidates || []),
    ...(latestSnapshot.stockPullbackCandidates || [])
  ];
  assert(scoredItems.length > 0, "Snapshot missing scored recommendation items");
  for (const item of scoredItems) {
    assert(item.moneyFlowScoreInitial !== undefined, `Snapshot missing initial score for ${item.ticker}`);
    assert(item.moneyFlowScoreFinal !== undefined, `Snapshot missing final score for ${item.ticker}`);
  }

  const reportData = readJson("latest-report.json");
  for (const row of scanResults.slice(0, 20)) {
    assert(row.moneyFlowScoreInitial !== undefined, `Scan result missing initial score for ${row.ticker}`);
    assert(row.moneyFlowScoreFinal !== undefined, `Scan result missing final score for ${row.ticker}`);
  }

  const candidatesWithRisk = [
    ...(reportData.stockActionCandidates || []),
    ...(reportData.etfActionCandidates || [])
  ].filter((row) => row.riskPenaltySummary);
  for (const row of candidatesWithRisk) {
    assert(row.riskPenaltySummary.totalPenalty === sumRiskPenalty(row.riskPenaltySummary), `Risk penalty item sum mismatch for ${row.ticker}`);
  }

  console.log("Verified moneyFlowScore initial/final labels, Nasdaq-100 table, snapshots, and charts");
  console.log(`Verified chart count: ${chartFiles.length}`);
}

main();
