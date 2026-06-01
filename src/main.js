const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");
const DATA_MODE = "MOCK";
const DATA_WARNING = "MOCK DATA - 실전 투자 판단 사용 금지";

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
  "관찰": "watch"
};

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), "utf8"));
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
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function money(value) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} (mock)`;
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

function scoreEtf(etf) {
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
  const oneLineReason = etf.priority === 1
    ? `${etf.category} 흐름을 개별 종목보다 넓게 확인`
    : etf.priority === 2
      ? `${etf.category} 보조 확인용`
      : "위험선호 확인용이라 추격 금지";

  return {
    ...etf,
    score,
    scoreBreakdown,
    todayChoice,
    oneLineReason,
    entryConditions: [
      `${etf.ticker}가 VWAP 위에서 유지`,
      "관련 구성 종목 2개 이상 동반 강세",
      "거래량과 스프레드가 mock 기준 정상"
    ],
    invalidationConditions: [
      "VWAP 이탈 후 회복 실패",
      "관련 개별 종목 동반 약세",
      "스프레드 확대 또는 거래량 둔화"
    ],
    uniqueEtfReasons: [
      etf.useCase,
      etf.riskNotes
    ],
    uniqueStockReasons: [
      "특정 기업의 실적, 가이던스, 뉴스 촉매가 ETF보다 선명할 때",
      "ETF보다 후발 개별 종목의 가격 위치가 더 좋을 때"
    ],
    liquiditySpreadCheck: etf.priority === 1 ? "필요" : "강하게 필요",
    dataReliability: "MOCK DATA"
  };
}

function groupThemes(stocks) {
  const map = new Map();
  for (const stock of stocks) {
    const row = map.get(stock.theme) || { theme: stock.theme, tickers: [], score: 0, count: 0 };
    row.tickers.push(stock.ticker);
    row.score += stock.score;
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

function buildReport() {
  const watchlist = readJson("watchlist.json");
  const holdings = readJson("holdings.json");
  const etfs = readJson("watchlist_etfs.json").map(scoreEtf);
  const stocks = [...watchlist, ...holdings];
  const etfTop5 = [...etfs].sort((a, b) => b.score - a.score).slice(0, 5);
  const etfOverheat = etfs.filter((etf) => etf.todayChoice === "ETF 과열 주의").sort((a, b) => b.score - a.score).slice(0, 3);
  const watchEtfs = etfs.filter((etf) => !etfTop5.some((top) => top.ticker === etf.ticker));
  const themeWatch = etfs.filter((etf) => ["DRAM", "SHLD", "GRID"].includes(etf.ticker));
  const etfGroups = groupEtfs(etfs);
  const strongEtfGroups = etfGroups.slice(0, 3);
  const summaryEtfGroups = etfGroups.slice(3);

  return {
    generatedAt: formatDate(new Date()),
    dataMode: DATA_MODE,
    dataWarning: DATA_WARNING,
    watchlist,
    holdings,
    stocks,
    themes: groupThemes(stocks),
    market: {
      label: "위험선호 우위",
      summary: "mock 기준 AI/반도체와 AI 소프트웨어가 우위입니다. ETF는 주도 테마가 넓게 확산되는지 확인하는 수단입니다."
    },
    etfs,
    etfTop5,
    etfOverheat,
    watchEtfs,
    themeWatch,
    strongEtfGroups,
    summaryEtfGroups,
    marketEtfs: etfs.filter((etf) => ["SPY", "QQQ", "IWM", "TLT", "GLD", "IBIT"].includes(etf.ticker))
  };
}

function renderMarkdown(report) {
  const entryRows = report.watchlist.filter((row) => ["진입 가능", "진입 후보"].includes(row.status));
  const holdRows = report.holdings.filter((row) => row.status === "보유 유지");
  const cautionRows = report.stocks.filter((row) => ["관찰", "청산 후보", "매매 금지"].includes(row.status));

  return `# Daily Trading Thesis Report

**${report.dataWarning}**

생성 시각: ${report.generatedAt}

> 핵심 질문: 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

mock 데이터입니다. 개별 종목과 ETF 모두 실전 판단에 사용하면 안 됩니다.

## 오늘의 결론

