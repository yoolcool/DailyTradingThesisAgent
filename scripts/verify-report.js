const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");

const requiredSections = [
  "0. 시장 상태",
  "오늘의 분리 결론",
  "moneyFlowScore 산정 방식",
  "오늘 돈이 몰리는 테마",
  "1. ETF 트레이딩 보고서",
  "2. 개별 종목 트레이딩 보고서",
  "감시 ETF 목록",
  "3. 최종 실행 판단",
  "데이터 수집 상태"
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
  assert(!markdown.includes("뉴스/옵션/ETF 구성종목 확산도 등은 아직 미연결"), "Data mode banner should not be hardcoded to disconnected state");
  assert(markdown.includes("돈이 몰리는 근거와 다음 매수 주체"), "Markdown missing report purpose");
  assert(html.includes("돈이 몰리는 근거와 다음 매수 주체"), "HTML missing report purpose");
  assert(!markdown.includes("\uFFFD") && !html.includes("\uFFFD"), "Report contains replacement characters");

  for (const section of requiredSections) {
    assert(markdown.includes(`## ${section}`), `Markdown missing section: ${section}`);
    assert(html.includes(`<h2>${section}</h2>`), `HTML missing section: ${section}`);
  }

  assert(etfs.length >= 20, `ETF count is too low: ${etfs.length}`);
  assert((sectionText(markdown, "1. ETF 트레이딩 보고서").match(/### \[ETF /g) || []).length === 5, "Markdown should show exactly 5 ETF cards");
  assert((html.match(/data-etf-card=/g) || []).length === 5, "HTML should show exactly 5 ETF cards");
  assert((html.match(/data-stock-card=/g) || []).length >= 5, "HTML should show stock cards");

  const splitSection = sectionText(markdown, "오늘의 분리 결론");
  assert(splitSection.includes("ETF 행동 후보:"), "Split conclusion missing ETF action candidates");
  assert(splitSection.includes("개별 종목 행동 후보:"), "Split conclusion missing stock action candidates");
  assert(splitSection.includes("Nasdaq-100 신규 스캔 결과:"), "Split conclusion missing Nasdaq-100 scan summary");
  assert(splitSection.includes("전일 추천 종목 점검:"), "Split conclusion missing previous recommendation summary");

  const scoreGuide = sectionText(markdown, "moneyFlowScore 산정 방식");
  assert(scoreGuide.includes("장기 가치평가 점수가 아니다"), "Score guide must explain score is not valuation");
  assert(scoreGuide.includes("80점 이상"), "Score guide missing score band interpretation");
  assert(scoreGuide.includes("매수 추천 점수가 아니다"), "Score guide missing warning");
  assert(scoreGuide.includes("ETF 대비 상대강도"), "Score guide missing relative strength factor");

  const nvdaCard = markdown.match(/### \[NVDA\][\s\S]*?(?=\n### \[|$)/)?.[0] || "";
  if (nvdaCard) {
    assert(nvdaCard.includes("relatedEtfs: SMH, SOXX, SOXQ, AIQ"), "NVDA related ETF mapping is not refined");
    assert(!nvdaCard.includes("HACK") && !nvdaCard.includes("CIBR"), "NVDA should not map to cybersecurity ETFs");
  }
  assert(markdown.includes("왜 ETF가 아니라 이 종목인가?"), "Stock cards missing stock-over-ETF explanation");
  assert(markdown.includes("ETF가 더 나은 경우"), "Stock cards missing ETF-better explanation");

  const etfSection = sectionText(markdown, "1. ETF 트레이딩 보고서");
  const stockSection = sectionText(markdown, "2. 개별 종목 트레이딩 보고서");
  for (const stockTicker of ["PLTR", "NVDA", "TSM", "MSFT", "AAPL"]) {
    assert(!etfSection.includes(`### [${stockTicker}]`), `ETF section must not include stock card: ${stockTicker}`);
  }
  for (const etfTicker of ["HACK", "IGV", "AIQ", "CIBR", "IPO"]) {
    assert(!stockSection.includes(`### [ETF ${etfTicker}]`), `Stock section must not include ETF card: ${etfTicker}`);
  }

  assert(markdown.includes("moneyFlowScore:"), "Markdown missing moneyFlowScore");
  assert(markdown.includes("moneyFlowScore 산정 근거:"), "Markdown missing moneyFlowScore rationale");
  assert(markdown.includes("뉴스 점수:"), "Markdown missing news score");
  assert(markdown.includes("옵션 점수:"), "Markdown missing options score");
  assert(markdown.includes("유동성 점수:"), "Markdown missing liquidity score");
  assert(markdown.includes("데이터 사용 현황:"), "Markdown missing data usage block");
  assert(markdown.includes("뉴스 확인:"), "Markdown missing news block");
  assert(markdown.includes("옵션 수급:"), "Markdown missing options block");
  assert(markdown.includes("ETF 구성종목 확산도:"), "Markdown missing ETF breadth block");
  assert(markdown.includes("유동성/스프레드:"), "Markdown missing liquidity block");
  assert(markdown.includes("reasonConfidence 근거:"), "Markdown missing confidence rationale");
  assert(html.includes("moneyFlowScore 산정 근거"), "HTML missing moneyFlowScore rationale");
  assert(html.includes("<details"), "HTML should use collapsible details for mobile readability");
  assert(markdown.includes("whyMoneyIsFlowing:"), "Markdown missing whyMoneyIsFlowing");
  assert(markdown.includes("likelyNextBuyer:"), "Markdown missing likelyNextBuyer");
  assert(markdown.includes("whyThisCouldTradeHigher:"), "Markdown missing whyThisCouldTradeHigher");
  if (markdown.includes("reasonConfidence: HIGH")) {
    assert(markdown.includes("뉴스: 사용") || markdown.includes("옵션: 사용"), "HIGH confidence requires news or options usage");
    assert(markdown.includes("유동성/스프레드: 사용"), "HIGH confidence requires liquidity usage");
  }
  assert(markdown.includes("ETF에서 할 일:"), "Final action missing ETF task");
  assert(markdown.includes("개별 종목에서 할 일:"), "Final action missing stock task");
  assert(markdown.includes("하지 말아야 할 일:"), "Final action missing do-not-do task");
  assert(markdown.includes("신규 발굴 풀: Nasdaq-100 구성종목 전체"), "Markdown missing Nasdaq-100 discovery pool");
  assert(markdown.includes("총 스캔 종목 수:"), "Markdown missing stock scan count");
  assert(markdown.includes("상세 데이터 수집 대상: 가격/거래량 1차 스캔 상위 20개"), "Markdown missing staged detailed data collection note");
  assert(markdown.includes("전일 추천 종목 점검"), "Markdown missing previous recommendation review");
  assert(markdown.includes("실제 계좌 보유 종목이 아니라 전일 리포트"), "Previous review must distinguish account holdings from report tracking");
  assert(markdown.includes("Nasdaq-100 전체 moneyFlowScore 표"), "Markdown missing full Nasdaq-100 score table section");
  assert(markdown.includes("| 순위 | 티커 | 이름 | moneyFlowScore |"), "Markdown missing required stock score table columns");
  assert(markdown.includes("Nasdaq-100 전체 moneyFlowScore 표 펼치기"), "Markdown missing collapsible full table summary");
  assert(markdown.includes("데이터 수집 실패 종목"), "Markdown missing failed stock scan subsection");
  assert(html.includes("data-stock-universe-table"), "HTML missing full stock universe table");
  assert(html.includes("table-scroll"), "HTML table must be wrapped for horizontal scrolling");

  assert(fs.existsSync(chartsDir), "Missing reports/charts directory");
  const chartFiles = fs.readdirSync(chartsDir).filter((name) => name.endsWith(".png"));
  assert(chartFiles.length > 0, "No chart images were generated");
  assert(html.includes('<img class="chart"'), "HTML card charts are not linked");
  for (const file of ["src/data/newsProvider.js", "src/data/optionsProvider.js", "src/data/etfHoldingsProvider.js", "src/data/liquidityProvider.js", "src/data/nasdaq100Universe.js", ".env.example", "config/nasdaq100Fallback.json", "data/latest-report.json"]) {
    assert(fs.existsSync(path.join(ROOT, file)), `Missing provider/env file: ${file}`);
  }
  const marketData = readJson("market_data_real.json");
  assert((marketData.universe?.stockUniverseCount || 0) >= 90, "Market data missing expanded Nasdaq-100 universe count");
  const latestSnapshot = readJson("latest-report.json");
  assert(latestSnapshot.stockUniverseScan?.results?.length >= 90, "Snapshot missing stockUniverseScan results");
  assert(latestSnapshot.stockUniverseScan.results[0].moneyFlowScore >= latestSnapshot.stockUniverseScan.results.at(-1).moneyFlowScore, "Snapshot stockUniverseScan results should be sorted by score");

  console.log("Verified provider-aware report sections, dynamic data status, scoring fields, ETF mapping, and charts");
  console.log(`Verified chart count: ${chartFiles.length}`);
}

main();
