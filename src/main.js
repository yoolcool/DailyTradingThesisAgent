const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");
const CHARTS_DIR = path.join(REPORTS_DIR, "charts");

const MODE = process.env.REPORT_MODE === "REAL_TEST" || process.argv.includes("--real-test") ? "REAL_TEST" : "MOCK";
const REAL_WARNING = "REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스/옵션/ETF 구성종목 확산도 등은 아직 미연결";
const MOCK_WARNING = "MOCK DATA - 실전 매매 판단 사용 금지";
const PURPOSE =
  "이 리포트는 최근 오른 자산을 나열하는 것이 아니라, 돈이 몰리는 근거와 다음 매수 주체가 확인되는 트레이딩 후보를 찾기 위한 보고서다.";

const STATUS = {
  WATCH: "관찰",
  ENTRY_CANDIDATE: "진입 후보",
  ENTRY_READY: "진입 가능",
  HOLD: "보유 유지",
  PARTIAL_PROFIT: "부분 익절",
  EXIT: "청산 후보",
  BAN: "매매 금지"
};

const STATUS_CLASS = {
  [STATUS.WATCH]: "watch",
  [STATUS.ENTRY_CANDIDATE]: "candidate",
  [STATUS.ENTRY_READY]: "ready",
  [STATUS.HOLD]: "hold",
  [STATUS.PARTIAL_PROFIT]: "profit",
  [STATUS.EXIT]: "exit",
  [STATUS.BAN]: "ban"
};

const RELATED_ETF_PRIORITY = {
  NVDA: ["SMH", "SOXX", "SOXQ", "AIQ", "QQQ"],
  TSM: ["SMH", "SOXX", "SOXQ"],
  PLTR: ["IGV", "AIQ", "CIBR", "QQQ"],
  MSFT: ["QQQ", "MAGS", "IGV", "AIQ"],
  AAPL: ["QQQ", "MAGS", "SPY"],
  XOM: ["XLE", "OIH"],
  MU: ["DRAM", "SMH", "SOXX", "SOXQ"],
  AVAV: ["XAR", "SHLD", "ITA", "PPA"],
  IREN: ["IBIT", "BLOK"],
  CIFR: ["IBIT", "BLOK"],
  RIOT: ["IBIT", "BLOK"],
  MARA: ["IBIT", "BLOK"]
};

const STOCK_META = {
  NVDA: { primaryTheme: "AI 반도체", primarySector: "반도체" },
  TSM: { primaryTheme: "반도체 공급망", primarySector: "반도체" },
  PLTR: { primaryTheme: "AI 소프트웨어", primarySector: "소프트웨어" },
  MSFT: { primaryTheme: "AI 플랫폼", primarySector: "메가캡 기술" },
  AAPL: { primaryTheme: "메가캡 기술", primarySector: "소비자 기술" },
  XOM: { primaryTheme: "전통 에너지", primarySector: "에너지" },
  MU: { primaryTheme: "메모리 반도체", primarySector: "반도체" },
  AVAV: { primaryTheme: "드론/방산", primarySector: "방산" }
};

const ETF_CATEGORY = {
  DRAM: "반도체/기술 ETF",
  SMH: "반도체/기술 ETF",
  SOXX: "반도체/기술 ETF",
  SOXQ: "반도체/기술 ETF",
  IGV: "성장/테마 ETF",
  AIQ: "성장/테마 ETF",
  BOTZ: "성장/테마 ETF",
  ROBO: "성장/테마 ETF",
  CIBR: "성장/테마 ETF",
  HACK: "성장/테마 ETF",
  IHAK: "성장/테마 ETF",
  ITA: "방산 ETF",
  XAR: "방산 ETF",
  SHLD: "방산 ETF",
  PPA: "방산 ETF",
  QQQ: "시장 기준 ETF",
  SPY: "시장 기준 ETF",
  IWM: "시장 기준 ETF",
  TLT: "채권 ETF",
  GLD: "금 ETF",
  IBIT: "비트코인 ETF",
  BLOK: "비트코인 ETF"
};

