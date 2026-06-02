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
    const emptyBreakdown = {
      totalScore: 0,
      trendScore: 0,
      shortMomentumScore: 0,
      mediumMomentumScore: 0,
      volumeScore: 0,
      highProximityScore: 0,
      movingAverageScore: 0,
      relativeStrengthScore: assetType === "STOCK" ? 0 : undefined,
      riskPenalty: 0,
      dataConfidencePenalty: 0,
      reasons: ["가격/거래량 데이터 없음"]
    };
    return {
      moneyFlowScore: 0,
      moneyFlowScoreBreakdown: emptyBreakdown,
      moneyFlowScoreReasons: emptyBreakdown.reasons,
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
  const closes = (item.history || []).map((row) => row.close).filter((value) => Number.isFinite(value));
  const lastClose = closes.at(-1) ?? item.lastClose;
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  const ma50 = average(closes.slice(-50));
  const aboveMa5 = Number.isFinite(lastClose) && Number.isFinite(ma5) && lastClose >= ma5;
  const aboveMa20 = Number.isFinite(lastClose) && Number.isFinite(ma20) && lastClose >= ma20;
  const aboveMa50 = Number.isFinite(lastClose) && Number.isFinite(ma50) && lastClose >= ma50;

  const trendScore = clamp(r5 * 1.0, -6, 12) + clamp(r20 * 0.45, -4, 12) + (trendAcceleration ? 6 : 0);
  const shortMomentumScore = clamp(daily * 1.2, -6, 8) + clamp(r5 * 0.8, -6, 12);
  const mediumMomentumScore = clamp(r20 * 0.65, -8, 16);
  const volumeScore = relVol >= 1.5 ? 18 : relVol >= 1.2 ? 14 : relVol >= 1 ? 10 : -8;
  const highProximityScore = highProximity ? 12 : drawdown > -12 ? 6 : 0;
  const movingAverageScore = (aboveMa5 ? 4 : 0) + (aboveMa20 ? 6 : -6) + (aboveMa50 ? 4 : 0);
  const relativeStrengthScore = assetType === "STOCK" ? clamp(relatedEtfStrength / 12, 0, 8) : undefined;
  const riskPenalty = (overheatingFlag ? 10 : 0) + (blowoffFlag ? 6 : 0) + (daily >= 6 ? 4 : 0) + (r5 >= 18 ? 4 : 0);
  const dataConfidencePenalty = 0;
  const reasons = [];
  if (r20 > 8) reasons.push("20일 수익률 강함");
  if (r5 > 5) reasons.push("5일 수익률 강함");
  if (daily > 2) reasons.push("1일 단기 모멘텀 확인");
  if (relVol >= 1.2) reasons.push("상대 거래량 증가");
  if (highProximity) reasons.push("52주 고점 근처");
  if (aboveMa5 && aboveMa20) reasons.push("이동평균 위 추세 유지");
  if (assetType === "STOCK" && relatedEtfStrength > 0) reasons.push("관련 ETF 강세 테마 안의 개별 종목");
  if (riskPenalty > 0) reasons.push("단기 과열/추격 위험 존재");
  reasons.push("뉴스/옵션/스프레드/ETF 구성종목 확산도 데이터 미연결");

  let score = trendScore + shortMomentumScore + mediumMomentumScore + volumeScore + highProximityScore + movingAverageScore;
  if (assetType === "STOCK") score += relativeStrengthScore;
  score -= riskPenalty;
  score -= dataConfidencePenalty;
  score = Math.round(clamp(score, 0, 100));
  const breakdown = {
    totalScore: score,
    trendScore: Math.round(trendScore),
    shortMomentumScore: Math.round(shortMomentumScore),
    mediumMomentumScore: Math.round(mediumMomentumScore),
    volumeScore: Math.round(volumeScore),
    highProximityScore: Math.round(highProximityScore),
    movingAverageScore: Math.round(movingAverageScore),
    relativeStrengthScore: assetType === "STOCK" ? Math.round(relativeStrengthScore) : undefined,
    riskPenalty,
    dataConfidencePenalty,
    reasons
  };

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
    moneyFlowScoreBreakdown: breakdown,
    moneyFlowScoreReasons: reasons,
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
    assetType: "ETF",
    categoryType,
    etfCategory: categoryType,
    etfRole: etfRole(etf.ticker, categoryType),
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
  const relativeStrength = relativeStrengthVsEtf(market, relatedEtfs);
  const stockVsEtfDecision = stockVsEtfDecisionFor(scored, relativeStrength, relatedEtfs);
  const adjustedStatus =
    stockVsEtfDecision === "DO_NOT_TRADE"
      ? STATUS.BAN
      : stockVsEtfDecision === "ETF_PREFERRED" && scored.status === STATUS.ENTRY_READY
        ? STATUS.ENTRY_CANDIDATE
        : scored.status;
  const status = isHolding && adjustedStatus !== STATUS.BAN ? STATUS.HOLD : adjustedStatus;
  return {
    ...stock,
    assetType: "STOCK",
    ...STOCK_META[stock.ticker],
    market,
    relatedEtfs,
    relativeStrengthVsEtf: relativeStrength.summary,
    whyStockOverEtf: whyStockOverEtf(stock.ticker, relativeStrength, stockVsEtfDecision),
    whenEtfIsBetter: whenEtfIsBetter(stock.ticker, relativeStrength),
    stockVsEtfDecision,
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

function etfRole(ticker, category) {
  if (["QQQ", "SPY", "IWM"].includes(ticker)) return "시장 기준 확인용";
  if (category.includes("방산")) return "방어 섹터 확인용";
  if (category.includes("비트코인")) return "위험선호 지표";
  if (category.includes("채권") || category.includes("금")) return "리스크 헤지 확인용";
  return "테마 베타 매수";
}

function relativeStrengthVsEtf(stockMarket, relatedEtfs) {
  if (!relatedEtfs.length) {
    return {
      decisionScore: 0,
      avg5d: null,
      avg20d: null,
      avgRelativeVolume: null,
      summary: "관련 ETF 데이터 부족"
    };
  }
  if (!stockMarket || stockMarket.dataStatus !== "ok") {
    return {
      decisionScore: 0,
      avg5d: null,
      avg20d: null,
      avgRelativeVolume: null,
      summary: "개별 종목 가격/거래량 데이터 부족"
    };
  }
  const okEtfs = relatedEtfs.filter((etf) => etf.market?.dataStatus === "ok");
  if (!okEtfs.length) {
    return {
      decisionScore: 0,
      avg5d: null,
      avg20d: null,
      avgRelativeVolume: null,
      summary: "관련 ETF 가격/거래량 데이터 부족"
    };
  }
  const avg5d = average(okEtfs.map((etf) => etf.market.return5dPct ?? 0));
  const avg20d = average(okEtfs.map((etf) => etf.market.return20dPct ?? 0));
  const avgRelativeVolume = average(okEtfs.map((etf) => etf.market.relativeVolume ?? 0));
  const fiveDayGap = (stockMarket.return5dPct ?? 0) - avg5d;
  const twentyDayGap = (stockMarket.return20dPct ?? 0) - avg20d;
  const volumeGap = (stockMarket.relativeVolume ?? 0) - avgRelativeVolume;
  const decisionScore = fiveDayGap + twentyDayGap * 0.6 + volumeGap * 4;
  const direction = decisionScore >= 6 ? "관련 ETF보다 강함" : decisionScore <= -4 ? "관련 ETF보다 약함" : "관련 ETF와 비슷함";
  return {
    decisionScore,
    avg5d,
    avg20d,
    avgRelativeVolume,
    summary: `${direction} | 주식 5일 ${pct(stockMarket.return5dPct)} vs ETF 평균 ${pct(avg5d)}, 주식 20일 ${pct(stockMarket.return20dPct)} vs ETF 평균 ${pct(avg20d)}, 상대 거래량 ${num(stockMarket.relativeVolume, 2)}배 vs ETF 평균 ${num(avgRelativeVolume, 2)}배`
  };
}

function stockVsEtfDecisionFor(scored, relativeStrength, relatedEtfs) {
  if (!relatedEtfs.length || relativeStrength.summary.includes("데이터 부족")) return "WATCH_ONLY";
  if (scored.moneyFlowScore < 35) return "DO_NOT_TRADE";
  if (relativeStrength.decisionScore >= 6 && scored.moneyFlowScore >= 58) return "STOCK_PREFERRED";
  if (relativeStrength.decisionScore <= -4) return "ETF_PREFERRED";
  return "WATCH_ONLY";
}

function whyStockOverEtf(ticker, relativeStrength, decision) {
  if (decision === "STOCK_PREFERRED") return `${ticker}가 관련 ETF 평균보다 5일/20일 흐름 또는 거래량에서 더 강해 개별 종목 알파 후보로 본다.`;
  if (decision === "ETF_PREFERRED") return `${ticker}보다 관련 ETF 쪽 흐름이 더 선명해 오늘은 ETF 우선으로 본다.`;
  if (decision === "DO_NOT_TRADE") return `${ticker}의 가격/거래량 흐름이 약해 개별 종목 우선 근거가 부족하다.`;
  return `${relativeStrength.summary}. 개별 종목 우선으로 격상하려면 관련 ETF 대비 상대강도 유지가 더 필요하다.`;
}

function whenEtfIsBetter(ticker, relativeStrength) {
  if (relativeStrength.summary.includes("데이터 부족")) return "관련 ETF 데이터가 부족하면 개별 종목보다 ETF 또는 관찰을 우선한다.";
  return `${ticker}가 관련 ETF 평균보다 약하거나 거래량이 둔화되면 개별 종목 대신 관련 ETF를 우선한다.`;
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
    ...etfs,
    ...stocks.filter((row) => !row.holdingInfo)
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
  const stockTop5 = [...stocks].sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const etfActionCandidates = validEtfs.filter((row) => [STATUS.ENTRY_CANDIDATE, STATUS.ENTRY_READY].includes(row.status)).sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const stockActionCandidates = watchlist.filter((row) => [STATUS.ENTRY_CANDIDATE, STATUS.ENTRY_READY].includes(row.status)).sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const entryCandidates = stockActionCandidates;
  const cautionRows = stocks.filter((row) => [STATUS.EXIT, STATUS.BAN].includes(row.status));
  const etfOverheat = validEtfs.filter((row) => ["높음", "중간", "낮음~중간"].includes(row.overheatingRisk)).sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const stockCautionRows = watchlist.filter((row) => [STATUS.WATCH, STATUS.BAN].includes(row.status) || row.stockVsEtfDecision !== "STOCK_PREFERRED").sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const etfBanRows = validEtfs.filter((row) => row.status === STATUS.BAN || row.moneyFlowScore < 50).sort((a, b) => a.moneyFlowScore - b.moneyFlowScore).slice(0, 5);
  const overheat = etfOverheat;
  const actionCandidates = chooseActionCandidates(stocks, etfs);
  const topExecutionCandidate = chooseTopExecutionCandidate(etfActionCandidates, stockActionCandidates);
  const chartTickers = unique([
    ...actionCandidates.map((row) => row.ticker),
    ...etfTop5.map((row) => row.ticker),
    ...stockTop5.slice(0, 5).map((row) => row.ticker)
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
    stockTop5,
    etfActionCandidates,
    stockActionCandidates,
    entryCandidates,
    holdRows: holdings,
    cautionRows,
    stockCautionRows,
    etfBanRows,
    etfOverheat,
    overheat,
    actionCandidates,
    topExecutionCandidate,
    chartCount
  };
}

function chooseTopExecutionCandidate(etfCandidates, stockCandidates) {
  const bestEtf = etfCandidates[0];
  const bestStock = stockCandidates.find((row) => row.stockVsEtfDecision === "STOCK_PREFERRED") || stockCandidates[0];
  if (!bestEtf && !bestStock) return null;
  if (bestEtf && (!bestStock || bestEtf.moneyFlowScore >= bestStock.moneyFlowScore)) {
    return {
      ...bestEtf,
      explanation: `${bestEtf.ticker}는 ETF라 테마 단위 자금 흐름을 직접 먹는 후보이고, 현재 점수가 개별 종목 후보보다 우선한다.`
    };
  }
  return {
    ...bestStock,
    explanation: `${bestStock.ticker}는 관련 ETF 대비 상대강도 확인이 필요한 개별 종목 후보라 조건 충족 시 ETF보다 알파를 기대할 수 있다.`
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
  const etfBest = report.etfActionCandidates[0];
  const stockBest = report.stockActionCandidates[0];
  return `# 오늘의 데일리 트레이딩 요약

**${report.dataWarning}**

**목적:** ${PURPOSE}

> 핵심 질문: 현재 가격에서 살까, 누가 왜 더 비싸게 사줄 수 있는가?

## 0. 시장 상태

- 데이터 모드: ${report.dataMode}
- 생성 시각: ${report.generatedAt}
- 시장 상태: ${report.marketLabel}
- 오늘 돈의 방향: ${moneyDirection(report)}
- 강한 테마 TOP 3: ${report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "데이터 없음"}
- 오늘의 원칙: ETF는 테마 자금 흐름, 개별 종목은 ETF보다 강할 때만 알파 후보로 본다.
- 데이터 한계:
  - 가격/거래량은 실제 데이터
  - 뉴스/옵션/ETF 구성종목 확산도/스프레드 데이터는 아직 미연결
  - reasonConfidence는 HIGH를 사용하지 않음

## 오늘의 분리 결론

- ETF 행동 후보: ${report.etfActionCandidates.map((row) => row.ticker).join(", ") || "없음"}
- 개별 종목 행동 후보: ${report.stockActionCandidates.map((row) => row.ticker).join(", ") || "없음"}
- ETF 우선 테마: ${report.etfTop5.slice(0, 3).map((row) => row.categoryType).filter((value, index, arr) => arr.indexOf(value) === index).join(", ") || "데이터 없음"}
- 개별 종목 우선 테마: ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.primaryTheme).filter(Boolean).join(", ") || "관련 ETF 대비 추가 확인 필요"}
- 오늘 최우선 실행 후보: ${report.topExecutionCandidate ? `${report.topExecutionCandidate.ticker} - ${report.topExecutionCandidate.explanation}` : "조건 충족 후보 없음"}
- 하지 말아야 할 것: 추격 매수 금지 / ETF와 개별 종목 중복 베팅 금지 / 데이터 미연결 상태에서 과신 금지

## moneyFlowScore 산정 방식

### score의 의미
moneyFlowScore는 “현재 해당 ETF 또는 종목으로 돈이 몰리고 있는 정도”를 가격, 거래량, 추세, 신고가 근접도, ETF 대비 상대강도 등을 바탕으로 수치화한 점수다.

이 점수는 장기 가치평가 점수가 아니다.
이 점수는 “지금 시장 참여자들이 더 비싸게 사줄 가능성이 있는 트레이딩 후보인가?”를 판단하기 위한 단기/중기 모멘텀 점수다.

### 기본 산정 요소
- 20일 수익률: 최근 1개월 수준의 중기 추세를 반영한다.
- 5일 수익률: 최근 1주일 수준의 단기 자금 유입을 반영한다.
- 1일 수익률: 직전 거래일의 단기 추격 매수세를 반영한다.
- 상대 거래량: 가격 상승과 함께 거래량이 늘면 실제 자금 유입 가능성을 높게 본다.
- 52주 고점 대비 위치: 고점 근처 자산은 추세 추종 자금 유입 가능성이 있다.
- 추세 상태: 5일선/20일선/50일선 위에 있는지 확인한다.
- ETF 대비 상대강도: 개별 종목에만 적용하며, 관련 ETF보다 강할 때 개별 종목 우선 가능성이 올라간다.
- 데이터 신뢰도 패널티: 뉴스/옵션/스프레드/ETF 구성종목 확산도 데이터가 미연결이면 HIGH confidence를 사용하지 않는다.

### 점수 구간 해석
- 80점 이상: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
- 65점 이상 80점 미만: 관심 후보. 눌림 또는 돌파 확인 후 진입 검토.
- 50점 이상 65점 미만: 관찰 후보. 흐름은 있으나 우선순위는 낮음.
- 50점 미만: 매매 금지 또는 후순위 후보.

### 주의 문구
moneyFlowScore는 매수 추천 점수가 아니다.
가격/거래량 기반의 자금 흐름 후보 점수이며, 진입 여부는 반드시 진입 조건과 무효화 조건을 함께 확인해야 한다.

## 오늘 돈이 몰리는 테마

${mdList(report.themes.slice(0, 6).map((row) => `**${row.theme}**: ${row.tickers.slice(0, 6).join(", ")} | 평균 moneyFlowScore ${row.avgScore.toFixed(0)}`))}

## 1. ETF 트레이딩 보고서

### 1-1. ETF 결론
- ETF 우선 후보: ${report.etfActionCandidates.filter((row) => row.status === STATUS.ENTRY_READY).map((row) => row.ticker).join(", ") || "없음"}
- ETF 관찰 후보: ${report.etfs.filter((row) => row.status === STATUS.WATCH).slice(0, 5).map((row) => row.ticker).join(", ") || "없음"}
- ETF 매매 금지: ${report.etfBanRows.map((row) => row.ticker).join(", ") || "없음"}
- 오늘 ETF 최우선 1개: ${etfBest ? `${etfBest.ticker} - ${etfBest.entryCondition}` : "없음"}
- ETF 섹션 해석: 이 섹션은 개별 종목 선택이 아니라 테마/섹터 단위의 자금 흐름을 ETF로 매매할지 판단하기 위한 영역이다.

### 1-2. ETF 후보 TOP 5

${report.etfTop5.map(renderEtfMarkdown).join("\n\n") || "데이터 없음"}

### 1-3. ETF 과열/주의 후보

${report.etfOverheat.slice(0, 5).map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore: ${row.moneyFlowScore}
- moneyFlowScore 산정 근거 요약: ${scoreOneLine(row)}
- 과열 리스크: ${row.overheatingRisk}
- 과열 근거: ${row.overheatingReason}
- 대응: ${row.overheatingRisk === "높음" ? "추격 금지" : row.overheatingRisk === "중간" ? "눌림 대기" : "돌파 확인 후 진입"}
`).join("\n") || "해당 없음"}

### 1-4. ETF 제외/매매 금지 후보

${report.etfBanRows.map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore: ${row.moneyFlowScore}
- moneyFlowScore 산정 근거 요약: ${scoreOneLine(row)}
- 제외 사유: ${row.moneyFlowScore < 50 ? "테마 자금 흐름 약함" : "매매 조건 미충족"}
- 재검토 조건: ${row.entryCondition}
`).join("\n") || "해당 없음"}

## 2. 개별 종목 트레이딩 보고서

### 2-1. 개별 종목 결론
- 개별 종목 진입 후보: ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음"}
- 개별 종목 눌림 대기: ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision !== "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음"}
- 개별 종목 보유 점검: ${report.holdRows.map((row) => row.ticker).join(", ") || "없음"}
- 개별 종목 매매 금지: ${report.stockCautionRows.filter((row) => row.status === STATUS.BAN).map((row) => row.ticker).join(", ") || "없음"}
- 오늘 개별 종목 최우선 1개: ${stockBest ? `${stockBest.ticker} - ${stockBest.relativeStrengthVsEtf}` : "없음"}
- 개별 종목 섹션 해석: 이 섹션은 ETF로 확인된 테마 자금 흐름 안에서 ETF보다 더 나은 알파를 줄 수 있는 개별 종목만 선별하는 영역이다.

### 2-2. 개별 종목 후보 TOP 5

${report.stockTop5.map(renderStockMarkdown).join("\n\n") || "데이터 없음"}

### 2-3. ETF 대비 개별 종목 판단 로직

- 관련 ETF의 5일/20일 수익률과 개별 종목의 5일/20일 수익률을 비교한다.
- 관련 ETF의 상대 거래량과 개별 종목의 상대 거래량을 비교한다.
- 개별 종목이 관련 ETF보다 강하면 “개별 종목 우선” 가능으로 본다.
- 개별 종목이 관련 ETF와 비슷하거나 약하면 “ETF 우선 / 개별 종목 관찰”로 낮춘다.
- 관련 ETF가 더 강하면 개별 종목 대신 ETF를 우선한다.

### 2-4. 개별 종목 제외/주의 후보

${report.stockCautionRows.map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore: ${row.moneyFlowScore}
- moneyFlowScore 산정 근거 요약: ${scoreOneLine(row)}
- 제외/주의 사유: ${row.stockVsEtfDecision === "ETF_PREFERRED" ? "ETF 대비 약세" : row.status === STATUS.BAN ? "매매 조건 미충족" : "개별 종목 우선 근거 부족"}
- 재검토 조건: ${row.entryCondition}
`).join("\n") || "해당 없음"}

## 감시 ETF 목록

| 티커 | 카테고리 | moneyFlowScore | 상태 | reasonConfidence | 한 줄 이유 |
| --- | --- | ---: | --- | --- | --- |
${report.etfs.map((row) => `| ${row.ticker} | ${row.categoryType} | ${row.moneyFlowScore} | ${row.status} | ${row.reasonConfidence} | ${row.whyMoneyIsFlowing} |`).join("\n")}

## 3. 최종 실행 판단

### 3-1. 오늘 실제로 할 일
1. ETF에서 할 일: ${etfBest ? `${etfBest.ticker} 포함 ETF 후보의 전일 고점 돌파와 5일선 유지를 확인한다.` : "ETF 후보는 관찰한다."}
2. 개별 종목에서 할 일: ${stockBest ? `${stockBest.ticker} 등은 관련 ETF 대비 상대강도가 유지되는지 확인한 뒤 눌림 또는 돌파 조건에서만 검토한다.` : "개별 종목은 관련 ETF 대비 상대강도 확인 전까지 관찰한다."}
3. 하지 말아야 할 일: ETF와 개별 종목을 같은 테마 안에서 중복 매수하지 않는다.

### 3-2. 내일 확인할 조건
- ETF 확인 조건: ETF 후보 TOP 5가 20일선 위에서 유지되는지 확인
- 개별 종목 확인 조건: 관련 ETF 대비 5일/20일 상대강도와 상대 거래량 유지 확인
- 시장 상태 확인 조건: QQQ/SPY의 5일/20일 추세와 위험선호 유지 여부 확인
- 데이터 보강 필요 항목: 뉴스, 옵션, 스프레드, ETF 구성종목 확산도, 실제 보유 진입가
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

function moneyDirection(report) {
  const topEtf = report.etfTop5[0];
  const topStock = report.stockTop5[0];
  if (!topEtf && !topStock) return "데이터 없음";
  if (topEtf && (!topStock || topEtf.moneyFlowScore >= topStock.moneyFlowScore)) {
    return `${topEtf.categoryType} 쪽 ETF 자금 흐름이 가장 선명함`;
  }
  return `${topStock.primaryTheme || topStock.ticker} 개별 종목 흐름이 ETF 대비 강한지 확인 필요`;
}

function scoreInterpretation(score) {
  if (score >= 80) return "강한 자금 유입 후보. 단, 과열 여부 확인 필수.";
  if (score >= 65) return "관심 후보. 눌림 또는 돌파 확인 후 진입 검토.";
  if (score >= 50) return "관찰 후보. 흐름은 있으나 우선순위는 낮음.";
  return "매매 금지 또는 후순위 후보.";
}

function scoreOneLine(row) {
  const breakdown = row.moneyFlowScoreBreakdown;
  if (!breakdown) return "산정 근거 데이터 없음";
  const positives = breakdown.reasons.filter((reason) => !reason.includes("위험") && !reason.includes("미연결")).slice(0, 3).join(", ") || "가점 제한적";
  const cautions = breakdown.reasons.filter((reason) => reason.includes("위험") || reason.includes("미연결")).slice(0, 2).join(", ") || "큰 감점 제한적";
  return `${positives}. 주의: ${cautions}.`;
}

function scoreBreakdownMarkdown(row) {
  const b = row.moneyFlowScoreBreakdown;
  if (!b) return "moneyFlowScore 산정 근거: 데이터 없음";
  const relativeLine = row.assetType === "STOCK" ? `\n  - ETF 대비 상대강도 점수: ${signed(b.relativeStrengthScore ?? 0)}` : "";
  return `moneyFlowScore 산정 근거:
  - 총점: ${b.totalScore}
  - 점수 해석: ${scoreInterpretation(b.totalScore)}
  - 추세 점수: ${signed(b.trendScore)}
  - 단기 모멘텀: ${signed(b.shortMomentumScore)}
  - 중기 모멘텀: ${signed(b.mediumMomentumScore)}
  - 거래량 점수: ${signed(b.volumeScore)}
  - 신고가 근접 점수: ${signed(b.highProximityScore)}
  - 이동평균 점수: ${signed(b.movingAverageScore)}${relativeLine}
  - 리스크 패널티: ${b.riskPenalty ? `-${b.riskPenalty}` : "0"}
  - 주요 근거: ${scoreOneLine(row)}`;
}

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : String(number);
}

function renderEtfMarkdown(row) {
  return `### [ETF ${row.ticker}] ${row.name}
- 자산 유형: ETF
- ETF 세부 카테고리: ${row.etfCategory}
- ETF 역할: ${row.etfRole}
- 상태: ${row.status}
- moneyFlowScore: ${row.moneyFlowScore}
- ${scoreBreakdownMarkdown(row)}
- 과열 리스크: ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- todayActionLabel: ${row.todayActionLabel}
- 기준일: ${row.market?.dataDate || "데이터 없음"}
- 종가: ${price(row.market?.lastClose)}
- 1일 수익률: ${pct(row.market?.dailyChangePct)}
- 5일 수익률: ${pct(row.market?.return5dPct)}
- 20일 수익률: ${pct(row.market?.return20dPct)}
- 상대 거래량: ${num(row.market?.relativeVolume, 2)}배
- 52주 고점 대비 위치: ${pct(row.market?.drawdownFrom52wHighPct)}
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
- 자산 유형: STOCK
- 상태: ${row.status}
- primaryTheme: ${row.primaryTheme || "데이터 없음"}
- primarySector: ${row.primarySector || "데이터 없음"}
- relatedEtfs: ${row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "관련 ETF 데이터 부족"}
- moneyFlowScore: ${row.moneyFlowScore}
- ${scoreBreakdownMarkdown(row)}
- 과열 리스크: ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- todayActionLabel: ${row.todayActionLabel}
- 기준일: ${row.market?.dataDate || "데이터 없음"}
- 종가: ${price(row.market?.lastClose)}
- 1일 수익률: ${pct(row.market?.dailyChangePct)}
- 5일 수익률: ${pct(row.market?.return5dPct)}
- 20일 수익률: ${pct(row.market?.return20dPct)}
- 상대 거래량: ${num(row.market?.relativeVolume, 2)}배
- 52주 고점 대비 위치: ${pct(row.market?.drawdownFrom52wHighPct)}
- 관련 ETF 대비 상대강도: ${row.relativeStrengthVsEtf}
- whyMoneyIsFlowing: ${row.whyMoneyIsFlowing}
- likelyNextBuyer: ${row.likelyNextBuyer}
- whyThisCouldTradeHigher: ${row.whyThisCouldTradeHigher}
- 왜 ETF가 아니라 이 종목인가?: ${row.whyStockOverEtf}
- ETF가 더 나은 경우: ${row.whenEtfIsBetter}
- 진입 조건: ${row.entryCondition}
- 무효화 조건: ${row.invalidationCondition}
${row.holdingInfo ? `- 보유 정보: ${row.holdingInfo}\n` : ""}- 차트 요약: ${row.chartSummary}
- 차트: ![${row.ticker} chart](${row.chartPath})
- ${marketLine(row.market)}`;
}

function renderHtml(report) {
  const etfBest = report.etfActionCandidates[0];
  const stockBest = report.stockActionCandidates[0];
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
      <h1>오늘의 데일리 트레이딩 요약</h1>
      <p class="purpose">${escapeHtml(PURPOSE)}</p>
      <p class="muted">생성 시각: ${escapeHtml(report.generatedAt)}</p>
      <p><strong>핵심 질문:</strong> 현재 가격에서 살까, 누가 왜 더 비싸게 사줄 수 있는가?</p>
      <p class="muted">뉴스/옵션/ETF 구성종목 확산도/스프레드 데이터는 아직 미연결이다. HIGH confidence는 사용하지 않는다.</p>
    </div>
    ${renderMarketStatusHtml(report)}
    ${renderSplitConclusionHtml(report)}
    ${renderScoreGuideHtml()}
    <section><h2>오늘 돈이 몰리는 테마</h2>${htmlList(report.themes.slice(0, 6).map((row) => `${escapeHtml(row.theme)}: ${escapeHtml(row.tickers.slice(0, 6).join(", "))} | 평균 moneyFlowScore ${row.avgScore.toFixed(0)}`))}</section>
    <section><h2>1. ETF 트레이딩 보고서</h2>
      <h3>1-1. ETF 결론</h3>
      ${htmlList([
        `ETF 우선 후보: ${escapeHtml(report.etfActionCandidates.filter((row) => row.status === STATUS.ENTRY_READY).map((row) => row.ticker).join(", ") || "없음")}`,
        `ETF 관찰 후보: ${escapeHtml(report.etfs.filter((row) => row.status === STATUS.WATCH).slice(0, 5).map((row) => row.ticker).join(", ") || "없음")}`,
        `ETF 매매 금지: ${escapeHtml(report.etfBanRows.map((row) => row.ticker).join(", ") || "없음")}`,
        `오늘 ETF 최우선 1개: ${escapeHtml(etfBest ? `${etfBest.ticker} - ${etfBest.entryCondition}` : "없음")}`,
        "ETF 섹션 해석: 이 섹션은 개별 종목 선택이 아니라 테마/섹터 단위의 자금 흐름을 ETF로 매매할지 판단하기 위한 영역이다."
      ])}
      <h3>1-2. ETF 후보 TOP 5</h3>${report.etfTop5.map(renderEtfHtml).join("") || "<p>데이터 없음</p>"}
      <h3>1-3. ETF 과열/주의 후보</h3>${htmlList(report.etfOverheat.slice(0, 5).map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | ${escapeHtml(row.overheatingRisk)} | ${escapeHtml(row.overheatingReason)}`))}
      <h3>1-4. ETF 제외/매매 금지 후보</h3>${htmlList(report.etfBanRows.map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | 재검토: ${escapeHtml(row.entryCondition)}`))}
    </section>
    <section><h2>2. 개별 종목 트레이딩 보고서</h2>
      <h3>2-1. 개별 종목 결론</h3>
      ${htmlList([
        `개별 종목 진입 후보: ${escapeHtml(report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음")}`,
        `개별 종목 눌림 대기: ${escapeHtml(report.stockActionCandidates.filter((row) => row.stockVsEtfDecision !== "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음")}`,
        `개별 종목 보유 점검: ${escapeHtml(report.holdRows.map((row) => row.ticker).join(", ") || "없음")}`,
        `개별 종목 매매 금지: ${escapeHtml(report.stockCautionRows.filter((row) => row.status === STATUS.BAN).map((row) => row.ticker).join(", ") || "없음")}`,
        `오늘 개별 종목 최우선 1개: ${escapeHtml(stockBest ? `${stockBest.ticker} - ${stockBest.relativeStrengthVsEtf}` : "없음")}`,
        "개별 종목 섹션 해석: 이 섹션은 ETF로 확인된 테마 자금 흐름 안에서 ETF보다 더 나은 알파를 줄 수 있는 개별 종목만 선별하는 영역이다."
      ])}
      <h3>2-2. 개별 종목 후보 TOP 5</h3>${report.stockTop5.map(renderStockHtml).join("") || "<p>데이터 없음</p>"}
      <h3>2-3. ETF 대비 개별 종목 판단 로직</h3>${htmlList(["관련 ETF의 5일/20일 수익률과 개별 종목의 5일/20일 수익률을 비교한다.", "관련 ETF의 상대 거래량과 개별 종목의 상대 거래량을 비교한다.", "개별 종목이 관련 ETF보다 강하면 개별 종목 우선 가능으로 본다.", "관련 ETF가 더 강하면 개별 종목 대신 ETF를 우선한다."])}
      <h3>2-4. 개별 종목 제외/주의 후보</h3>${htmlList(report.stockCautionRows.map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | 재검토: ${escapeHtml(row.entryCondition)}`))}
    </section>
    <section><h2>감시 ETF 목록</h2>${renderEtfTable(report.etfs)}</section>
    <section><h2>3. 최종 실행 판단</h2>
      <h3>3-1. 오늘 실제로 할 일</h3>
      ${htmlList([
        `ETF에서 할 일: ${escapeHtml(etfBest ? `${etfBest.ticker} 포함 ETF 후보의 전일 고점 돌파와 5일선 유지를 확인한다.` : "ETF 후보는 관찰한다.")}`,
        `개별 종목에서 할 일: ${escapeHtml(stockBest ? `${stockBest.ticker} 등은 관련 ETF 대비 상대강도가 유지되는지 확인한 뒤 눌림 또는 돌파 조건에서만 검토한다.` : "개별 종목은 관련 ETF 대비 상대강도 확인 전까지 관찰한다.")}`,
        "하지 말아야 할 일: ETF와 개별 종목을 같은 테마 안에서 중복 매수하지 않는다."
      ])}
      <h3>3-2. 내일 확인할 조건</h3>
      ${htmlList(["ETF 확인 조건: ETF 후보 TOP 5가 20일선 위에서 유지되는지 확인", "개별 종목 확인 조건: 관련 ETF 대비 5일/20일 상대강도와 상대 거래량 유지 확인", "시장 상태 확인 조건: QQQ/SPY의 5일/20일 추세와 위험선호 유지 여부 확인", "데이터 보강 필요 항목: 뉴스, 옵션, 스프레드, ETF 구성종목 확산도, 실제 보유 진입가"])}
    </section>
  </main>
</body>
</html>`;
}

function renderMarketStatusHtml(report) {
  return `<section><h2>0. 시장 상태</h2><div class="grid">
    ${tile("데이터 모드", report.dataMode)}
    ${tile("생성 시각", report.generatedAt)}
    ${tile("시장 상태", report.marketLabel)}
    ${tile("오늘 돈의 방향", moneyDirection(report))}
    ${tile("강한 테마 TOP 3", report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "데이터 없음")}
    ${tile("오늘의 원칙", "ETF는 테마 흐름, 개별 종목은 ETF보다 강할 때만 알파 후보")}
  </div>${htmlList(["가격/거래량은 실제 데이터", "뉴스/옵션/ETF 구성종목 확산도/스프레드 데이터는 아직 미연결", "reasonConfidence는 HIGH를 사용하지 않음"])}</section>`;
}

function renderSplitConclusionHtml(report) {
  return `<section><h2>오늘의 분리 결론</h2><div class="grid">
    ${tile("ETF 행동 후보", report.etfActionCandidates.map((row) => row.ticker).join(", ") || "없음")}
    ${tile("개별 종목 행동 후보", report.stockActionCandidates.map((row) => row.ticker).join(", ") || "없음")}
    ${tile("ETF 우선 테마", report.etfTop5.slice(0, 3).map((row) => row.categoryType).filter((value, index, arr) => arr.indexOf(value) === index).join(", ") || "데이터 없음")}
    ${tile("개별 종목 우선 테마", report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.primaryTheme).filter(Boolean).join(", ") || "관련 ETF 대비 추가 확인 필요")}
    ${tile("오늘 최우선 실행 후보", report.topExecutionCandidate ? `${report.topExecutionCandidate.ticker} - ${report.topExecutionCandidate.explanation}` : "조건 충족 후보 없음")}
    ${tile("하지 말아야 할 것", "추격 매수 금지 / ETF와 개별 종목 중복 베팅 금지 / 데이터 미연결 과신 금지")}
  </div></section>`;
}

function renderScoreGuideHtml() {
  return `<section><h2>moneyFlowScore 산정 방식</h2>
    <h3>score의 의미</h3>
    <p>moneyFlowScore는 현재 해당 ETF 또는 종목으로 돈이 몰리고 있는 정도를 가격, 거래량, 추세, 신고가 근접도, ETF 대비 상대강도 등을 바탕으로 수치화한 점수다.</p>
    <p>이 점수는 장기 가치평가 점수가 아니다. 지금 시장 참여자들이 더 비싸게 사줄 가능성이 있는 트레이딩 후보인지 판단하기 위한 단기/중기 모멘텀 점수다.</p>
    <h3>기본 산정 요소</h3>
    ${htmlList(["20일 수익률: 최근 1개월 수준의 중기 추세", "5일 수익률: 최근 1주일 수준의 단기 자금 유입", "1일 수익률: 직전 거래일의 단기 추격 매수세", "상대 거래량: 가격 상승과 함께 거래량 증가 여부", "52주 고점 대비 위치: 추세 추종 자금 유입 가능성", "추세 상태: 5일선/20일선/50일선 위치", "ETF 대비 상대강도: 개별 종목에만 적용", "데이터 신뢰도 패널티: 미연결 데이터가 있으면 HIGH confidence 사용 금지"])}
    <h3>점수 구간 해석</h3>
    ${htmlList(["80점 이상: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.", "65점 이상 80점 미만: 관심 후보. 눌림 또는 돌파 확인 후 진입 검토.", "50점 이상 65점 미만: 관찰 후보. 흐름은 있으나 우선순위는 낮음.", "50점 미만: 매매 금지 또는 후순위 후보."])}
    <p><strong>주의:</strong> moneyFlowScore는 매수 추천 점수가 아니다. 가격/거래량 기반의 자금 흐름 후보 점수이며, 진입 여부는 반드시 진입 조건과 무효화 조건을 함께 확인해야 한다.</p>
  </section>`;
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
    <div class="grid">${tile("자산 유형", "ETF")}${tile("ETF 세부 카테고리", row.etfCategory)}${tile("ETF 역할", row.etfRole)}${tile("moneyFlowScore", row.moneyFlowScore)}${tile("과열 리스크", row.overheatingRisk)}${tile("reasonConfidence", row.reasonConfidence)}${tile("todayActionLabel", row.todayActionLabel)}${tile("데이터", row.market.dataStatus)}</div>
    ${scoreBreakdownHtml(row)}
    ${fieldList(row)}
    ${chartImage(row)}
    <p class="muted">${escapeHtml(marketLine(row.market))}</p>
  </article>`;
}

function renderStockHtml(row) {
  return `<article data-stock-card="${escapeHtml(row.ticker)}"><h3>[${escapeHtml(row.ticker)}] ${escapeHtml(row.name)} ${badge(row.status)}</h3>
    <div class="grid">${tile("자산 유형", "STOCK")}${tile("primaryTheme", row.primaryTheme || "데이터 없음")}${tile("relatedEtfs", row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "관련 ETF 데이터 부족")}${tile("moneyFlowScore", row.moneyFlowScore)}${tile("reasonConfidence", row.reasonConfidence)}${tile("todayActionLabel", row.todayActionLabel)}${tile("ETF 대비 상대강도", row.relativeStrengthVsEtf)}</div>
    ${scoreBreakdownHtml(row)}
    ${fieldList(row)}
    ${htmlList([`<strong>왜 ETF가 아니라 이 종목인가?</strong> ${escapeHtml(row.whyStockOverEtf)}`, `<strong>ETF가 더 나은 경우</strong> ${escapeHtml(row.whenEtfIsBetter)}`])}
    ${row.holdingInfo ? `<p class="muted">${escapeHtml(row.holdingInfo)}</p>` : ""}
    ${chartImage(row)}
    <p class="muted">${escapeHtml(marketLine(row.market))}</p>
  </article>`;
}

function fieldList(row) {
  return htmlList([
    `<strong>기준일:</strong> ${escapeHtml(row.market?.dataDate || "데이터 없음")} / <strong>종가:</strong> ${escapeHtml(price(row.market?.lastClose))} / <strong>1일:</strong> ${escapeHtml(pct(row.market?.dailyChangePct))} / <strong>5일:</strong> ${escapeHtml(pct(row.market?.return5dPct))} / <strong>20일:</strong> ${escapeHtml(pct(row.market?.return20dPct))} / <strong>상대 거래량:</strong> ${escapeHtml(num(row.market?.relativeVolume, 2))}배`,
    `<strong>whyMoneyIsFlowing:</strong> ${escapeHtml(row.whyMoneyIsFlowing)}`,
    `<strong>likelyNextBuyer:</strong> ${escapeHtml(row.likelyNextBuyer)}`,
    `<strong>whyThisCouldTradeHigher:</strong> ${escapeHtml(row.whyThisCouldTradeHigher)}`,
    `<strong>진입 조건:</strong> ${escapeHtml(row.entryCondition)}`,
    `<strong>무효화 조건:</strong> ${escapeHtml(row.invalidationCondition)}`,
    `<strong>차트 요약:</strong> ${escapeHtml(row.chartSummary)}`
  ]);
}

function scoreBreakdownHtml(row) {
  const b = row.moneyFlowScoreBreakdown;
  if (!b) return "<p>moneyFlowScore 산정 근거: 데이터 없음</p>";
  const relative = row.assetType === "STOCK" ? `${tile("ETF 대비 상대강도 점수", signed(b.relativeStrengthScore ?? 0))}` : "";
  return `<div>
    <h4>moneyFlowScore 산정 근거</h4>
    <div class="grid">
      ${tile("총점", b.totalScore)}
      ${tile("점수 해석", scoreInterpretation(b.totalScore))}
      ${tile("추세 점수", signed(b.trendScore))}
      ${tile("단기 모멘텀", signed(b.shortMomentumScore))}
      ${tile("중기 모멘텀", signed(b.mediumMomentumScore))}
      ${tile("거래량 점수", signed(b.volumeScore))}
      ${tile("신고가 근접 점수", signed(b.highProximityScore))}
      ${tile("이동평균 점수", signed(b.movingAverageScore))}
      ${relative}
      ${tile("리스크 패널티", b.riskPenalty ? `-${b.riskPenalty}` : "0")}
    </div>
    <p class="muted">${escapeHtml(scoreOneLine(row))}</p>
  </div>`;
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
