const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");

const MODE = process.env.REPORT_MODE === "REAL_TEST" || process.argv.includes("--real-test") ? "REAL_TEST" : "MOCK";
const WARNINGS = {
  MOCK: "MOCK DATA - 실전 투자 판단 사용 금지",
  REAL_TEST: "REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스/옵션/일부 판단 로직은 검증 중"
};

const STATUS_CLASS = {
  "ETF 우선": "pick-etf",
  "개별 종목 우선": "pick-stock",
  "둘 다 관찰": "watch",
  "ETF 과열 주의": "hot",
  "매매 금지": "ban",
  "진입 가능": "ready",
  "진입 후보": "candidate",
  "보유 유지": "hold",
  "청산 후보": "exit",
  "관찰": "watch",
  "데이터 없음": "ban"
};

function readJson(fileName, fallback = null) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeReport(fileName, content) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, fileName), content, "utf8");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function pct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "데이터 없음";
  return `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}

function money(value, sourceLabel) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "데이터 없음";
  return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} (${sourceLabel})`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mdList(items) {
  return items.map((item) => `- ${item}`).join("\n") || "- 해당 없음";
}

function htmlList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function getMarketItem(marketData, ticker) {
  return marketData?.items?.[ticker] || { ticker, dataStatus: "missing", error: "market_data_real.json에 없음" };
}

function realScore(item) {
  if (!item || item.dataStatus !== "ok") {
    return {
      score: -999,
      status: "데이터 없음",
      oneLineReason: "실제 데이터 수집 실패",
      scoreBreakdown: {
        trend20d: 0,
        momentum5d: 0,
        relativeVolume: 0,
        highProximity: 0,
        overheatingRiskDeduction: 0,
        weakTrendDeduction: 0
      }
    };
  }

  const return20 = item.return20dPct ?? 0;
  const return5 = item.return5dPct ?? 0;
  const relVol = item.relativeVolume ?? 0;
  const drawdown = item.drawdownFrom52wHighPct ?? -100;
  const daily = item.dailyChangePct ?? 0;
  const trend20d = return20 > 0 ? Math.min(35, 15 + return20) : Math.max(0, 10 + return20);
  const momentum5d = return5 > return20 ? 20 : return5 > 0 ? 14 : 6;
  const relativeVolume = relVol >= 1.5 ? 20 : relVol >= 1 ? 13 : relVol <= 0.8 ? 4 : 8;
  const highProximity = drawdown >= -5 ? 15 : drawdown <= -20 ? 2 : 8;
  const overheatingRiskDeduction = daily >= 5 && drawdown >= -5 ? -12 : daily >= 3 ? -5 : 0;
  const weakTrendDeduction = drawdown <= -20 ? -10 : relVol <= 0.8 ? -4 : 0;
  const score = Math.round(trend20d + momentum5d + relativeVolume + highProximity + overheatingRiskDeduction + weakTrendDeduction);
  const status = score >= 70 ? "ETF 우선" : score >= 55 ? "둘 다 관찰" : score >= 35 ? "ETF 과열 주의" : "매매 금지";
  const oneLineReason = `20일 ${pct(return20)}, 5일 ${pct(return5)}, 상대 거래량 ${item.relativeVolume ?? "없음"}`;

  return {
    score,
    status,
    oneLineReason,
    scoreBreakdown: {
      trend20d: Math.round(trend20d),
      momentum5d: Math.round(momentum5d),
      relativeVolume: Math.round(relativeVolume),
      highProximity: Math.round(highProximity),
      overheatingRiskDeduction,
      weakTrendDeduction
    }
  };
}

function mockScoreEtf(etf) {
  const riskTickers = new Set(["ARKK", "IPO", "KWEB", "OIH", "BLOK"]);
  const narrowTheme = new Set(["DRAM", "SHLD", "GRID", "URA", "COPX", "IBIT"]);
  const isRisk = riskTickers.has(etf.ticker);
  const isNarrow = narrowTheme.has(etf.ticker);
  const scoreBreakdown = {
    themeStrength: etf.priority === 1 ? 24 : etf.priority === 2 ? 19 : 15,
    flow: etf.priority === 1 ? 20 : etf.priority === 2 ? 17 : 13,
    priceLocation: isRisk ? 11 : 14,
    breadth: etf.compareStocks.length >= 5 ? 12 : 9,
    efficiencyVsStock: etf.role.includes("basket") || etf.role.includes("beta") || etf.role.includes("benchmark") ? 10 : 8,
    overheatingRiskDeduction: isRisk || isNarrow ? -12 : etf.priority === 1 ? -8 : -6,
    liquidityRiskDeduction: etf.priority === 3 ? -6 : etf.priority === 2 ? -3 : -2
  };
  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  const todayChoice = isRisk ? "ETF 과열 주의" : etf.priority === 1 ? "ETF 우선" : etf.priority === 2 ? "둘 다 관찰" : "매매 금지";
  return {
    score,
    todayChoice,
    oneLineReason: etf.priority === 1 ? `${etf.category} 흐름을 개별 종목보다 넓게 확인` : `${etf.category} 보조 확인용`,
    scoreBreakdown
  };
}

