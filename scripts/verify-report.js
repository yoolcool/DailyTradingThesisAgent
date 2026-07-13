const fs = require("fs");
const path = require("path");
const { loadMarketProfile } = require("../src/marketProfile");

const ROOT = path.resolve(__dirname, "..");
const MARKET_PROFILE = loadMarketProfile({ root: ROOT });
const DATA_DIR = MARKET_PROFILE.paths.dataDir;
const REPORTS_DIR = MARKET_PROFILE.paths.reportsDir;
const DOCS_DIR = MARKET_PROFILE.paths.docsDir;
const IS_KR = MARKET_PROFILE.id === "kr";

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

function verifyKrReport(markdown, html, docsHtml) {
  assert(markdown.includes("REAL DATA TEST") || markdown.includes("MOCK DATA"), "KR report missing data mode banner");
  assert(html.includes("REAL DATA TEST") || html.includes("MOCK DATA"), "KR HTML missing data mode banner");
  assert(html.includes("data-data-reliability"), "KR HTML missing data reliability panel");
  assert(html.includes("data-today-decision"), "KR HTML missing Today Decision panel");
  assert(html.includes("data-narrative-section"), "KR HTML missing narrative section marker");
  assert(html.includes("data-stock-universe-table"), "KR HTML missing stock universe table");
  assert(markdown.includes("DART") || markdown.includes("OpenDART"), "KR markdown missing DART disclosure source status");
  assert(html.includes("DART") || html.includes("OpenDART"), "KR HTML missing DART disclosure source status");
  assert(markdown.includes("KOSPI200") || html.includes("KOSPI200") || docsHtml.includes("KOSPI200"), "KR report missing KOSPI200 market marker");

  const latestSnapshot = readJson("latest-report.json");
  assert(latestSnapshot.marketId === "kr", "KR snapshot marketId should be kr");
  assert(latestSnapshot.dataReliability?.grade, "KR snapshot missing data reliability grade");
  assert(latestSnapshot.todayDecision?.label, "KR snapshot missing today decision label");
  assert(Array.isArray(latestSnapshot.narratives), "KR snapshot missing narratives array");
  assert(Array.isArray(latestSnapshot.stockUniverseScan?.results), "KR snapshot missing stock universe scan results");
  assert(Array.isArray(latestSnapshot.actionCandidates), "KR snapshot missing actionCandidates array");

  const marketData = readJson("market_data_real.json");
  assert(marketData.marketId === "kr", "KR market data marketId should be kr");
  assert(
    Array.isArray(marketData.universe?.members) || Array.isArray(latestSnapshot.stockUniverseScan?.results),
    "KR report missing KOSPI200 universe scan context"
  );

  const chartsDir = path.join(REPORTS_DIR, "charts");
  if (fs.existsSync(chartsDir)) {
    const chartFiles = fs.readdirSync(chartsDir).filter((name) => name.endsWith(".png"));
    assert(chartFiles.length >= 0, "KR report has invalid chart image count");
  }

  console.log("Verified KR report split paths, DART source status, KOSPI200 snapshot, and market-scoped outputs");
}