- 데이터 모드: ${report.dataMode}
- 시장 상태: ${report.market.label}
- ETF 후보 TOP 5: ${report.etfTop5.map((etf) => `${etf.ticker}(${etf.todayChoice})`).join(", ")}
- 개별 종목보다 ETF가 더 나은 테마: ${report.strongEtfGroups.slice(0, 3).map((group) => group.category).join(", ")}
- ETF 과열 주의 후보: ${report.etfOverheat.map((etf) => etf.ticker).join(", ") || "해당 없음"}
- 시장 기준 ETF 상태: ${report.marketEtfs.map((etf) => `${etf.ticker} ${etf.todayChoice}`).join(" / ")}
- 진입 후보: ${entryRows.map((row) => row.ticker).join(", ") || "해당 없음"}
- 보유 유지: ${holdRows.map((row) => row.ticker).join(", ") || "해당 없음"}
- 청산/주의: ${cautionRows.map((row) => row.ticker).join(", ") || "해당 없음"}

## 오늘의 시장 상태

**${report.market.label}**

${report.market.summary}

## 오늘 돈이 몰리는 테마

${mdList(report.themes.slice(0, 4).map((theme) => `**${theme.theme}**: ${theme.tickers.join(", ")} | 평균 점수 ${theme.avgScore.toFixed(0)}점 (mock)`))}

## ETF 카드

${report.etfTop5.map(renderEtfCardMarkdown).join("\n\n")}

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

${mdList(entryRows.map((row) => `**${row.ticker} ${row.name}** | ${row.status} | 관련 ETF ${relatedEtfsForStock(row, report.etfs).map((etf) => etf.ticker).join(", ")}`))}

## 보유 유지 후보

${mdList(holdRows.map((row) => `**${row.ticker} ${row.name}** | 평가 수익률 ${pct(investmentReturn(row))} (mock) | 관련 ETF ${relatedEtfsForStock(row, report.etfs).map((etf) => etf.ticker).join(", ")}`))}

## 청산/주의 후보

${mdList(cautionRows.map((row) => `**${row.ticker} ${row.name}** | ${row.status} | ${row.todayAction.join(" / ")}`))}

## 종목별 상승 근거

${report.stocks.map((row) => renderStockCardMarkdown(row, report.etfs)).join("\n\n")}

## 감시 ETF 목록

| 티커 | 카테고리 | 상태 | 오늘 선택 | 한 줄 이유 |
| --- | --- | --- | --- | --- |
${report.watchEtfs.map((etf) => `| ${etf.ticker} | ${etf.category} | ${etf.score}점 (mock) | ${etf.todayChoice} | ${etf.oneLineReason} |`).join("\n")}

## 진입 조건

${mdList(entryRows.map((row) => `**${row.ticker}**: ${row.entryConditions.join(" / ")}`))}

## 무효화 조건

${mdList(report.stocks.map((row) => `**${row.ticker}**: ${(row.invalidationConditions || row.fullExitCandidateConditions).join(" / ")}`))}

## 내일 확인할 것

- TOP 5 ETF가 VWAP 위에서 유지되는지 확인
- ETF와 개별 종목 중 상대강도가 더 좋은 쪽을 우선 검토
- 과열 ETF는 추격하지 않고 눌림 또는 다음 세션 확인
- 실제 데이터 연결 전까지 실전 판단 금지
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
- 총점: ${etf.score}점 (mock)
- 점수: 테마 ${etf.scoreBreakdown.themeStrength}/25, 수급 ${etf.scoreBreakdown.flow}/25, 위치 ${etf.scoreBreakdown.priceLocation}/20, 확산 ${etf.scoreBreakdown.breadth}/15, 효율 ${etf.scoreBreakdown.efficiencyVsStock}/10, 과열 ${etf.scoreBreakdown.overheatingRiskDeduction}, 유동성 ${etf.scoreBreakdown.liquidityRiskDeduction}
- ETF가 유리한 이유: ${etf.uniqueEtfReasons[0]}
- 개별 종목이 유리한 경우: ${etf.uniqueStockReasons[0]}
- 진입 조건: ${etf.entryConditions.join(" / ")}
- 무효화 조건: ${etf.invalidationConditions.join(" / ")}
- 과열 리스크: ${etf.riskNotes}
- 유동성/스프레드 체크: ${etf.liquiditySpreadCheck}`;
}

function renderStockCardMarkdown(row, etfs) {
  const related = relatedEtfsForStock(row, etfs);
  const isHolding = Boolean(row.entryPrice);
  return `### [${row.ticker}] ${row.name}