function enrichEtf(etf, marketData) {
  const market = getMarketItem(marketData, etf.ticker);
  const scored = MODE === "REAL_TEST" ? realScore(market) : mockScoreEtf(etf);
  return {
    ...etf,
    market,
    score: scored.score,
    scoreBreakdown: scored.scoreBreakdown,
    todayChoice: MODE === "REAL_TEST" ? scored.status : scored.todayChoice,
    oneLineReason: scored.oneLineReason,
    entryConditions: MODE === "REAL_TEST"
      ? ["20일 수익률 양수 유지", "5일 수익률이 20일 흐름보다 강함", "상대 거래량 1.0 이상 유지"]
      : [`${etf.ticker}가 VWAP 위에서 유지`, "관련 구성 종목 2개 이상 동반 강세", "거래량과 스프레드가 mock 기준 정상"],
    invalidationConditions: MODE === "REAL_TEST"
      ? ["20일 수익률 음전", "상대 거래량 0.8 이하로 둔화", "52주 고점 대비 -20% 이하 약세"]
      : ["VWAP 이탈 후 회복 실패", "관련 개별 종목 동반 약세", "스프레드 확대 또는 거래량 둔화"],
    dataReliability: MODE === "REAL_TEST" && market.dataStatus === "ok" ? "REAL PRICE/VOLUME TEST" : MODE === "REAL_TEST" ? "데이터 없음" : "MOCK DATA"
  };
}

function enrichStock(stock, etfs, marketData) {
  const market = getMarketItem(marketData, stock.ticker);
  const scored = MODE === "REAL_TEST" ? realScore(market) : { score: stock.score, status: stock.status };
  const relatedEtfs = relatedEtfsForStock(stock, etfs);
  const relatedEtfStrength = relatedEtfs[0]?.score ?? 0;
  const totalScore = MODE === "REAL_TEST" && market.dataStatus === "ok" ? scored.score + Math.min(10, Math.max(0, Math.round(relatedEtfStrength / 10))) : stock.score;
  return {
    ...stock,
    market,
    relatedEtfs,
    score: totalScore,
    status: MODE === "REAL_TEST" ? classifyRealStock(totalScore, market) : stock.status,
    dataReliability: MODE === "REAL_TEST" && market.dataStatus === "ok" ? "REAL PRICE/VOLUME TEST" : MODE === "REAL_TEST" ? "데이터 없음" : stock.dataReliability
  };
}

function classifyRealStock(score, market) {
  if (!market || market.dataStatus !== "ok") return "데이터 없음";
  if ((market.dailyChangePct ?? 0) >= 5 && (market.drawdownFrom52wHighPct ?? -100) >= -5) return "관찰";
  if (score >= 75) return "진입 가능";
  if (score >= 60) return "진입 후보";
  if (score >= 40) return "관찰";
  return "매매 금지";
}