function main() {
  const markdown = readText(path.join(REPORTS_DIR, "latest.md"));
  const html = readText(path.join(REPORTS_DIR, "latest.html"));
  const docsHtml = readText(path.join(DOCS_DIR, "index.html"));
  const chartsDir = path.join(REPORTS_DIR, "charts");
  const latestSnapshotForRegime = readJson("latest-report.json");

  assert(markdown.includes("시장 국면 판단"), "Markdown missing market regime assessment");
  assert(markdown.includes("기술적 지표"), "Markdown missing market regime technical section");
  assert(markdown.includes("매크로 시황"), "Markdown missing market regime macro section");
  assert(markdown.includes("전일 대비"), "Markdown missing market regime day-over-day change");
  assert(markdown.includes("판정 신뢰도"), "Markdown missing market regime reliability");
  assert(html.includes("data-market-regime"), "HTML missing market regime assessment");
  assert(latestSnapshotForRegime.marketRegimeAssessment?.label, "Snapshot missing market regime label");
  assert(latestSnapshotForRegime.marketRegimeAssessment?.technical?.benchmarks?.length, "Snapshot missing market regime benchmarks");
  assert(latestSnapshotForRegime.marketRegimeAssessment?.macro?.signals?.length, "Snapshot missing market regime macro signals");
  assert(latestSnapshotForRegime.marketRegimeAssessment?.reliability?.grade, "Snapshot missing market regime reliability");
  assert(latestSnapshotForRegime.marketRegimeAssessment?.change?.status, "Snapshot missing market regime change");

  if (IS_KR) {
    verifyKrReport(markdown, html, docsHtml);
    return;
  }

  assert(markdown.includes("REAL DATA TEST") || markdown.includes("MOCK DATA"), "Report missing data mode banner");
  assert(html.includes("REAL DATA TEST") || html.includes("MOCK DATA"), "HTML missing data mode banner");
  assert(markdown.includes("데이터 신뢰도"), "Markdown missing data reliability panel");
  assert(html.includes("data-data-reliability"), "HTML missing data reliability panel");
  assert(markdown.includes("오늘 결론"), "Markdown missing Today Decision panel");
  assert(html.includes("data-today-decision"), "HTML missing Today Decision panel");
  assert(markdown.includes("다크호스 후보"), "Markdown missing dark horse section");
  assert(html.includes("data-dark-horse-candidates"), "HTML missing dark horse section");
  assert(markdown.includes("darkHorseScore"), "Markdown missing darkHorseScore");
  assert(html.includes("darkHorseScore"), "HTML missing darkHorseScore");
  assert(markdown.includes("왜 아직 메인이 아닌가"), "Markdown missing dark horse not-main explanation");
  assert(html.includes("아직 메인이 아닌 이유"), "HTML missing dark horse not-main explanation");
  assert(markdown.includes("darkHorseScore 상세 근거"), "Markdown missing dark horse breakdown");
  assert(html.includes("darkHorseScore 상세 근거"), "HTML missing dark horse breakdown");
  assert(markdown.includes("분석 신뢰도"), "Markdown missing analysis reliability");
  assert(html.includes("분석 신뢰도"), "HTML missing analysis reliability");
  assert(markdown.includes("주문 실행 신뢰도"), "Markdown missing execution reliability");
  assert(html.includes("주문 실행 신뢰도"), "HTML missing execution reliability");
  assert(markdown.includes("후보 제한 요인 집계"), "Markdown missing action gate summary");
  assert(html.includes("data-action-gate-summary"), "HTML missing action gate summary");
  assert(markdown.includes("뉴스 수집 시각"), "Markdown missing news fetched timestamp");
  assert(markdown.includes("가장 최근 뉴스 발행 시각"), "Markdown missing latest news published timestamp");
  assert(markdown.includes("뉴스 신선도 상태"), "Markdown missing news freshness status");
  assert(markdown.includes("MarketWatch RSS"), "Markdown missing MarketWatch news source");
  assert(markdown.includes("CNBC Markets RSS"), "Markdown missing CNBC news source");
  assert(markdown.includes("SEC EDGAR RSS"), "Markdown missing SEC EDGAR news source");
  assert(markdown.includes("Federal Reserve RSS"), "Markdown missing Federal Reserve news source");
  assert(markdown.includes("Finnhub API"), "Markdown missing Finnhub API news source status");
  assert(markdown.includes("후보 선정 후 뉴스/동향 재확인"), "Markdown missing candidate post-selection news update");
  assert(markdown.includes("최근 뉴스/동향 한국어 요약"), "Markdown missing Korean candidate news summary section");
  assert(markdown.includes("general_market") || markdown.includes("earnings") || markdown.includes("guidance") || markdown.includes("macro"), "Markdown missing normalized news event type");
  assert(html.includes("뉴스 수집 시각"), "HTML missing news fetched timestamp");
  assert(html.includes("최근 뉴스 발행"), "HTML missing latest news published timestamp");
  assert(html.includes("뉴스 신선도"), "HTML missing news freshness status");
  assert(html.includes("MarketWatch RSS"), "HTML missing MarketWatch news source");
  assert(html.includes("CNBC Markets RSS"), "HTML missing CNBC news source");
  assert(html.includes("SEC EDGAR RSS"), "HTML missing SEC EDGAR news source");
  assert(html.includes("Federal Reserve RSS"), "HTML missing Federal Reserve news source");
  assert(html.includes("Finnhub API"), "HTML missing Finnhub API news source status");
  assert(html.includes("후보 선정 후 뉴스/동향 재확인"), "HTML missing candidate post-selection news update");
  assert(html.includes("최근 뉴스/동향 한국어 요약"), "HTML missing Korean candidate news summary section");
  assert(html.includes("general_market") || html.includes("earnings") || html.includes("guidance") || html.includes("macro"), "HTML missing normalized news event type");
  assert(markdown.includes("이 리포트는 투자판단 보조용이며"), "Markdown missing practical-use warning");
  assert(html.includes("이 리포트는 투자판단 보조용이며"), "HTML missing practical-use warning");
  for (const removedSpreadTerm of ["스프레드", "bid/ask", "liquiditySpread", "spreadStatus"]) {
    assert(!markdown.includes(removedSpreadTerm), `Markdown still includes removed spread criterion: ${removedSpreadTerm}`);
    assert(!html.includes(removedSpreadTerm), `HTML still includes removed spread criterion: ${removedSpreadTerm}`);
  }
  assert(/RVOL\s+\d+\.\d{2}x/.test(html), "HTML should show RVOL with two decimals");

  for (const pattern of ["\uFFFD", "?꾪", "?좏", "?댁", "?뺤", "?좊", "?덉", "?섎", "?곌"]) {
    assert(!markdown.includes(pattern), `Markdown contains broken Korean pattern: ${pattern}`);
    assert(!html.includes(pattern), `HTML contains broken Korean pattern: ${pattern}`);
    assert(!docsHtml.includes(pattern), `Docs HTML contains broken Korean pattern: ${pattern}`);
  }

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
    "오늘 실제 행동 후보",
    "ETF 후보 TOP 5",
    "오늘 개별 종목 신규 후보 TOP 5",
    "오늘 돈이 몰리는 테마",
    "왜 돈이 몰리는가",
    "Nasdaq-100 전체 moneyFlowScore(1차) 표",
    "데이터 수집 상태",
    "참고: moneyFlowScore 산정 방식"
  ]) {
    assert(markdown.includes(snippet), `Markdown missing required snippet: ${snippet}`);
    assert(html.includes(snippet), `HTML missing required snippet: ${snippet}`);
  }

  assert(!html.includes("<details open"), "HTML details should be collapsed by default");
  assert(html.includes("<details"), "HTML should render detailed evidence in details/summary blocks");
  assert(html.includes('class="score-details"'), "Score details should be rendered as collapsed details");
  assert(markdown.includes("오늘 시장을 지배하는 서사"), "Markdown missing market narrative section");
  assert(html.includes("오늘 시장을 지배하는 서사"), "HTML missing market narrative section");
  assert(html.includes("data-narrative-section"), "HTML missing narrative section marker");
  assert(html.includes("data-narrative-table"), "HTML missing narrative summary table");
  assert(markdown.includes("시장 지배 서사") || markdown.includes("오늘 시장을 지배하는 서사"), "Mobile summary/narrative wording missing from markdown");
  assert(html.includes("data-stock-universe-table"), "HTML missing Nasdaq-100 score table");
  assert(html.includes("table-scroll"), "HTML missing scroll wrapper for wide table");
  assert(markdown.includes("상세 근거"), "Markdown should move detailed evidence below candidate cards");
  assert(!markdown.includes("- Technology:"), "Markdown should not expose repeated broad Technology theme");
  assert(!html.includes(">Technology:<"), "HTML should not expose repeated broad Technology theme");

  assert(fs.existsSync(chartsDir), "Missing reports/charts directory");
  const chartFiles = fs.readdirSync(chartsDir).filter((name) => name.endsWith(".png"));
  assert(chartFiles.length > 0, "No chart images were generated");
  assert(html.includes('class="chart chart-fallback"'), "HTML chart fallback images are not linked");
  assert(html.includes('data-trading-chart'), "HTML missing interactive trading chart container");
  assert(html.includes('class="candlestick-chart'), "HTML missing candlestick SVG chart");
  assert(html.includes('data-chart-hit'), "HTML missing OHLCV tooltip hit areas");
  assert(html.includes('data-chart-range="1M"') && html.includes('data-chart-range="3M"') && html.includes('data-chart-range="6M"'), "HTML missing chart range controls");
  assert(html.includes('class="axis-marker"'), "HTML missing current price axis marker");
  assert(html.includes('class="ref-label-group"'), "HTML missing gutter annotation labels");
  assert(html.includes('class="chart-summary-text"'), "HTML missing chart summary line");
  assert(html.includes('legend-prev-high') && html.includes('legend-recommend') && html.includes('legend-invalid'), "HTML missing separated reference-line legend items");

  for (const file of [
    "src/data/newsProvider.js",
    "src/data/etfHoldingsProvider.js",
    "src/data/liquidityProvider.js",
    "src/data/nasdaq100Universe.js",
    "config/nasdaq100Fallback.json",
    "data/latest-report.json",
    "docs/index.html"
  ]) {
    assert(fs.existsSync(path.join(ROOT, file)), `Missing provider/env file: ${file}`);
  }

  const marketData = readJson("market_data_real.json");
  assert((marketData.universe?.stockUniverseCount || 0) >= 90, "Market data missing expanded Nasdaq-100 universe count");

  const latestSnapshot = readJson("latest-report.json");
  const narratives = latestSnapshot.narratives || [];
  const topNarratives = latestSnapshot.topNarratives || [];
  assert(narratives.length >= 1, "Snapshot missing narratives");
  assert(topNarratives.length <= 3, "Narrative TOP 3 should have at most 3 items");
  assert(topNarratives.length > 0, "Snapshot missing topNarratives");
  for (const narrative of topNarratives) {
    assert(narrative.narrativeScore !== undefined, `Narrative missing narrativeScore: ${narrative.name}`);
    assert(narrative.status, `Narrative missing status: ${narrative.name}`);
    assert(narrative.reasonConfidence, `Narrative missing reasonConfidence: ${narrative.name}`);
    assert((narrative.supportEtfs || []).length > 0, `Narrative missing support ETFs: ${narrative.name}`);
    assert((narrative.supportStocks || []).length > 0, `Narrative missing support stocks: ${narrative.name}`);
    if ((narrative.directNewsCount || 0) < 1) {
      assert(narrative.reasonConfidence !== "HIGH", `Narrative with weak direct news should not be HIGH: ${narrative.name}`);
    }
  }
  const scanResults = latestSnapshot.stockUniverseScan?.results || [];
  assert(scanResults.length >= 90, "Snapshot missing stockUniverseScan results");
  assert(scanResults[0].moneyFlowScoreInitial >= scanResults.at(-1).moneyFlowScoreInitial, "Snapshot stockUniverseScan results should be sorted by initial score");

  const actionCandidates = latestSnapshot.actionCandidates || [];
  assert(actionCandidates.length <= 3, "Today actual action candidates should be limited to 3");

  const scoredItems = [
    ...actionCandidates,
    ...(latestSnapshot.stockActionCandidates || []),
    ...(latestSnapshot.etfActionCandidates || []),
    ...(latestSnapshot.stockEntryCandidates || []),
    ...(latestSnapshot.stockPullbackCandidates || []),
    ...(latestSnapshot.stockWatchCandidates || []),
    ...(latestSnapshot.etfWatchCandidates || [])
  ];
  assert(scoredItems.length > 0, "Snapshot missing scored recommendation items");
  const postSelectionNewsItems = [
    ...actionCandidates,
    ...(latestSnapshot.stockActionCandidates || []),
    ...(latestSnapshot.etfActionCandidates || []),
    ...(latestSnapshot.stockEntryCandidates || [])
  ];
  assert(postSelectionNewsItems.every((row) => row.candidateNewsSummary), "Candidate snapshot missing post-selection news summary");
  assert(postSelectionNewsItems.every((row) => row.candidateNewsSummary?.koreanSummary?.overview), "Candidate snapshot missing Korean post-selection news summary");
  assert(latestSnapshot.dataReliability?.grade, "Snapshot missing data reliability grade");
  assert(latestSnapshot.dataReliability?.analysisReliability, "Snapshot missing analysis reliability");
  assert(latestSnapshot.dataReliability?.executionReliability, "Snapshot missing execution reliability");
  assert(latestSnapshot.dataReliability?.priceAsOfLabel, "Snapshot missing price as-of label");
  assert(latestSnapshot.dataReliability?.recommendationSession, "Snapshot missing recommendation session");
  assert(latestSnapshot.dataReliability?.newsSources, "Snapshot missing news source list");
  assert(latestSnapshot.dataReliability?.newsSourceStatus, "Snapshot missing news source status");
  assert(latestSnapshot.dataReliability?.newsReliability, "Snapshot missing news reliability");
  assert(latestSnapshot.todayDecision?.label, "Snapshot missing today decision label");
  assert(latestSnapshot.actionGateSummary?.items?.length, "Snapshot missing action gate summary");
  assert(Array.isArray(latestSnapshot.darkHorseCandidates), "Snapshot missing darkHorseCandidates array");
  assert((latestSnapshot.darkHorseCandidates || []).length <= 3, "Dark horse candidates should be limited to 3");
  for (const item of latestSnapshot.darkHorseCandidates || []) {
    assert(item.assetType === "STOCK", `Dark horse should be stock-only: ${item.ticker}`);
    assert(item.darkHorseScore !== undefined, `Dark horse missing score: ${item.ticker}`);
    assert(item.darkHorseBreakdown?.rawScore !== undefined, `Dark horse missing breakdown rawScore: ${item.ticker}`);
    assert(item.darkHorseConfirmCondition, `Dark horse missing confirm condition: ${item.ticker}`);
    assert(item.darkHorseInvalidationCondition, `Dark horse missing invalidation condition: ${item.ticker}`);
    assert(item.darkHorseWhyNotMain, `Dark horse missing not-main explanation: ${item.ticker}`);
    assert(!(latestSnapshot.actionCandidates || []).some((candidate) => candidate.ticker === item.ticker), `Dark horse duplicated in action candidates: ${item.ticker}`);
  }
  if ((latestSnapshot.actionCandidates || []).length === 0) {
    assert(markdown.includes("신규 추격은 보류"), "No-trade report missing practical no-trade wording");
    assert(html.includes("신규 추격은 보류"), "No-trade HTML missing practical no-trade wording");
    assert(markdown.includes("참고용 행동 후보"), "No-trade report missing reference candidates section");
    assert(html.includes("data-reference-candidates"), "No-trade HTML missing reference candidates section");
    assert((latestSnapshot.referenceCandidates?.etfs || []).length <= 3, "Reference ETF candidates should be limited to 3");
    assert((latestSnapshot.referenceCandidates?.stocks || []).length <= 3, "Reference stock candidates should be limited to 3");
    assert((latestSnapshot.referenceCandidates?.etfs || []).length + (latestSnapshot.referenceCandidates?.stocks || []).length > 0, "No-trade snapshot missing reference candidates");
  }
  for (const item of scoredItems) {
    assert(item.moneyFlowScoreInitial !== undefined, `Snapshot missing initial score for ${item.ticker}`);
    assert(item.moneyFlowScoreFinal !== undefined, `Snapshot missing final score for ${item.ticker}`);
    assert(item.finalRawScore !== undefined, `Snapshot missing finalRawScore for ${item.ticker}`);
    assert(item.reasonConfidence, `Snapshot missing reasonConfidence for ${item.ticker}`);
    assert(item.reasonConfidenceExplanation, `Snapshot missing reasonConfidenceExplanation for ${item.ticker}`);
    assert(item.tieBreakerReason, `Snapshot missing tieBreakerReason for ${item.ticker}`);
    assert(item.linkedNarrative, `Snapshot scored item missing linkedNarrative for ${item.ticker}`);
    assert(item.narrativeStatus, `Snapshot scored item missing narrativeStatus for ${item.ticker}`);
    assert(item.narrativeScore !== undefined, `Snapshot scored item missing narrativeScore for ${item.ticker}`);
    assert(!JSON.stringify(item).includes("options"), `Snapshot scored item still includes options text for ${item.ticker}`);
    if (item.reasonConfidence === "HIGH") {
      assert(item.directCatalyst && item.directCatalyst.startsWith("직접 촉매:"), `HIGH confidence item missing direct catalyst: ${item.ticker}`);
    } else {
      assert(!item.directCatalyst || item.reasonConfidence !== "HIGH", `Non-HIGH item should not be promoted by catalyst alone: ${item.ticker}`);
    }
  }

  assert(markdown.includes("finalRawScore"), "Markdown TOP/action cards should show finalRawScore");
  assert(html.includes("finalRawScore"), "HTML TOP/action cards should show finalRawScore");
  assert(markdown.includes("tieBreakerReason"), "Markdown TOP/action cards should show tieBreakerReason");
  assert(html.includes("tieBreakerReason"), "HTML TOP/action cards should show tieBreakerReason");
  assert(markdown.includes("reasonConfidenceExplanation"), "Markdown should show reasonConfidenceExplanation");
  assert(html.includes("reasonConfidenceExplanation"), "HTML should show reasonConfidenceExplanation");

  const candidatesWithRisk = [
    ...(latestSnapshot.stockActionCandidates || []),
    ...(latestSnapshot.etfActionCandidates || [])
  ].filter((row) => row.riskPenaltySummary);
  for (const row of candidatesWithRisk) {
    assert(row.riskPenaltySummary.totalPenalty === sumRiskPenalty(row.riskPenaltySummary), `Risk penalty item sum mismatch for ${row.ticker}`);
  }

  console.log("Verified concise report, UTF-8 output, HIGH catalyst rules, raw-score ranking, collapsed details, themes, and charts");
  console.log(`Verified chart count: ${chartFiles.length}`);
}

main();