- 상태값: ${row.status}
- 현재가: ${money(row.currentPrice)}
${isHolding ? `- 진입가/수익률: ${money(row.entryPrice)} / ${pct(investmentReturn(row))} (mock)` : `- 당일 등락률: ${pct(row.changePct)} (mock)`}
- 관련 ETF: ${related.map((etf) => etf.ticker).join(", ") || "해당 없음"}
- ETF 대비 개별 종목이 나은 이유: 직접 촉매가 ETF보다 강하게 반영될 수 있음
- 개별 종목보다 ETF가 나은 경우: ${related[0]?.useCase || "테마 전체를 분산해서 확인하고 싶을 때"}
- 오늘 선택: ${related[0] ? `${related[0].ticker} ${related[0].todayChoice} 또는 ${row.ticker} 관찰` : `${row.ticker} 관찰`}
- 상승 근거: ${(row.bullishEvidence || row.holdEvidence || []).slice(0, 2).join(" / ")}
- 무효화 조건: ${(row.invalidationConditions || row.fullExitCandidateConditions).slice(0, 3).join(" / ")}`;
}

function renderHtml(report) {
  const entryRows = report.watchlist.filter((row) => ["진입 가능", "진입 후보"].includes(row.status));
  const holdRows = report.holdings.filter((row) => row.status === "보유 유지");
  const cautionRows = report.stocks.filter((row) => ["관찰", "청산 후보", "매매 금지"].includes(row.status));

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
      <p class="warn">mock 데이터입니다. 개별 종목과 ETF 모두 실전 판단에 사용 금지.</p>
    </div>
    ${renderConclusionHtml(report)}
    <section><h2>오늘의 시장 상태</h2><p><strong>${escapeHtml(report.market.label)}</strong></p><p>${escapeHtml(report.market.summary)}</p></section>
    <section><h2>오늘 돈이 몰리는 테마</h2>${htmlList(report.themes.slice(0, 4).map((theme) => `${theme.theme}: ${theme.tickers.join(", ")} | 평균 점수 ${theme.avgScore.toFixed(0)}점 (mock)`))}</section>
    <section><h2>ETF 카드</h2>${report.etfTop5.map(renderEtfCardHtml).join("")}</section>
    <section><h2>종목별 상승 근거</h2>${report.stocks.map((row) => renderStockCardHtml(row, report.etfs)).join("")}</section>
    <section><h2>ETF 대안 검토</h2><p class="warn">${escapeHtml(report.dataWarning)}</p>${report.strongEtfGroups.map(renderEtfGroupHtml).join("")}<h3>나머지 테마 요약</h3>${htmlList(report.summaryEtfGroups.map((group) => `${group.category}: ${group.rows.slice(0, 3).map((etf) => etf.ticker).join(", ")} | ${group.rows[0].todayChoice}`))}</section>
    <section><h2>테마형 ETF Watch</h2>${htmlList(report.themeWatch.map((etf) => `${etf.ticker}: ${etf.category} | ${etf.todayChoice} | ${etf.oneLineReason}`))}</section>
    <section><h2>진입 후보</h2>${htmlList(entryRows.map((row) => `${row.ticker} ${row.name} | ${row.status} | 관련 ETF ${relatedEtfsForStock(row, report.etfs).map((etf) => etf.ticker).join(", ")}`))}</section>
    <section><h2>보유 유지 후보</h2>${htmlList(holdRows.map((row) => `${row.ticker} ${row.name} | 평가 수익률 ${pct(investmentReturn(row))} (mock)`))}</section>
    <section><h2>청산/주의 후보</h2>${htmlList(cautionRows.map((row) => `${row.ticker} ${row.name} | ${row.status}`))}</section>
    <section><h2>감시 ETF 목록</h2>${renderWatchTable(report.watchEtfs)}</section>
    <section><h2>진입 조건</h2>${htmlList(entryRows.map((row) => `${row.ticker}: ${row.entryConditions.join(" / ")}`))}</section>
    <section><h2>무효화 조건</h2>${htmlList(report.stocks.map((row) => `${row.ticker}: ${(row.invalidationConditions || row.fullExitCandidateConditions).join(" / ")}`))}</section>
    <section><h2>내일 확인할 것</h2>${htmlList(["TOP 5 ETF가 VWAP 위에서 유지되는지 확인", "ETF와 개별 종목 중 상대강도가 더 좋은 쪽 우선", "과열 ETF는 추격 금지", "실제 데이터 연결 전까지 실전 판단 금지"])}</section>
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
    ${tile("ETF 후보 TOP 5", report.etfTop5.map((etf) => etf.ticker).join(", "))}
    ${tile("ETF가 더 나은 테마", report.strongEtfGroups.slice(0, 3).map((group) => group.category).join(", "))}
    ${tile("ETF 과열 주의", report.etfOverheat.map((etf) => etf.ticker).join(", ") || "해당 없음")}
    ${tile("시장 기준 ETF", report.marketEtfs.map((etf) => `${etf.ticker} ${etf.todayChoice}`).join(" / "))}
  </div></section>`;
}