function groupThemes(stocks) {
  const map = new Map();
  for (const stock of stocks) {
    const row = map.get(stock.theme) || { theme: stock.theme, tickers: [], score: 0, count: 0 };
    row.tickers.push(stock.ticker);
    row.score += stock.score || 0;
    row.count += 1;
    map.set(stock.theme, row);
  }
  return [...map.values()]
    .map((row) => ({ ...row, avgScore: row.score / row.count }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

function groupEtfs(etfs) {
  const map = new Map();
  for (const etf of etfs) {
    const rows = map.get(etf.category) || [];
    rows.push(etf);
    map.set(etf.category, rows);
  }
  return [...map.entries()]
    .map(([category, rows]) => ({
      category,
      rows: rows.sort((a, b) => b.score - a.score),
      topScore: Math.max(...rows.map((row) => row.score))
    }))
    .sort((a, b) => b.topScore - a.topScore);
}

function relatedEtfsForStock(stock, etfs) {
  const words = `${stock.theme} ${stock.ticker}`.toLowerCase().split(/\s|\/|-/).filter(Boolean);
  return etfs
    .filter((etf) => etf.compareStocks.includes(stock.ticker) || words.some((word) => etf.category.toLowerCase().includes(word) || etf.theme.join(" ").includes(word)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function investmentReturn(row) {
  return ((row.currentPrice - row.entryPrice) / row.entryPrice) * 100;
}

function marketStatus(etfs) {
  if (MODE !== "REAL_TEST") return "위험선호";
  const qqq = etfs.find((etf) => etf.ticker === "QQQ")?.market;
  const spy = etfs.find((etf) => etf.ticker === "SPY")?.market;
  if (qqq?.dataStatus !== "ok" || spy?.dataStatus !== "ok") return "중립";
  const avg20 = ((qqq.return20dPct ?? 0) + (spy.return20dPct ?? 0)) / 2;
  if (avg20 > 2) return "위험선호";
  if (avg20 < -2) return "위험회피";
  return "중립";
}

function buildReport() {
  const rawWatchlist = readJson("watchlist.json");
  const rawHoldings = readJson("holdings.json");
  const marketData = MODE === "REAL_TEST" ? readJson("market_data_real.json", { items: {} }) : null;
  const etfs = readJson("watchlist_etfs.json").map((etf) => enrichEtf(etf, marketData));
  const watchlist = rawWatchlist.map((stock) => enrichStock(stock, etfs, marketData));
  const holdings = rawHoldings.map((stock) => enrichStock(stock, etfs, marketData));
  const stocks = [...watchlist, ...holdings];
  const validEtfs = etfs.filter((etf) => MODE !== "REAL_TEST" || etf.market.dataStatus === "ok");
  const etfTop5 = [...validEtfs].sort((a, b) => b.score - a.score).slice(0, 5);
  const entryTop3 = [...watchlist].filter((row) => row.market?.dataStatus !== "missing").sort((a, b) => b.score - a.score).slice(0, 3);
  const etfOverheat = etfs.filter((etf) => etf.todayChoice === "ETF 과열 주의").sort((a, b) => b.score - a.score).slice(0, 3);
  const watchEtfs = etfs.filter((etf) => !etfTop5.some((top) => top.ticker === etf.ticker));
  const themeWatch = etfs.filter((etf) => ["DRAM", "SHLD", "GRID"].includes(etf.ticker));
  const etfGroups = groupEtfs(etfs);

  return {
    generatedAt: formatDate(new Date()),
    dataMode: MODE,
    dataWarning: WARNINGS[MODE],
    marketData,
    watchlist,
    holdings,
    stocks,
    themes: groupThemes(stocks),
    market: {
      label: marketStatus(etfs),
      summary: MODE === "REAL_TEST"
        ? "REAL_TEST 기준 가격/거래량은 yfinance에서 수집했습니다. 뉴스/옵션/구성종목 확산도는 아직 미연결입니다."
        : "mock 기준 AI/반도체와 AI 소프트웨어가 우위입니다. ETF는 주도 테마가 넓게 확산되는지 확인하는 수단입니다."
    },
    etfs,
    etfTop5,
    entryTop3,
    etfOverheat,
    watchEtfs,
    themeWatch,
    strongEtfGroups: etfGroups.slice(0, 3),
    summaryEtfGroups: etfGroups.slice(3),
    marketEtfs: etfs.filter((etf) => ["SPY", "QQQ", "IWM", "TLT", "GLD", "IBIT"].includes(etf.ticker))
  };
}

function marketLine(item) {
  if (!item || item.dataStatus !== "ok") return "데이터 상태: 데이터 없음";
  return `데이터 기준일 ${item.dataDate} | 최신 종가 ${money(item.lastClose, "real")} | 1일 ${pct(item.dailyChangePct)} | 5일 ${pct(item.return5dPct)} | 20일 ${pct(item.return20dPct)} | 상대 거래량 ${item.relativeVolume ?? "데이터 없음"} | 52주 고점 대비 ${pct(item.drawdownFrom52wHighPct)} | 데이터 소스: ${item.dataSource} | 데이터 상태: ${item.dataStatus}`;
}

function renderMarkdown(report) {
  const entryRows = MODE === "REAL_TEST" ? report.entryTop3 : report.watchlist.filter((row) => ["진입 가능", "진입 후보"].includes(row.status)).slice(0, 3);
  const holdRows = report.holdings.filter((row) => row.status === "보유 유지");
  const cautionRows = report.stocks.filter((row) => ["관찰", "청산 후보", "매매 금지", "데이터 없음"].includes(row.status));

  return `# Daily Trading Thesis Report

**${report.dataWarning}**

생성 시각: ${report.generatedAt}

> 핵심 질문: 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

${MODE === "REAL_TEST" ? "가격/거래량은 실제 데이터 테스트입니다. 뉴스/옵션/ETF 구성종목 확산도는 아직 미연결이며 실전 매매 판단에 사용하면 안 됩니다." : "mock 데이터입니다. 개별 종목과 ETF 모두 실전 판단에 사용하면 안 됩니다."}

## 오늘의 결론

- 데이터 모드: ${report.dataMode}
- 시장 상태: ${report.market.label}
- ETF 후보 TOP 5: ${report.etfTop5.map((etf) => `${etf.ticker}(${etf.todayChoice})`).join(", ") || "데이터 없음"}
- 개별 종목보다 ETF가 더 나은 테마: ${report.strongEtfGroups.slice(0, 3).map((group) => group.category).join(", ")}
- ETF 과열 주의 후보: ${report.etfOverheat.map((etf) => etf.ticker).join(", ") || "해당 없음"}
- 시장 기준 ETF 상태: ${report.marketEtfs.map((etf) => `${etf.ticker} ${etf.todayChoice}`).join(" / ")}
- 진입 후보: ${entryRows.map((row) => row.ticker).join(", ") || "해당 없음"}
- 보유 유지: ${holdRows.map((row) => row.ticker).join(", ") || "해당 없음"}
- 청산/주의: ${cautionRows.map((row) => row.ticker).join(", ") || "해당 없음"}

## 오늘의 시장 상태

**${report.market.label}**

${report.market.summary}

뉴스/옵션/구성종목 확산도: 아직 미연결, 판단 보조에서 제외

## 오늘 돈이 몰리는 테마

${mdList(report.themes.slice(0, 4).map((theme) => `**${theme.theme}**: ${theme.tickers.join(", ")} | 평균 점수 ${theme.avgScore.toFixed(0)}점 (${MODE === "REAL_TEST" ? "real-test" : "mock"})`))}

## ETF 카드

${report.etfTop5.map(renderEtfCardMarkdown).join("\n\n") || "데이터 없음"}

## ETF 과열 주의 후보

${report.etfOverheat.map((etf) => `### [${etf.ticker}] ${etf.name}\n- 상태: ${etf.todayChoice}\n- 이유: ${etf.oneLineReason}\n- 체크: ${etf.riskNotes}`).join("\n\n") || "해당 없음"}

## ETF 대안 검토

**${report.dataWarning}**

${report.strongEtfGroups.map(renderEtfGroupMarkdown).join("\n\n")}

### 나머지 테마 요약

${mdList(report.summaryEtfGroups.map((group) => `${group.category}: ${group.rows.slice(0, 3).map((etf) => etf.ticker).join(", ")} | 최우선 상태 ${group.rows[0].todayChoice}`))}

## 테마형 ETF Watch

${mdList(report.themeWatch.map((etf) => `**${etf.ticker}** ${etf.category} | ${etf.todayChoice} | ${etf.oneLineReason}`))}

## 진입 후보

${mdList(entryRows.map((row) => `**${row.ticker} ${row.name}** | ${row.status} | 관련 ETF ${row.relatedEtfs.map((etf) => etf.ticker).join(", ")} | ${marketLine(row.market)}`))}

## 보유 유지 후보

${mdList(holdRows.map((row) => `**${row.ticker} ${row.name}** | 평가 수익률 ${pct(investmentReturn(row))} (mock) | 관련 ETF ${row.relatedEtfs.map((etf) => etf.ticker).join(", ")} | ${marketLine(row.market)}`))}

## 청산/주의 후보

${mdList(cautionRows.map((row) => `**${row.ticker} ${row.name}** | ${row.status} | ${marketLine(row.market)}`))}

## 종목별 상승 근거

${report.stocks.map(renderStockCardMarkdown).join("\n\n")}

## 감시 ETF 목록

| 티커 | 카테고리 | 상태 | 오늘 선택 | 한 줄 이유 |
| --- | --- | --- | --- | --- |
${report.watchEtfs.map((etf) => `| ${etf.ticker} | ${etf.category} | ${etf.market.dataStatus === "ok" ? `${etf.score}점` : "데이터 없음"} | ${etf.todayChoice} | ${etf.oneLineReason} |`).join("\n")}

## 진입 조건

${mdList(entryRows.map((row) => `**${row.ticker}**: ${MODE === "REAL_TEST" ? "20일 수익률 양수, 5일 모멘텀 우위, 상대 거래량 1.0 이상" : row.entryConditions.join(" / ")}`))}

## 무효화 조건

${mdList(report.stocks.map((row) => `**${row.ticker}**: ${MODE === "REAL_TEST" ? "20일 수익률 음전 또는 상대 거래량 0.8 이하" : (row.invalidationConditions || row.fullExitCandidateConditions).join(" / ")}`))}

## 내일 확인할 것

- TOP 5 ETF가 VWAP 위에서 유지되는지 확인
- ETF와 개별 종목 중 상대강도가 더 좋은 쪽을 우선 검토
- 과열 ETF는 추격하지 않고 눌림 또는 다음 세션 확인
- REAL_TEST에서는 뉴스/옵션/스프레드/구성종목 데이터 연결 전까지 실전 판단 금지
`;
}

function renderEtfGroupMarkdown(group) {
  const rows = group.rows.slice(0, 3);
  return `### [${group.category}]
- 후보 ETF: ${rows.map((etf) => etf.ticker).join(", ")}
- 비교 개별 종목: ${[...new Set(rows.flatMap((etf) => etf.compareStocks))].slice(0, 6).join(", ")}
- ETF가 유리한 경우: ${rows[0].useCase}
- 개별 종목이 유리한 경우: 특정 기업 촉매가 ETF보다 선명할 때
- 오늘의 판단: ${rows[0].todayChoice}`;
}

function renderEtfCardMarkdown(etf) {
  return `### [ETF ${etf.ticker}] ${etf.name}
- 카테고리: ${etf.category}
- 상태: ${etf.todayChoice}
- 총점: ${etf.market.dataStatus === "ok" || MODE === "MOCK" ? `${etf.score}점` : "데이터 없음"} (${MODE === "REAL_TEST" ? "real-test" : "mock"})
- ${marketLine(etf.market)}
- 점수: 20일 추세 ${etf.scoreBreakdown.trend20d ?? etf.scoreBreakdown.themeStrength}, 5일 모멘텀 ${etf.scoreBreakdown.momentum5d ?? etf.scoreBreakdown.flow}, 수급 ${etf.scoreBreakdown.relativeVolume ?? "mock"}, 고점 근접 ${etf.scoreBreakdown.highProximity ?? "mock"}, 과열 ${etf.scoreBreakdown.overheatingRiskDeduction}, 약세 ${etf.scoreBreakdown.weakTrendDeduction ?? etf.scoreBreakdown.liquidityRiskDeduction}
- ETF가 유리한 이유: ${etf.useCase}
- 개별 종목이 유리한 경우: 특정 기업의 실적, 가이던스, 뉴스 촉매가 ETF보다 선명할 때
- 진입 조건: ${etf.entryConditions.join(" / ")}
- 무효화 조건: ${etf.invalidationConditions.join(" / ")}
- 과열 리스크: ${etf.riskNotes}
- 뉴스/옵션/구성종목 확산도: 아직 미연결, 판단 보조에서 제외
- 데이터 신뢰도: ${etf.dataReliability}`;
}

function renderStockCardMarkdown(row) {
  const isHolding = Boolean(row.entryPrice);
  const buyers = row.buyers?.length ? row.buyers : ["실제 가격/거래량 기준 추세 추종 자금", "관련 ETF 강세를 확인하는 단기 수급"];
  const buyerReasons = row.buyerReasons?.length ? row.buyerReasons : ["20일 수익률과 5일 모멘텀이 유지되면 후속 매수가 붙을 수 있기 때문", "관련 ETF가 강하면 개별 종목에도 상대강도 매수가 들어올 수 있기 때문"];
  const bullishEvidence = row.bullishEvidence?.length ? row.bullishEvidence : ["20일 수익률 양수 여부", "5일 모멘텀 유지 여부", "상대 거래량 개선 여부"];
  const entryConditions = MODE === "REAL_TEST" ? ["20일 수익률 양수 유지", "5일 수익률이 20일 흐름보다 강함", "상대 거래량 1.0 이상 회복"] : row.entryConditions;
  const invalidationConditions = MODE === "REAL_TEST" ? ["20일 수익률 음전", "상대 거래량 0.8 이하 둔화", "52주 고점 대비 -20% 이하 약세"] : (row.invalidationConditions || row.fullExitCandidateConditions || []);
  const action = Array.isArray(row.todayAction) ? row.todayAction.join(" / ") : row.todayAction || "관찰 유지";
  return `### [${row.ticker}] ${row.name}
- 상태값: ${row.status}
- ${marketLine(row.market)}
${isHolding ? `- 진입가/수익률: ${money(row.entryPrice, "mock")} / ${pct(investmentReturn(row))} (mock)` : ""}
- 관련 ETF: ${row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "해당 없음"}
- 더 비싸게 사줄 주체: ${buyers.join(" / ")}
- 그들이 더 비싸게 살 이유: ${buyerReasons.join(" / ")}
- 상승 근거: ${bullishEvidence.join(" / ")}
- 진입 조건: ${entryConditions.join(" / ")}
- 무효화 조건: ${invalidationConditions.join(" / ")}
- ETF 대비 개별 종목이 나은 이유: 직접 촉매가 ETF보다 강하게 반영될 수 있음
- 개별 종목보다 ETF가 나은 경우: ${row.relatedEtfs[0]?.useCase || "테마 전체를 분산해서 확인하고 싶을 때"}
- 오늘 선택: ${row.relatedEtfs[0] ? `${row.relatedEtfs[0].ticker} ${row.relatedEtfs[0].todayChoice} 또는 ${row.ticker} 관찰` : `${row.ticker} 관찰`}
- 오늘 행동: ${action}
- 뉴스/옵션/구성종목 확산도: 아직 미연결, 판단 보조에서 제외
- 데이터 신뢰도: ${row.dataReliability}`;
}

function renderHtml(report) {
  const entryRows = MODE === "REAL_TEST" ? report.entryTop3 : report.watchlist.filter((row) => ["진입 가능", "진입 후보"].includes(row.status)).slice(0, 3);
  const holdRows = report.holdings.filter((row) => row.status === "보유 유지");
  const cautionRows = report.stocks.filter((row) => ["관찰", "청산 후보", "매매 금지", "데이터 없음"].includes(row.status));

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daily Trading Thesis Report</title>
  <style>
    body { margin: 0; background: #f6f7f8; color: #172026; font-family: Arial, "Noto Sans KR", sans-serif; line-height: 1.55; }
    main { width: min(1120px, calc(100% - 24px)); margin: 0 auto; padding: 14px 0 36px; }
    .banner { border: 2px solid #f59e0b; background: #fff3cd; color: #7a3f00; border-radius: 8px; padding: 12px 14px; font-weight: 800; font-size: 18px; margin-bottom: 12px; }
    section, article, .hero { background: #fff; border: 1px solid #d9dee3; border-radius: 8px; margin: 10px 0; padding: 14px; }
    h1 { margin: 0 0 6px; font-size: 25px; } h2 { margin: 0 0 10px; font-size: 20px; } h3 { margin: 0 0 8px; font-size: 18px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .tile { border: 1px solid #d9dee3; border-radius: 8px; padding: 9px; background: #fbfcfd; }
    .tile strong { display: block; color: #5d6670; font-size: 12px; margin-bottom: 4px; }
    .badge { display: inline-flex; border-radius: 999px; color: #fff; padding: 4px 8px; font-size: 12px; font-weight: 800; }
    .pick-etf, .ready { background: #0f766e; } .pick-stock, .candidate { background: #2563eb; } .watch, .hold { background: #4f46e5; } .hot, .exit { background: #c2410c; } .ban { background: #991b1b; }
    .warn { color: #9a3412; font-weight: 700; } .muted { color: #5d6670; font-size: 14px; }
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
      <p class="muted">생성 시각: ${escapeHtml(report.generatedAt)}</p>
      <p><strong>핵심 질문:</strong> 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?</p>
      <p class="warn">${MODE === "REAL_TEST" ? "가격/거래량은 실제 데이터 테스트입니다. 뉴스/옵션/스프레드는 아직 미연결입니다." : "mock 데이터입니다. 개별 종목과 ETF 모두 실전 판단에 사용 금지."}</p>
    </div>
    ${renderConclusionHtml(report)}
    <section><h2>오늘의 시장 상태</h2><p><strong>${escapeHtml(report.market.label)}</strong></p><p>${escapeHtml(report.market.summary)}</p><p class="muted">뉴스/옵션/구성종목 확산도: 아직 미연결, 판단 보조에서 제외</p></section>
    <section><h2>오늘 돈이 몰리는 테마</h2>${htmlList(report.themes.slice(0, 4).map((theme) => `${theme.theme}: ${theme.tickers.join(", ")} | 평균 점수 ${theme.avgScore.toFixed(0)}점`))}</section>
    <section><h2>ETF 카드</h2>${report.etfTop5.map(renderEtfCardHtml).join("") || "데이터 없음"}</section>
    <section><h2>종목별 상승 근거</h2>${report.stocks.map(renderStockCardHtml).join("")}</section>
    <section><h2>ETF 대안 검토</h2><p class="warn">${escapeHtml(report.dataWarning)}</p>${report.strongEtfGroups.map(renderEtfGroupHtml).join("")}<h3>나머지 테마 요약</h3>${htmlList(report.summaryEtfGroups.map((group) => `${group.category}: ${group.rows.slice(0, 3).map((etf) => etf.ticker).join(", ")} | ${group.rows[0].todayChoice}`))}</section>
    <section><h2>테마형 ETF Watch</h2>${htmlList(report.themeWatch.map((etf) => `${etf.ticker}: ${etf.category} | ${etf.todayChoice} | ${etf.oneLineReason}`))}</section>
    <section><h2>진입 후보</h2>${htmlList(entryRows.map((row) => `${row.ticker} ${row.name} | ${row.status} | ${marketLine(row.market)}`))}</section>
    <section><h2>보유 유지 후보</h2>${htmlList(holdRows.map((row) => `${row.ticker} ${row.name} | 평가 수익률 ${pct(investmentReturn(row))} (mock)`))}</section>
    <section><h2>청산/주의 후보</h2>${htmlList(cautionRows.map((row) => `${row.ticker} ${row.name} | ${row.status}`))}</section>
    <section><h2>감시 ETF 목록</h2>${renderWatchTable(report.watchEtfs)}</section>
    <section><h2>진입 조건</h2>${htmlList(entryRows.map((row) => `${row.ticker}: ${MODE === "REAL_TEST" ? "20일 수익률 양수, 5일 모멘텀 우위, 상대 거래량 1.0 이상" : row.entryConditions.join(" / ")}`))}</section>
    <section><h2>무효화 조건</h2>${htmlList(report.stocks.map((row) => `${row.ticker}: ${MODE === "REAL_TEST" ? "20일 수익률 음전 또는 상대 거래량 0.8 이하" : (row.invalidationConditions || row.fullExitCandidateConditions).join(" / ")}`))}</section>
    <section><h2>내일 확인할 것</h2>${htmlList(["TOP 5 ETF가 VWAP 위에서 유지되는지 확인", "ETF와 개별 종목 중 상대강도가 더 좋은 쪽 우선", "과열 ETF는 추격 금지", "REAL_TEST는 실전 판단 금지"])}</section>
  </main>
</body>
</html>`;
}

function badge(value) {
  return `<span class="badge ${STATUS_CLASS[value] || "watch"}">${escapeHtml(value)}</span>`;
}

function tile(label, value) {
  return `<div class="tile"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`;
}

function renderConclusionHtml(report) {
  return `<section><h2>오늘의 결론</h2><div class="grid">
    ${tile("데이터 모드", report.dataMode)}
    ${tile("시장 상태", report.market.label)}
    ${tile("ETF 후보 TOP 5", report.etfTop5.map((etf) => etf.ticker).join(", ") || "데이터 없음")}
    ${tile("ETF가 더 나은 테마", report.strongEtfGroups.slice(0, 3).map((group) => group.category).join(", "))}
    ${tile("ETF 과열 주의", report.etfOverheat.map((etf) => etf.ticker).join(", ") || "해당 없음")}
    ${tile("시장 기준 ETF", report.marketEtfs.map((etf) => `${etf.ticker} ${etf.todayChoice}`).join(" / "))}
  </div></section>`;
}

function renderEtfCardHtml(etf) {
  return `<article data-etf-card="${escapeHtml(etf.ticker)}"><h3>[ETF ${escapeHtml(etf.ticker)}] ${escapeHtml(etf.name)} ${badge(etf.todayChoice)}</h3>
    <div class="grid">${tile("카테고리", etf.category)}${tile("총점", etf.market.dataStatus === "ok" || MODE === "MOCK" ? `${etf.score}점` : "데이터 없음")}${tile("데이터 상태", etf.market.dataStatus)}</div>
    ${htmlList([marketLine(etf.market), `ETF가 유리한 이유: ${etf.useCase}`, "개별 종목이 유리한 경우: 특정 기업 촉매가 ETF보다 선명할 때", `진입 조건: ${etf.entryConditions.join(" / ")}`, `무효화 조건: ${etf.invalidationConditions.join(" / ")}`, `과열 리스크: ${etf.riskNotes}`, "뉴스/옵션/구성종목 확산도: 아직 미연결, 판단 보조에서 제외"])}</article>`;
}

function renderStockCardHtml(row) {
  const isHolding = Boolean(row.entryPrice);
  const buyers = row.buyers?.length ? row.buyers : ["실제 가격/거래량 기준 추세 추종 자금", "관련 ETF 강세를 확인하는 단기 수급"];
  const buyerReasons = row.buyerReasons?.length ? row.buyerReasons : ["20일 수익률과 5일 모멘텀이 유지되면 후속 매수가 붙을 수 있기 때문", "관련 ETF가 강하면 개별 종목에도 상대강도 매수가 들어올 수 있기 때문"];
  const bullishEvidence = row.bullishEvidence?.length ? row.bullishEvidence : ["20일 수익률 양수 여부", "5일 모멘텀 유지 여부", "상대 거래량 개선 여부"];
  const entryConditions = MODE === "REAL_TEST" ? ["20일 수익률 양수 유지", "5일 수익률이 20일 흐름보다 강함", "상대 거래량 1.0 이상 회복"] : row.entryConditions;
  const invalidationConditions = MODE === "REAL_TEST" ? ["20일 수익률 음전", "상대 거래량 0.8 이하 둔화", "52주 고점 대비 -20% 이하 약세"] : (row.invalidationConditions || row.fullExitCandidateConditions || []);
  const action = Array.isArray(row.todayAction) ? row.todayAction.join(" / ") : row.todayAction || "관찰 유지";
  return `<article data-stock-card="${escapeHtml(row.ticker)}"><h3>[${escapeHtml(row.ticker)}] ${escapeHtml(row.name)} ${badge(row.status)}</h3>
    <div class="grid">${tile("데이터 상태", row.market.dataStatus)}${tile("관련 ETF", row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "해당 없음")}${tile("오늘 선택", row.relatedEtfs[0] ? `${row.relatedEtfs[0].ticker} ${row.relatedEtfs[0].todayChoice} 또는 ${row.ticker} 관찰` : `${row.ticker} 관찰`)}</div>
    ${htmlList([marketLine(row.market), `${isHolding ? "진입가/수익률" : "당일 등락률"}: ${isHolding ? `${money(row.entryPrice, "mock")} / ${pct(investmentReturn(row))} (mock)` : pct(row.market.dailyChangePct ?? row.changePct)}`, `더 비싸게 사줄 주체: ${buyers.join(" / ")}`, `그들이 더 비싸게 살 이유: ${buyerReasons.join(" / ")}`, `상승 근거: ${bullishEvidence.join(" / ")}`, `진입 조건: ${entryConditions.join(" / ")}`, `무효화 조건: ${invalidationConditions.join(" / ")}`, "ETF 대비 개별 종목이 나은 이유: 직접 촉매가 ETF보다 강하게 반영될 수 있음", `개별 종목보다 ETF가 나은 경우: ${row.relatedEtfs[0]?.useCase || "테마 전체를 분산해서 확인하고 싶을 때"}`, `오늘 행동: ${action}`, "뉴스/옵션/구성종목 확산도: 아직 미연결, 판단 보조에서 제외"])}</article>`;
}

function renderEtfGroupHtml(group) {
  const rows = group.rows.slice(0, 3);
  return `<article><h3>[${escapeHtml(group.category)}]</h3>${htmlList([`후보 ETF: ${rows.map((etf) => etf.ticker).join(", ")}`, `비교 개별 종목: ${[...new Set(rows.flatMap((etf) => etf.compareStocks))].slice(0, 6).join(", ")}`, `ETF가 유리한 경우: ${rows[0].useCase}`, "개별 종목이 유리한 경우: 특정 기업 촉매가 ETF보다 선명할 때", `오늘의 판단: ${rows[0].todayChoice}`])}</article>`;
}

function renderWatchTable(etfs) {
  return `<table><thead><tr><th>티커</th><th>카테고리</th><th>상태</th><th>오늘 선택</th><th>한 줄 이유</th></tr></thead><tbody>${etfs.map((etf) => `<tr><td>${escapeHtml(etf.ticker)}</td><td>${escapeHtml(etf.category)}</td><td>${etf.market.dataStatus === "ok" || MODE === "MOCK" ? `${etf.score}점` : "데이터 없음"}</td><td>${badge(etf.todayChoice)}</td><td>${escapeHtml(etf.oneLineReason)}</td></tr>`).join("")}</tbody></table>`;
}

function main() {
  const report = buildReport();
  writeReport("latest.md", renderMarkdown(report));
  writeReport("latest.html", renderHtml(report));
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.md")}`);
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.html")}`);
}

main();
