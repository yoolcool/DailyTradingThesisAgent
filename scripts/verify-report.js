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

  const forbiddenTerms = [
    "\uC635\uC158",
    ["options", "Score"].join(""),
    ["options", " data"].join(""),
    ["option", " chain"].join(""),
    ["Put", "/Call"].join("")
  ];
  for (const forbidden of forbiddenTerms) {
    assert(!markdown.includes(forbidden), `Markdown still includes forbidden options text: ${forbidden}`);
    assert(!html.includes(forbidden), `HTML still includes forbidden options text: ${forbidden}`);
  }

  for (const snippet of [
    "오늘의 분리 결론",
    "ETF 행동 후보",
    "개별 종목 행동 후보",
    "오늘 돈이 몰리는 테마",
    "돈이 몰린다고 보는 이유",
    "Nasdaq-100 전체 moneyFlowScore(1차) 표",
    "데이터 수집 상태",
    "참고: moneyFlowScore 산정 방식"
  ]) {
    assert(markdown.includes(snippet), `Markdown missing required snippet: ${snippet}`);
    assert(html.includes(snippet), `HTML missing required snippet: ${snippet}`);
  }

  assert(!html.includes("<details open"), "HTML details should be collapsed by default");
  assert(html.includes('class="score-details"'), "Score details should be rendered as collapsed details");
  assert(html.includes("data-stock-universe-table"), "HTML missing Nasdaq-100 score table");
  assert(html.includes("table-scroll"), "HTML missing scroll wrapper for wide table");

  assert(fs.existsSync(chartsDir), "Missing reports/charts directory");
  const chartFiles = fs.readdirSync(chartsDir).filter((name) => name.endsWith(".png"));
  assert(chartFiles.length > 0, "No chart images were generated");
  assert(html.includes('<img class="chart"'), "HTML card charts are not linked");

  for (const file of [
    "src/data/newsProvider.js",
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
    assert(!JSON.stringify(item).includes("options"), `Snapshot scored item still includes options text for ${item.ticker}`);
  }

  const candidatesWithRisk = [
    ...(latestSnapshot.stockActionCandidates || []),
    ...(latestSnapshot.etfActionCandidates || [])
  ].filter((row) => row.riskPenaltySummary);
  for (const row of candidatesWithRisk) {
    assert(row.riskPenaltySummary.totalPenalty === sumRiskPenalty(row.riskPenaltySummary), `Risk penalty item sum mismatch for ${row.ticker}`);
  }

  console.log("Verified simplified report, option-free output, collapsed details, Nasdaq-100 table, snapshots, and charts");
  console.log(`Verified chart count: ${chartFiles.length}`);
}

main();
