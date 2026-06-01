const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");

const requiredSections = [
  "오늘의 시장 상태",
  "오늘 돈이 몰리는 테마",
  "진입 후보",
  "보유 유지 후보",
  "청산/주의 후보",
  "ETF 대안 검토",
  "테마형 ETF Watch",
  "ETF 카드",
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

function verifyUtf8(label, content) {
  assert(content.includes("현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가"), `${label} missing core question`);
  assert(content.includes("MOCK DATA - 실전 투자 판단 사용 금지"), `${label} missing mock warning`);
  assert(!content.includes("�"), `${label} contains replacement character`);
  assert(!/[?][꾩ㅻ댁쒓됯]/.test(content), `${label} appears to contain mojibake`);
}

function verifyEnglishOnly(label, content) {
  const visible = content.replace(/<style[\s\S]*?<\/style>/gi, "\n").replace(/<script[\s\S]*?<\/script>/gi, "\n");
  const suspicious = visible
    .split(/\n+/)
    .map((line) => line.replace(/<[^>]+>/g, " ").trim())
    .filter((line) => line.length > 70)
    .filter((line) => /[A-Za-z]{5,}/.test(line))
    .filter((line) => !/[가-힣]/.test(line))
    .filter((line) => !/^(#|[-*]|\d+\.|\||\{|\}|\.|:|--|@)/.test(line));
  assert(suspicious.length === 0, `${label} has excessive English-only text: ${suspicious.slice(0, 3).join(" | ")}`);
}

function sectionText(markdown, sectionName) {
  const match = markdown.match(new RegExp(`## ${sectionName}[\\s\\S]*?(?=\\n## |$)`));
  return match ? match[0] : "";
}

function main() {
  const markdown = readText(path.join(REPORTS_DIR, "latest.md"));
  const html = readText(path.join(REPORTS_DIR, "latest.html"));
  const watchlist = readJson("watchlist.json");
  const holdings = readJson("holdings.json");
  const etfs = readJson("watchlist_etfs.json");

  verifyUtf8("reports/latest.md", markdown);
  verifyUtf8("reports/latest.html", html);
  verifyEnglishOnly("reports/latest.md", markdown);
  verifyEnglishOnly("reports/latest.html", html);

  for (const section of requiredSections) {
    assert(markdown.includes(`## ${section}`), `Markdown missing section: ${section}`);
    assert(html.includes(`<h2>${section}</h2>`), `HTML missing section: ${section}`);
  }

  assert(etfs.length >= 20, `ETF count is too low: ${etfs.length}`);
  for (const etf of etfs) {
    for (const field of ["category", "role", "useCase", "riskNotes"]) {
      assert(etf[field], `${etf.ticker} missing ${field}`);
    }
  }

  assert(markdown.includes("ETF 후보 TOP 5"), "Conclusion missing ETF 후보 TOP 5");
  assert(markdown.includes("시장 기준 ETF 상태"), "Conclusion missing market ETF status");
  assert(markdown.includes("나머지 테마 요약"), "ETF alternative section missing collapsed summary");
  assert(markdown.includes("티커 | 카테고리 | 상태 | 오늘 선택 | 한 줄 이유"), "Watch ETF table missing");

  const etfCardMarkdown = sectionText(markdown, "ETF 카드");
  const mdEtfCardCount = (etfCardMarkdown.match(/### \[ETF /g) || []).length;
  const htmlEtfCardCount = (html.match(/data-etf-card=/g) || []).length;
  assert(mdEtfCardCount === 5, `Markdown should show exactly 5 detailed ETF cards, found ${mdEtfCardCount}`);
  assert(htmlEtfCardCount === 5, `HTML should show exactly 5 detailed ETF cards, found ${htmlEtfCardCount}`);

  const overheatSection = sectionText(markdown, "ETF 과열 주의 후보");
  const overheatCount = (overheatSection.match(/^### \[/gm) || []).length;
  assert(overheatCount <= 3, `ETF overheating summary should show at most 3 cards, found ${overheatCount}`);

  for (const stock of [...watchlist, ...holdings]) {
    const stockMarker = `### [${stock.ticker}]`;
    assert(markdown.includes(stockMarker), `Missing stock card: ${stock.ticker}`);
    const start = markdown.indexOf(stockMarker);
    const next = markdown.indexOf("\n### [", start + stockMarker.length);
    const card = markdown.slice(start, next === -1 ? undefined : next);
    assert(card.includes("관련 ETF"), `${stock.ticker} missing related ETF field`);
    assert(card.includes("ETF 대비 개별 종목이 나은 이유"), `${stock.ticker} missing stock-vs-ETF field`);
    assert(card.includes("개별 종목보다 ETF가 나은 경우"), `${stock.ticker} missing ETF-vs-stock field`);
    assert(card.includes("오늘 선택"), `${stock.ticker} missing today selection field`);
  }

  assert(markdown.length < 26000, `Markdown is still too long for mobile daily use: ${markdown.length} chars`);

  console.log("Verified reports/latest.md");
  console.log("Verified reports/latest.html");
  console.log(`Verified ETF watchlist count: ${etfs.length}`);
  console.log("Verified compressed ETF output, TOP 5 cards, watch table, related ETF fields");
}

main();