function readJson(fileName, fallback = null) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeReport(fileName, content) {
  ensureDir(REPORTS_DIR);
  fs.writeFileSync(path.join(REPORTS_DIR, fileName), content, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "데이터 없음";
  return `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}

function num(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "데이터 없음";
  return Number(value).toFixed(digits);
}

function price(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "데이터 없음";
  return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function mdList(items, empty = "- 해당 없음") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

function htmlList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("") || "<li>해당 없음</li>"}</ul>`;
}

function marketItem(marketData, ticker) {
  return marketData?.items?.[ticker] || { ticker, dataStatus: "missing", error: "데이터 없음" };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreAsset(item, assetType, relatedEtfStrength = 0) {
  if (!item || item.dataStatus !== "ok") {
    return {
      moneyFlowScore: 0,
      overheatingRisk: "데이터 없음",
      overheatingReason: "가격/거래량 데이터 없음",
      reasonConfidence: "LOW",
      status: STATUS.BAN,
      whyMoneyIsFlowing: "데이터 없음",
      likelyNextBuyer: "데이터 없음",
      whyThisCouldTradeHigher: "데이터 없음"
    };
  }

  const daily = item.dailyChangePct ?? 0;
  const r5 = item.return5dPct ?? 0;
  const r20 = item.return20dPct ?? 0;
  const relVol = item.relativeVolume ?? 0;
  const drawdown = item.drawdownFrom52wHighPct ?? -100;
  const trendAcceleration = r20 > 0 && r5 > r20 / 4 && relVol >= 1;
  const highProximity = drawdown >= -5;
  const volumeExpansion = relVol >= 1.5;
  const weakVolume = relVol < 1;
  const overheatingFlag = daily >= 4 && highProximity && relVol < 1.2;
  const blowoffFlag = daily >= 6 && highProximity && relVol >= 1.8;

  let score = 0;
  score += clamp(daily * 2, -10, 16);
  score += clamp(r5 * 1.8, -12, 24);
  score += clamp(r20 * 1.1, -10, 24);
  score += relVol >= 1.5 ? 18 : relVol >= 1 ? 10 : -8;
  score += highProximity ? 12 : drawdown > -12 ? 6 : 0;
  score += clamp(relatedEtfStrength / 12, 0, 8);
  if (trendAcceleration) score += 10;
  if (overheatingFlag) score -= 10;
  if (blowoffFlag) score -= 6;
  score = Math.round(clamp(score, 0, 100));

  const reasonConfidence = weakVolume ? "LOW" : score >= 45 ? "MEDIUM" : "LOW";
  const status = score >= 72 && !overheatingFlag ? STATUS.ENTRY_READY : score >= 58 && !overheatingFlag ? STATUS.ENTRY_CANDIDATE : score >= 35 ? STATUS.WATCH : STATUS.BAN;
  const overheatingRisk = blowoffFlag ? "높음" : overheatingFlag ? "중간" : highProximity && daily > 2 ? "낮음~중간" : "낮음";
  const overheatingReason = etfOverheatingReason(assetType, item, overheatingRisk);

  const whyMoneyIsFlowing = weakVolume
    ? `최근 수익률은 확인되지만 상대 거래량 ${num(relVol, 2)}배라 신규 자금 유입 강도는 약함`
    : `20일 ${pct(r20)}, 5일 ${pct(r5)}, 상대 거래량 ${num(relVol, 2)}배로 가격과 거래량이 함께 개선`;
  const likelyNextBuyer =
    assetType === "ETF"
      ? "섹터 베타를 사려는 단기 모멘텀 자금과 리밸런싱 자금"
      : "개별 주도주를 따라붙는 단기 모멘텀 자금과 관련 ETF 강세를 확인한 스윙 트레이더";
  const whyThisCouldTradeHigher = highProximity
    ? "52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음"
    : "단기 추세가 유지되고 거래량이 1.0배 이상이면 되돌림 이후 재상승을 시도할 수 있음";

  return {
    moneyFlowScore: score,
    overheatingRisk,
    overheatingReason,
    reasonConfidence,
    status,
    whyMoneyIsFlowing,
    likelyNextBuyer,
    whyThisCouldTradeHigher
  };
}

function etfOverheatingReason(assetType, item, risk) {
  if (assetType !== "ETF") {
    return risk === "낮음" ? "개별 종목 기준 과열 신호 제한적" : "단기 급등과 고점 근접 조합 확인";
  }
  const category = ETF_CATEGORY[item.ticker] || "성장/테마 ETF";
  if (category === "채권 ETF") return "채권 ETF는 가격 급등보다 금리 급락 후 되돌림 리스크를 별도 확인 필요";
  if (category === "금 ETF") return "금 ETF는 달러/실질금리 데이터가 미연결이라 가격 기준으로만 낮은 신뢰도 평가";
  if (category === "비트코인 ETF") return "비트코인 ETF는 단기 변동성과 거래량 급증이 겹치면 과열 리스크를 높게 봄";
  if (category === "시장 기준 ETF") return "시장 기준 ETF는 단기 과열 기준을 완만하게 적용";
  return risk === "낮음" ? `${category} 기준 과열 신호 제한적` : `${category} 기준 단기 급등과 고점 근접 조합 확인`;
}

function chartSummary(item) {
  const history = item?.history || [];
  if (history.length < 20) return "차트 데이터 없음";
  const closes = history.map((row) => row.close).filter((value) => Number.isFinite(value));
  const last = closes.at(-1);
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  if (last >= ma5 && ma5 >= ma20) return "최근 20거래일 우상향, 5일선이 20일선 위에 있음";
  if (last >= ma20 && last < ma5) return "20일선 위에서 단기 눌림 확인 구간";
  if (last < ma20) return "20일선 아래라 추세 확인 전까지 보수적 접근";
  return "단기 추세는 중립";
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function enrichEtf(etf, marketData) {
  const market = marketItem(marketData, etf.ticker);
  const scored = MODE === "REAL_TEST" ? scoreAsset(market, "ETF") : scoreAsset(mockMarket(etf), "ETF");
  const categoryType = ETF_CATEGORY[etf.ticker] || "성장/테마 ETF";
  return {
    ...etf,
    categoryType,
    market,
    chartPath: `charts/${etf.ticker}.png`,
    chartSummary: chartSummary(market),
    ...scored,
    todayActionLabel: scored.status === STATUS.ENTRY_READY ? "ETF 우선" : scored.status === STATUS.ENTRY_CANDIDATE ? "눌림 매수 대기" : scored.overheatingRisk === "높음" ? "추격 금지" : "돌파 확인 후 관찰",
    entryCondition: entryCondition(market),
    invalidationCondition: invalidationCondition(market)
  };
}

function enrichStock(stock, etfs, marketData) {
  const market = marketItem(marketData, stock.ticker);
  const relatedEtfs = relatedEtfsForStock(stock.ticker, etfs);
  const relatedEtfStrength = relatedEtfs.length ? Math.max(...relatedEtfs.map((etf) => etf.moneyFlowScore || 0)) : 0;
  const scored = MODE === "REAL_TEST" ? scoreAsset(market, "STOCK", relatedEtfStrength) : scoreAsset(mockMarket(stock), "STOCK", relatedEtfStrength);
  const isHolding = Boolean(stock.entryPrice);
  const status = isHolding && scored.status !== STATUS.BAN ? STATUS.HOLD : scored.status;
  return {
    ...stock,
    ...STOCK_META[stock.ticker],
    market,
    relatedEtfs,
    chartPath: `charts/${stock.ticker}.png`,
    chartSummary: chartSummary(market),
    ...scored,
    status,
    todayActionLabel: status === STATUS.ENTRY_READY ? "개별 종목 우선" : status === STATUS.ENTRY_CANDIDATE ? "눌림 매수 대기" : status === STATUS.HOLD ? "보유 정보 확인" : "돌파 확인 후 관찰",
    entryCondition: entryCondition(market),
    invalidationCondition: invalidationCondition(market),
    holdingInfo: isHolding ? "보유 정보 미입력 - 기존 mock 진입가/수익률은 실전 판단에 사용하지 않음" : ""
  };
}

function mockMarket(row) {
  return {
    ticker: row.ticker,
    dataStatus: "ok",
    dailyChangePct: row.changePct ?? 0,
    return5dPct: Math.max(row.changePct ?? 0, 1),
    return20dPct: Math.max(row.score ? row.score / 10 : 2, 1),
    relativeVolume: row.relativeVolume ?? 1,
    drawdownFrom52wHighPct: -8,
    lastClose: row.currentPrice ?? null,
    dataSource: "mock",
    history: []
  };
}

function relatedEtfsForStock(ticker, etfs) {
  const priorities = RELATED_ETF_PRIORITY[ticker] || [];
  return priorities
    .map((symbol) => etfs.find((etf) => etf.ticker === symbol))
    .filter(Boolean)
    .sort((a, b) => priorities.indexOf(a.ticker) - priorities.indexOf(b.ticker));
}

function entryCondition(item) {
  if (!item || item.dataStatus !== "ok") return "데이터 없음";
  if ((item.relativeVolume ?? 0) < 1) return "상대 거래량 1.0배 회복 후 관찰";
  if ((item.drawdownFrom52wHighPct ?? -100) >= -5) return "전일 고점 돌파 후 5일선 위 유지";
  return "20일선 위에서 눌림 후 재상승 확인";
}

function invalidationCondition(item) {
  if (!item || item.dataStatus !== "ok") return "데이터 없음";
  if ((item.relativeVolume ?? 0) < 1) return "거래량 회복 실패";
  return "20일선 이탈 또는 상대 거래량 0.8배 이하 둔화";
}

function marketStatus(etfs) {
  const qqq = etfs.find((etf) => etf.ticker === "QQQ")?.market;
  const spy = etfs.find((etf) => etf.ticker === "SPY")?.market;
  if (qqq?.dataStatus !== "ok" || spy?.dataStatus !== "ok") return "중립";
  const avg20 = ((qqq.return20dPct ?? 0) + (spy.return20dPct ?? 0)) / 2;
  const avg5 = ((qqq.return5dPct ?? 0) + (spy.return5dPct ?? 0)) / 2;
  if (avg20 > 2 && avg5 > 0) return "위험선호";
  if (avg20 < -2 && avg5 < 0) return "위험회피";
  return "중립";
}

function groupThemes(stocks, etfs) {
  const rows = new Map();
  for (const stock of stocks) {
    const theme = stock.primaryTheme || stock.theme || "기타";
    const row = rows.get(theme) || { theme, tickers: [], score: 0, count: 0 };
    row.tickers.push(stock.ticker);
    row.score += stock.moneyFlowScore || 0;
    row.count += 1;
    rows.set(theme, row);
  }
  for (const etf of etfs) {
    const theme = etf.categoryType || etf.category || "ETF";
    const row = rows.get(theme) || { theme, tickers: [], score: 0, count: 0 };
    row.tickers.push(etf.ticker);
    row.score += etf.moneyFlowScore || 0;
    row.count += 1;
    rows.set(theme, row);
  }
  return [...rows.values()].map((row) => ({ ...row, avgScore: row.score / row.count })).sort((a, b) => b.avgScore - a.avgScore);
}

function chooseActionCandidates(stocks, etfs) {
  const pool = [
    ...etfs.map((row) => ({ ...row, assetType: "ETF" })),
    ...stocks.filter((row) => !row.holdingInfo).map((row) => ({ ...row, assetType: "개별 종목" }))
  ].filter((row) => [STATUS.ENTRY_READY, STATUS.ENTRY_CANDIDATE].includes(row.status) && row.reasonConfidence !== "LOW");

  return pool
    .sort((a, b) => b.moneyFlowScore - a.moneyFlowScore)
    .slice(0, 3)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function buildReport() {
  const rawWatchlist = readJson("watchlist.json", []);
  const rawHoldings = readJson("holdings.json", []);
  const marketData = MODE === "REAL_TEST" ? readJson("market_data_real.json", { items: {} }) : null;
  const etfs = readJson("watchlist_etfs.json", []).map((etf) => enrichEtf(etf, marketData));
  const watchlist = rawWatchlist.map((stock) => enrichStock(stock, etfs, marketData));
  const holdings = rawHoldings.map((stock) => enrichStock(stock, etfs, marketData));
  const stocks = [...watchlist, ...holdings];
  const validEtfs = etfs.filter((etf) => MODE !== "REAL_TEST" || etf.market.dataStatus === "ok");
  const etfTop5 = [...validEtfs].sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const entryCandidates = watchlist.filter((row) => [STATUS.ENTRY_CANDIDATE, STATUS.ENTRY_READY].includes(row.status)).sort((a, b) => b.moneyFlowScore - a.moneyFlowScore);
  const cautionRows = stocks.filter((row) => [STATUS.EXIT, STATUS.BAN].includes(row.status));
  const overheat = [...validEtfs, ...watchlist].filter((row) => ["높음", "중간", "낮음~중간"].includes(row.overheatingRisk)).sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const actionCandidates = chooseActionCandidates(stocks, etfs);
  const chartTickers = unique([
    ...actionCandidates.map((row) => row.ticker),
    ...etfTop5.map((row) => row.ticker),
    ...entryCandidates.slice(0, 3).map((row) => row.ticker)
  ]);
  const chartCount = generateCharts(chartTickers, marketData);

  return {
    generatedAt: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "full", timeStyle: "short" }).format(new Date()),
    dataMode: MODE,
    dataWarning: MODE === "REAL_TEST" ? REAL_WARNING : MOCK_WARNING,
    marketData,
    marketLabel: marketStatus(etfs),
    etfs,
    watchlist,
    holdings,
    stocks,
    themes: groupThemes(stocks, etfs),
    etfTop5,
    entryCandidates,
    holdRows: holdings,
    cautionRows,
    overheat,
    actionCandidates,
    chartCount
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function marketLine(item) {
  if (!item || item.dataStatus !== "ok") return "데이터 상태: 데이터 없음";
  return `기준일 ${item.dataDate} | 종가 ${price(item.lastClose)} | 1일 ${pct(item.dailyChangePct)} | 5일 ${pct(item.return5dPct)} | 20일 ${pct(item.return20dPct)} | 상대 거래량 ${num(item.relativeVolume, 2)}배 | 52주 고점 대비 ${pct(item.drawdownFrom52wHighPct)} | 데이터 소스: ${item.dataSource}`;
}

function renderMarkdown(report) {
  return `# Daily Trading Thesis Report

**${report.dataWarning}**

**목적:** ${PURPOSE}

생성 시각: ${report.generatedAt}

> 핵심 질문: 현재 가격에서 살까, 누가 왜 더 비싸게 사줄 수 있는가?

뉴스/옵션/ETF 구성종목 확산도/스프레드 데이터는 아직 미연결이다. 따라서 reasonConfidence는 가격/거래량/관련 ETF 강도 기준으로만 산정하며 HIGH를 사용하지 않는다.

## 오늘의 결론

- 데이터 모드: ${report.dataMode}
- 시장 상태: ${report.marketLabel}
- 강한 테마 TOP 3: ${report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "데이터 없음"}
- ETF 후보 TOP 5: ${report.etfTop5.map((row) => row.ticker).join(", ") || "데이터 없음"}
- 개별 종목보다 ETF가 더 나은 테마: ${report.themes.filter((row) => row.theme.includes("ETF")).slice(0, 3).map((row) => row.theme).join(", ") || "데이터 없음"}
- 과열 주의 후보: ${report.overheat.map((row) => `${row.ticker}(${row.overheatingRisk})`).join(", ") || "없음"}
- 오늘 꼭 확인할 조건 3개: 상대 거래량 1.0배 유지 / 20일선 이탈 여부 / 추격 매수 금지 구간 확인

## 오늘 실제 행동 후보

${report.actionCandidates.map(renderActionMarkdown).join("\n\n") || "적합한 행동 후보 없음"}

## 오늘의 시장 상태

**${report.marketLabel}**

REAL_TEST 가격/거래량은 yfinance에서 수집했다. 뉴스/옵션/ETF 구성종목 확산도/스프레드 데이터는 아직 미연결이다.

## 오늘 돈이 몰리는 테마

${mdList(report.themes.slice(0, 6).map((row) => `**${row.theme}**: ${row.tickers.slice(0, 6).join(", ")} | 평균 moneyFlowScore ${row.avgScore.toFixed(0)}`))}

## ETF 카드

${report.etfTop5.map(renderEtfMarkdown).join("\n\n") || "데이터 없음"}

## ETF 과열 주의 후보

${report.overheat.filter((row) => row.assetType !== "개별 종목").slice(0, 3).map((row) => `### [${row.ticker}] ${row.name}
- 과열 리스크: ${row.overheatingRisk}
- 이유: ${row.overheatingReason}
- moneyFlowScore: ${row.moneyFlowScore}
`).join("\n") || "해당 없음"}

## 진입 후보

${mdList(report.entryCandidates.map((row) => `**${row.ticker} ${row.name}** | 상태: ${row.status} | moneyFlowScore: ${row.moneyFlowScore} | 관련 ETF: ${row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "없음"}`))}

## 보유 유지 후보

${mdList(report.holdRows.map((row) => `**${row.ticker} ${row.name}** | 상태: ${row.status} | ${row.holdingInfo || "보유 정보 미입력"}`))}

## 청산/주의 후보

${mdList(report.cautionRows.map((row) => `**${row.ticker} ${row.name}** | 상태: ${row.status} | ${row.invalidationCondition}`))}

## 종목별 상승 근거

${report.stocks.map(renderStockMarkdown).join("\n\n")}

## 감시 ETF 목록

| 티커 | 카테고리 | moneyFlowScore | 상태 | reasonConfidence | 한 줄 이유 |
| --- | --- | ---: | --- | --- | --- |
${report.etfs.map((row) => `| ${row.ticker} | ${row.categoryType} | ${row.moneyFlowScore} | ${row.status} | ${row.reasonConfidence} | ${row.whyMoneyIsFlowing} |`).join("\n")}

## 진입 조건

${mdList(report.actionCandidates.map((row) => `**${row.ticker}**: ${row.entryCondition}`))}

## 무효화 조건

${mdList(report.actionCandidates.map((row) => `**${row.ticker}**: ${row.invalidationCondition}`))}

## 내일 확인할 것
- 오늘 실제 행동 후보의 상대 거래량이 1.0배 이상 유지되는지 확인
- ETF 후보 TOP 5가 20일선 위에서 유지되는지 확인
- 뉴스/옵션/ETF 구성종목 확산도 데이터가 연결되기 전까지 HIGH confidence를 사용하지 않기
`;
}

function renderActionMarkdown(row) {
  return `### ${row.rank}. [${row.ticker}] ${row.name || row.ticker}
- 자산 유형: ${row.assetType}
- 현재 돈이 몰린다고 보는 이유: ${row.whyMoneyIsFlowing}
- 누가 더 비싸게 사줄 수 있는지: ${row.likelyNextBuyer}
- 진입 조건: ${row.entryCondition}
- 무효화 조건: ${row.invalidationCondition}
- reasonConfidence: ${row.reasonConfidence}
- todayActionLabel: ${row.todayActionLabel}
- moneyFlowScore: ${row.moneyFlowScore}
- 과열 리스크: ${row.overheatingRisk}
- 차트: ![${row.ticker} chart](${row.chartPath})`;
}

function renderEtfMarkdown(row) {
  return `### [ETF ${row.ticker}] ${row.name}
- 카테고리: ${row.categoryType}
- 상태: ${row.status}
- moneyFlowScore: ${row.moneyFlowScore}
- 과열 리스크: ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- whyMoneyIsFlowing: ${row.whyMoneyIsFlowing}
- likelyNextBuyer: ${row.likelyNextBuyer}
- whyThisCouldTradeHigher: ${row.whyThisCouldTradeHigher}
- 진입 조건: ${row.entryCondition}
- 무효화 조건: ${row.invalidationCondition}
- 차트 요약: ${row.chartSummary}
- 차트: ![${row.ticker} chart](${row.chartPath})
- ${marketLine(row.market)}`;
}

function renderStockMarkdown(row) {
  return `### [${row.ticker}] ${row.name}
- 상태: ${row.status}
- primaryTheme: ${row.primaryTheme || "데이터 없음"}
- primarySector: ${row.primarySector || "데이터 없음"}
- 관련 ETF: ${row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "없음"}
- moneyFlowScore: ${row.moneyFlowScore}
- 과열 리스크: ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- whyMoneyIsFlowing: ${row.whyMoneyIsFlowing}
- likelyNextBuyer: ${row.likelyNextBuyer}
- whyThisCouldTradeHigher: ${row.whyThisCouldTradeHigher}
- 진입 조건: ${row.entryCondition}
- 무효화 조건: ${row.invalidationCondition}
${row.holdingInfo ? `- 보유 정보: ${row.holdingInfo}\n` : ""}- 차트 요약: ${row.chartSummary}
- 차트: ![${row.ticker} chart](${row.chartPath})
- ${marketLine(row.market)}`;
}

function renderHtml(report) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daily Trading Thesis Report</title>
  <style>
    body { margin: 0; background: #f4f6f8; color: #172026; font-family: Arial, "Noto Sans KR", sans-serif; line-height: 1.55; }
    main { width: min(1120px, calc(100% - 24px)); margin: 0 auto; padding: 14px 0 36px; }
    .banner { border: 2px solid #f59e0b; background: #fff7ed; color: #7a3f00; border-radius: 8px; padding: 12px 14px; font-weight: 800; font-size: 17px; margin-bottom: 12px; }
    section, article, .hero { background: #fff; border: 1px solid #d9dee3; border-radius: 8px; margin: 10px 0; padding: 14px; }
    h1 { margin: 0 0 6px; font-size: 25px; } h2 { margin: 0 0 10px; font-size: 20px; } h3 { margin: 0 0 8px; font-size: 18px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .tile { border: 1px solid #d9dee3; border-radius: 8px; padding: 9px; background: #fbfcfd; }
    .tile strong { display: block; color: #5d6670; font-size: 12px; margin-bottom: 4px; }
    .badge { display: inline-flex; border-radius: 999px; color: #fff; padding: 4px 8px; font-size: 12px; font-weight: 800; }
    .ready { background: #047857; } .candidate { background: #2563eb; } .watch, .hold { background: #4f46e5; } .profit { background: #0f766e; } .exit { background: #c2410c; } .ban { background: #991b1b; }
    .muted { color: #5d6670; font-size: 14px; } .purpose { font-weight: 800; }
    .chart { width: 100%; max-width: 520px; height: auto; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; } th, td { border-top: 1px solid #d9dee3; padding: 8px; text-align: left; vertical-align: top; }
    ul { padding-left: 20px; } li { margin: 4px 0; }
    @media (max-width: 740px) { main { width: min(100% - 16px, 1120px); } .grid { grid-template-columns: 1fr; } h1 { font-size: 22px; } section, article, .hero { padding: 12px; } table { font-size: 12px; } }
  </style>
</head>
<body>
  <main>
    <div class="banner" data-report-warning>${escapeHtml(report.dataWarning)}</div>
    <div class="hero">
      <h1>Daily Trading Thesis Report</h1>
      <p class="purpose">${escapeHtml(PURPOSE)}</p>
      <p class="muted">생성 시각: ${escapeHtml(report.generatedAt)}</p>
      <p><strong>핵심 질문:</strong> 현재 가격에서 살까, 누가 왜 더 비싸게 사줄 수 있는가?</p>
      <p class="muted">뉴스/옵션/ETF 구성종목 확산도/스프레드 데이터는 아직 미연결이다. HIGH confidence는 사용하지 않는다.</p>
    </div>
    ${renderConclusionHtml(report)}
    <section><h2>오늘 실제 행동 후보</h2>${report.actionCandidates.map(renderActionHtml).join("") || "<p>적합한 행동 후보 없음</p>"}</section>
    <section><h2>오늘의 시장 상태</h2><p><strong>${escapeHtml(report.marketLabel)}</strong></p><p>REAL_TEST 가격/거래량은 yfinance에서 수집했다. 뉴스/옵션/ETF 구성종목 확산도/스프레드 데이터는 아직 미연결이다.</p></section>
    <section><h2>오늘 돈이 몰리는 테마</h2>${htmlList(report.themes.slice(0, 6).map((row) => `${escapeHtml(row.theme)}: ${escapeHtml(row.tickers.slice(0, 6).join(", "))} | 평균 moneyFlowScore ${row.avgScore.toFixed(0)}`))}</section>
    <section><h2>ETF 카드</h2>${report.etfTop5.map(renderEtfHtml).join("") || "<p>데이터 없음</p>"}</section>
    <section><h2>ETF 과열 주의 후보</h2>${htmlList(report.overheat.slice(0, 5).map((row) => `${escapeHtml(row.ticker)} | ${escapeHtml(row.overheatingRisk)} | ${escapeHtml(row.overheatingReason)}`))}</section>
    <section><h2>진입 후보</h2>${htmlList(report.entryCandidates.map((row) => `${escapeHtml(row.ticker)} ${escapeHtml(row.name)} | ${escapeHtml(row.status)} | moneyFlowScore ${row.moneyFlowScore}`))}</section>
    <section><h2>보유 유지 후보</h2>${htmlList(report.holdRows.map((row) => `${escapeHtml(row.ticker)} ${escapeHtml(row.name)} | ${escapeHtml(row.status)} | ${escapeHtml(row.holdingInfo || "보유 정보 미입력")}`))}</section>
    <section><h2>청산/주의 후보</h2>${htmlList(report.cautionRows.map((row) => `${escapeHtml(row.ticker)} ${escapeHtml(row.name)} | ${escapeHtml(row.status)} | ${escapeHtml(row.invalidationCondition)}`))}</section>
    <section><h2>종목별 상승 근거</h2>${report.stocks.map(renderStockHtml).join("")}</section>
    <section><h2>감시 ETF 목록</h2>${renderEtfTable(report.etfs)}</section>
    <section><h2>진입 조건</h2>${htmlList(report.actionCandidates.map((row) => `${escapeHtml(row.ticker)}: ${escapeHtml(row.entryCondition)}`))}</section>
    <section><h2>무효화 조건</h2>${htmlList(report.actionCandidates.map((row) => `${escapeHtml(row.ticker)}: ${escapeHtml(row.invalidationCondition)}`))}</section>
    <section><h2>내일 확인할 것</h2>${htmlList(["오늘 실제 행동 후보의 상대 거래량이 1.0배 이상 유지되는지 확인", "ETF 후보 TOP 5가 20일선 위에서 유지되는지 확인", "뉴스/옵션/ETF 구성종목 확산도 데이터가 연결되기 전까지 HIGH confidence를 사용하지 않기"])}</section>
  </main>
</body>
</html>`;
}

function renderConclusionHtml(report) {
  return `<section><h2>오늘의 결론</h2><div class="grid">
    ${tile("데이터 모드", report.dataMode)}
    ${tile("시장 상태", report.marketLabel)}
    ${tile("강한 테마 TOP 3", report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "데이터 없음")}
    ${tile("ETF 후보 TOP 5", report.etfTop5.map((row) => row.ticker).join(", ") || "데이터 없음")}
    ${tile("ETF가 나은 테마", report.themes.filter((row) => row.theme.includes("ETF")).slice(0, 3).map((row) => row.theme).join(", ") || "데이터 없음")}
    ${tile("오늘 꼭 확인할 조건", "거래량 / 20일선 / 추격 금지")}
  </div></section>`;
}

function renderActionHtml(row) {
  return `<article data-action-card="${escapeHtml(row.ticker)}"><h3>${row.rank}. [${escapeHtml(row.ticker)}] ${escapeHtml(row.name || row.ticker)} ${badge(row.status)}</h3>
    <div class="grid">${tile("자산 유형", row.assetType)}${tile("moneyFlowScore", row.moneyFlowScore)}${tile("reasonConfidence", row.reasonConfidence)}</div>
    ${fieldList(row)}
    ${chartImage(row)}
  </article>`;
}

function renderEtfHtml(row) {
  return `<article data-etf-card="${escapeHtml(row.ticker)}"><h3>[ETF ${escapeHtml(row.ticker)}] ${escapeHtml(row.name)} ${badge(row.status)}</h3>
    <div class="grid">${tile("카테고리", row.categoryType)}${tile("moneyFlowScore", row.moneyFlowScore)}${tile("과열 리스크", row.overheatingRisk)}${tile("reasonConfidence", row.reasonConfidence)}${tile("todayActionLabel", row.todayActionLabel)}${tile("데이터", row.market.dataStatus)}</div>
    ${fieldList(row)}
    ${chartImage(row)}
    <p class="muted">${escapeHtml(marketLine(row.market))}</p>
  </article>`;
}

function renderStockHtml(row) {
  return `<article data-stock-card="${escapeHtml(row.ticker)}"><h3>[${escapeHtml(row.ticker)}] ${escapeHtml(row.name)} ${badge(row.status)}</h3>
    <div class="grid">${tile("primaryTheme", row.primaryTheme || "데이터 없음")}${tile("관련 ETF", row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "없음")}${tile("moneyFlowScore", row.moneyFlowScore)}${tile("reasonConfidence", row.reasonConfidence)}${tile("과열 리스크", row.overheatingRisk)}${tile("todayActionLabel", row.todayActionLabel)}</div>
    ${fieldList(row)}
    ${row.holdingInfo ? `<p class="muted">${escapeHtml(row.holdingInfo)}</p>` : ""}
    ${chartImage(row)}
    <p class="muted">${escapeHtml(marketLine(row.market))}</p>
  </article>`;
}

function fieldList(row) {
  return htmlList([
    `<strong>whyMoneyIsFlowing:</strong> ${escapeHtml(row.whyMoneyIsFlowing)}`,
    `<strong>likelyNextBuyer:</strong> ${escapeHtml(row.likelyNextBuyer)}`,
    `<strong>whyThisCouldTradeHigher:</strong> ${escapeHtml(row.whyThisCouldTradeHigher)}`,
    `<strong>진입 조건:</strong> ${escapeHtml(row.entryCondition)}`,
    `<strong>무효화 조건:</strong> ${escapeHtml(row.invalidationCondition)}`,
    `<strong>차트 요약:</strong> ${escapeHtml(row.chartSummary)}`
  ]);
}

function renderEtfTable(etfs) {
  return `<table><thead><tr><th>티커</th><th>카테고리</th><th>moneyFlowScore</th><th>상태</th><th>reasonConfidence</th><th>한 줄 이유</th></tr></thead><tbody>${etfs.map((row) => `<tr><td>${escapeHtml(row.ticker)}</td><td>${escapeHtml(row.categoryType)}</td><td>${row.moneyFlowScore}</td><td>${badge(row.status)}</td><td>${escapeHtml(row.reasonConfidence)}</td><td>${escapeHtml(row.whyMoneyIsFlowing)}</td></tr>`).join("")}</tbody></table>`;
}

function tile(label, value) {
  return `<div class="tile"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`;
}

function badge(value) {
  return `<span class="badge ${STATUS_CLASS[value] || "watch"}">${escapeHtml(value)}</span>`;
}

function chartImage(row) {
  if (!row.market?.history?.length) return "";
  return `<img class="chart" src="${escapeHtml(row.chartPath)}" alt="${escapeHtml(row.ticker)} price chart">`;
}

function generateCharts(tickers, marketData) {
  ensureDir(CHARTS_DIR);
  let count = 0;
  for (const ticker of tickers) {
    const item = marketItem(marketData, ticker);
    if (!item.history || item.history.length < 5) continue;
    const filePath = path.join(CHARTS_DIR, `${ticker}.png`);
    writeChartPng(filePath, ticker, item.history.slice(-30).map((row) => row.close));
    count += 1;
  }
  return count;
}

function writeChartPng(filePath, ticker, closes) {
  const width = 640;
  const height = 300;
  const pixels = Buffer.alloc(width * height * 4, 255);
  const setPixel = (x, y, color) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = (Math.round(y) * width + Math.round(x)) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = color[3];
  };
  const line = (x0, y0, x1, y1, color) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      setPixel(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color);
    }
  };
  const margin = { left: 36, right: 18, top: 28, bottom: 28 };
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max === min ? 1 : max - min;
  const x = (i) => margin.left + (i / Math.max(1, closes.length - 1)) * (width - margin.left - margin.right);
  const y = (value) => height - margin.bottom - ((value - min) / span) * (height - margin.top - margin.bottom);
  for (let gx = margin.left; gx < width - margin.right; gx += 80) line(gx, margin.top, gx, height - margin.bottom, [230, 235, 240, 255]);
  for (let gy = margin.top; gy < height - margin.bottom; gy += 48) line(margin.left, gy, width - margin.right, gy, [230, 235, 240, 255]);
  line(margin.left, height - margin.bottom, width - margin.right, height - margin.bottom, [120, 130, 140, 255]);
  line(margin.left, margin.top, margin.left, height - margin.bottom, [120, 130, 140, 255]);
  drawSeries(closes, x, y, line, [37, 99, 235, 255]);
  drawSeries(movingAverage(closes, 5), x, y, line, [5, 150, 105, 255]);
  drawSeries(movingAverage(closes, 20), x, y, line, [234, 88, 12, 255]);
  const lx = x(closes.length - 1);
  const ly = y(closes.at(-1));
  for (let dx = -3; dx <= 3; dx += 1) {
    for (let dy = -3; dy <= 3; dy += 1) setPixel(lx + dx, ly + dy, [220, 38, 38, 255]);
  }
  fs.writeFileSync(filePath, encodePng(width, height, pixels));
}

function movingAverage(values, period) {
  return values.map((_, index) => (index + 1 >= period ? average(values.slice(index + 1 - period, index + 1)) : null));
}

function drawSeries(values, x, y, line, color) {
  let prev = null;
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    const point = { x: x(index), y: y(value) };
    if (prev) line(prev.x, prev.y, point.x, point.y, color);
    prev = point;
  });
}

function encodePng(width, height, rgba) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    rgba.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])]));
  const idat = chunk("IDAT", zlib.deflateSync(scanlines));
  const iend = chunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const crcInput = Buffer.concat([typeBuf, data]);
  return Buffer.concat([u32(data.length), typeBuf, data, u32(crc32(crcInput))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function main() {
  const report = buildReport();
  writeReport("latest.md", renderMarkdown(report));
  writeReport("latest.html", renderHtml(report));
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.md")}`);
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.html")}`);
  console.log(`Generated charts: ${report.chartCount}`);
}

main();
