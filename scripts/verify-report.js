const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");

const requiredSections = [
  "오늘의 결론",
  "오늘 실제 행동 후보",
  "오늘의 시장 상태",
  "오늘 돈이 몰리는 테마",
  "ETF 카드",
  "ETF 과열 주의 후보",
  "진입 후보",
  "보유 유지 후보",
  "청산/주의 후보",
  "종목별 상승 근거",
  "감시 ETF 목록",
  "진입 조건",
  "무효화 조건",
  "내일 확인할 것"
];

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

function sectionText(markdown, sectionName) {
  const match = markdown.match(new RegExp(`## ${sectionName}[\\s\\S]*?(?=\\n## |$)`));
  return match ? match[0] : "";
}

function main() {
  const markdown = readText(path.join(REPORTS_DIR, "latest.md"));
  const html = readText(path.join(REPORTS_DIR, "latest.html"));
  const etfs = readJson("watchlist_etfs.json");
  const chartsDir = path.join(REPORTS_DIR, "charts");

  assert(markdown.includes("REAL DATA TEST") || markdown.includes("MOCK DATA"), "Report missing data mode banner");
  assert(html.includes("REAL DATA TEST") || html.includes("MOCK DATA"), "HTML missing data mode banner");
  assert(markdown.includes("돈이 몰리는 근거와 다음 매수 주체"), "Markdown missing report purpose");
  assert(html.includes("돈이 몰리는 근거와 다음 매수 주체"), "HTML missing report purpose");
  assert(!markdown.includes("\uFFFD") && !html.includes("\uFFFD"), "Report contains replacement characters");

  for (const section of requiredSections) {
    assert(markdown.includes(`## ${section}`), `Markdown missing section: ${section}`);
    assert(html.includes(`<h2>${section}</h2>`), `HTML missing section: ${section}`);
  }

  assert(etfs.length >= 20, `ETF count is too low: ${etfs.length}`);
  assert((sectionText(markdown, "ETF 카드").match(/### \[ETF /g) || []).length === 5, "Markdown should show exactly 5 ETF cards");
  assert((html.match(/data-etf-card=/g) || []).length === 5, "HTML should show exactly 5 ETF cards");

  const actionSection = sectionText(markdown, "오늘 실제 행동 후보");
  const actionCount = (actionSection.match(/^### \d+\./gm) || []).length;
  assert(actionCount <= 3, `Action candidates should be 3 or fewer, found ${actionCount}`);
  if (actionCount > 0) {
    assert(actionSection.includes("reasonConfidence:"), "Action candidates missing reasonConfidence");
    assert(actionSection.includes("todayActionLabel:"), "Action candidates missing todayActionLabel");
  }

  const entrySection = sectionText(markdown, "진입 후보");
  assert(!entrySection.includes("상태: 관찰"), "Entry section must not include watch status");
  const cautionSection = sectionText(markdown, "청산/주의 후보");
  assert(!cautionSection.includes("상태: 관찰"), "Caution section must not include watch status");

  const nvdaCard = markdown.match(/### \[NVDA\][\s\S]*?(?=\n### \[|$)/)?.[0] || "";
  assert(nvdaCard.includes("관련 ETF: SMH, SOXX, SOXQ, AIQ, QQQ"), "NVDA related ETF mapping is not refined");
  assert(!nvdaCard.includes("HACK") && !nvdaCard.includes("CIBR"), "NVDA should not map to cybersecurity ETFs");

  assert(markdown.includes("moneyFlowScore:"), "Markdown missing moneyFlowScore");
  assert(markdown.includes("whyMoneyIsFlowing:"), "Markdown missing whyMoneyIsFlowing");
  assert(markdown.includes("likelyNextBuyer:"), "Markdown missing likelyNextBuyer");
  assert(markdown.includes("whyThisCouldTradeHigher:"), "Markdown missing whyThisCouldTradeHigher");
  assert(!markdown.includes("reasonConfidence: HIGH"), "HIGH confidence must not appear while news/event data is disconnected");

  assert(fs.existsSync(chartsDir), "Missing reports/charts directory");
  const chartFiles = fs.readdirSync(chartsDir).filter((name) => name.endsWith(".png"));
  assert(chartFiles.length > 0, "No chart images were generated");
  assert(html.includes('<img class="chart"'), "HTML card charts are not linked");

  console.log("Verified improved report purpose, sections, action candidates, ETF mapping, scoring fields, and charts");
  console.log(`Verified chart count: ${chartFiles.length}`);
}

main();