function renderEtfCardHtml(etf) {
  return `<article data-etf-card="${escapeHtml(etf.ticker)}"><h3>[ETF ${escapeHtml(etf.ticker)}] ${escapeHtml(etf.name)} ${badge(etf.todayChoice)}</h3>
    <div class="grid">${tile("카테고리", etf.category)}${tile("총점", `${etf.score}점 (mock)`)}${tile("유동성/스프레드", etf.liquiditySpreadCheck)}</div>
    ${htmlList([`ETF가 유리한 이유: ${etf.uniqueEtfReasons[0]}`, `개별 종목이 유리한 경우: ${etf.uniqueStockReasons[0]}`, `진입 조건: ${etf.entryConditions.join(" / ")}`, `무효화 조건: ${etf.invalidationConditions.join(" / ")}`, `과열 리스크: ${etf.riskNotes}`])}</article>`;
}

function renderStockCardHtml(row, etfs) {
  const related = relatedEtfsForStock(row, etfs);
  const isHolding = Boolean(row.entryPrice);
  return `<article data-stock-card="${escapeHtml(row.ticker)}"><h3>[${escapeHtml(row.ticker)}] ${escapeHtml(row.name)} ${badge(row.status)}</h3>
    <div class="grid">${tile("현재가", money(row.currentPrice))}${tile("관련 ETF", related.map((etf) => etf.ticker).join(", ") || "해당 없음")}${tile("오늘 선택", related[0] ? `${related[0].ticker} ${related[0].todayChoice} 또는 ${row.ticker} 관찰` : `${row.ticker} 관찰`)}</div>
    ${htmlList([`${isHolding ? "진입가/수익률" : "당일 등락률"}: ${isHolding ? `${money(row.entryPrice)} / ${pct(investmentReturn(row))} (mock)` : `${pct(row.changePct)} (mock)`}`, "ETF 대비 개별 종목이 나은 이유: 직접 촉매가 ETF보다 강하게 반영될 수 있음", `개별 종목보다 ETF가 나은 경우: ${related[0]?.useCase || "테마 전체를 분산해서 확인하고 싶을 때"}`, `무효화 조건: ${(row.invalidationConditions || row.fullExitCandidateConditions).slice(0, 3).join(" / ")}`])}</article>`;
}

function renderEtfGroupHtml(group) {
  const rows = group.rows.slice(0, 3);
  return `<article><h3>[${escapeHtml(group.category)}]</h3>${htmlList([`후보 ETF: ${rows.map((etf) => etf.ticker).join(", ")}`, `비교 개별 종목: ${[...new Set(rows.flatMap((etf) => etf.compareStocks))].slice(0, 6).join(", ")}`, `ETF가 유리한 경우: ${rows[0].useCase}`, "개별 종목이 유리한 경우: 특정 기업 촉매가 ETF보다 선명할 때", `오늘의 판단: ${rows[0].todayChoice}`])}</article>`;
}

function renderWatchTable(etfs) {
  return `<table><thead><tr><th>티커</th><th>카테고리</th><th>상태</th><th>오늘 선택</th><th>한 줄 이유</th></tr></thead><tbody>${etfs.map((etf) => `<tr><td>${escapeHtml(etf.ticker)}</td><td>${escapeHtml(etf.category)}</td><td>${etf.score}점</td><td>${badge(etf.todayChoice)}</td><td>${escapeHtml(etf.oneLineReason)}</td></tr>`).join("")}</tbody></table>`;
}

function main() {
  const report = buildReport();
  writeReport("latest.md", renderMarkdown(report));
  writeReport("latest.html", renderHtml(report));
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.md")}`);
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.html")}`);
}

main();
