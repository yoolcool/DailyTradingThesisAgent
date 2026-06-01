const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");

const requiredSections = [
  "오늘의 시장 상태",
  "오늘 돈이 몰리는 테마",
  "ETF 카드",
  "ETF 대안 검토",
  "테마형 ETF Watch",
  "진입 후보",
  "보유 유지 후보",
  "청산/주의 후보",
  "종목별 상승 근거",
  "감시 ETF 목록",
  "진입 조건",
  "무효화 조건",
  "내일 확인할 것"
];

const warnings = {
  MOCK: "MOCK DATA - 실전 투자 판단 사용 금지",
  REAL_TEST: "REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스/옵션/일부 판단 로직은 검증 중"
};

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

function detectMode(content) {
  if (content.includes(warnings.REAL_TEST)) return "REAL_TEST";
  if (content.includes(warnings.MOCK)) return "MOCK";
  return "UNKNOWN";
}

function verifyUtf8(label, content) {
  assert(content.includes("현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가"), `${label} missing core question`);
  assert(!content.includes("\uFFFD"), `${label} contains replacement character`);
  assert(!/[占�]/.test(content), `${label} appears to contain mojibake`);
}

function verifyEnglishOnly(label, content) {
  const visible = content.replace(/<style[\s\S]*?<\/style>/gi, "\n").replace(/<script[\s\S]*?<\/script>/gi, "\n");
  const suspicious = visible
    .split(/\n+/)
    .map((line) => line.replace(/<[^>]+>/g, " ").trim())
    .filter((line) => line.length > 90)
    .filter((line) => /[A-Za-z]{5,}/.test(line))
    .filter((line) => !/[가-힣]/.test(line))
    .filter((line) => !/^(#|[-*]|\d+\.|\||\{|\}|\.|:|--|@)/.test(line));
  assert(suspicious.length === 0, `${label} has excessive English-only text: ${suspicious.slice(0, 3).join(" | ")}`);
}

function sectionText(markdown, sectionName) {
  const match = markdown.match(new RegExp(`## ${sectionName}[\\s\\S]*?(?=\\n## |$)`));
  return match ? match[0] : "";
}

function verifyStockCards(markdown, watchlist, holdings) {
  for (const stock of [...watchlist, ...holdings]) {
    const marker = `### [${stock.ticker}]`;
    assert(markdown.includes(marker), `Missing stock card: ${stock.ticker}`);
    const start = markdown.indexOf(marker);
    const next = markdown.indexOf("\n### [", start + marker.length);
    const card = markdown.slice(start, next === -1 ? undefined : next);
    assert(/상태(?:값)?:\s*(관찰|진입 후보|진입 가능|보유 유지|부분 익절|청산 후보|매매 금지)/.test(card), `${stock.ticker} missing allowed status`);
    assert(card.includes("더 비싸게 사줄 주체"), `${stock.ticker} missing buyer field`);
    assert(card.includes("무효화 조건"), `${stock.ticker} missing invalidation field`);
    assert((card.match(/^- /gm) || []).length >= 2, `${stock.ticker} card has too few bullet details`);
  }
}

function verifyRealTest(markdown, html) {
  assert(markdown.includes("데이터 소스") && markdown.includes("yfinance"), "REAL_TEST markdown missing yfinance source");
  assert(html.includes("데이터 소스") && html.includes("yfinance"), "REAL_TEST html missing yfinance source");
  assert(markdown.includes("데이터 상태"), "REAL_TEST markdown missing data status");
  assert(markdown.includes("뉴스/옵션/구성종목 확산도: 아직 미연결"), "REAL_TEST markdown missing unconnected-data notice");
  assert(fs.existsSync(path.join(DATA_DIR, "market_data_real.json")), "REAL_TEST missing data/market_data_real.json");
}

function main() {
  const markdown = readText(path.join(REPORTS_DIR, "latest.md"));
  const html = readText(path.join(REPORTS_DIR, "latest.html"));
  const watchlist = readJson("watchlist.json");
  const holdings = readJson("holdings.json");
  const etfs = readJson("watchlist_etfs.json");
  const mode = detectMode(markdown);

  assert(mode !== "UNKNOWN", "Report missing recognized data mode warning");
  assert(html.includes(warnings[mode]), "HTML missing matching data mode warning");

  verifyUtf8("reports/latest.md", markdown);
  verifyUtf8("reports/latest.html", html);
  verifyEnglishOnly("reports/latest.md", markdown);
  verifyEnglishOnly("reports/latest.html", html);

  for (const section of requiredSections) {
    assert(markdown.includes(`## ${section}`), `Markdown missing section: ${section}`);
    assert(html.includes(`<h2>${section}</h2>`), `HTML missing section: ${section}`);
  }

  assert(etfs.length >= 20, `ETF count is too low: ${etfs.length}`);
  assert(markdown.includes("ETF 후보 TOP 5"), "Conclusion missing ETF 후보 TOP 5");
  assert(markdown.includes("나머지 테마 요약"), "ETF alternative section missing summary");
  assert(markdown.includes("티커 | 카테고리 | 상태 | 오늘 선택 | 한 줄 이유"), "Watch ETF table missing");

  const etfCardMarkdown = sectionText(markdown, "ETF 카드");
  const mdEtfCardCount = (etfCardMarkdown.match(/### \[ETF /g) || []).length;
  const htmlEtfCardCount = (html.match(/data-etf-card=/g) || []).length;
  assert(mdEtfCardCount === 5, `Markdown should show exactly 5 detailed ETF cards, found ${mdEtfCardCount}`);
  assert(htmlEtfCardCount === 5, `HTML should show exactly 5 detailed ETF cards, found ${htmlEtfCardCount}`);

  const overheatSection = sectionText(markdown, "ETF 과열 주의 후보");
  const overheatCount = (overheatSection.match(/^### \[/gm) || []).length;
  assert(overheatCount <= 3, `ETF overheating summary should show at most 3 cards, found ${overheatCount}`);

  verifyStockCards(markdown, watchlist, holdings);
  if (mode === "REAL_TEST") verifyRealTest(markdown, html);

  assert(markdown.length < 30000, `Markdown is too long for mobile daily use: ${markdown.length} chars`);

  console.log(`Verified reports/latest.md (${mode})`);
  console.log(`Verified reports/latest.html (${mode})`);
  console.log(`Verified ETF watchlist count: ${etfs.length}`);
  console.log("Verified compressed ETF output, stock cards, data mode banner, and UTF-8 Korean output");
}

main();
