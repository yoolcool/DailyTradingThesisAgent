const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { calculateEtfBreadth, fetchEtfHoldings } = require("./data/etfHoldingsProvider");
const { fetchLiquidityProfile } = require("./data/liquidityProvider");
const { fetchNasdaq100Universe } = require("./data/nasdaq100Universe");
const { fetchNewsForTicker } = require("./data/newsProvider");
const { aggregateStatus, statusLabel } = require("./data/providerUtils");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CONFIG_DIR = path.join(ROOT, "config");
const REPORTS_DIR = path.join(ROOT, "reports");
const CHARTS_DIR = path.join(REPORTS_DIR, "charts");
const DAILY_REPORTS_DIR = path.join(DATA_DIR, "dailyReports");
const RECOMMENDATION_HISTORY_FILE = "recommendation-history.json";

const MODE = process.env.REPORT_MODE === "REAL_TEST" || process.argv.includes("--real-test") ? "REAL_TEST" : "MOCK";
const REAL_WARNING = "REAL DATA TEST - 가격/거래량은 실제 데이터이며 보조 데이터 연결 상태를 함께 표시";
const MOCK_WARNING = "MOCK DATA - 실전 매매 판단 사용 금지";
const PURPOSE =
  "이 리포트는 최근 오른 자산을 나열하는 것이 아니라, 돈이 몰리는 근거와 다음 매수 주체가 확인할 트레이딩 후보를 찾기 위한 보고서다.";

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
  MSFT: { primaryTheme: "AI 클라우드", primarySector: "메가캡 기술" },
  AAPL: { primaryTheme: "메가캡 기술", primarySector: "소비자 기술" },
  XOM: { primaryTheme: "전통 에너지", primarySector: "에너지" },
  MU: { primaryTheme: "메모리 반도체", primarySector: "반도체" },
  AVAV: { primaryTheme: "드론/방산", primarySector: "방산" }
};

const ETF_CATEGORY = {
  DRAM: "메모리/HBM ETF",
  SMH: "AI 반도체 ETF",
  SOXX: "AI 반도체 ETF",
  SOXQ: "AI 반도체 ETF",
  IGV: "클라우드/엔터프라이즈 소프트웨어 ETF",
  AIQ: "AI 소프트웨어 ETF",
  BOTZ: "로봇/자동화 ETF",
  ROBO: "로봇/자동화 ETF",
  CIBR: "사이버보안 ETF",
  HACK: "사이버보안 ETF",
  IHAK: "사이버보안 ETF",
  ITA: "방산 ETF",
  XAR: "방산 ETF",
  SHLD: "방산 ETF",
  PPA: "방산 ETF",
  PAVE: "인프라 ETF",
  GRID: "전력망 인프라 ETF",
  IFRA: "인프라 ETF",
  XLU: "전력/유틸리티 ETF",
  URA: "원전/우라늄 ETF",
  NLR: "원전/우라늄 ETF",
  LIT: "배터리/리튬 ETF",
  COPX: "구리/금속 ETF",
  XME: "금속/광산 ETF",
  XLE: "전통 에너지 ETF",
  OIH: "전통 에너지 ETF",
  ARKK: "혁신 성장 ETF",
  IPO: "IPO/신규상장 ETF",
  KWEB: "중국 인터넷 ETF",
  MAGS: "메가캡 플랫폼 ETF",
  QQQ: "시장 기준 ETF",
  SPY: "시장 기준 ETF",
  IWM: "시장 기준 ETF",
  TLT: "채권 ETF",
  GLD: "금 ETF",
  IBIT: "비트코인 ETF",
  BLOK: "비트코인 ETF"
};

const NARRATIVE_DEFINITIONS = [
  {
    name: "AI 인프라 재가속",
    etfs: ["SMH", "SOXX", "SOXQ", "DRAM", "GRID", "PAVE"],
    stocks: ["NVDA", "TSM", "AMD", "AVGO", "MU", "ARM", "VRT", "ETN", "PWR"],
    nextBuyer: "AI 인프라 CAPEX를 사는 반도체/전력망 ETF 자금과 신고가 모멘텀 추종 자금",
    preferredEtfs: ["SMH", "SOXX", "DRAM"],
    preferredStocks: ["NVDA", "AVGO", "MU", "ARM"],
    breakCondition: "SMH/SOXX 20일선 이탈, 관련 반도체와 전력 인프라 종목 절반 이상 5일선 이탈",
    todayAction: "추격보다 5일선 지지 후 재상승 확인"
  },
  {
    name: "AI 소프트웨어/사이버보안 확산",
    etfs: ["IGV", "AIQ", "CIBR", "HACK", "IHAK"],
    stocks: ["PLTR", "PANW", "CRWD", "DDOG", "TEAM", "MSFT", "NOW", "ZS"],
    nextBuyer: "섹터 베타를 사는 ETF 자금, AI/보안 실적 기대를 사는 스윙 트레이더, 신고가 추종 자금",
    preferredEtfs: ["IGV", "CIBR", "AIQ"],
    preferredStocks: ["PANW", "CRWD", "DDOG", "TEAM"],
    breakCondition: "IGV/CIBR 20일선 이탈, 관련 개별 종목 절반 이상 5일선 이탈, 상대 거래량 둔화",
    todayAction: "추격보다 눌림 후 재상승 확인"
  },
  {
    name: "위험선호 성장주 재진입",
    etfs: ["QQQ", "IPO", "ARKK", "IWM", "MAGS"],
    stocks: ["ARM", "COIN", "TSLA", "ROKU", "PATH"],
    nextBuyer: "위험선호 회복을 사는 성장주 ETF 자금과 고베타 단기 모멘텀 자금",
    preferredEtfs: ["QQQ", "IPO", "ARKK"],
    preferredStocks: ["ARM", "COIN", "TSLA"],
    breakCondition: "QQQ/IWM 동반 약화, 고베타 성장주 상대 거래량 둔화",
    todayAction: "지수 위험선호가 유지될 때만 선별 진입"
  },
  {
    name: "방산/안보 프리미엄",
    etfs: ["XAR", "SHLD", "ITA", "PPA"],
    stocks: ["AVAV", "KTOS", "RTX", "LMT", "NOC", "PLTR"],
    nextBuyer: "지정학 리스크와 안보 예산 기대를 사는 테마 ETF 자금",
    preferredEtfs: ["XAR", "SHLD", "ITA"],
    preferredStocks: ["AVAV", "KTOS", "PLTR"],
    breakCondition: "방산 ETF 20일선 이탈 또는 안보 이벤트 프리미엄 둔화",
    todayAction: "뉴스 촉매가 직접 확인될 때만 추세 추종"
  },
  {
    name: "전력망/원전/인프라 병목",
    etfs: ["GRID", "PAVE", "IFRA", "XLU", "URA", "NLR", "COPX"],
    stocks: ["VRT", "ETN", "PWR", "GEV", "CEG", "CCJ", "FCX"],
    nextBuyer: "AI 전력 수요와 인프라 병목을 사는 장기 테마 자금",
    preferredEtfs: ["GRID", "PAVE", "URA"],
    preferredStocks: ["VRT", "ETN", "PWR", "CEG"],
    breakCondition: "GRID/PAVE 20일선 이탈, 전력/원전 관련 종목 확산도 둔화",
    todayAction: "ETF 확산도와 거래량이 같이 살아날 때만 진입"
  },
  {
    name: "비트코인/디지털 자산 위험선호",
    etfs: ["IBIT", "BLOK"],
    stocks: ["MSTR", "COIN", "IREN", "CIFR", "RIOT", "MARA"],
    nextBuyer: "비트코인 현물 ETF와 디지털 자산 베타를 사는 위험선호 자금",
    preferredEtfs: ["IBIT", "BLOK"],
    preferredStocks: ["MSTR", "COIN", "IREN"],
    breakCondition: "IBIT/BLOK 20일선 이탈 또는 채굴주 상대강도 급락",
    todayAction: "비트코인 베타가 살아날 때만 단기 매매"
  },
  {
    name: "매크로 방어/헤지",
    etfs: ["GLD", "TLT", "XLE", "OIH"],
    stocks: ["XOM", "CVX"],
    nextBuyer: "금리/에너지/방어 헤지를 찾는 매크로 자금",
    preferredEtfs: ["GLD", "TLT", "XLE"],
    preferredStocks: ["XOM", "CVX"],
    breakCondition: "방어 ETF 상대강도 둔화와 위험선호 성장주 재강세",
    todayAction: "위험회피가 확인될 때만 헤지성 접근"
  }
];

const NARRATIVE_STATUS = {
  DOMINANT: "지배",
  EMERGING: "부상",
  WATCH: "관찰",
  WEAKENING: "약화",
  DEAD: "소멸"
};

function readJson(fileName, fallback = null) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readConfigJson(fileName, fallback = null) {
  const filePath = path.join(CONFIG_DIR, fileName);
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

function signedPct(value) {
  return pct(value);
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

function rounded(value) {
  return Math.round(Number(value) || 0);
}

function displayScore(value) {
  return rounded(clamp(value, 0, 100));
}

function compareFinalScore(a, b) {
  const preferredA = a.stockVsEtfDecision === "STOCK_PREFERRED" ? 1 : 0;
  const preferredB = b.stockVsEtfDecision === "STOCK_PREFERRED" ? 1 : 0;
  if (preferredA !== preferredB) return preferredB - preferredA;
  const scoreA = Number.isFinite(a.moneyFlowScoreFinal) ? a.moneyFlowScoreFinal : a.moneyFlowScore || 0;
  const scoreB = Number.isFinite(b.moneyFlowScoreFinal) ? b.moneyFlowScoreFinal : b.moneyFlowScore || 0;
  const rawA = Number.isFinite(a.moneyFlowScoreBreakdown?.finalRawScore) ? a.moneyFlowScoreBreakdown.finalRawScore : scoreA;
  const rawB = Number.isFinite(b.moneyFlowScoreBreakdown?.finalRawScore) ? b.moneyFlowScoreBreakdown.finalRawScore : scoreB;
  if (rawA !== rawB) return rawB - rawA;
  if (scoreA !== scoreB) return scoreB - scoreA;
  const riskA = Number(a.moneyFlowScoreBreakdown?.riskPenalty || 0);
  const riskB = Number(b.moneyFlowScoreBreakdown?.riskPenalty || 0);
  if (riskA !== riskB) return riskB - riskA;
  const r5a = Number.isFinite(a.market?.return5dPct) ? a.market.return5dPct : -999;
  const r5b = Number.isFinite(b.market?.return5dPct) ? b.market.return5dPct : -999;
  if (r5a !== r5b) return r5b - r5a;
  const volA = Number.isFinite(a.market?.relativeVolume) ? a.market.relativeVolume : -1;
  const volB = Number.isFinite(b.market?.relativeVolume) ? b.market.relativeVolume : -1;
  return volB - volA;
}

function compareInitialScore(a, b) {
  const scoreA = Number.isFinite(a.moneyFlowScoreInitial) ? a.moneyFlowScoreInitial : a.moneyFlowScore || -1;
  const scoreB = Number.isFinite(b.moneyFlowScoreInitial) ? b.moneyFlowScoreInitial : b.moneyFlowScore || -1;
  if (scoreA !== scoreB) return scoreB - scoreA;
  const r5a = Number.isFinite(a.market?.return5dPct) ? a.market.return5dPct : -999;
  const r5b = Number.isFinite(b.market?.return5dPct) ? b.market.return5dPct : -999;
  if (r5a !== r5b) return r5b - r5a;
  const volA = Number.isFinite(a.market?.relativeVolume) ? a.market.relativeVolume : -1;
  const volB = Number.isFinite(b.market?.relativeVolume) ? b.market.relativeVolume : -1;
  return volB - volA;
}

function riskPenaltySummary(items, watchItems) {
  const totalPenalty = items.reduce((sum, item) => sum + item.penalty, 0);
  const riskLevel = totalPenalty <= -15 ? "HIGH" : totalPenalty <= -7 ? "MEDIUM" : "LOW";
  return {
    totalPenalty,
    riskLevel,
    items,
    watchItems,
    summary: items.length
      ? `${items.length}개 감점 리스크로 총 ${totalPenalty}점 반영.`
      : "직접 감점된 주요 리스크는 없지만 관찰 리스크는 계속 확인해야 한다."
  };
}

function riskItem(riskType, label, penalty, evidence, action) {
  return { riskType, label, penalty: -Math.abs(penalty), evidence, action };
}

function scoreComponent(label, raw, min, max) {
  const capped = clamp(raw, min, max);
  return {
    label,
    raw: rounded(raw),
    capped: rounded(capped),
    max,
    wasCapped: rounded(raw) !== rounded(capped),
    display: rounded(capped)
  };
}

function scoreAsset(item, assetType, relatedEtfStrength = 0, supplemental = {}, identity = {}) {
  if (!item || item.dataStatus !== "ok") {
    const riskSummary = riskPenaltySummary([], ["price/volume data missing"]);
    const emptyBreakdown = {
      totalScore: 0,
      initialScore: 0,
      initialRawScore: 0,
      initialDisplayScore: 0,
      finalRawScore: 0,
      finalDisplayScore: 0,
      trendScore: 0,
      shortMomentumScore: 0,
      mediumMomentumScore: 0,
      volumeScore: 0,
      highProximityScore: 0,
      movingAverageScore: 0,
      relativeStrengthScore: assetType === "STOCK" ? 0 : undefined,
      priceVolumeScore: 0,
      newsScore: 0,
      etfBreadthScore: assetType === "ETF" ? 0 : undefined,
      liquidityScore: 0,
      riskPenalty: 0,
      riskPenaltySummary: riskSummary,
      dataConfidencePenalty: 0,
      wasCapped: false,
      capReason: "cap not applied",
      formulaText: "0 = price/volume data missing",
      reasons: ["가격/거래량 데이터 없음"],
      dataUsed: dataUsedFlags(supplemental, false)
    };
    return {
      moneyFlowScore: 0,
      moneyFlowScoreInitial: 0,
      moneyFlowScoreFinal: 0,
      moneyFlowScoreBreakdown: emptyBreakdown,
      moneyFlowScoreReasons: emptyBreakdown.reasons,
      overheatingRisk: "데이터 없음",
      overheatingReason: "가격/거래량 데이터 없음",
      reasonConfidence: "LOW",
      directCatalyst: "",
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
  const newsSummary = supplemental.news;
  const rawNewsScore = Number(supplemental.news?.rawNewsScore || supplemental.news?.newsScore || 0);
  let newsScore = Number(supplemental.news?.newsScore || 0);
  if (newsScore > 0 && daily < 0) {
    newsScore = Math.min(newsScore, 2);
  }
  if (newsSummary) {
    newsSummary.priceReaction = daily < 0 ? "부정" : daily > 0 ? "긍정" : "중립";
    newsSummary.priceReactionAfterNews = daily < 0 ? "negative" : daily > 0 ? "positive" : "neutral";
    newsSummary.priceReactionNote = daily < 0 && rawNewsScore > newsScore
      ? "뉴스 이후 가격 반응 부정 -> 긍정 점수 제한"
      : "뉴스 이후 가격 반응과 점수 제한 특이사항 없음";
    newsSummary.newsFreshnessStatus = newsFreshnessLabel(newsSummary.lastPublishedAt);
    for (const item of newsSummary.items || []) {
      item.priceReactionAfterNews = newsSummary.priceReactionAfterNews;
      if ((item.direction === "positive" && daily < 0) || (item.direction === "negative" && daily > 0)) item.confidence = "LOW";
    }
  }
  const etfBreadthScore = assetType === "ETF" ? Number(supplemental.etfBreadth?.etfBreadthScore || 0) : undefined;
  const liquidityScore = Number(supplemental.liquidity?.liquidityScore || 0);
  const closes = (item.history || []).map((row) => row.close).filter((value) => Number.isFinite(value));
  const lastClose = closes.at(-1) ?? item.lastClose;
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  const ma50 = average(closes.slice(-50));
  const aboveMa5 = Number.isFinite(lastClose) && Number.isFinite(ma5) && lastClose >= ma5;
  const aboveMa20 = Number.isFinite(lastClose) && Number.isFinite(ma20) && lastClose >= ma20;
  const aboveMa50 = Number.isFinite(lastClose) && Number.isFinite(ma50) && lastClose >= ma50;

  const trendComponent = scoreComponent("가격 모멘텀", clamp(r5 * 1.0, -6, 12) + clamp(r20 * 0.45, -4, 12) + (trendAcceleration ? 6 : 0), -10, 25);
  const shortMomentumComponent = scoreComponent("단기 모멘텀", clamp(daily * 1.2, -6, 8) + clamp(r5 * 0.8, -6, 12), -10, 20);
  const mediumMomentumComponent = scoreComponent("중기 모멘텀", r20 * 0.65, -8, 16);
  const volumeComponent = scoreComponent("거래량", relVol >= 1.5 ? 18 : relVol >= 1.2 ? 14 : relVol >= 1 ? 10 : -8, -8, 20);
  const highProximityComponent = scoreComponent("신고가 근접", highProximity ? 12 : drawdown > -12 ? 6 : 0, 0, 12);
  const movingAverageComponent = scoreComponent("이동평균", (aboveMa5 ? 4 : 0) + (aboveMa20 ? 6 : -6) + (aboveMa50 ? 4 : 0), -6, 14);
  const relativeStrengthComponentScore = assetType === "STOCK" ? scoreComponent("관련 ETF 상대강도", relatedEtfStrength / 12, 0, 8) : null;
  const trendScore = trendComponent.capped;
  const shortMomentumScore = shortMomentumComponent.capped;
  const mediumMomentumScore = mediumMomentumComponent.capped;
  const volumeScore = volumeComponent.capped;
  const highProximityScore = highProximityComponent.capped;
  const movingAverageScore = movingAverageComponent.capped;
  const relativeStrengthScore = assetType === "STOCK" ? relativeStrengthComponentScore.capped : undefined;
  const riskItems = [];
  if (r5 >= 18) {
    riskItems.push(riskItem("SHORT_TERM_OVERHEAT", "short-term overheat", 6, `5d return ${pct(r5)} is extended.`, "Prefer pullback or prior high reclaim over chasing."));
  }
  if (daily >= 6) {
    riskItems.push(riskItem("EXTREME_1D_MOVE", "extreme 1d move", 4, `1d return ${pct(daily)} is unusually strong.`, "Confirm next-session volume retention."));
  }
  if (overheatingFlag || blowoffFlag) {
    riskItems.push(riskItem("NEAR_52W_HIGH_CHASE", "near 52w high chase", blowoffFlag ? 6 : 4, "Price is close to the 52-week high with fast short-term momentum.", "Downgrade if breakout fails."));
  }
  if (r5 > 5 && relVol < 1) {
    riskItems.push(riskItem("VOLUME_DIVERGENCE", "volume divergence", 4, `5d price strength is not confirmed by relative volume ${num(relVol, 2)}x.`, "Require relative volume recovery above 1.0x."));
  }
  if (!aboveMa20) {
    riskItems.push(riskItem("MA_BREAK_RISK", "20d moving average break risk", 6, "Close is below the 20-day moving average.", "Hold off until 20-day moving average is recovered."));
  }
  if ((supplemental.news?.newsScore || 0) < 0) {
    riskItems.push(riskItem("NEGATIVE_NEWS", "negative news", Math.abs(supplemental.news.newsScore), supplemental.news.headlineSummary || "News score is negative.", "Wait for news risk to clear."));
  }
  if ((supplemental.liquidity?.liquidityScore || 0) < 0) {
    const riskType = ["LOW", "LOW_LIQUIDITY"].includes(supplemental.liquidity?.liquiditySignal) ? "LOW_LIQUIDITY" : "WIDE_SPREAD";
    riskItems.push(riskItem(riskType, riskType === "LOW_LIQUIDITY" ? "low liquidity" : "wide spread", Math.abs(supplemental.liquidity.liquidityScore), `Liquidity signal: ${supplemental.liquidity?.liquiditySignal || "UNKNOWN"}.`, "Avoid market-order chasing."));
  }
  const watchItems = [];
  if (!isConnectedLike(supplemental.news?.status)) watchItems.push("news data not connected or unavailable");
  if (assetType === "ETF" && !isConnectedLike(supplemental.etfBreadth?.status)) watchItems.push("ETF breadth data not connected");
  if (!isConnectedLike(supplemental.liquidity?.status)) watchItems.push("liquidity/spread data is fallback or unavailable");
  if (assetType === "STOCK" && relatedEtfStrength <= 0) watchItems.push("related ETF relative strength mapping needs confirmation");
  const riskSummary = riskPenaltySummary(riskItems, watchItems);
  const riskPenalty = riskSummary.totalPenalty;
  const dataConfidencePenalty = 0;
  const reasons = [];
  if (r20 > 8) reasons.push("20일 수익률 강함");
  if (r5 > 5) reasons.push("5일 수익률 강함");
  if (daily > 2) reasons.push("1일 단기 모멘텀 확인");
  if (relVol >= 1.2) reasons.push("상대 거래량 증가");
  if (highProximity) reasons.push("52주 고점 근처");
  if (aboveMa5 && aboveMa20) reasons.push("이동평균 위 추세 유지");
  if (assetType === "STOCK" && relatedEtfStrength > 0) reasons.push("관련 ETF 강세 테마 안의 개별 종목");
  if (newsScore > 0) reasons.push("뉴스 흐름이 가격/거래량 근거 보강");
  if (assetType === "ETF" && etfBreadthScore > 0) reasons.push("ETF 구성종목 확산도 양호");
  if (liquidityScore > 0) reasons.push("거래대금 기준 유동성 양호");
  if (newsScore < 0) reasons.push("부정 뉴스 또는 이벤트 리스크");
  if (liquidityScore < 0) reasons.push("거래대금 유동성 주의");
  if (riskPenalty < 0) reasons.push("단기 과열/추격 위험 존재");
  if (!isConnectedLike(supplemental.news?.status)) reasons.push("뉴스 데이터 미연결 또는 수집 실패");
  if (assetType === "ETF" && !isConnectedLike(supplemental.etfBreadth?.status)) reasons.push("ETF 구성종목 확산도 데이터 미연결");
  if (!isConnectedLike(supplemental.liquidity?.status)) reasons.push("거래대금 유동성 데이터 미연결");

  const componentCaps = [
    trendComponent,
    shortMomentumComponent,
    mediumMomentumComponent,
    volumeComponent,
    highProximityComponent,
    movingAverageComponent,
    relativeStrengthComponentScore
  ].filter(Boolean);
  const priceVolumeScore = trendScore + shortMomentumScore + mediumMomentumScore + volumeScore + highProximityScore + movingAverageScore;
  const initialRawScore = rounded(priceVolumeScore);
  const initialDisplayScore = displayScore(initialRawScore);
  const etfBreadthComponent = assetType === "ETF" ? etfBreadthScore : 0;
  const relativeStrengthComponent = assetType === "STOCK" ? relativeStrengthScore : 0;
  const finalRawScore = rounded(initialRawScore + newsScore + etfBreadthComponent + liquidityScore + relativeStrengthComponent + riskPenalty - dataConfidencePenalty);
  const finalDisplayScore = displayScore(finalRawScore);
  const wasCapped = finalRawScore !== finalDisplayScore;
  const capReason = wasCapped
    ? `raw score ${finalRawScore} capped to displayed score ${finalDisplayScore}`
    : "cap not applied";
  const formulaText = `${[initialRawScore, newsScore, etfBreadthComponent, liquidityScore, relativeStrengthComponent, riskPenalty, dataConfidencePenalty ? -dataConfidencePenalty : 0].map(signed).join(" + ").replace(/\+ -/g, "- ")} = ${finalRawScore}${wasCapped ? ` -> ${finalDisplayScore}` : ""}`;
  const breakdown = {
    totalScore: finalDisplayScore,
    initialScore: initialDisplayScore,
    initialRawScore,
    initialDisplayScore,
    finalRawScore,
    finalDisplayScore,
    trendScore: rounded(trendScore),
    shortMomentumScore: rounded(shortMomentumScore),
    mediumMomentumScore: rounded(mediumMomentumScore),
    volumeScore: rounded(volumeScore),
    highProximityScore: rounded(highProximityScore),
    movingAverageScore: rounded(movingAverageScore),
    priceVolumeScore: initialRawScore,
    newsScore,
    etfBreadthScore: assetType === "ETF" ? etfBreadthScore : undefined,
    liquidityScore,
    relativeStrengthScore: assetType === "STOCK" ? rounded(relativeStrengthScore) : undefined,
    riskPenalty,
    riskPenaltySummary: riskSummary,
    dataConfidencePenalty,
    wasCapped,
    capReason,
    formulaText,
    componentCaps,
    reasons,
    dataUsed: dataUsedFlags(supplemental, true)
  };

  const directCatalyst = directCatalystLine(assetType, identity.ticker || item.ticker, supplemental.news, identity.name);
  const reasonConfidence = computeReasonConfidence(assetType, item, finalDisplayScore, weakVolume, supplemental, relatedEtfStrength, directCatalyst);
  const status = finalDisplayScore >= 72 && !overheatingFlag ? STATUS.ENTRY_READY : finalDisplayScore >= 58 && !overheatingFlag ? STATUS.ENTRY_CANDIDATE : finalDisplayScore >= 35 ? STATUS.WATCH : STATUS.BAN;
  const overheatingRisk = blowoffFlag ? "높음" : overheatingFlag ? "중간" : highProximity && daily > 2 ? "낮음~중간" : "낮음";
  const overheatingReason = etfOverheatingReason(assetType, item, overheatingRisk);

  const whyMoneyIsFlowing = weakVolume
    ? `최근 수익률은 확인되지만 상대 거래량 ${num(relVol, 2)}배라 신규 자금 유입 강도는 약함`
    : `20일 ${pct(r20)}, 5일 ${pct(r5)}, 상대 거래량 ${num(relVol, 2)}배로 가격과 거래량이 함께 개선`;
  const supplementalReason = supplementalReasonLine(assetType, supplemental);
  const likelyNextBuyer =
    assetType === "ETF"
      ? "섹터 베타를 노리는 단기 모멘텀 자금과 리밸런싱 자금"
      : "개별 주도주를 따라붙는 단기 모멘텀 자금과 관련 ETF 강세를 확인한 트레이더";
  const whyThisCouldTradeHigher = highProximity
    ? "52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음"
    : "단기 추세가 유지되고 거래량이 1.0배 이상이면 눌림 이후 재상승을 시도할 수 있음";

  return {
    moneyFlowScore: finalDisplayScore,
    moneyFlowScoreInitial: initialDisplayScore,
    moneyFlowScoreFinal: finalDisplayScore,
    moneyFlowScoreBreakdown: breakdown,
    moneyFlowScoreReasons: reasons,
    overheatingRisk,
    overheatingReason,
    reasonConfidence,
    directCatalyst,
    status,
    whyMoneyIsFlowing: supplementalReason ? `${whyMoneyIsFlowing}. ${supplementalReason}` : whyMoneyIsFlowing,
    likelyNextBuyer,
    whyThisCouldTradeHigher
  };
}

function isConnectedLike(status) {
  return status === "CONNECTED" || status === "PARTIAL";
}

function dataUsedFlags(supplemental, priceVolume) {
  return {
    priceVolume,
    news: isConnectedLike(supplemental.news?.status) && (supplemental.news?.itemCount || 0) > 0,
    etfBreadth: isConnectedLike(supplemental.etfBreadth?.status) && Number(supplemental.etfBreadth?.sampledHoldingsCount || 0) >= 5,
    dollarVolumeLiquidity: isConnectedLike(supplemental.liquidity?.status) && supplemental.liquidity?.liquiditySignal !== "UNKNOWN",
    relativeStrength: priceVolume
  };
}

function computeReasonConfidence(assetType, item, score, weakVolume, supplemental, relatedEtfStrength, directCatalyst) {
  if (!item || item.dataStatus !== "ok" || weakVolume || score < 35) return "LOW";
  const used = dataUsedFlags(supplemental, true);
  const hasNegativeNews = (supplemental.news?.sentimentCounts?.negative || 0) > (supplemental.news?.sentimentCounts?.positive || 0);
  const badLiquidity = ["WIDE_SPREAD", "LOW_LIQUIDITY", "LOW"].includes(supplemental.liquidity?.liquiditySignal);
  const hasPriceVolume = Number(item.relativeVolume || 0) >= 1 && Number(item.return5dPct || 0) > 0;
  const hasBreadth = assetType === "ETF" ? used.etfBreadth : relatedEtfStrength > 0;
  const hasDirectCatalyst = Boolean(directCatalyst);
  if (hasDirectCatalyst && used.news && hasPriceVolume && hasBreadth && used.dollarVolumeLiquidity && !hasNegativeNews && !badLiquidity) return "HIGH";
  return "MEDIUM";
}

function reasonConfidenceExplanation(row) {
  const used = row.moneyFlowScoreBreakdown?.dataUsed || {};
  if (row.reasonConfidence === "HIGH") {
    return `${row.directCatalyst} 가격/거래량, ${row.assetType === "ETF" ? "ETF 확산도" : "관련 ETF 동반 강세"}, 유동성 근거가 함께 확인되어 HIGH로 분류했다.`;
  }
  if (row.reasonConfidence === "MEDIUM") {
    const missing = [];
    if (!row.directCatalyst) missing.push("직접 촉매 부재");
    if (!used.news) missing.push("뉴스 미사용");
    if (row.assetType === "ETF" && !used.etfBreadth) missing.push("ETF 확산도 제한");
    if (!used.dollarVolumeLiquidity) missing.push("거래대금 유동성 제한");
    return `${missing.join(", ") || "보조 근거 일부 제한"} 때문에 HIGH가 아니라 MEDIUM으로 제한했다.`;
  }
  return "가격/거래량이 약하거나 핵심 보조 근거가 부족해 LOW로 분류했다.";
}

function directCatalystLine(assetType, ticker, newsSummary, name = "") {
  if (!newsSummary || !isConnectedLike(newsSummary.status) || !newsSummary.itemCount) return "";
  if (newsSummary.directCatalyst) {
    const item = newsSummary.directCatalyst;
    return `직접 촉매: ${item.source} / ${item.eventType} / ${item.freshnessBucket} - ${item.title}`;
  }
  const directKeywords = [
    "earnings", "guidance", "upgrade", "contract", "partnership", "policy", "regulation",
    "deal", "acquisition", "merger", "ipo", "approval", "order", "revenue", "profit",
    "data center", "cybersecurity", "chip", "semiconductor", "ai"
  ];
  const generalMarket = ["market", "futures", "pre-bell", "wall street", "stocks", "equity futures", "qqq", "spy"];
  const tickerText = String(ticker || "").toLowerCase();
  const nameTokens = String(name || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !["inc", "corp", "corporation", "class", "ordinary", "shares", "common", "stock"].includes(token));
  const items = newsSummary.items || [];
  const direct = items.find((item) => {
    const text = `${item.title || ""} ${item.summary || ""}`.toLowerCase();
    const hasKeyword = directKeywords.some((keyword) => text.includes(keyword));
    const namesTicker = tickerText && text.includes(tickerText);
    const namesCompany = nameTokens.some((token) => text.includes(token));
    const isGeneral = generalMarket.some((keyword) => text.includes(keyword));
    if (assetType === "STOCK") return hasKeyword && (namesTicker || namesCompany) && !isGeneral;
    return hasKeyword && (namesTicker || namesCompany || !isGeneral);
  });
  if (!direct) return "";
  return `직접 촉매: ${direct.source || "뉴스"} / ${direct.eventType || "general_market"} / ${direct.freshnessBucket || newsFreshnessBucket(direct.publishedAt)} - ${direct.title}`;
}

function supplementalReasonLine(assetType, supplemental) {
  const parts = [];
  if ((supplemental.news?.newsScore || 0) > 0) {
    const item = supplemental.news.directCatalyst || supplemental.news.items?.[0];
    const sourceLine = item ? `${item.source} ${item.eventType}/${item.freshnessBucket}` : supplemental.news.headlineSummary;
    parts.push(`뉴스: ${sourceLine}`);
  }
  if (assetType === "ETF" && (supplemental.etfBreadth?.etfBreadthScore || 0) > 0) parts.push(`ETF 확산도: ${supplemental.etfBreadth.breadthSignal}`);
  if ((supplemental.liquidity?.liquidityScore || 0) > 0) parts.push(`유동성: ${supplemental.liquidity.liquiditySignal}`);
  return parts.join(" / ");
}

function etfOverheatingReason(assetType, item, risk) {
  if (assetType !== "ETF") {
    return risk === "낮음" ? "개별 종목 기준 과열 신호 제한적" : "단기 급등과 고점 근접 조합 확인";
  }
  const category = ETF_CATEGORY[item.ticker] || "테마 ETF";
  if (category === "채권 ETF") return "채권 ETF는 가격 급등보다 금리 급락 이후 되돌림 리스크를 별도 확인한다.";
  if (category === "금 ETF") return "금 ETF는 달러와 실질금리 데이터 미연결 시 가격 기준으로만 신뢰도를 제한한다.";
  if (category === "비트코인 ETF") return "비트코인 ETF는 단기 변동성과 거래량 급증이 겹치면 과열 리스크를 높게 본다.";
  if (category === "시장 기준 ETF") return "시장 기준 ETF는 단기 과열 기준을 완만하게 적용한다.";
  return risk === "낮음" ? `${category} 기준 과열 신호 제한적` : `${category} 기준 단기 급등과 고점 근접 조합 확인`;
}

function chartSummary(item) {
  const history = item?.history || [];
  if (history.length < 20) return "차트 데이터 없음";
  const closes = history.map((row) => row.close).filter((value) => Number.isFinite(value));
  const last = closes.at(-1);
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  if (last >= ma5 && ma5 >= ma20) return "최근 20거래일 기준 5일선이 20일선 위에 있음";
  if (last >= ma20 && last < ma5) return "20일선 위에서 단기 눌림 확인 구간";
  if (last < ma20) return "20일선 아래라 추세 확인 전까지 보수적 접근";
  return "단기 추세 중립";
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function enrichEtf(etf, marketData, supplementalData = {}) {
  const market = marketItem(marketData, etf.ticker);
  const supplemental = supplementalData.byTicker?.[etf.ticker] || {};
  const scored = MODE === "REAL_TEST" ? scoreAsset(market, "ETF", 0, supplemental, etf) : scoreAsset(mockMarket(etf), "ETF", 0, supplemental, etf);
  const categoryType = ETF_CATEGORY[etf.ticker] || "성장/테마 ETF";
  const row = {
    ...etf,
    assetType: "ETF",
    categoryType,
    etfCategory: categoryType,
    etfRole: etfRole(etf.ticker, categoryType),
    newsSummary: supplemental.news,
    etfBreadthSummary: supplemental.etfBreadth,
    liquiditySummary: supplemental.liquidity,
    market,
    chartPath: `charts/${etf.ticker}.png`,
    chartSummary: chartSummary(market),
    ...scored,
    todayActionLabel: scored.status === STATUS.ENTRY_READY ? "ETF 우선" : scored.status === STATUS.ENTRY_CANDIDATE ? "눌림 매수 대기" : scored.overheatingRisk === "높음" ? "추격 금지" : "돌파 확인 후 관찰",
    entryCondition: entryCondition(market),
    invalidationCondition: invalidationCondition(market)
  };
  return addDecisionExplanations(row);
}

function enrichStock(stock, etfs, marketData, supplementalData = {}) {
  const market = marketItem(marketData, stock.ticker);
  const relatedEtfs = relatedEtfsForStock(stock.ticker, etfs, stock);
  const relatedEtfStrength = relatedEtfs.length ? Math.max(...relatedEtfs.map((etf) => etf.moneyFlowScore || 0)) : 0;
  const supplemental = supplementalData.byTicker?.[stock.ticker] || {};
  const scored = MODE === "REAL_TEST" ? scoreAsset(market, "STOCK", relatedEtfStrength, supplemental, stock) : scoreAsset(mockMarket(stock), "STOCK", relatedEtfStrength, supplemental, stock);
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
  const row = {
    ...stock,
    assetType: "STOCK",
    ...STOCK_META[stock.ticker],
    primaryTheme: stock.primaryTheme || STOCK_META[stock.ticker]?.primaryTheme,
    primarySector: stock.primarySector || STOCK_META[stock.ticker]?.primarySector,
    market,
    relatedEtfs,
    newsSummary: supplemental.news,
    liquiditySummary: supplemental.liquidity,
    relativeStrengthVsEtf: relativeStrength.summary,
    whyStockOverEtf: whyStockOverEtf(stock.ticker, relativeStrength, stockVsEtfDecision),
    whenEtfIsBetter: whenEtfIsBetter(stock.ticker, relativeStrength),
    stockVsEtfDecision,
    relatedEtfMappingNote: stock.relatedEtfMappingNote || (stock.relatedEtfSymbols ? "rule-based mapping" : "정밀 ETF 매핑 부족"),
    chartPath: `charts/${stock.ticker}.png`,
    chartSummary: chartSummary(market),
    ...scored,
    status,
    todayActionLabel: status === STATUS.ENTRY_READY ? "개별 종목 우선" : status === STATUS.ENTRY_CANDIDATE ? "눌림 매수 대기" : status === STATUS.HOLD ? "전일 추천 추적" : "돌파 확인 후 관찰",
    entryCondition: entryCondition(market),
    invalidationCondition: invalidationCondition(market),
    holdingInfo: isHolding ? "보유 정보 미입력 - 기존 mock 진입가/수익률은 실전 판단에 사용하지 않음" : ""
  };
  return addDecisionExplanations(row);
}

function etfRole(ticker, category) {
  if (["QQQ", "SPY", "IWM"].includes(ticker)) return "시장 기준 확인";
  if (category.includes("방산")) return "방어 섹터 확인";
  if (category.includes("비트코인")) return "위험선호 지표";
  if (category.includes("채권") || category.includes("금")) return "리스크 오프 확인";
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
  if (decision === "STOCK_PREFERRED") return `${ticker}가 관련 ETF 평균보다 5일/20일 흐름 또는 거래량에서 강해 개별 종목 우선 후보로 본다.`;
  if (decision === "ETF_PREFERRED") return `${ticker}보다 관련 ETF 쪽 흐름이 더 선명해 오늘은 ETF 우선으로 본다.`;
  if (decision === "DO_NOT_TRADE") return `${ticker}의 가격/거래량 흐름이 약해 개별 종목 우선 근거가 부족하다.`;
  return `${relativeStrength.summary}. 개별 종목 우선으로 격상하려면 관련 ETF 대비 상대강도 유지가 더 필요하다.`;
}

function whenEtfIsBetter(ticker, relativeStrength) {
  if (relativeStrength.summary.includes("데이터 부족")) return "관련 ETF 데이터가 부족하면 개별 종목보다 ETF 또는 관찰을 우선한다.";
  return `${ticker}가 관련 ETF 평균보다 약하거나 거래량이 둔화되면 개별 종목보다 관련 ETF를 우선한다.`;
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

function relatedEtfsForStock(ticker, etfs, stock = {}) {
  const priorities = stock.relatedEtfSymbols || RELATED_ETF_PRIORITY[ticker] || ["QQQ"];
  return priorities
    .map((symbol) => etfs.find((etf) => etf.ticker === symbol))
    .filter(Boolean)
    .sort((a, b) => priorities.indexOf(a.ticker) - priorities.indexOf(b.ticker));
}

function relatedEtfSymbolsForUniverseMember(member) {
  const ticker = member.ticker;
  if (RELATED_ETF_PRIORITY[ticker]) return { symbols: RELATED_ETF_PRIORITY[ticker], mappingNote: "ticker-specific mapping" };
  const semiconductor = ["NVDA", "AMD", "AVGO", "QCOM", "MRVL", "ARM", "MU", "KLAC", "LRCX", "AMAT", "ASML", "TSM", "INTC", "ADI", "NXPI", "MCHP", "MPWR"];
  const software = ["MSFT", "PLTR", "CRM", "NOW", "ADBE", "INTU", "TEAM", "DDOG", "SNOW", "WDAY", "ADSK", "CDNS", "SNPS", "ROP", "SHOP", "APP"];
  const cyber = ["CRWD", "PANW", "ZS", "FTNT", "OKTA"];
  const ecommerceTravel = ["AMZN", "MELI", "PDD", "BKNG", "ABNB", "DASH"];
  const comms = ["GOOGL", "GOOG", "META", "NFLX", "WBD", "TTWO", "EA"];
  const bio = ["BIIB", "GILD", "REGN", "VRTX", "ALNY", "INSM", "AMGN"];
  const staples = ["COST", "PEP", "MDLZ", "KDP", "CCEP", "KHC", "MNST", "WMT"];
  if (semiconductor.includes(ticker)) return { symbols: ["SMH", "SOXX", "SOXQ", "AIQ"], mappingNote: "semiconductor rule" };
  if (cyber.includes(ticker)) return { symbols: ["HACK", "CIBR", "IHAK", "IGV"], mappingNote: "cybersecurity rule" };
  if (software.includes(ticker)) return { symbols: ["IGV", "AIQ", "QQQ"], mappingNote: "software rule" };
  if (ecommerceTravel.includes(ticker)) return { symbols: ["QQQ", "FDN", "XLY"], mappingNote: "ecommerce/travel rule" };
  if (comms.includes(ticker)) return { symbols: ["QQQ", "XLC"], mappingNote: "communication services rule" };
  if (ticker === "TSLA") return { symbols: ["QQQ", "XLY", "DRIV"], mappingNote: "tesla rule" };
  if (bio.includes(ticker)) return { symbols: ["IBB", "XBI", "QQQ"], mappingNote: "biotech rule" };
  if (staples.includes(ticker)) return { symbols: ["QQQ", "XLP"], mappingNote: "consumer staples rule" };
  const sector = `${member.sector || ""} ${member.industry || ""}`.toLowerCase();
  if (sector.includes("semiconductor")) return { symbols: ["SMH", "SOXX", "SOXQ", "AIQ"], mappingNote: "sector semiconductor fallback" };
  if (sector.includes("software")) return { symbols: ["IGV", "AIQ", "QQQ"], mappingNote: "sector software fallback" };
  if (sector.includes("biotech") || sector.includes("health")) return { symbols: ["IBB", "XBI", "QQQ"], mappingNote: "sector healthcare fallback" };
  return { symbols: ["QQQ"], mappingNote: "정밀 ETF 매핑 부족 - QQQ 기본값" };
}

function inferStockTheme(member) {
  const ticker = member.ticker;
  const sector = String(member.sector || "");
  const industry = String(member.industry || "");
  const text = `${sector} ${industry}`.toLowerCase();
  const aiChips = ["NVDA", "AMD", "ARM", "AVGO", "MRVL", "TSM", "ASML"];
  const memory = ["MU", "STX", "WDC"];
  const chipEquipment = ["AMAT", "LRCX", "KLAC", "TER", "ENTG", "COHR"];
  const cyber = ["PANW", "CRWD", "FTNT", "ZS", "OKTA"];
  const cloudSoftware = ["DDOG", "TEAM", "SNOW", "MDB", "NOW", "CRM", "WDAY", "ADBE", "INTU", "ADSK"];
  const megaPlatform = ["MSFT", "AAPL", "GOOGL", "GOOG", "META", "AMZN", "NFLX", "TSLA"];
  const ecommerce = ["MELI", "PDD", "BKNG", "ABNB", "DASH", "CPNG"];
  const biotech = ["BIIB", "GILD", "REGN", "VRTX", "ALNY", "INSM", "AMGN", "MRNA", "ISRG"];
  const staples = ["COST", "PEP", "MDLZ", "KDP", "CCEP", "KHC", "MNST", "WMT"];
  if (aiChips.includes(ticker)) return "AI 반도체";
  if (memory.includes(ticker)) return "메모리/HBM";
  if (chipEquipment.includes(ticker) || text.includes("semiconductor equipment")) return "반도체 장비/공급망";
  if (cyber.includes(ticker) || text.includes("security")) return "사이버보안";
  if (cloudSoftware.includes(ticker) || text.includes("software")) return "클라우드/엔터프라이즈 소프트웨어";
  if (megaPlatform.includes(ticker)) return "메가캡 플랫폼";
  if (ecommerce.includes(ticker)) return "이커머스/여행 플랫폼";
  if (biotech.includes(ticker) || text.includes("biotech") || text.includes("health")) return "바이오/헬스케어";
  if (staples.includes(ticker)) return "필수소비재";
  if (sector === "Technology") return "기술 기타";
  return sector || "Nasdaq-100";
}

function universeMemberToStock(member) {
  const mapping = relatedEtfSymbolsForUniverseMember(member);
  const theme = inferStockTheme(member);
  return {
    ticker: member.ticker,
    name: member.name || member.ticker,
    market: "US",
    theme,
    primaryTheme: theme,
    primarySector: member.sector || "데이터 없음",
    industry: member.industry || "데이터 없음",
    isNewScanCandidate: true,
    universeName: "NASDAQ_100",
    universeSource: member.source,
    universeAsOfDate: member.asOfDate,
    relatedEtfSymbols: mapping.symbols,
    relatedEtfMappingNote: mapping.mappingNote
  };
}

function narrativeStockToStock(row) {
  const mapping = relatedEtfSymbolsForUniverseMember(row);
  const theme = inferStockTheme(row);
  return {
    ticker: row.ticker,
    name: row.name || row.ticker,
    market: "US",
    theme,
    primaryTheme: theme,
    primarySector: row.sector || "데이터 없음",
    industry: row.industry || "데이터 없음",
    isNewScanCandidate: true,
    universeName: "NARRATIVE_SUPPORT",
    universeSource: "config/narrativeStocks.json",
    universeAsOfDate: row.asOfDate,
    relatedEtfSymbols: mapping.symbols,
    relatedEtfMappingNote: mapping.mappingNote
  };
}

function uniqueStocksByTicker(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.ticker || seen.has(row.ticker)) return false;
    seen.add(row.ticker);
    return true;
  });
}

function entryCondition(item) {
  if (!item || item.dataStatus !== "ok") return "데이터 없음";
  if ((item.relativeVolume ?? 0) < 1) return "상대 거래량 1.0배 회복 후 관찰";
  if ((item.drawdownFrom52wHighPct ?? -100) >= -5) return "전일 고점 돌파와 5일선 유지 확인";
  return "20일선 위 눌림 후 재상승 확인";
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
    const row = rows.get(theme) || { theme, tickers: [], score: 0, count: 0, members: [] };
    row.tickers.push(stock.ticker);
    row.score += stock.moneyFlowScore || 0;
    row.count += 1;
    row.members.push(stock);
    rows.set(theme, row);
  }
  for (const etf of etfs) {
    const theme = etf.categoryType || etf.category || "ETF";
    const row = rows.get(theme) || { theme, tickers: [], score: 0, count: 0, members: [] };
    row.tickers.push(etf.ticker);
    row.score += etf.moneyFlowScore || 0;
    row.count += 1;
    row.members.push(etf);
    rows.set(theme, row);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, tickers: unique(row.tickers), avgScore: row.score / row.count }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

function buildNarratives(stocks, etfs) {
  return NARRATIVE_DEFINITIONS.map((definition) => buildNarrative(definition, stocks, etfs))
    .sort((a, b) => b.narrativeScore - a.narrativeScore || b.rawScore - a.rawScore);
}

function buildNarrative(definition, stocks, etfs) {
  const narrativeEtfs = definition.etfs.map((ticker) => etfs.find((row) => row.ticker === ticker)).filter(Boolean);
  const narrativeStocks = definition.stocks.map((ticker) => stocks.find((row) => row.ticker === ticker)).filter(Boolean);
  const tradableEtfs = narrativeEtfs.filter(isTradableCandidate);
  const tradableStocks = narrativeStocks.filter(isTradableCandidate);
  const allRows = [...narrativeEtfs, ...narrativeStocks];
  const etfAvgScore = averageNonEmpty(narrativeEtfs.map((row) => row.moneyFlowScoreFinal ?? row.moneyFlowScore));
  const stockAvgScore = averageNonEmpty(narrativeStocks.map((row) => row.moneyFlowScoreFinal ?? row.moneyFlowScore));
  const etfCandidateRatio = ratio(tradableEtfs.length, narrativeEtfs.length);
  const stockCandidateRatio = ratio(tradableStocks.length, narrativeStocks.length);
  const momentum5 = averageNonEmpty(allRows.map((row) => row.market?.return5dPct));
  const momentum20 = averageNonEmpty(allRows.map((row) => row.market?.return20dPct));
  const relativeVolumeStats = narrativeRelativeVolumeStats(narrativeEtfs, narrativeStocks);
  const relativeVolumeAvg = relativeVolumeStats.overall;
  const highProximityRatio = ratio(allRows.filter((row) => Number(row.market?.drawdownFrom52wHighPct) >= -5).length, allRows.length);
  const newsDirectScore = averageNonEmpty(allRows.map((row) => row.reasonConfidence === "HIGH" ? 10 : row.moneyFlowScoreBreakdown?.newsScore || 0));
  const directNewsCount = allRows.filter((row) => row.reasonConfidence === "HIGH" && row.directCatalyst).length;
  const etfBreadthScore = averageNonEmpty(narrativeEtfs.map((row) => row.moneyFlowScoreBreakdown?.etfBreadthScore));
  const liquidityScore = averageNonEmpty(allRows.map((row) => row.moneyFlowScoreBreakdown?.liquidityScore));
  const overheatPenalty = averageNonEmpty(allRows.map((row) => row.overheatingRisk === "높음" ? -8 : row.overheatingRisk === "중간" ? -4 : 0));
  const bothSidesStrong = etfAvgScore >= 65 && stockAvgScore >= 65;
  const rawScore = rounded(
    etfAvgScore * 0.2 +
    stockAvgScore * 0.2 +
    etfCandidateRatio * 12 +
    stockCandidateRatio * 12 +
    clamp(momentum5, -10, 15) * 0.9 +
    clamp(momentum20, -15, 25) * 0.7 +
    clamp(relativeVolumeAvg - 1, -1, 2.5) * 10 +
    highProximityRatio * 8 +
    clamp(newsDirectScore, -8, 12) +
    clamp(etfBreadthScore, -5, 10) +
    clamp(liquidityScore, -5, 5) +
    overheatPenalty
  );
  const narrativeScore = clamp(rounded(rawScore), 0, 100);
  const status = narrativeStatus(narrativeScore, bothSidesStrong, etfCandidateRatio, stockCandidateRatio, relativeVolumeAvg, momentum20);
  const reasonConfidence = narrativeReasonConfidence(narrativeScore, bothSidesStrong, etfBreadthScore, relativeVolumeAvg, directNewsCount);
  const supportEtfs = pickSupportRows(narrativeEtfs, definition.preferredEtfs);
  const supportStocks = pickSupportRows(narrativeStocks, definition.preferredStocks);
  const trend = buildTrendStrengthEngine(definition, narrativeEtfs, narrativeStocks, etfs, supportEtfs, supportStocks);
  return {
    name: definition.name,
    status,
    narrativeScore,
    trendStrengthIndex: trend.trendStrengthIndex,
    trendStateLabel: trend.trendStateLabel,
    themeBreadthLabel: trend.themeBreadthLabel,
    etfSyncLabel: trend.etfSyncLabel,
    volumeStrengthLabel: trend.volumeStrengthLabel,
    exhaustionRisk: trend.exhaustionRisk,
    exhaustionRiskLabel: trend.exhaustionRiskLabel,
    entryQualityScore: trend.entryQualityScore,
    entryQualityLabel: trend.entryQualityLabel,
    trendOneLineJudgment: trend.oneLineJudgment,
    trendTodayApproach: trend.todayApproach,
    trendComponents: trend.components,
    trendDetailReasons: trend.detailReasons,
    rawScore,
    reasonConfidence,
    supportEtfs: supportEtfs.map((row) => row.ticker),
    supportStocks: supportStocks.map((row) => row.ticker),
    representativeEtfs: supportEtfs.slice(0, 3).map((row) => row.ticker),
    representativeStocks: supportStocks.slice(0, 4).map((row) => row.ticker),
    etfAvgScore: rounded(etfAvgScore),
    stockAvgScore: rounded(stockAvgScore),
    etfCandidateRatio: rounded(etfCandidateRatio * 100),
    stockCandidateRatio: rounded(stockCandidateRatio * 100),
    momentum5: rounded(momentum5),
    momentum20: rounded(momentum20),
    relativeVolumeAvg: rounded(relativeVolumeAvg),
    etfRelativeVolumeAvg: rounded(relativeVolumeStats.etf),
    stockRelativeVolumeAvg: rounded(relativeVolumeStats.stock),
    highProximityRatio: rounded(highProximityRatio * 100),
    newsDirectScore: rounded(newsDirectScore),
    directNewsCount,
    etfBreadthScore: rounded(etfBreadthScore),
    liquidityScore: rounded(liquidityScore),
    overheatPenalty: rounded(overheatPenalty),
    whyMoneyIsFlowing: narrativeMoneyReason(definition.name, supportEtfs, supportStocks, momentum5, momentum20, relativeVolumeAvg, etfBreadthScore, directNewsCount),
    likelyNextBuyer: definition.nextBuyer,
    bestTradingVehicle: `ETF 우선: ${pickSymbols(definition.preferredEtfs, supportEtfs).join(", ") || "데이터 없음"} / 개별 종목 우선: ${pickSymbols(definition.preferredStocks, supportStocks).join(", ") || "데이터 없음"}`,
    breakCondition: definition.breakCondition,
    todayAction: definition.todayAction,
    summaryReason: narrativeOneLine(definition.name, status, supportEtfs, supportStocks, momentum5, momentum20, directNewsCount)
  };
}

function applyNarrativeLinks(rows, narratives) {
  for (const row of rows) {
    const narrative = bestNarrativeForRow(row, narratives);
    if (!narrative) continue;
    row.linkedNarrative = narrative.name;
    row.narrativeStatus = narrative.status;
    row.narrativeScore = narrative.narrativeScore;
    row.trendStrengthIndex = narrative.trendStrengthIndex;
    row.trendStateLabel = narrative.trendStateLabel;
    row.themeBreadthLabel = narrative.themeBreadthLabel;
    row.etfSyncLabel = narrative.etfSyncLabel;
    row.exhaustionRisk = narrative.exhaustionRisk;
    row.exhaustionRiskLabel = narrative.exhaustionRiskLabel;
    row.entryQualityScore = itemEntryQualityScore(row, narrative);
    row.entryQualityLabel = entryQualityLabel(row.entryQualityScore);
    row.trendDecisionLine = itemTrendDecisionLine(row, narrative);
  }
}

function applyActionLabelGates(rows, marketLabel) {
  for (const row of rows) {
    if (!row?.market || row.market.dataStatus !== "ok") continue;
    const gate = actionGate(row);
    row.actionGate = gate;
    row.marketContext = candidateMarketContext(row, marketLabel, gate);
    row.todayActionLabel = gate.label;
    row.status = gate.status;
  }
}

function actionGate(row) {
  const entryQuality = Number(row.entryQualityScore ?? 0);
  const exhaustion = Number(row.exhaustionRisk ?? 0);
  const rvol = Number(row.market?.relativeVolume ?? 0);
  const liquidity = row.liquiditySummary || {};
  const lowLiquidity = ["LOW", "LOW_LIQUIDITY", "UNKNOWN"].includes(liquidity.liquiditySignal);
  const reasons = [];
  let label = "제외";
  let status = STATUS.BAN;

  if (entryQuality >= 75) {
    label = "진입 가능";
    status = STATUS.ENTRY_READY;
  } else if (entryQuality >= 60) {
    label = "조건부 진입";
    status = STATUS.ENTRY_CANDIDATE;
  } else if (entryQuality >= 45) {
    label = "관찰";
    status = STATUS.WATCH;
  }

  if (entryQuality < 45) reasons.push(`Entry Quality ${entryQuality} < 45`);
  if (exhaustion >= 70) {
    label = "추격 금지";
    status = STATUS.WATCH;
    reasons.push(`Exhaustion Risk ${exhaustion} >= 70`);
  }
  if (rvol < 1) {
    label = "거래량 확인 전 관찰";
    status = STATUS.WATCH;
    reasons.push(`RVOL ${num(rvol, 2)}x < 1.00x`);
  }
  if (lowLiquidity) {
    label = label === "진입 가능" ? "지정가 권장" : label;
    if (status === STATUS.ENTRY_READY) status = STATUS.ENTRY_CANDIDATE;
    reasons.push("거래대금 유동성 LOW/UNKNOWN");
  }
  if (label === "제외") reasons.push("진입 품질 부족");
  return { label, status, reasons };
}

function candidateMarketContext(row, marketLabel, gate) {
  const daily = Number(row.market?.dailyChangePct ?? 0);
  const nearHigh = Number(row.market?.drawdownFrom52wHighPct ?? -100) >= -5;
  const reasons = [];
  if (marketLabel === "위험선호") reasons.push("전체 시장은 위험선호");
  if (marketLabel === "위험회피") reasons.push("전체 시장은 위험회피");
  if (daily < 0) reasons.push("후보는 당일 음봉 또는 약세");
  if (nearHigh && row.overheatingRisk !== "낮음") reasons.push("고점 근처 추격 리스크");
  if (gate.reasons.length) reasons.push(...gate.reasons.slice(0, 2));
  const environment = gate.status === STATUS.ENTRY_READY ? "우호적" : gate.status === STATUS.ENTRY_CANDIDATE ? "제한적" : "관찰";
  return {
    marketRegime: marketLabel,
    candidateEnvironment: environment,
    reason: reasons.join(" / ") || "특이 충돌 없음"
  };
}

function bestNarrativeForRow(row, narratives) {
  const ticker = row.ticker;
  const relatedEtfSymbols = (row.relatedEtfs || []).map((etf) => etf.ticker);
  return narratives.find((narrative) => narrative.supportEtfs.includes(ticker) || narrative.supportStocks.includes(ticker))
    || narratives.find((narrative) => {
      const definition = NARRATIVE_DEFINITIONS.find((row) => row.name === narrative.name);
      return definition?.etfs.includes(ticker) || definition?.stocks.includes(ticker);
    })
    || bestNarrativeByRelatedEtfs(relatedEtfSymbols, narratives);
}

function bestNarrativeByRelatedEtfs(relatedEtfSymbols, narratives) {
  if (!relatedEtfSymbols.length) return null;
  return narratives
    .map((narrative) => {
      const definition = NARRATIVE_DEFINITIONS.find((row) => row.name === narrative.name);
      const overlap = relatedEtfSymbols.filter((symbol) => definition?.etfs.includes(symbol)).length;
      return { narrative, overlap };
    })
    .filter((row) => row.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.narrative.narrativeScore - a.narrative.narrativeScore)[0]?.narrative || null;
}

function isTradableCandidate(row) {
  return row && [STATUS.ENTRY_READY, STATUS.ENTRY_CANDIDATE].includes(row.status) && row.reasonConfidence !== "LOW";
}

function averageNonEmpty(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function narrativeRelativeVolumeStats(etfs, stocks) {
  return {
    overall: averageNonEmpty([...etfs, ...stocks].map((row) => row.market?.relativeVolume)),
    etf: averageNonEmpty(etfs.map((row) => row.market?.relativeVolume)),
    stock: averageNonEmpty(stocks.map((row) => row.market?.relativeVolume))
  };
}

function ratio(count, total) {
  return total ? count / total : 0;
}

function narrativeStatus(score, bothSidesStrong, etfCandidateRatio, stockCandidateRatio, relativeVolumeAvg, momentum20) {
  if (score >= 80 && bothSidesStrong) return NARRATIVE_STATUS.DOMINANT;
  if (score >= 65 && (etfCandidateRatio >= 0.25 || stockCandidateRatio >= 0.25)) return NARRATIVE_STATUS.EMERGING;
  if (score >= 50) return relativeVolumeAvg < 0.9 || momentum20 < 0 ? NARRATIVE_STATUS.WEAKENING : NARRATIVE_STATUS.WATCH;
  if (momentum20 < -3) return NARRATIVE_STATUS.DEAD;
  return NARRATIVE_STATUS.WEAKENING;
}

function narrativeReasonConfidence(score, bothSidesStrong, etfBreadthScore, relativeVolumeAvg, directNewsCount) {
  if (score >= 75 && bothSidesStrong && etfBreadthScore > 0 && relativeVolumeAvg >= 1 && directNewsCount >= 2) return "HIGH";
  if (score >= 60 && (etfBreadthScore > 0 || relativeVolumeAvg >= 1)) return "MEDIUM";
  return "LOW";
}

function buildTrendStrengthEngine(definition, narrativeEtfs, narrativeStocks, allEtfs, supportEtfs, supportStocks) {
  const allRows = [...narrativeEtfs, ...narrativeStocks].filter((row) => row?.market?.dataStatus === "ok");
  const marketScore = marketRegimeScore(allEtfs);
  const concentration = concentrationPenalty(allRows);
  const components = {
    priceMomentum: trendPriceMomentumScore(allRows),
    volumeStrength: trendVolumeScore(allRows),
    themeBreadth: trendBreadthScore(allRows, concentration),
    etfSync: trendEtfSyncScore(narrativeEtfs, allEtfs),
    catalystFreshness: trendCatalystScore(allRows, narrativeEtfs, narrativeStocks),
    marketRegime: marketScore
  };
  const trendStrengthIndex = rounded(clamp(
    components.priceMomentum +
    components.volumeStrength +
    components.themeBreadth +
    components.etfSync +
    components.catalystFreshness +
    components.marketRegime,
    0,
    100
  ));
  const exhaustionRisk = trendExhaustionRisk(allRows, narrativeEtfs, narrativeStocks, concentration);
  const entryQualityScore = rounded(clamp(
    trendStrengthIndex * 0.42 +
    averageNonEmpty(allRows.map((row) => row.moneyFlowScoreFinal ?? row.moneyFlowScore)) * 0.28 +
    components.catalystFreshness * 1.3 +
    components.marketRegime * 1.1 -
    exhaustionRisk * 0.45 -
    averageNonEmpty(allRows.map((row) => liquidityRiskScore(row))) * 0.18,
    0,
    100
  ));
  const labels = {
    themeBreadthLabel: strengthLabel(components.themeBreadth, 20),
    etfSyncLabel: strengthLabel(components.etfSync, 15),
    volumeStrengthLabel: strengthLabel(components.volumeStrength, 20),
    exhaustionRiskLabel: riskLabel(exhaustionRisk),
    entryQualityLabel: entryQualityLabel(entryQualityScore)
  };
  const trendStateLabel = trendStateLabelFor(trendStrengthIndex, exhaustionRisk, components.themeBreadth, components.etfSync, components.volumeStrength);
  const oneLineJudgment = trendOneLineJudgment(definition.name, trendStrengthIndex, exhaustionRisk, components, labels);
  const todayApproach = trendTodayApproach(definition, trendStateLabel, labels, supportEtfs, supportStocks);
  return {
    trendStrengthIndex,
    trendStateLabel,
    exhaustionRisk,
    entryQualityScore,
    ...labels,
    components,
    oneLineJudgment,
    todayApproach,
    detailReasons: trendDetailReasons(components, exhaustionRisk, concentration, marketScore, allRows, narrativeEtfs)
  };
}

function trendPriceMomentumScore(rows) {
  if (!rows.length) return 0;
  const avg5 = averageNonEmpty(rows.map((row) => row.market?.return5dPct));
  const avg20 = averageNonEmpty(rows.map((row) => row.market?.return20dPct));
  const avg1 = averageNonEmpty(rows.map((row) => row.market?.dailyChangePct));
  const highProximity = ratio(rows.filter((row) => Number(row.market?.drawdownFrom52wHighPct) >= -5).length, rows.length);
  const aboveMaRatio = ratio(rows.filter((row) => isAboveMovingAverages(row.market)).length, rows.length);
  const acceleration = avg5 - avg20 / 4;
  return rounded(clamp(avg5 * 1.25, -5, 8) + clamp(avg20 * 0.45, -4, 8) + clamp(acceleration * 1.2, -3, 5) + highProximity * 4 + aboveMaRatio * 4);
}

function trendVolumeScore(rows) {
  if (!rows.length) return 0;
  const avgRvol = averageNonEmpty(rows.map((row) => row.market?.relativeVolume));
  const rvolRatio = ratio(rows.filter((row) => Number(row.market?.relativeVolume) >= 1.2).length, rows.length);
  const dollarVolumeStrength = ratio(rows.filter((row) => Number(row.market?.lastClose) * Number(row.market?.volume) >= 500000000).length, rows.length);
  const upVolumeProxy = ratio(rows.filter((row) => Number(row.market?.dailyChangePct) > 0 && Number(row.market?.relativeVolume) >= 1).length, rows.length);
  return rounded(clamp((avgRvol - 0.8) * 8, 0, 8) + rvolRatio * 5 + dollarVolumeStrength * 3 + upVolumeProxy * 4);
}

function trendBreadthScore(rows, concentration) {
  if (!rows.length) return 0;
  const up5Ratio = ratio(rows.filter((row) => Number(row.market?.return5dPct) > 0).length, rows.length);
  const above20Ratio = ratio(rows.filter((row) => isAboveMa(row.market, 20)).length, rows.length);
  const rvolRatio = ratio(rows.filter((row) => Number(row.market?.relativeVolume) >= 1.2).length, rows.length);
  const highBreakoutProxy = ratio(rows.filter((row) => Number(row.market?.drawdownFrom52wHighPct) >= -2 && Number(row.market?.dailyChangePct) > 0).length, rows.length);
  return rounded(clamp(up5Ratio * 6 + above20Ratio * 6 + rvolRatio * 4 + highBreakoutProxy * 4 - concentration, 0, 20));
}

function trendEtfSyncScore(narrativeEtfs, allEtfs) {
  const okEtfs = narrativeEtfs.filter((row) => row?.market?.dataStatus === "ok");
  if (!okEtfs.length) return 0;
  const qqq = allEtfs.find((row) => row.ticker === "QQQ")?.market;
  const spy = allEtfs.find((row) => row.ticker === "SPY")?.market;
  const benchmark5 = averageNonEmpty([qqq?.return5dPct, spy?.return5dPct]);
  const benchmark20 = averageNonEmpty([qqq?.return20dPct, spy?.return20dPct]);
  const avg5 = averageNonEmpty(okEtfs.map((row) => row.market?.return5dPct));
  const avg20 = averageNonEmpty(okEtfs.map((row) => row.market?.return20dPct));
  const avgRvol = averageNonEmpty(okEtfs.map((row) => row.market?.relativeVolume));
  const sameDirection = ratio(okEtfs.filter((row) => Number(row.market?.return5dPct) > 0 && Number(row.market?.return20dPct) > 0).length, okEtfs.length);
  const relative = (avg5 - benchmark5) + (avg20 - benchmark20) * 0.4;
  return rounded(clamp(avg5 * 0.8 + avg20 * 0.3, -3, 5) + clamp((avgRvol - 0.9) * 3, 0, 3) + sameDirection * 4 + clamp(relative, -3, 3) + 3);
}

function trendCatalystScore(rows, narrativeEtfs, narrativeStocks) {
  if (!rows.length) return 0;
  const highCount = rows.filter((row) => row.reasonConfidence === "HIGH" && row.directCatalyst).length;
  const mediumCount = rows.filter((row) => row.reasonConfidence === "MEDIUM").length;
  const etfCatalyst = narrativeEtfs.some((row) => row.reasonConfidence === "HIGH") ? 2 : 0;
  const stockOnlyPenalty = highCount > 0 && !etfCatalyst && narrativeStocks.length <= 2 ? -2 : 0;
  return rounded(clamp(highCount * 2.5 + mediumCount * 0.8 + etfCatalyst + stockOnlyPenalty, 0, 10));
}

function marketRegimeScore(etfs) {
  const qqq = etfs.find((row) => row.ticker === "QQQ")?.market;
  const spy = etfs.find((row) => row.ticker === "SPY")?.market;
  const iwm = etfs.find((row) => row.ticker === "IWM")?.market;
  const growth = averageNonEmpty([qqq?.return5dPct, qqq?.return20dPct, iwm?.return5dPct]);
  const broad = averageNonEmpty([spy?.return5dPct, spy?.return20dPct]);
  const rvol = averageNonEmpty([qqq?.relativeVolume, spy?.relativeVolume, iwm?.relativeVolume]);
  return rounded(clamp(growth * 0.55 + broad * 0.35 + clamp((rvol - 0.8) * 2, 0, 2) + 4, 0, 10));
}

function trendExhaustionRisk(rows, narrativeEtfs, narrativeStocks, concentration) {
  if (!rows.length) return 0;
  const avg5 = averageNonEmpty(rows.map((row) => row.market?.return5dPct));
  const avg20 = averageNonEmpty(rows.map((row) => row.market?.return20dPct));
  const highProximity = ratio(rows.filter((row) => Number(row.market?.drawdownFrom52wHighPct) >= -2).length, rows.length);
  const blowoff = ratio(rows.filter((row) => row.overheatingRisk === "높음").length, rows.length);
  const mediumHot = ratio(rows.filter((row) => row.overheatingRisk === "중간" || row.overheatingRisk === "낮음~중간").length, rows.length);
  const weakCloseProxy = ratio(rows.filter((row) => Number(row.market?.dailyChangePct) < 0 && Number(row.market?.relativeVolume) >= 1.5).length, rows.length);
  const etfWeak = narrativeEtfs.length && averageNonEmpty(narrativeEtfs.map((row) => row.market?.return5dPct)) <= 0;
  const stockStrong = narrativeStocks.length && averageNonEmpty(narrativeStocks.map((row) => row.market?.return5dPct)) >= 3;
  const etfDivergence = etfWeak && stockStrong ? 12 : 0;
  return rounded(clamp(
    clamp(avg5 - 4, 0, 12) * 2.2 +
    clamp(avg20 - 12, 0, 18) * 1.4 +
    highProximity * 18 +
    blowoff * 20 +
    mediumHot * 8 +
    weakCloseProxy * 12 +
    concentration * 3 +
    etfDivergence,
    0,
    100
  ));
}

function concentrationPenalty(rows) {
  const scores = rows.map((row) => Number(row.moneyFlowScoreFinal ?? row.moneyFlowScore)).filter(Number.isFinite);
  if (scores.length <= 2) return 4;
  const sorted = [...scores].sort((a, b) => b - a);
  const total = scores.reduce((sum, value) => sum + Math.max(value, 0), 0);
  if (!total) return 0;
  const topShare = (sorted[0] + sorted[1]) / total;
  return topShare > 0.7 ? 6 : topShare > 0.55 ? 3 : 0;
}

function itemEntryQualityScore(row, narrative) {
  const moneyFlow = Number(row.moneyFlowScoreFinal ?? row.moneyFlowScore ?? 0);
  const exhaustion = Number(narrative.exhaustionRisk ?? 0);
  const liquidityRisk = liquidityRiskScore(row);
  const gapRisk = Math.max(0, Number(row.market?.dailyChangePct || 0) - 3) * 4;
  const liquidityDataRisk = row.liquiditySummary?.liquiditySignal === "LOW" || row.liquiditySummary?.status === "FAILED" ? 8 : 0;
  const invalidationBonus = row.invalidationCondition && row.invalidationCondition !== "데이터 없음" ? 4 : 0;
  return rounded(clamp(
    Number(narrative.trendStrengthIndex || 0) * 0.36 +
    moneyFlow * 0.34 +
    Number(narrative.components?.marketRegime || 0) * 1.2 +
    Number(narrative.components?.catalystFreshness || 0) * 1.2 +
    invalidationBonus -
    exhaustion * 0.32 -
    liquidityRisk * 0.25 -
    gapRisk -
    liquidityDataRisk,
    0,
    100
  ));
}

function liquidityRiskScore(row) {
  const liquidityScore = Number(row.moneyFlowScoreBreakdown?.liquidityScore ?? row.liquiditySummary?.liquidityScore ?? 0);
  const dollarVolume = Number(row.market?.lastClose) * Number(row.market?.volume);
  const lowDollarVolume = Number.isFinite(dollarVolume) && dollarVolume < 100000000 ? 10 : 0;
  return clamp(10 - liquidityScore + lowDollarVolume, 0, 20);
}

function isAboveMovingAverages(market) {
  return isAboveMa(market, 5) && isAboveMa(market, 20);
}

function isAboveMa(market, period) {
  const closes = (market?.history || []).map((bar) => Number(bar.close)).filter(Number.isFinite);
  if (closes.length < period) return false;
  return Number(market?.lastClose ?? closes.at(-1)) >= average(closes.slice(-period));
}

function strengthLabel(score, maxScore) {
  const ratioValue = maxScore ? score / maxScore : 0;
  if (ratioValue >= 0.75) return "강함";
  if (ratioValue >= 0.5) return "보통";
  if (ratioValue >= 0.3) return "약함";
  return "부족";
}

function riskLabel(score) {
  if (score >= 70) return "높음";
  if (score >= 45) return "주의";
  if (score >= 25) return "보통";
  return "낮음";
}

function entryQualityLabel(score) {
  if (score >= 75) return "좋음";
  if (score >= 55) return "보통";
  if (score >= 40) return "관찰";
  return "낮음";
}

function trendStateLabelFor(tsi, exhaustion, breadth, etfSync, volume) {
  if (tsi < 35) return "잠복";
  if (tsi >= 75 && exhaustion >= 65) return "과열";
  if (tsi >= 70 && breadth >= 11 && etfSync >= 8 && volume >= 10) return "확인";
  if (tsi >= 65) return exhaustion >= 45 ? "과열" : "부상";
  if (tsi >= 50 && volume >= 7) return "부상";
  if (tsi >= 45 && (breadth < 7 || volume < 6)) return "약화";
  return "잠복";
}

function trendOneLineJudgment(name, tsi, exhaustion, components, labels) {
  if (tsi >= 70 && exhaustion >= 65) return `${name}는 돈이 강하게 몰리지만 단기 급등과 쏠림이 커서 강하지만 추격 위험 구간이다.`;
  if (tsi >= 65 && labels.themeBreadthLabel === "강함" && labels.etfSyncLabel === "강함") return `${name}는 가격, 거래량, ETF, 확산도가 함께 확인되어 테마 단위 자금 유입이 선명하다.`;
  if (components.marketRegime <= 3) return `${name}는 Trend Strength는 높아도 시장 위험선호가 약해 시장 환경 비우호 구간이다.`;
  if (tsi >= 70 && labels.entryQualityLabel !== "좋음") return `${name}는 돈이 강하게 몰리지만 오늘 진입 품질은 아직 제한적이라 추격보다 조건 확인이 필요하다.`;
  if (tsi >= 50 && labels.entryQualityLabel !== "낮음") return `${name}는 Trend Strength는 중간이지만 진입 품질이 살아나는 초기 진입 후보 성격이다.`;
  if (labels.themeBreadthLabel === "부족") return `${name}는 테마 확산도가 낮아 아직 개별 종목 이벤트성 흐름에 가깝다.`;
  if (labels.etfSyncLabel === "부족") return `${name}는 ETF 동조성이 약해 테마 자금 확인이 부족하다.`;
  return `${name}는 관찰 가능한 흐름은 있으나 가격, 거래량, 확산도 중 일부 확인이 더 필요하다.`;
}

function trendTodayApproach(definition, state, labels, supportEtfs, supportStocks) {
  const etfText = supportEtfs.slice(0, 3).map((row) => row.ticker).join("/") || definition.preferredEtfs.slice(0, 2).join("/");
  const stockText = supportStocks.slice(0, 3).map((row) => row.ticker).join("/") || definition.preferredStocks.slice(0, 2).join("/");
  if (state === "과열") return `${etfText}가 5일선 위에서 눌림 후 재상승하고 ${stockText}의 종가 유지가 확인될 때만 진입 품질이 좋아진다.`;
  if (state === "확인") return `${etfText} 동반 강세가 유지되는 동안 돌파 추격보다 전일 고점 재돌파 또는 5일선 눌림 회복을 기다린다.`;
  if (state === "부상") return `${etfText} 거래량 증가와 ${stockText} 확산을 확인하며 작은 사이즈의 초기 진입 후보로만 본다.`;
  if (state === "약화") return `상승률이 남아 있어도 ${etfText}와 구성 종목 확산도가 회복될 때까지 신규 진입은 낮춘다.`;
  return `${etfText}와 ${stockText}의 거래량 확산이 확인되기 전까지 관찰한다.`;
}

function trendDetailReasons(components, exhaustionRisk, concentration, marketScore, rows, narrativeEtfs) {
  return {
    priceMomentum: `가격 모멘텀 ${components.priceMomentum}/25. 평균 5D ${pct(averageNonEmpty(rows.map((row) => row.market?.return5dPct)))}, 20D ${pct(averageNonEmpty(rows.map((row) => row.market?.return20dPct)))}.`,
    volumeStrength: `거래량 강도 ${components.volumeStrength}/20. 평균 RVOL ${num(averageNonEmpty(rows.map((row) => row.market?.relativeVolume)), 2)}배.`,
    etfSync: `ETF 동조성 ${components.etfSync}/15. 관련 ETF ${narrativeEtfs.map((row) => row.ticker).join(", ") || "데이터 없음"} 흐름을 기준으로 판단.`,
    themeBreadth: `테마 확산도 ${components.themeBreadth}/20. 상위 1~2개 쏠림 감점 ${concentration}점 반영.`,
    catalystFreshness: `뉴스/촉매 신선도 ${components.catalystFreshness}/10. HIGH 직접 촉매 ${rows.filter((row) => row.reasonConfidence === "HIGH" && row.directCatalyst).length}개.`,
    exhaustionRisk: `과열 리스크 ${exhaustionRisk}/100. 단기 급등, 고점 근접, ETF-개별주 괴리, 쏠림을 함께 반영.`,
    marketRegime: `시장 환경 ${marketScore}/10. QQQ/SPY/IWM 가격 흐름 기반 위험선호 점수.`
  };
}

function itemTrendDecisionLine(row, narrative) {
  const trend = Number(narrative.trendStrengthIndex || 0);
  const exhaustion = Number(narrative.exhaustionRisk || 0);
  const entry = Number(row.entryQualityScore ?? narrative.entryQualityScore ?? 0);
  if (trend >= 70 && exhaustion >= 65) return "테마는 강하지만 추격 위험이 커서 돌파 매수보다 눌림 후 재상승 확인이 필요하다.";
  if (trend >= 65 && entry >= 65) return "강한 테마 자금과 종목별 진입 품질이 함께 확인되어 조건 충족 시 우선 관찰한다.";
  if (trend >= 45 && entry >= 60) return "Trend Strength는 중간이지만 Entry Quality가 좋아 초기 진입 후보로 본다.";
  if (narrative.themeBreadthLabel === "부족") return "테마 확산도가 낮아 개별 종목 이벤트성 흐름일 수 있다.";
  if (narrative.etfSyncLabel === "부족") return "ETF 동조성이 약해 테마 자금 확인이 부족하다.";
  if (Number(narrative.components?.marketRegime || 0) <= 3) return "시장 위험선호가 약해 시장 환경 비우호 구간이다.";
  return "강한 흐름과 매수 가능성을 분리해 보고, 진입 조건 확인 전까지 추격은 피한다.";
}

function pickSupportRows(rows, preferredSymbols) {
  const preferred = new Set(preferredSymbols);
  return [...rows]
    .sort((a, b) => {
      const scoreDiff = (b.moneyFlowScoreFinal ?? b.moneyFlowScore ?? 0) - (a.moneyFlowScoreFinal ?? a.moneyFlowScore ?? 0);
      if (scoreDiff) return scoreDiff;
      return (preferred.has(b.ticker) ? 1 : 0) - (preferred.has(a.ticker) ? 1 : 0);
    })
    .filter((row) => (row.moneyFlowScoreFinal ?? row.moneyFlowScore ?? 0) >= 50 || preferred.has(row.ticker))
    .slice(0, 5);
}

function pickSymbols(preferredSymbols, supportRows) {
  const support = new Set(supportRows.map((row) => row.ticker));
  return preferredSymbols.filter((ticker) => support.has(ticker)).slice(0, 3);
}

function narrativeMoneyReason(name, supportEtfs, supportStocks, momentum5, momentum20, relativeVolumeAvg, etfBreadthScore, directNewsCount) {
  const etfText = supportEtfs.slice(0, 3).map((row) => row.ticker).join(", ") || "관련 ETF";
  const stockText = supportStocks.slice(0, 4).map((row) => row.ticker).join(", ") || "관련 종목";
  const breadthText = etfBreadthScore > 0 ? "ETF 확산도도 이를 보조한다" : "ETF 확산도는 추가 확인이 필요하다";
  const newsText = directNewsCount > 0 ? "직접 뉴스/이벤트가 일부 확인된다" : "뉴스 직접성은 아직 제한적이다";
  return `${name} 관련 ${etfText}와 ${stockText}의 5일(${pct(momentum5)})·20일(${pct(momentum20)}) 흐름을 함께 본다. 평균 상대 거래량은 ${num(relativeVolumeAvg, 2)}배이고, ${breadthText}. ${newsText}.`;
}

function narrativeOneLine(name, status, supportEtfs, supportStocks, momentum5, momentum20, directNewsCount) {
  const leaders = [...supportEtfs.slice(0, 2), ...supportStocks.slice(0, 2)].map((row) => row.ticker).join(", ") || "관련 후보";
  const news = directNewsCount > 0 ? "직접 촉매 일부 확인" : "뉴스 직접성 제한";
  return `${leaders} 중심으로 5일 ${pct(momentum5)}, 20일 ${pct(momentum20)} 흐름이 형성됨. ${news}.`;
}

function chooseActionCandidates(stocks, etfs) {
  const pool = [
    ...etfs,
    ...stocks.filter((row) => !row.holdingInfo)
  ].filter((row) => [STATUS.ENTRY_READY, STATUS.ENTRY_CANDIDATE].includes(row.status) && row.reasonConfidence !== "LOW");

  return pool
    .sort(compareActionCandidateScore)
    .slice(0, 3)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function buildReferenceCandidates(stocks, etfs) {
  return {
    etfs: etfs
      .filter((row) => row?.market?.dataStatus === "ok")
      .sort(compareActionCandidateScore)
      .slice(0, 3)
      .map((row, index) => ({ ...row, referenceRank: index + 1, referenceType: "ETF" })),
    stocks: stocks
      .filter((row) => row?.market?.dataStatus === "ok" && !row.holdingInfo)
      .sort(compareActionCandidateScore)
      .slice(0, 3)
      .map((row, index) => ({ ...row, referenceRank: index + 1, referenceType: "STOCK" }))
  };
}

function compareActionCandidateScore(a, b) {
  const scoreA = actionCandidateScore(a);
  const scoreB = actionCandidateScore(b);
  if (scoreA !== scoreB) return scoreB - scoreA;
  return compareFinalScore(a, b);
}

function actionCandidateScore(row) {
  const moneyFlow = Number(row.moneyFlowScoreFinal ?? row.moneyFlowScore ?? 0);
  const trend = Number(row.trendStrengthIndex ?? row.narrativeScore ?? 0);
  const entryQuality = Number(row.entryQualityScore ?? 0);
  const exhaustion = Number(row.exhaustionRisk ?? 0);
  const liquidityRisk = liquidityRiskScore(row);
  const liquidityDataRisk = row.liquiditySummary?.status === "FAILED" ? 8 : 0;
  const invalidationBonus = row.invalidationCondition && row.invalidationCondition !== "데이터 없음" ? 4 : 0;
  const assetBias = row.assetType === "ETF"
    ? Number(row.moneyFlowScoreBreakdown?.etfBreadthScore || 0) * 0.8
    : row.stockVsEtfDecision === "STOCK_PREFERRED" ? 5 : row.stockVsEtfDecision === "ETF_PREFERRED" ? -6 : 0;
  return rounded(clamp(
    trend * 0.28 +
    moneyFlow * 0.32 +
    entryQuality * 0.32 +
    invalidationBonus +
    assetBias -
    exhaustion * 0.22 -
    liquidityRisk * 0.15 -
    liquidityDataRisk,
    0,
    100
  ));
}

function buildDarkHorseCandidates(stocks, actionCandidates, marketLabel) {
  const mainTickers = new Set(actionCandidates.map((row) => row.ticker));
  return stocks
    .filter((row) => row?.assetType === "STOCK" && row?.market?.dataStatus === "ok" && !row.holdingInfo)
    .filter((row) => !mainTickers.has(row.ticker))
    .map((row) => attachDarkHorseScore(row, mainTickers.has(row.ticker), marketLabel))
    .filter((row) => row.darkHorse?.eligible && row.darkHorse.score >= 50)
    .sort((a, b) => b.darkHorse.score - a.darkHorse.score || compareActionCandidateScore(a, b))
    .slice(0, 3)
    .map((row, index) => ({ ...row, darkHorseRank: index + 1 }));
}

function attachDarkHorseScore(row, isMainActionCandidate, marketLabel) {
  const input = darkHorseInput(row, isMainActionCandidate);
  const darkHorse = calculateDarkHorseScore(input, marketLabel);
  return { ...row, darkHorseInput: input, darkHorse };
}

function darkHorseInput(row, isMainActionCandidate) {
  const history = chartBars(row.market?.history || [], 132);
  const closeSeries = history.map((bar) => bar.close);
  const volumeSeries = history.map((bar) => bar.volume);
  const highSeries = history.map((bar) => bar.high);
  const lowSeries = history.map((bar) => bar.low);
  const dateSeries = history.map((bar) => bar.date);
  const ma5Series = movingAverage(closeSeries, 5);
  const ma20Series = movingAverage(closeSeries, 20);
  const latest = history.at(-1);
  const previous = history.at(-2);
  const news = row.newsSummary || {};
  return {
    ticker: row.ticker,
    name: row.name,
    narrative: row.linkedNarrative || "미분류",
    narrativeScore: Number(row.narrativeScore ?? 0),
    trendStrengthIndex: Number(row.trendStrengthIndex ?? 0),
    close: Number(row.market?.lastClose ?? latest?.close),
    previousClose: Number(previous?.close),
    return1D: Number(row.market?.dailyChangePct ?? 0),
    return5D: Number(row.market?.return5dPct ?? 0),
    return20D: Number(row.market?.return20dPct ?? 0),
    rvol: Number(row.market?.relativeVolume ?? 0),
    dollarVolume: Number(row.market?.lastClose) * Number(row.market?.volume),
    ma5: Number(ma5Series.at(-1)),
    ma20: Number(ma20Series.at(-1)),
    ma5Prev: Number(ma5Series.at(-2)),
    ma20Prev: Number(ma20Series.at(-2)),
    ma5Series,
    ma20Series,
    closeSeries,
    volumeSeries,
    highSeries,
    lowSeries,
    dateSeries,
    exhaustionRisk: Number(row.exhaustionRisk ?? 0),
    entryQualityScore: Number(row.entryQualityScore ?? 0),
    moneyFlowScore: Number(row.moneyFlowScoreFinal ?? row.moneyFlowScore ?? 0),
    liquidityStatus: row.liquiditySummary?.liquiditySignal || row.liquiditySummary?.dollarVolumeLiquidity || "UNKNOWN",
    spreadStatus: "UNKNOWN",
    directNewsScore: Number(news.directnessScore ?? 0) + Number(news.strongCatalystCount ?? 0) * 2,
    newsDirection: newsDirectionLabel(news),
    isMainActionCandidate
  };
}

function newsDirectionLabel(news) {
  if (!news) return "unknown";
  if (Number(news.directionScore || 0) > 0) return "positive";
  if (Number(news.directionScore || 0) < 0) return "negative";
  const counts = news.sentimentCounts || {};
  if ((counts.positive || 0) > (counts.negative || 0)) return "positive";
  if ((counts.negative || 0) > (counts.positive || 0)) return "negative";
  return "neutral";
}

function calculateDarkHorseScore(c, marketLabel) {
  const filter = darkHorseHardFilterResult(c);
  if (!filter.eligible) {
    return {
      score: 0,
      eligible: false,
      label: "제외",
      stage: "제외",
      confidence: "LOW",
      reason: filter.reason,
      breakdown: {}
    };
  }
  const breakdown = {
    narrativeAlignmentScore: calcNarrativeAlignmentScore(c),
    earlyTrendStructureScore: calcEarlyTrendStructureScore(c),
    baseBreakoutScore: calcBaseBreakoutScore(c),
    volumeConfirmationScore: calcVolumeConfirmationScore(c),
    lowExhaustionScore: calcLowExhaustionScore(c),
    liquidityRiskScore: calcDarkHorseLiquidityScore(c),
    riskPenalty: calcDarkHorseRiskPenalty(c, marketLabel)
  };
  const rawScore = rounded(
    breakdown.narrativeAlignmentScore +
    breakdown.earlyTrendStructureScore +
    breakdown.baseBreakoutScore +
    breakdown.volumeConfirmationScore +
    breakdown.lowExhaustionScore +
    breakdown.liquidityRiskScore -
    breakdown.riskPenalty
  );
  const score = rounded(clamp(rawScore, 0, 100));
  return {
    score,
    eligible: true,
    breakdown: { ...breakdown, rawScore },
    label: getDarkHorseLabel(score),
    stage: getDarkHorseStage(c),
    confidence: getDarkHorseConfidence(score, c),
    reason: generateDarkHorseReason(c),
    confirmCondition: generateDarkHorseConfirmCondition(c),
    invalidationCondition: generateDarkHorseInvalidationCondition(c),
    whyNotMain: generateWhyNotMainCandidate(c)
  };
}

function darkHorseHardFilterResult(c) {
  if (c.isMainActionCandidate) return { eligible: false, reason: "이미 메인 행동 후보에 포함됨" };
  const themeOk = c.narrativeScore >= 65 || (c.trendStrengthIndex ?? 0) >= 65;
  if (!themeOk) return { eligible: false, reason: "상위 서사 정렬 부족" };
  if (!hasDarkHorseRequiredData(c)) return { eligible: false, reason: "다크호스 필수 가격/거래량 데이터 부족" };
  if (c.close <= c.ma20) return { eligible: false, reason: "종가가 MA20 아래" };
  const maStructureOk = c.ma5 >= c.ma20 || crossedAboveRecently(c.ma5Series, c.ma20Series, 7);
  if (!maStructureOk) return { eligible: false, reason: "MA5/MA20 정렬 개선 부족" };
  if (c.rvol < 0.9) return { eligible: false, reason: "RVOL 0.90x 미만" };
  if (c.exhaustionRisk > 60) return { eligible: false, reason: "Exhaustion Risk 과다" };
  if (c.return5D > 18) return { eligible: false, reason: "5D 수익률 과도" };
  if (c.return20D > 45) return { eligible: false, reason: "20D 수익률 과도" };
  if (c.newsDirection === "negative" && (c.directNewsScore ?? 0) >= 7) return { eligible: false, reason: "부정 직접 뉴스" };
  if (c.liquidityStatus === "LOW" || c.liquidityStatus === "LOW_LIQUIDITY") return { eligible: false, reason: "유동성 부족" };
  return { eligible: true, reason: "필수 조건 통과" };
}

function hasDarkHorseRequiredData(c) {
  return Number.isFinite(c.close) &&
    Number.isFinite(c.return5D) &&
    Number.isFinite(c.return20D) &&
    Number.isFinite(c.rvol) &&
    Number.isFinite(c.ma5) &&
    Number.isFinite(c.ma20) &&
    c.closeSeries.length >= 20 &&
    c.volumeSeries.length >= 20 &&
    Number.isFinite(c.exhaustionRisk) &&
    (Number.isFinite(c.narrativeScore) || Number.isFinite(c.trendStrengthIndex));
}

function calcNarrativeAlignmentScore(c) {
  const narrative = c.narrativeScore ?? 0;
  const tsi = c.trendStrengthIndex ?? narrative;
  if (narrative >= 85 || tsi >= 85) return 20;
  if (narrative >= 75 || tsi >= 75) return 17;
  if (narrative >= 65 || tsi >= 65) return 13;
  if (narrative >= 55 || tsi >= 55) return 7;
  return 0;
}

function calcEarlyTrendStructureScore(c) {
  let score = 0;
  if (c.close > c.ma20) score += 6;
  if (c.close > c.ma5) score += 5;
  if (c.ma5 > c.ma20) score += 7;
  if (crossedAboveRecently(c.ma5Series, c.ma20Series, 7)) score += 6;
  if (slopePositive(c.ma20Series, 5)) score += 4;
  if (higherLows(c.lowSeries, 10)) score += 2;
  return rounded(clamp(score, 0, 30));
}

function calcBaseBreakoutScore(c) {
  const recentHigh = recentPriorHigh(c.highSeries, 15);
  const recentLow = recentPriorLow(c.lowSeries, 15);
  if (!Number.isFinite(recentHigh) || !Number.isFinite(recentLow) || recentLow <= 0) return 0;
  const distanceToHighPct = ((c.close - recentHigh) / recentHigh) * 100;
  const rangePct = ((recentHigh - recentLow) / recentLow) * 100;
  let score = 0;
  if (c.close > recentHigh) score += 8;
  else if (distanceToHighPct >= -3 && distanceToHighPct <= 0) score += 5;
  if (rangePct <= 18) score += 4;
  else if (rangePct <= 25) score += 2;
  if (c.close > c.ma5 && c.ma5 > c.ma20) score += 3;
  return rounded(clamp(score, 0, 20));
}

function calcVolumeConfirmationScore(c) {
  let score = 0;
  if (c.rvol >= 1.0) score += 4;
  if (c.rvol >= 1.2) score += 3;
  const avg3 = average(c.volumeSeries.slice(-3));
  const avg20 = average(c.volumeSeries.slice(-20));
  if (Number.isFinite(avg3) && Number.isFinite(avg20) && avg3 > avg20) score += 4;
  if (upVolumeDominates(c.closeSeries, c.volumeSeries, 10)) score += 3;
  if (lastCandleBearishOnHighVolume(c)) score -= 3;
  return rounded(clamp(score, 0, 15));
}

function calcLowExhaustionScore(c) {
  let score = c.exhaustionRisk <= 25 ? 10 : c.exhaustionRisk <= 35 ? 8 : c.exhaustionRisk <= 45 ? 6 : c.exhaustionRisk <= 55 ? 3 : 0;
  if (c.return5D < 0) score -= 3;
  if (c.return20D < 0) score -= 3;
  if (c.return5D > 15) score -= 3;
  if (c.return20D > 40) score -= 3;
  return rounded(clamp(score, 0, 10));
}

function calcDarkHorseLiquidityScore(c) {
  if (c.liquidityStatus === "LIQUID") return 5;
  if (c.liquidityStatus === "ACCEPTABLE") return 3;
  if (c.liquidityStatus === "UNKNOWN") return 2;
  return 0;
}

function calcDarkHorseRiskPenalty(c, marketLabel) {
  let penalty = 0;
  if (c.newsDirection === "negative" && (c.directNewsScore ?? 0) >= 7) penalty += 8;
  if (lastCandleBearishOnHighVolume(c)) penalty += 6;
  if (c.return5D > 18) penalty += 5;
  if (c.return20D > 45) penalty += 5;
  if (c.exhaustionRisk > 60) penalty += 8;
  const distanceFromMA20Pct = ((c.close - c.ma20) / c.ma20) * 100;
  if (distanceFromMA20Pct > 18) penalty += 4;
  if (c.liquidityStatus === "LOW" || c.liquidityStatus === "LOW_LIQUIDITY") penalty += 6;
  if (marketLabel === "위험회피") penalty += 4;
  return rounded(clamp(penalty, 0, 20));
}

function crossedAboveRecently(shortSeries = [], longSeries = [], lookbackDays = 7) {
  const start = Math.max(1, shortSeries.length - lookbackDays);
  for (let i = start; i < shortSeries.length; i += 1) {
    const prevShort = Number(shortSeries[i - 1]);
    const prevLong = Number(longSeries[i - 1]);
    const nowShort = Number(shortSeries[i]);
    const nowLong = Number(longSeries[i]);
    if ([prevShort, prevLong, nowShort, nowLong].every(Number.isFinite) && prevShort <= prevLong && nowShort > nowLong) return true;
  }
  return false;
}

function slopePositive(series = [], lookbackDays = 5) {
  const valid = series.filter(Number.isFinite);
  if (valid.length <= lookbackDays) return false;
  return valid.at(-1) > valid.at(-1 - lookbackDays);
}

function higherLows(series = [], lookbackDays = 10) {
  const lows = series.slice(-lookbackDays).map(Number).filter(Number.isFinite);
  if (lows.length < 4) return false;
  const firstHalf = lows.slice(0, Math.floor(lows.length / 2));
  const secondHalf = lows.slice(Math.floor(lows.length / 2));
  return Math.min(...secondHalf) > Math.min(...firstHalf);
}

function upVolumeDominates(closeSeries = [], volumeSeries = [], lookbackDays = 10) {
  let up = 0;
  let down = 0;
  const start = Math.max(1, closeSeries.length - lookbackDays);
  for (let i = start; i < closeSeries.length; i += 1) {
    const volume = Number(volumeSeries[i]);
    if (!Number.isFinite(volume)) continue;
    if (Number(closeSeries[i]) >= Number(closeSeries[i - 1])) up += volume;
    else down += volume;
  }
  return up > down;
}

function lastCandleBearishOnHighVolume(c) {
  const latestClose = Number(c.closeSeries.at(-1));
  const previousClose = Number(c.closeSeries.at(-2));
  const latestVolume = Number(c.volumeSeries.at(-1));
  const avg20 = average(c.volumeSeries.slice(-20));
  return Number.isFinite(latestClose) && Number.isFinite(previousClose) && Number.isFinite(latestVolume) && Number.isFinite(avg20) && latestClose < previousClose && latestVolume > avg20 * 1.4;
}

function recentPriorHigh(series = [], lookback = 15) {
  const values = series.slice(-lookback - 1, -1).map(Number).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function recentPriorLow(series = [], lookback = 15) {
  const values = series.slice(-lookback - 1, -1).map(Number).filter(Number.isFinite);
  return values.length ? Math.min(...values) : null;
}

function findRecentSwingLow(series = [], lookback = 10) {
  const values = series.slice(-lookback).map(Number).filter(Number.isFinite);
  return values.length ? Math.min(...values) : null;
}

function getDarkHorseLabel(score) {
  if (score >= 80) return "강한 다크호스";
  if (score >= 70) return "다크호스 후보";
  if (score >= 60) return "관찰 후보";
  if (score >= 50) return "초기 관찰";
  return "제외";
}

function getDarkHorseStage(c) {
  const recentHigh = recentPriorHigh(c.highSeries, 15);
  const distanceToHighPct = Number.isFinite(recentHigh) ? ((c.close - recentHigh) / recentHigh) * 100 : null;
  const crossedMARecently = crossedAboveRecently(c.ma5Series, c.ma20Series, 7);
  if (Number.isFinite(recentHigh) && c.close > recentHigh && c.rvol >= 1.2 && c.ma5 > c.ma20) return "베이스 돌파 확인";
  if (Number.isFinite(distanceToHighPct) && distanceToHighPct >= -3 && distanceToHighPct <= 0 && c.ma5 >= c.ma20) return "베이스 돌파 직전";
  if (crossedMARecently && c.close > c.ma20) return "초기 반전";
  if (c.close > c.ma5 && c.ma5 > c.ma20 && c.return5D > 8) return "첫 눌림 대기";
  if (c.moneyFlowScore >= 75 && c.entryQualityScore >= 60 && c.exhaustionRisk <= 50) return "메인 후보 승격 가능";
  return "초기 관찰";
}

function getDarkHorseConfidence(score, c) {
  if (score >= 85 && c.rvol >= 1.2 && c.narrativeScore >= 75 && c.close > c.ma5 && c.ma5 > c.ma20 && c.exhaustionRisk <= 35) return "HIGH";
  if (score >= 75 && c.rvol >= 1.1 && c.narrativeScore >= 70 && c.exhaustionRisk <= 45) return "MEDIUM";
  return "LOW";
}

function generateDarkHorseReason(c) {
  const breakoutStatus = darkHorseBreakoutStatus(c);
  const volumeStatus = c.rvol >= 1.2 ? "충분하다" : c.rvol >= 1.0 ? "보통 수준이다" : "아직 약하다";
  return `${c.ticker}는 ${c.narrative} 서사에 속하고 종가가 MA20 위에 있으며 MA5/MA20 정렬이 개선되고 있다. 최근 15거래일 베이스는 ${breakoutStatus} 상태이고, RVOL ${num(c.rvol, 2)}x로 거래량 확인은 ${volumeStatus}. Exhaustion Risk ${c.exhaustionRisk}로 아직 메인 후보 대비 과열 상한 안에 있다.`;
}

function darkHorseBreakoutStatus(c) {
  const recentHigh = recentPriorHigh(c.highSeries, 15);
  if (!Number.isFinite(recentHigh)) return "확인 부족";
  const distanceToHighPct = ((c.close - recentHigh) / recentHigh) * 100;
  if (c.close > recentHigh) return "상단 돌파";
  if (distanceToHighPct >= -3) return "상단 돌파 직전";
  return "돌파 대기";
}

function generateDarkHorseConfirmCondition(c) {
  const conditions = [];
  const recentHigh = recentPriorHigh(c.highSeries, 15);
  if (Number.isFinite(recentHigh) && c.close <= recentHigh) conditions.push(`최근 15거래일 고점 ${priceFixed(recentHigh)} 돌파`);
  else conditions.push("돌파 후 고점 위 안착 유지");
  if (c.rvol < 1.2) conditions.push("RVOL 1.20x 이상 재증가");
  conditions.push("MA5 위 종가 유지");
  conditions.push("관련 ETF 동반 강세");
  return conditions.join(", ");
}

function generateDarkHorseInvalidationCondition(c) {
  const conditions = [`MA20 ${priceFixed(c.ma20)} 종가 이탈`];
  const swingLow = findRecentSwingLow(c.lowSeries, 10);
  if (Number.isFinite(swingLow)) conditions.push(`최근 스윙 저점 ${priceFixed(swingLow)} 이탈`);
  conditions.push("RVOL 0.80x 이하 둔화");
  return conditions.join(", ");
}

function generateWhyNotMainCandidate(c) {
  const reasons = [];
  if (c.entryQualityScore < 60) reasons.push(`Entry Quality ${c.entryQualityScore} < 60`);
  if (c.moneyFlowScore < 75) reasons.push(`moneyFlowScore ${c.moneyFlowScore} < 75`);
  if (c.rvol < 1.2) reasons.push(`RVOL ${num(c.rvol, 2)}x < 1.20x`);
  if (darkHorseBreakoutStatus(c) !== "상단 돌파") reasons.push("최근 고점 돌파 확인 전");
  return reasons.join(", ") || "메인 후보 조건에 근접했지만 다음 거래일 확인이 필요";
}

async function buildReport() {
  const rawWatchlist = readJson("watchlist.json", []);
  const rawHoldings = readJson("holdings.json", []);
  const marketData = MODE === "REAL_TEST" ? readJson("market_data_real.json", { items: {} }) : null;
  const rawEtfs = readJson("watchlist_etfs.json", []);
  const rawNarrativeStocks = readConfigJson("narrativeStocks.json", []);
  const stockUniverse = await fetchNasdaq100Universe();
  const rawScanStocks = uniqueStocksByTicker([
    ...stockUniverse.members.map(universeMemberToStock),
    ...rawNarrativeStocks.map(narrativeStockToStock)
  ]);
  const baseSupplementalData = createBaseSupplementalData(rawScanStocks, rawEtfs, marketData);
  const preliminaryEtfs = rawEtfs.map((etf) => enrichEtf(etf, marketData, baseSupplementalData));
  const preliminaryScanStocks = rawScanStocks.map((stock) => enrichStock(stock, preliminaryEtfs, marketData, baseSupplementalData));
  const detailedScanTickers = new Set(preliminaryScanStocks.sort(compareInitialScore).slice(0, 20).map((row) => row.ticker));
  const detailedScanStocks = rawScanStocks.filter((row) => detailedScanTickers.has(row.ticker));
  const supplementalData = await collectSupplementalData(detailedScanStocks, [], rawEtfs, marketData);
  const etfs = rawEtfs.map((etf) => enrichEtf(etf, marketData, supplementalData));
  const watchlist = rawScanStocks.map((stock) => enrichStock(stock, etfs, marketData, supplementalData));
  const holdings = [];
  const stocks = watchlist;
  const validEtfs = etfs.filter((etf) => MODE !== "REAL_TEST" || etf.market.dataStatus === "ok");
  const narratives = buildNarratives(stocks, validEtfs);
  applyNarrativeLinks([...stocks, ...etfs], narratives);
  const marketLabel = marketStatus(etfs);
  applyActionLabelGates([...stocks, ...etfs], marketLabel);
  const etfTop5 = [...validEtfs].sort(compareActionCandidateScore).slice(0, 5);
  const stockTop5 = [...stocks].sort(compareActionCandidateScore).slice(0, 5);
  const etfActionCandidates = validEtfs.filter((row) => [STATUS.ENTRY_CANDIDATE, STATUS.ENTRY_READY].includes(row.status)).sort(compareActionCandidateScore).slice(0, 5);
  const stockActionCandidates = watchlist.filter((row) => [STATUS.ENTRY_CANDIDATE, STATUS.ENTRY_READY].includes(row.status)).sort(compareActionCandidateScore).slice(0, 5);
  const entryCandidates = stockActionCandidates;
  const cautionRows = stocks.filter((row) => [STATUS.EXIT, STATUS.BAN].includes(row.status));
  const etfOverheat = validEtfs.filter((row) => ["높음", "중간", "낮음~중간"].includes(row.overheatingRisk)).sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const stockCautionRows = watchlist.filter((row) => [STATUS.WATCH, STATUS.BAN].includes(row.status) || row.stockVsEtfDecision !== "STOCK_PREFERRED").sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const etfBanRows = validEtfs.filter((row) => row.status === STATUS.BAN || row.moneyFlowScore < 50).sort((a, b) => a.moneyFlowScore - b.moneyFlowScore).slice(0, 5);
  const overheat = etfOverheat;
  const actionCandidates = chooseActionCandidates(stocks, etfs);
  const darkHorseCandidates = buildDarkHorseCandidates(stocks, actionCandidates, marketLabel);
  const referenceCandidates = actionCandidates.length ? { etfs: [], stocks: [] } : buildReferenceCandidates(stocks, validEtfs);
  const topExecutionCandidate = chooseTopExecutionCandidate(etfActionCandidates, stockActionCandidates);
  const previousSnapshot = loadPreviousRecommendationSnapshot();
  const previousRecommendationReviews = buildPreviousRecommendationReviews(previousSnapshot, stocks, etfs);
  const stockScanSummary = buildStockScanSummary(stockUniverse, stocks, detailedScanTickers);
  const stockUniverseScan = buildStockUniverseScanSummary(stockUniverse, stocks);
  const chartTickers = unique([
    ...actionCandidates.map((row) => row.ticker),
    ...darkHorseCandidates.map((row) => row.ticker),
    ...etfTop5.map((row) => row.ticker),
    ...stockTop5.slice(0, 5).map((row) => row.ticker),
    ...previousRecommendationReviews.map((row) => row.ticker)
  ]);
  const chartCount = generateCharts(chartTickers, marketData);
  const generatedAtDate = new Date();
  const generatedAtETParts = easternTimeParts(generatedAtDate);
  const dataReliability = buildDataReliability(marketData, supplementalData, generatedAtDate);
  const actionGateSummary = buildActionGateSummary([...stocks, ...validEtfs]);
  const todayDecision = buildTodayDecision({
    actionCandidates,
    etfActionCandidates,
    stockActionCandidates,
    stocks,
    etfs: validEtfs,
    dataReliability,
    actionGateSummary
  });

  const report = {
    generatedAt: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "full", timeStyle: "short" }).format(generatedAtDate),
    generatedAtISO: generatedAtDate.toISOString(),
    generatedAtET: formatEasternTimestamp(generatedAtETParts),
    generatedAtETParts,
    reportDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(generatedAtDate),
    dataMode: MODE,
    dataWarning: MODE === "REAL_TEST" ? dynamicDataWarning(supplementalData.connectionStatus) : MOCK_WARNING,
    dataConnectionStatus: supplementalData.connectionStatus,
    supplementalData,
    dataReliability,
    todayDecision,
    actionGateSummary,
    marketData,
    marketLabel,
    stockUniverse,
    stockScanSummary,
    stockUniverseScan,
    previousSnapshot,
    previousRecommendationReviews,
    etfs,
    watchlist,
    holdings,
    stocks,
    narratives,
    topNarratives: narratives.slice(0, 3),
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
    darkHorseCandidates,
    referenceCandidates,
    topExecutionCandidate,
    chartCount
  };
  report.recommendationTracking = updateRecommendationTrackingHistory(report);
  saveDailyRecommendationSnapshot(report);
  return report;
}

function createBaseSupplementalData(rawStocks, rawEtfs, marketData) {
  const tickers = unique([...rawStocks.map((row) => row.ticker), ...rawEtfs.map((row) => row.ticker)]);
  const byTicker = Object.fromEntries(tickers.map((ticker) => [ticker, {
    liquidity: fetchLiquidityProfile(ticker, marketItem(marketData, ticker))
  }]));
  return {
    byTicker,
    connectionStatus: {
      priceVolume: marketData?.items && Object.values(marketData.items).some((item) => item.dataStatus === "ok") ? "CONNECTED" : "FAILED",
      news: "DISABLED",
      etfBreadth: "DISABLED",
      liquidity: aggregateStatus(tickers.map((ticker) => byTicker[ticker]?.liquidity?.status)),
      lastUpdated: new Date().toISOString(),
      notes: ["preliminary price/volume scan; detailed providers limited to top stock candidates"]
    }
  };
}

function buildStockScanSummary(stockUniverse, stocks, detailedScanTickers) {
  const total = stockUniverse.members.length;
  const success = stocks.filter((row) => row.market?.dataStatus === "ok").length;
  const failed = total - success;
  const entry = stocks.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED" && [STATUS.ENTRY_READY, STATUS.ENTRY_CANDIDATE].includes(row.status)).length;
  const pullback = stocks.filter((row) => row.status === STATUS.ENTRY_CANDIDATE && row.stockVsEtfDecision !== "STOCK_PREFERRED").length;
  const watch = stocks.filter((row) => row.status === STATUS.WATCH).length;
  const ban = stocks.filter((row) => row.status === STATUS.BAN).length;
  return {
    universeName: stockUniverse.universeName,
    universeSource: stockUniverse.source,
    universeFetchStatus: stockUniverse.fetchStatus,
    universeNotes: stockUniverse.notes || [],
    total,
    success,
    failed,
    detailedCount: detailedScanTickers.size,
    entry,
    pullback,
    watch,
    ban
  };
}

function buildStockUniverseScanSummary(stockUniverse, stocks) {
  const results = stocks.map(stockScanResult).sort(compareStockScanResults);
  const successCount = results.filter((row) => row.scanStatus === "OK").length;
  const failedCount = results.filter((row) => row.scanStatus !== "OK").length;
  return {
    universeName: "NASDAQ_100",
    asOfDate: stockUniverse.asOfDate,
    totalCount: stockUniverse.members.length,
    successCount,
    failedCount,
    scoreBands: {
      strong: results.filter((row) => Number(row.moneyFlowScoreInitial) >= 80).length,
      interest: results.filter((row) => Number(row.moneyFlowScoreInitial) >= 65 && Number(row.moneyFlowScoreInitial) < 80).length,
      watch: results.filter((row) => Number(row.moneyFlowScoreInitial) >= 50 && Number(row.moneyFlowScoreInitial) < 65).length,
      low: results.filter((row) => row.scanStatus !== "OK" || Number(row.moneyFlowScoreInitial) < 50).length
    },
    results
  };
}

function stockScanResult(row) {
  const ok = row.market?.dataStatus === "ok" && Number.isFinite(row.moneyFlowScoreInitial);
  return {
    ticker: row.ticker,
    name: row.name || row.ticker,
    assetType: "STOCK",
    moneyFlowScore: ok ? row.moneyFlowScoreInitial : null,
    moneyFlowScoreInitial: ok ? row.moneyFlowScoreInitial : null,
    moneyFlowScoreFinal: ok ? row.moneyFlowScoreFinal : null,
    finalRawScore: ok ? row.moneyFlowScoreBreakdown?.finalRawScore : null,
    todayActionLabel: row.todayActionLabel,
    reasonConfidence: row.reasonConfidence,
    oneDayReturn: row.market?.dailyChangePct ?? null,
    fiveDayReturn: row.market?.return5dPct ?? null,
    twentyDayReturn: row.market?.return20dPct ?? null,
    relativeVolume: row.market?.relativeVolume ?? null,
    relatedEtfs: row.relatedEtfs?.map((etf) => etf.ticker) || row.relatedEtfSymbols || ["QQQ 기본 매핑"],
    scoreBandLabel: ok ? scoreBandLabel(row.moneyFlowScoreInitial) : "계산 실패",
    scanStatus: ok ? "OK" : "FAILED",
    failureReason: ok ? "" : row.market?.error || "price/volume data missing or score calculation failed"
  };
}

function compareStockScanResults(a, b) {
  const scoreA = Number.isFinite(a.moneyFlowScoreInitial) ? a.moneyFlowScoreInitial : -1;
  const scoreB = Number.isFinite(b.moneyFlowScoreInitial) ? b.moneyFlowScoreInitial : -1;
  if (scoreA !== scoreB) return scoreB - scoreA;
  const r5a = Number.isFinite(a.fiveDayReturn) ? a.fiveDayReturn : -999;
  const r5b = Number.isFinite(b.fiveDayReturn) ? b.fiveDayReturn : -999;
  if (r5a !== r5b) return r5b - r5a;
  const volA = Number.isFinite(a.relativeVolume) ? a.relativeVolume : -1;
  const volB = Number.isFinite(b.relativeVolume) ? b.relativeVolume : -1;
  return volB - volA;
}

function scoreBandLabel(score) {
  if (score >= 80) return "강한 자금 유입 후보";
  if (score >= 65) return "관심 후보";
  if (score >= 50) return "관찰 후보";
  return "우선순위 낮음/매매 금지";
}

function loadPreviousRecommendationSnapshot() {
  const previousPath = path.join(DATA_DIR, "previous-report.json");
  const latestPath = path.join(DATA_DIR, "latest-report.json");
  if (fs.existsSync(previousPath)) {
    return JSON.parse(fs.readFileSync(previousPath, "utf8"));
  }
  if (fs.existsSync(latestPath)) {
    return JSON.parse(fs.readFileSync(latestPath, "utf8"));
  }
  return null;
}

function saveDailyRecommendationSnapshot(report) {
  ensureDir(DAILY_REPORTS_DIR);
  const latestPath = path.join(DATA_DIR, "latest-report.json");
  const previousPath = path.join(DATA_DIR, "previous-report.json");
  if (fs.existsSync(latestPath)) {
    try {
      fs.copyFileSync(latestPath, previousPath);
    } catch (_error) {
      // Snapshot rollover should never break report generation.
    }
  }
  const snapshot = createRecommendationSnapshot(report);
  const datedPath = path.join(DAILY_REPORTS_DIR, `${snapshot.reportDate}.json`);
  fs.writeFileSync(datedPath, JSON.stringify(snapshot, null, 2), "utf8");
  fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2), "utf8");
}

function createRecommendationSnapshot(report) {
  return {
    reportDate: report.reportDate,
    generatedAt: report.generatedAt,
    stockUniverseScan: report.stockUniverseScan,
    narratives: report.narratives.map(snapshotNarrative),
    topNarratives: report.topNarratives.map(snapshotNarrative),
    etfActionCandidates: report.etfActionCandidates.map(snapshotItem),
    stockActionCandidates: report.stockActionCandidates.map(snapshotItem),
    actionCandidates: report.actionCandidates.map(snapshotItem),
    darkHorseCandidates: (report.darkHorseCandidates || []).map(snapshotDarkHorseItem),
    stockEntryCandidates: report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map(snapshotItem),
    stockPullbackCandidates: report.stockActionCandidates.filter((row) => row.stockVsEtfDecision !== "STOCK_PREFERRED").map(snapshotItem),
    stockWatchCandidates: report.stockCautionRows.filter((row) => row.status === STATUS.WATCH).map(snapshotItem),
    etfWatchCandidates: report.etfs.filter((row) => row.status === STATUS.WATCH).slice(0, 5).map(snapshotItem),
    referenceCandidates: {
      etfs: (report.referenceCandidates?.etfs || []).map(snapshotItem),
      stocks: (report.referenceCandidates?.stocks || []).map(snapshotItem)
    },
    finalTopPick: report.topExecutionCandidate ? snapshotItem(report.topExecutionCandidate) : undefined,
    dataReliability: report.dataReliability,
    todayDecision: report.todayDecision,
    actionGateSummary: report.actionGateSummary,
    dataMode: report.dataMode
  };
}

function snapshotDarkHorseItem(row) {
  return {
    ...snapshotItem(row),
    darkHorseRank: row.darkHorseRank,
    darkHorseScore: row.darkHorse?.score,
    darkHorseLabel: row.darkHorse?.label,
    darkHorseStage: row.darkHorse?.stage,
    darkHorseConfidence: row.darkHorse?.confidence,
    darkHorseReason: row.darkHorse?.reason,
    darkHorseConfirmCondition: row.darkHorse?.confirmCondition,
    darkHorseInvalidationCondition: row.darkHorse?.invalidationCondition,
    darkHorseWhyNotMain: row.darkHorse?.whyNotMain,
    darkHorseBreakdown: row.darkHorse?.breakdown
  };
}

function snapshotItem(row) {
  return {
    ticker: row.ticker,
    assetType: row.assetType,
    name: row.name,
    actionLabel: row.todayActionLabel,
    moneyFlowScore: row.moneyFlowScore,
    moneyFlowScoreInitial: row.moneyFlowScoreInitial,
    moneyFlowScoreFinal: row.moneyFlowScoreFinal,
    finalRawScore: row.moneyFlowScoreBreakdown?.finalRawScore,
    finalDisplayScore: row.moneyFlowScoreBreakdown?.finalDisplayScore,
    wasCapped: row.moneyFlowScoreBreakdown?.wasCapped,
    capReason: row.moneyFlowScoreBreakdown?.capReason,
    formulaText: row.moneyFlowScoreBreakdown?.formulaText,
    riskPenalty: row.moneyFlowScoreBreakdown?.riskPenalty,
    riskPenaltySummary: row.moneyFlowScoreBreakdown?.riskPenaltySummary,
    reasonConfidence: row.reasonConfidence,
    reasonConfidenceExplanation: row.reasonConfidenceExplanation,
    directCatalyst: row.directCatalyst,
    tieBreakerReason: row.tieBreakerReason,
    entryCondition: row.entryCondition,
    invalidationCondition: row.invalidationCondition,
    actionGate: row.actionGate,
    marketContext: row.marketContext,
    linkedNarrative: row.linkedNarrative || "미분류",
    narrativeStatus: row.narrativeStatus || "관찰",
    narrativeScore: row.narrativeScore ?? 0,
    relatedEtfs: row.relatedEtfs?.map((etf) => etf.ticker) || [],
    closePriceAtRecommendation: row.market?.lastClose ?? null,
    recommendationDate: row.market?.dataDate || new Date().toISOString().slice(0, 10)
  };
}

function updateRecommendationTrackingHistory(report) {
  const stored = readJson(RECOMMENDATION_HISTORY_FILE, { version: 1, items: [] }) || { version: 1, items: [] };
  const items = Array.isArray(stored.items) ? stored.items : [];
  const byKey = new Map(items.map((item) => [trackingKey(item), item]));
  for (const entry of buildTrackingSeedEntries(report)) {
    const key = trackingKey(entry);
    if (byKey.has(key)) {
      const existing = byKey.get(key);
      byKey.set(key, { ...entry, ...existing, reportGeneratedAtET: entry.reportGeneratedAtET });
    } else {
      byKey.set(key, entry);
    }
  }
  const updatedItems = [...byKey.values()]
    .map((item) => updateTrackingEntry(item, report.marketData))
    .sort((a, b) => `${b.reportDate}-${b.assetType}-${b.rank}`.localeCompare(`${a.reportDate}-${a.assetType}-${a.rank}`));
  const history = {
    version: 1,
    updatedAt: new Date().toISOString(),
    description: "DailyTradingThesisAgent recommendation tracking history. STOCK tracks first regular session; ETF tracks one-week theme/swing window.",
    items: updatedItems
  };
  fs.writeFileSync(path.join(DATA_DIR, RECOMMENDATION_HISTORY_FILE), JSON.stringify(history, null, 2), "utf8");
  return buildRecommendationTrackingView(updatedItems);
}

function buildTrackingSeedEntries(report) {
  return [
    ...report.stockActionCandidates.slice(0, 3).map((row, index) => createTrackingSeed(row, "STOCK", index + 1, report)),
    ...report.etfActionCandidates.slice(0, 3).map((row, index) => createTrackingSeed(row, "ETF", index + 1, report))
  ];
}

function createTrackingSeed(row, assetType, rank, report) {
  const recommendationPrice = row.market?.lastClose ?? null;
  const base = {
    reportDate: report.reportDate,
    reportGeneratedAt: report.generatedAtISO,
    reportGeneratedAtET: report.generatedAtET,
    ticker: row.ticker,
    assetType,
    rank,
    recommendationPrice,
    recommendationClosePrice: row.market?.lastClose ?? null,
    narrative: row.linkedNarrative || row.primaryTheme || row.categoryType || "미분류",
    moneyFlowScore: row.moneyFlowScoreFinal ?? row.moneyFlowScore ?? null,
    finalRawScore: row.moneyFlowScoreBreakdown?.finalRawScore ?? null,
    confidence: row.reasonConfidence || null,
    actionLabel: row.todayActionLabel || null
  };
  if (assetType === "STOCK") {
    return {
      ...base,
      trackingSessionDate: stockTrackingSessionDate(report.generatedAtETParts.date, marketCalendarDates(report.marketData), report.generatedAtETParts),
      trackingStatus: "pending",
      intradayHighAfterRecommendation: null,
      trackingClose: null,
      highReturnPct: null,
      closeReturnPct: null,
      resultLabel: "추적 대기",
      resultComment: "아직 추적 거래일 데이터가 완성되지 않음"
    };
  }
  return {
    ...base,
    trackingStartDate: report.reportDate,
    trackingEndDate: addWeekdays(report.reportDate, 5),
    trackingStatus: "pending",
    weeklyHigh: null,
    latestClose: null,
    weeklyHighReturnPct: null,
    latestCloseReturnPct: null,
    resultLabel: "진행 중",
    resultComment: "아직 1주 추적 기간이 끝나지 않음"
  };
}

function trackingKey(item) {
  return `${item.reportDate}|${item.assetType}|${item.ticker}`;
}

function updateTrackingEntry(item, marketData) {
  if (item.assetType === "ETF") return updateEtfTrackingEntry(item, marketData);
  return updateStockTrackingEntry(item, marketData);
}

function updateStockTrackingEntry(item, marketData) {
  const market = marketItem(marketData, item.ticker);
  const bar = findHistoryBar(market, item.trackingSessionDate);
  const base = Number(item.recommendationPrice ?? item.recommendationClosePrice);
  if (!market || market.dataStatus !== "ok") {
    return { ...item, trackingStatus: "error", resultLabel: "추적 대기", resultComment: "가격 데이터 수집 실패" };
  }
  if (!bar) {
    return { ...item, trackingStatus: "pending", resultLabel: "추적 대기", resultComment: "아직 추적 거래일 데이터가 완성되지 않음" };
  }
  const high = Number(bar.high);
  const close = Number(bar.close);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(close)) {
    return { ...item, trackingStatus: "error", trackingClose: Number.isFinite(close) ? close : null, resultLabel: "추적 대기", resultComment: "추천 기준가 또는 종가 데이터가 부족함" };
  }
  if (!Number.isFinite(high)) {
    return {
      ...item,
      trackingStatus: "market_closed",
      trackingClose: close,
      closeReturnPct: roundPct(returnPct(close, base)),
      resultLabel: "추적 대기",
      resultComment: "일봉 high 데이터가 없어 장중 최고가 판정을 대기함"
    };
  }
  const highReturnPct = roundPct(returnPct(high, base));
  const closeReturnPct = roundPct(returnPct(close, base));
  const result = judgeStockResult(highReturnPct, closeReturnPct);
  return {
    ...item,
    trackingStatus: "complete",
    intradayHighAfterRecommendation: high,
    trackingClose: close,
    highReturnPct,
    closeReturnPct,
    resultLabel: result.label,
    resultComment: `${result.comment} (일봉 기준)`
  };
}

function updateEtfTrackingEntry(item, marketData) {
  const market = marketItem(marketData, item.ticker);
  const base = Number(item.recommendationPrice ?? item.recommendationClosePrice);
  if (!market || market.dataStatus !== "ok") {
    return { ...item, trackingStatus: "error", resultLabel: "진행 중", resultComment: "가격 데이터 수집 실패" };
  }
  const bars = (market.history || []).filter((bar) => bar.date > item.reportDate && bar.date <= item.trackingEndDate);
  const latestBar = latestHistoryBar(market);
  const highs = bars.map((bar) => Number(bar.high)).filter(Number.isFinite);
  const closes = bars.map((bar) => Number(bar.close)).filter(Number.isFinite);
  if (!Number.isFinite(base) || base <= 0 || !latestBar) {
    return { ...item, trackingStatus: "error", resultLabel: "진행 중", resultComment: "추천 기준가 또는 ETF 가격 데이터가 부족함" };
  }
  const weeklyHigh = highs.length ? Math.max(...highs) : (closes.length ? Math.max(...closes) : null);
  const latestClose = Number(latestBar.close);
  const trackingStatus = tradingDaysBetween(item.reportDate, latestBar.date, marketCalendarDates(marketData)) >= 5 ? "complete" : "in_progress";
  const weeklyHighReturnPct = Number.isFinite(weeklyHigh) ? roundPct(returnPct(weeklyHigh, base)) : null;
  const latestCloseReturnPct = Number.isFinite(latestClose) ? roundPct(returnPct(latestClose, base)) : null;
  const result = judgeEtfResult(trackingStatus, weeklyHighReturnPct, latestCloseReturnPct);
  return {
    ...item,
    trackingStatus,
    weeklyHigh,
    latestClose: Number.isFinite(latestClose) ? latestClose : null,
    weeklyHighReturnPct,
    latestCloseReturnPct,
    resultLabel: result.label,
    resultComment: highs.length ? result.comment : `${result.comment} (일봉 high 미확보 시 close 기준 보조)`
  };
}

function judgeStockResult(highReturnPct, closeReturnPct) {
  if (!Number.isFinite(highReturnPct) || !Number.isFinite(closeReturnPct)) return { label: "추적 대기", comment: "아직 추적 거래일 데이터가 완성되지 않음" };
  if (highReturnPct >= 3 && closeReturnPct >= 1) return { label: "성공", comment: "장중 기회와 종가 유지가 모두 확인됨" };
  if (highReturnPct >= 3 && closeReturnPct < 1) return { label: "단타 유효", comment: "장중 기회는 있었지만 종가 유지력은 약함" };
  if (highReturnPct >= 1 && highReturnPct < 3) return { label: "제한적 유효", comment: "제한적인 장중 기회만 발생" };
  if (highReturnPct < 1 && closeReturnPct < 0) return { label: "실패", comment: "추천 이후 의미 있는 장중 기회가 부족하고 종가도 약함" };
  return { label: "추적 대기", comment: "아직 추적 거래일 데이터가 완성되지 않음" };
}

function judgeEtfResult(status, weeklyHighReturnPct, latestCloseReturnPct) {
  if (status === "in_progress") return { label: "진행 중", comment: "아직 1주 추적 기간이 끝나지 않음" };
  if (Number.isFinite(weeklyHighReturnPct) && Number.isFinite(latestCloseReturnPct)) {
    if (weeklyHighReturnPct >= 2 && latestCloseReturnPct >= 1) return { label: "성공", comment: "추천 이후 테마 추세가 유지됨" };
    if (weeklyHighReturnPct >= 2 && latestCloseReturnPct < 0.5) return { label: "단기 고점 후 반납", comment: "1주 내 상승 기회는 있었지만 현재가는 반납" };
    if (latestCloseReturnPct < -1.5) return { label: "실패", comment: "추천 이후 ETF 흐름이 약화됨" };
  }
  return { label: "진행 중", comment: "아직 1주 추적 기간이 끝나지 않음" };
}

function buildRecommendationTrackingView(items) {
  const recentDates = unique(items.map((item) => item.reportDate).sort().reverse()).slice(0, 5);
  const recentItems = items.filter((item) => recentDates.includes(item.reportDate));
  return {
    stockSummary: summarizeStockTracking(recentItems.filter((item) => item.assetType === "STOCK")),
    etfSummary: summarizeEtfTracking(recentItems.filter((item) => item.assetType === "ETF")),
    items: items.slice(0, 60),
    recentDates
  };
}

function summarizeStockTracking(items) {
  const highRows = items.filter((item) => Number.isFinite(item.highReturnPct));
  const closeRows = items.filter((item) => Number.isFinite(item.closeReturnPct));
  return {
    title: "개별주 Top 3 추천 성과 요약",
    sampleSize: items.length,
    sampleReliability: trackingSampleReliability(items.length),
    highSuccessRate: rate(highRows.filter((item) => item.highReturnPct >= 3).length, highRows.length),
    closeSuccessRate: rate(closeRows.filter((item) => item.closeReturnPct >= 1).length, closeRows.length),
    averageHighReturnPct: averageOrNull(highRows.map((item) => item.highReturnPct)),
    averageCloseReturnPct: averageOrNull(closeRows.map((item) => item.closeReturnPct))
  };
}

function summarizeEtfTracking(items) {
  const highRows = items.filter((item) => Number.isFinite(item.weeklyHighReturnPct));
  const closeRows = items.filter((item) => Number.isFinite(item.latestCloseReturnPct));
  return {
    title: "ETF 추천 성과 요약",
    sampleSize: items.length,
    sampleReliability: trackingSampleReliability(items.length),
    weeklyHighSuccessRate: rate(highRows.filter((item) => item.weeklyHighReturnPct >= 2).length, highRows.length),
    latestCloseSuccessRate: rate(closeRows.filter((item) => item.latestCloseReturnPct >= 1).length, closeRows.length),
    averageWeeklyHighReturnPct: averageOrNull(highRows.map((item) => item.weeklyHighReturnPct)),
    averageLatestCloseReturnPct: averageOrNull(closeRows.map((item) => item.latestCloseReturnPct))
  };
}

function trackingSampleReliability(count) {
  if (count >= 100) return "통계 검토 가능";
  if (count >= 30) return "참고 가능";
  return "초기 검증 단계";
}

function rate(success, total) {
  if (!total) return null;
  return roundPct((success / total) * 100);
}

function roundPct(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function returnPct(value, base) {
  return ((Number(value) - Number(base)) / Number(base)) * 100;
}

function averageOrNull(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? roundPct(average(valid)) : null;
}

function findHistoryBar(market, date) {
  return (market.history || []).find((bar) => bar.date === date);
}

function latestHistoryBar(market) {
  return (market.history || []).filter((bar) => Number.isFinite(Number(bar.close))).at(-1);
}

function marketCalendarDates(marketData) {
  const dates = new Set();
  for (const item of Object.values(marketData?.items || {})) {
    for (const bar of item.history || []) if (bar.date) dates.add(bar.date);
  }
  return [...dates].sort();
}

function stockTrackingSessionDate(date, calendarDates, etParts) {
  const minutes = etParts.hour * 60 + etParts.minute;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  if (minutes < marketClose && isWeekday(date)) return date;
  return nextTradingDate(date, calendarDates);
}

function nextTradingDate(date, calendarDates) {
  const futureKnown = calendarDates.find((candidate) => candidate > date);
  if (futureKnown) return futureKnown;
  let next = addDays(date, 1);
  while (!isWeekday(next)) next = addDays(next, 1);
  return next;
}

function addWeekdays(date, count) {
  let current = date;
  let remaining = count;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWeekday(current)) remaining -= 1;
  }
  return current;
}

function tradingDaysBetween(startDate, endDate, calendarDates) {
  return calendarDates.filter((date) => date > startDate && date <= endDate).length;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isWeekday(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function easternTimeParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return {
    year,
    month,
    day,
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  };
}

function formatEasternTimestamp(parts) {
  return `${parts.date} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")} ET`;
}

function formatTimestampKst(value) {
  if (!value) return "데이터 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(date)} KST`;
}

function buildPreviousRecommendationReviews(previousSnapshot, stocks, etfs) {
  if (!previousSnapshot) return [];
  const items = [
    ...(previousSnapshot.stockActionCandidates || []),
    ...(previousSnapshot.stockEntryCandidates || []),
    ...(previousSnapshot.stockPullbackCandidates || [])
  ].filter((row) => row.assetType === "STOCK");
  const uniqueItems = new Map();
  for (const item of items) uniqueItems.set(item.ticker, item);
  return [...uniqueItems.values()].map((item) => {
    const current = stocks.find((row) => row.ticker === item.ticker);
    if (!current) {
      return {
        ...item,
        todayStatus: "데이터 없음",
        todayReason: "오늘 Nasdaq-100 스캔 결과에서 현재 데이터를 찾지 못함",
        nextCondition: "다음 리포트에서 데이터 재확인"
      };
    }
    const base = Number(item.closePriceAtRecommendation);
    const now = Number(current.market?.lastClose);
    const returnSinceRecommendation = Number.isFinite(base) && base > 0 && Number.isFinite(now) ? ((now - base) / base) * 100 : null;
    const invalidated = current.status === STATUS.BAN || current.stockVsEtfDecision === "DO_NOT_TRADE";
    const weakVsEtf = current.stockVsEtfDecision === "ETF_PREFERRED";
    const hot = current.overheatingRisk === "높음" || current.overheatingRisk === "중간";
    const todayStatus = invalidated ? "무효화" : weakVsEtf ? "매매 금지로 하향" : hot && returnSinceRecommendation > 0 ? "이익 보호" : current.status === STATUS.ENTRY_CANDIDATE ? "눌림 대기" : "유지";
    const todayReason = `${current.ticker}는 전일 추천 이후 ${returnSinceRecommendation === null ? "수익률 데이터 없음" : pct(returnSinceRecommendation)} 변화. ${current.relativeStrengthVsEtf}`;
    return {
      ...item,
      current,
      todayClose: current.market?.lastClose ?? null,
      returnSinceRecommendation,
      entryConditionMet: current.status === STATUS.ENTRY_READY || current.status === STATUS.ENTRY_CANDIDATE,
      invalidationTriggered: invalidated,
      relativeStrengthMaintained: !weakVsEtf,
      todayStatus,
      todayReason,
      nextCondition: current.invalidationCondition
    };
  });
}

async function collectSupplementalData(rawWatchlist, rawHoldings, rawEtfs, marketData) {
  const stockTickers = unique([...rawWatchlist, ...rawHoldings].map((row) => row.ticker));
  const etfTickers = unique(rawEtfs.map((row) => row.ticker));
  const tickers = unique([...stockTickers, ...etfTickers]);
  const byTicker = Object.fromEntries(tickers.map((ticker) => [ticker, {}]));

  const newsRows = await Promise.all(tickers.map((ticker) => fetchNewsForTicker(ticker)));
  for (const row of newsRows) byTicker[row.ticker].news = row;
  for (const ticker of tickers) {
    byTicker[ticker].liquidity = fetchLiquidityProfile(ticker, marketItem(marketData, ticker));
  }
  for (const etf of etfTickers) {
    const holdings = await fetchEtfHoldings(etf);
    byTicker[etf].etfBreadth = await calculateEtfBreadth(etf, holdings, marketData);
  }

  const connectionStatus = {
    priceVolume: marketData?.items && Object.values(marketData.items).some((item) => item.dataStatus === "ok") ? "CONNECTED" : "FAILED",
    news: aggregateStatus(newsRows.map((row) => row.status)),
    newsSources: aggregateNewsSourceStatuses(newsRows),
    etfBreadth: aggregateStatus(etfTickers.map((ticker) => byTicker[ticker]?.etfBreadth?.status)),
    liquidity: aggregateStatus(tickers.map((ticker) => byTicker[ticker]?.liquidity?.status)),
    lastUpdated: new Date().toISOString(),
    notes: supplementalNotes(byTicker)
  };
  return { byTicker, connectionStatus };
}

function supplementalNotes(byTicker) {
  const notes = [];
  const rows = Object.values(byTicker);
  const failedNews = rows.filter((row) => row.news?.status === "FAILED").length;
  const fallbackLiquidity = rows.filter((row) => row.liquidity?.status === "PARTIAL").length;
  const fallbackBreadth = rows.filter((row) => row.etfBreadth?.status === "PARTIAL").length;
  if (failedNews) notes.push(`뉴스 수집 실패 티커 ${failedNews}개`);
  if (fallbackBreadth) notes.push(`ETF 구성종목 확산도 fallback sample ${fallbackBreadth}개 사용`);
  if (fallbackLiquidity) notes.push(`거래대금 기반 유동성 fallback ${fallbackLiquidity}개 사용`);
  return notes;
}

function aggregateNewsSourceStatuses(newsRows) {
  const bySource = new Map();
  for (const row of newsRows) {
    for (const sourceRow of row.sourceStatuses || []) {
      const current = bySource.get(sourceRow.source) || [];
      current.push(sourceRow.status);
      bySource.set(sourceRow.source, current);
    }
  }
  return [...bySource.entries()].map(([source, statuses]) => ({
    source,
    status: aggregateStatus(statuses)
  }));
}

function buildDataReliability(marketData, supplementalData, generatedAtDate) {
  const marketItems = Object.values(marketData?.items || {}).filter((item) => item.dataStatus === "ok");
  const priceDates = marketItems.map((item) => item.dataDate).filter(Boolean).sort();
  const rows = Object.values(supplementalData?.byTicker || {});
  const newsRows = rows.map((row) => row.news).filter(Boolean);
  const breadthRows = rows.map((row) => row.etfBreadth).filter(Boolean);
  const liquidityRows = rows.map((row) => row.liquidity).filter(Boolean);
  const newsFetchedTimes = newsRows.map((row) => row.fetchedAt).filter(Boolean).sort();
  const newsPublishedTimes = newsRows.map((row) => row.lastPublishedAt).filter(Boolean).sort();
  const maxBreadthSample = Math.max(0, ...breadthRows.map((row) => Number(row.sampledHoldingsCount || 0)));
  const minBreadthSample = Math.min(...breadthRows.map((row) => Number(row.sampledHoldingsCount || 0)).filter((value) => value > 0));
  const lowLiquidityCount = liquidityRows.filter((row) => ["LOW", "UNKNOWN", "LOW_LIQUIDITY"].includes(row.liquiditySignal)).length;
  const partials = [
    supplementalData?.connectionStatus?.news,
    supplementalData?.connectionStatus?.etfBreadth,
    supplementalData?.connectionStatus?.liquidity
  ].filter((status) => status !== "CONNECTED").length;
  const prePostMarketStatus = "UNAVAILABLE";
  const etfBreadthReliability = maxBreadthSample >= 20 ? "HIGH" : maxBreadthSample >= 10 ? "MEDIUM" : "LOW";
  const analysisReliability = !marketItems.length
    ? "LOW"
    : supplementalData?.connectionStatus?.news === "CONNECTED" && partials <= 1 && maxBreadthSample >= 10
      ? "HIGH"
      : supplementalData?.connectionStatus?.news === "CONNECTED"
        ? "MEDIUM"
        : "LOW";
  const executionReliability = !marketItems.length
    ? "LOW"
    : lowLiquidityCount > 0
      ? "LOW"
      : prePostMarketStatus === "UNAVAILABLE"
        ? "MEDIUM"
        : "HIGH";
  const grade = [analysisReliability, executionReliability, etfBreadthReliability].includes("LOW") ? "LOW" : analysisReliability === "HIGH" && executionReliability === "HIGH" ? "HIGH" : "MEDIUM";
  const latestNewsPublishedAt = newsPublishedTimes.at(-1) || null;
  const newsFreshnessStatus = newsFreshnessLabel(latestNewsPublishedAt);
  const newsSourceRows = supplementalData?.connectionStatus?.newsSources || [];
  const newsSourceLabel = newsSourceRows.length
    ? newsSourceRows.map((row) => `${row.source} ${row.status}`).join(", ")
    : "데이터 없음";
  const configuredNewsSources = newsSourceRows.map((row) => row.source);
  const connectedNewsSources = newsSourceRows.filter((row) => row.status === "CONNECTED" || row.status === "PARTIAL").map((row) => row.source);
  const officialNewsConnected = newsSourceRows.some((row) => ["SEC EDGAR RSS", "Federal Reserve RSS"].includes(row.source) && (row.status === "CONNECTED" || row.status === "PARTIAL"));
  const newsReliability = supplementalData?.connectionStatus?.news === "CONNECTED" && officialNewsConnected
    ? "HIGH"
    : connectedNewsSources.length >= 2
      ? "MEDIUM"
      : supplementalData?.connectionStatus?.news === "CONNECTED"
        ? "MEDIUM"
        : "LOW";
  const reliabilityNotes = [
    maxBreadthSample < 5 ? "테마 확산 판단 제한" : null,
    lowLiquidityCount > 0 ? "거래대금 유동성 낮음 또는 확인 불가" : null,
    prePostMarketStatus === "UNAVAILABLE" ? "프리/애프터마켓 확인 불가" : null
  ].filter(Boolean);
  return {
    priceVolumeStatus: supplementalData?.connectionStatus?.priceVolume || "FAILED",
    priceAsOfDate: priceDates.at(-1) || "데이터 없음",
    priceAsOfLabel: priceDates.at(-1) ? `${priceDates.at(-1)} US regular close` : "데이터 없음",
    reportGeneratedAtKST: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(generatedAtDate),
    newsStatus: supplementalData?.connectionStatus?.news || "FAILED",
    newsFetchedAt: newsFetchedTimes.at(-1) || supplementalData?.connectionStatus?.lastUpdated || null,
    newsLastUpdatedAt: newsFetchedTimes.at(-1) || supplementalData?.connectionStatus?.lastUpdated || null,
    latestNewsPublishedAt,
    newsFreshnessStatus,
    newsSources: configuredNewsSources.length ? configuredNewsSources.join(", ") : newsRows.map((row) => row.source).filter(Boolean).slice(0, 5).join(", "),
    newsSourceStatus: newsSourceLabel,
    newsReliability,
    etfBreadthStatus: supplementalData?.connectionStatus?.etfBreadth || "FAILED",
    etfBreadthSampleCount: Number.isFinite(minBreadthSample) ? `${minBreadthSample}~${maxBreadthSample}` : String(maxBreadthSample || 0),
    etfBreadthReliability,
    liquidityStatus: supplementalData?.connectionStatus?.liquidity || "FAILED",
    prePostMarketStatus,
    analysisReliability,
    executionReliability,
    reliabilityNotes,
    providers: unique([
      marketData?.dataSource || "yfinance",
      ...configuredNewsSources,
      ...connectedNewsSources,
      ...newsRows.flatMap((row) => splitProviderNames(row.source)),
      ...breadthRows.map((row) => row.source).filter(Boolean),
      ...liquidityRows.map((row) => row.source).filter(Boolean)
    ]).join(", "),
    recommendationSession: nextUsSessionLabel(generatedAtDate),
    grade,
    warning: "이 리포트는 투자판단 보조용이며, REAL_TEST 모드에서는 일부 데이터가 누락되거나 지연될 수 있다. 실제 주문 전 현재가, 뉴스, 프리마켓/정규장 거래량을 별도 확인해야 한다."
  };
}

function splitProviderNames(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function newsFreshnessLabel(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "UNKNOWN";
  const ageHours = (Date.now() - timestamp) / 36e5;
  if (ageHours <= 24) return "FRESH";
  if (ageHours <= 72) return "STALE";
  return "UNKNOWN";
}

function newsFreshnessBucket(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "stale";
  const ageHours = (Date.now() - timestamp) / 36e5;
  if (ageHours <= 6) return "under_6h";
  if (ageHours <= 24) return "under_24h";
  if (ageHours <= 72) return "under_72h";
  return "stale";
}

function buildActionGateSummary(rows) {
  const validRows = rows.filter((row) => row?.market?.dataStatus === "ok");
  const counts = {
    rvolBelowOne: validRows.filter((row) => Number(row.market?.relativeVolume ?? 0) < 1).length,
    lowLiquidity: validRows.filter((row) => ["LOW", "UNKNOWN", "LOW_LIQUIDITY"].includes(row.liquiditySummary?.liquiditySignal)).length,
    entryQualityBelow60: validRows.filter((row) => Number(row.entryQualityScore ?? 0) < 60).length,
    exhaustionHigh: validRows.filter((row) => Number(row.exhaustionRisk ?? 0) >= 70).length,
    etfBreadthSmallSample: validRows.filter((row) => row.assetType === "ETF" && Number(row.etfBreadthSummary?.sampledHoldingsCount || 0) < 5).length,
    weakNewsDirectness: validRows.filter((row) => Number(row.newsSummary?.directnessScore || 0) < 2).length
  };
  return {
    total: validRows.length,
    items: [
      { label: "RVOL < 1.00x", count: counts.rvolBelowOne },
      { label: "거래대금 유동성 낮음", count: counts.lowLiquidity },
      { label: "Entry Quality < 60", count: counts.entryQualityBelow60 },
      { label: "Exhaustion Risk >= 70", count: counts.exhaustionHigh },
      { label: "ETF breadth 샘플 부족", count: counts.etfBreadthSmallSample },
      { label: "뉴스 직접성 부족", count: counts.weakNewsDirectness }
    ],
    topLimiters: Object.entries({
      "거래대금 유동성 낮음": counts.lowLiquidity,
      "ETF breadth 샘플 부족": counts.etfBreadthSmallSample,
      "RVOL 미달": counts.rvolBelowOne,
      "Entry Quality 부족": counts.entryQualityBelow60,
      "뉴스 직접성 부족": counts.weakNewsDirectness,
      "과열 위험": counts.exhaustionHigh
    }).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label)
  };
}

function buildTodayDecision({ actionCandidates, etfActionCandidates, stockActionCandidates, stocks, etfs, dataReliability, actionGateSummary }) {
  const rows = [...stocks, ...etfs].filter((row) => row?.market?.dataStatus === "ok");
  const entryReadyCount = [...etfActionCandidates, ...stockActionCandidates].filter((row) => row.status === STATUS.ENTRY_READY).length;
  const conditionalCount = [...etfActionCandidates, ...stockActionCandidates].filter((row) => row.status === STATUS.ENTRY_CANDIDATE).length;
  const watchCount = rows.filter((row) => row.status === STATUS.WATCH).length;
  const banCount = rows.filter((row) => row.status === STATUS.BAN).length;
  const banMajority = rows.length > 0 && banCount / rows.length >= 0.5;
  const label = dataReliability?.grade === "LOW" && banMajority
    ? "매매 보류"
    : entryReadyCount > 0
      ? "선별 진입 가능"
      : conditionalCount > 0
        ? "조건부 진입"
        : watchCount > 0
          ? "신규 추격 없음 / 관찰"
          : "매매 보류";
  const orderDecision = dataReliability?.executionReliability === "HIGH"
    ? "시장가 가능"
    : dataReliability?.executionReliability === "MEDIUM"
      ? "지정가 권장 / 시장가 주의"
      : "시장가 금지 / 지정가 또는 관찰";
  const noTradeMessage = actionCandidates.length
    ? "진입 후보는 있으나, 전일 고점 돌파와 거래량 확인 후 선별적으로 접근한다."
    : "오늘은 추세 후보는 있으나, 왜 돈이 몰리는가와 누가 더 비싸게 사줄 수 있는가를 주문 실행 신뢰도와 거래량이 충분히 뒷받침하지 못해 신규 추격은 보류한다. 기존 관심 종목은 전일 고점 돌파와 RVOL 1.00x 회복을 확인한 뒤 조건부로 본다.";
  return {
    label,
    entryReadyCount,
    conditionalCount,
    watchCount,
    banCount,
    actionCandidateCount: actionCandidates.length,
    mainLimiters: actionGateSummary?.topLimiters || [],
    orderDecision,
    noTradeMessage
  };
}

function nextUsSessionLabel(generatedAtDate) {
  const et = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(generatedAtDate);
  return `${et} US regular session`;
}

function dynamicDataWarning(status) {
  if (!status) return REAL_WARNING;
  const providerStatuses = [
    ["뉴스", status.news],
    ["ETF 구성종목 확산도", status.etfBreadth],
    ["거래대금 유동성", status.liquidity]
  ];
  const connected = providerStatuses.filter(([, value]) => value === "CONNECTED").map(([label]) => label);
  const partial = providerStatuses.filter(([, value]) => value === "PARTIAL").map(([label]) => label);
  const failed = providerStatuses.filter(([, value]) => value === "FAILED").map(([label]) => label);
  const disabled = providerStatuses.filter(([, value]) => value === "DISABLED").map(([label]) => label);
  if (connected.length === providerStatuses.length) return "REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스/ETF 확산도/거래대금 유동성 데이터 반영";
  const parts = ["가격/거래량은 실제 데이터"];
  if (connected.length) parts.push(`${connected.join("/")} 연결`);
  if (partial.length) parts.push(`${partial.join("/")} 일부 연결`);
  if (failed.length) parts.push(`${failed.join("/")} 수집 실패로 점수 반영 제한`);
  if (disabled.length) parts.push(`${disabled.join("/")} 미연결`);
  return `REAL DATA TEST - ${parts.join(", ")}`;
}

function chooseTopExecutionCandidate(etfCandidates, stockCandidates) {
  const bestEtf = etfCandidates[0];
  const bestStock = stockCandidates.find((row) => row.stockVsEtfDecision === "STOCK_PREFERRED") || stockCandidates[0];
  if (!bestEtf && !bestStock) return null;
  if (bestEtf && (!bestStock || compareFinalScore(bestEtf, bestStock) <= 0)) {
    return {
      ...bestEtf,
      explanation: `${bestEtf.ticker}는 ETF 단위 테마 자금 흐름을 직접 담는 후보이고, 현재 점수가 개별 종목 후보보다 우선한다.`
    };
  }
  return {
    ...bestStock,
    explanation: `${bestStock.ticker}는 관련 ETF 대비 상대강도를 확인해야 하지만, 개별 종목 후보 조건 충족 시 ETF보다 탄력적인 돌파를 기대할 수 있다.`
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

> 핵심 질문: 현재 가격에서 누가 사고 있고, 누가 앞으로 더 비싸게 사줄 수 있는가?

${renderMobileSummaryMarkdown(report)}

${renderTodayDecisionMarkdown(report)}

${renderDataReliabilityMarkdown(report)}

## 0. 시장 상태

- 데이터 모드: ${report.dataMode}
- 가격/거래량: ${statusLabel(report.dataConnectionStatus.priceVolume)}
- 뉴스: ${statusLabel(report.dataConnectionStatus.news)}
- ETF 구성종목 확산도: ${statusLabel(report.dataConnectionStatus.etfBreadth)}
- 거래대금 유동성: ${statusLabel(report.dataConnectionStatus.liquidity)}
- 생성 시각: ${report.generatedAt}
- 시장 상태: ${report.marketLabel}
- 오늘 돈의 방향: ${moneyDirection(report)}
- 강한 테마 TOP 3: ${report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "데이터 없음"}
- 데이터 한계:
  - API 또는 provider 상태에 따라 뉴스/ETF 확산도/거래대금 유동성 반영 범위가 달라질 수 있다.
  - 수집 실패 데이터는 점수 반영에서 제외하거나 confidence를 제한한다.
  - reasonConfidence HIGH는 직접 촉매, 가격/거래량, 확산도/유동성 근거가 함께 있을 때만 사용한다.

${renderNarrativesMarkdown(report)}

${renderTrendStrengthMarkdown(report)}

${renderRecommendationTrackingMarkdown(report)}

## 오늘 실제 행동 후보

${report.actionCandidates.slice(0, 3).map(renderActionMarkdown).join("\n\n") || `${report.todayDecision?.noTradeMessage || "오늘 즉시 행동 후보 없음. 왜 돈이 몰리는가, 누가 더 비싸게 사줄 수 있는가, 진입 조건이 동시에 충족된 후보가 없어 TOP 5는 관찰 목록으로만 본다."}`}

${renderDarkHorseCandidatesMarkdown(report)}

${renderReferenceCandidatesMarkdown(report)}

## 오늘 돈이 몰리는 테마

${report.themes.slice(0, 6).map(renderThemeMarkdown).join("\n") || "데이터 없음"}

## 1. ETF 트레이딩 보고서
### 1-1. ETF 결론
- ETF 우선 후보: ${report.etfActionCandidates.filter((row) => row.status === STATUS.ENTRY_READY).map((row) => row.ticker).join(", ") || "없음"}
- ETF 관찰 후보: ${report.etfs.filter((row) => row.status === STATUS.WATCH).slice(0, 5).map((row) => row.ticker).join(", ") || "없음"}
- ETF 매매 금지: ${report.etfBanRows.map((row) => row.ticker).join(", ") || "없음"}
- 오늘 ETF 최우선 1개: ${etfBest ? `${etfBest.ticker} - ${etfBest.entryCondition}` : "없음"}
- ETF 섹션 해석: 이 섹션은 개별 종목 선택이 아니라 테마/섹터 단위 자금 흐름을 ETF로 매매할지 판단하기 위한 영역이다.

### 1-2. ETF 후보 TOP 5

선정 기준: ETF 후보는 가격/거래량 1차 점수에 뉴스, ETF 구성종목 확산도, 유동성, 리스크 패널티를 반영한 finalRawScore 기준으로 정렬한다. 표시 점수 100점 후보가 겹치면 tieBreakerReason으로 우선순위를 설명한다.

${report.etfTop5.map(renderEtfMarkdown).join("\n\n") || "데이터 없음"}

### 1-3. ETF 과열/주의 후보

${report.etfOverheat.slice(0, 5).map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore(최종): ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- moneyFlowScore 산정 근거 요약: ${scoreOneLine(row)}
- 과열 리스크: ${row.overheatingRisk}
- 과열 근거: ${row.overheatingReason}
- 대응: ${row.overheatingRisk === "높음" ? "추격 금지" : row.overheatingRisk === "중간" ? "눌림 대기" : "돌파 확인 후 진입"}
`).join("\n") || "해당 없음"}

### 1-4. ETF 제외/매매 금지 후보

${report.etfBanRows.map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore(최종): ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- moneyFlowScore 산정 근거 요약: ${scoreOneLine(row)}
- 제외 사유: ${row.moneyFlowScore < 50 ? "테마 자금 흐름 약함" : "매매 조건 미충족"}
- 해제 조건: ${row.entryCondition}
`).join("\n") || "해당 없음"}

## 2. 개별 종목 트레이딩 보고서
### 2-1. 오늘 Nasdaq-100 신규 발굴 요약
- 신규 발굴 풀: Nasdaq-100 구성종목 전체
- universe source: ${report.stockUniverse.source}
- universe fetchStatus: ${report.stockUniverse.fetchStatus}
- 총 스캔 종목 수: ${report.stockScanSummary.total}
- 데이터 수집 성공: ${report.stockScanSummary.success}
- 데이터 수집 실패: ${report.stockScanSummary.failed}
- 상세 데이터 수집 대상: 가격/거래량 1차 스캔 상위 ${report.stockScanSummary.detailedCount}개
- 오늘 진입 후보: ${report.stockScanSummary.entry}
- 오늘 눌림 대기: ${report.stockScanSummary.pullback}
- 오늘 관찰: ${report.stockScanSummary.watch}
- 오늘 매매 금지: ${report.stockScanSummary.ban}
- 개별 종목 진입 후보: ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음"}
- 개별 종목 눌림 대기: ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision !== "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음"}
- 개별 종목 매매 금지: ${report.stockCautionRows.filter((row) => row.status === STATUS.BAN).map((row) => row.ticker).join(", ") || "없음"}
- 오늘 개별 종목 최우선 1개: ${stockBest ? `${stockBest.ticker} - ${stockBest.relativeStrengthVsEtf}` : "없음"}
- 개별 종목 섹션 해석: 이 섹션은 ETF로 확인된 테마 자금 흐름 안에서 ETF보다 더 강한 돌파 가능성이 있는 개별 종목만 선별하는 영역이다.

### 2-2. 오늘 개별 종목 신규 후보 TOP 5

선정 기준:
1. Nasdaq-100 전체를 moneyFlowScore(1차)로 먼저 스캔
2. moneyFlowScore(1차) 상위 ${report.stockScanSummary.detailedCount}개를 상세 분석
3. 뉴스/유동성/관련 ETF 대비 상대강도/리스크 패널티를 반영
4. moneyFlowScore(최종), 최종 원점수, 리스크 패널티, 5일 수익률, 상대 거래량 순으로 재정렬

${report.stockTop5.map(renderStockMarkdown).join("\n\n") || "데이터 없음"}

### 2-3. 전일 추천 종목 점검
이 섹션은 실제 계좌 보유 종목이 아니라 전일 리포트에서 제시된 개별 종목 후보의 사후 점검이다.
실제 보유 수량/평단이 입력되지 않았으므로 계좌 수익률이 아니라 추천 기준일 이후 가격 변화를 추적한다.

${report.previousRecommendationReviews.length ? report.previousRecommendationReviews.map(renderPreviousReviewMarkdown).join("\n\n") : "전일 추천 종목 데이터 없음"}

### 2-4. ETF 대비 개별 종목 판단 로직

- 관련 ETF의 5일/20일 수익률과 개별 종목의 5일/20일 수익률을 비교한다.
- 관련 ETF의 상대 거래량과 개별 종목의 상대 거래량을 비교한다.
- 개별 종목이 관련 ETF보다 강하면 개별 종목 우선 가능성으로 본다.
- 개별 종목이 관련 ETF와 비슷하거나 약하면 ETF 우선 / 개별 종목 관찰로 낮춘다.
- 관련 ETF가 더 강하면 개별 종목 대신 ETF를 우선한다.

### 2-5. 개별 종목 제외/주의 후보

${report.stockCautionRows.map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore(최종): ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- moneyFlowScore 산정 근거 요약: ${scoreOneLine(row)}
- 제외/주의 사유: ${row.stockVsEtfDecision === "ETF_PREFERRED" ? "ETF 대비 약세" : row.status === STATUS.BAN ? "매매 조건 미충족" : "개별 종목 우선 근거 부족"}
- 해제 조건: ${row.entryCondition}
`).join("\n") || "해당 없음"}

### Nasdaq-100 전체 moneyFlowScore(1차) 표
${renderStockUniverseScoreMarkdown(report.stockUniverseScan)}

## 감시 ETF 목록

| 티커 | 카테고리 | moneyFlowScore | 상태 | reasonConfidence | 주요 이유 |
| --- | --- | ---: | --- | --- | --- |
${report.etfs.map((row) => `| ${row.ticker} | ${row.categoryType} | ${row.moneyFlowScore} | ${row.status} | ${row.reasonConfidence} | ${row.whyMoneyIsFlowing} |`).join("\n")}

## 3. 최종 실행 판단

### 3-1. 오늘 실제로 할 일
1. ETF에서 할 일: ${etfBest ? `${etfBest.ticker} 포함 ETF 후보의 전일 고점 돌파와 5일선 유지를 확인한다.` : "ETF 후보는 관찰한다."}
2. 개별 종목에서 할 일: ${stockBest ? `${stockBest.ticker} 등은 관련 ETF 대비 상대강도가 유지되는지 확인하고 눌림 또는 돌파 조건에서만 검토한다.` : "개별 종목은 관련 ETF 대비 상대강도 확인 전까지 관찰한다."}
3. 하지 말아야 할 일: ETF와 개별 종목을 같은 테마 안에서 중복 매수하지 않는다.

### 3-2. 내일 확인할 조건
- ETF 확인 조건: ETF 후보 TOP 5가 20일선 위에서 유지되는지 확인
- 개별 종목 확인 조건: 관련 ETF 대비 5일/20일 상대강도와 상대 거래량 유지 확인
- 시장 상태 확인 조건: QQQ/SPY의 5일/20일 추세와 위험선호 유지 여부 확인
- 데이터 보강 필요 항목: 뉴스, ETF 구성종목 확산도, 프리마켓/정규장 거래량, 실제 보유 진입가

## 데이터 수집 상태

${renderDataCollectionMarkdown(report)}

${renderScoreGuideMarkdown()}
`;
}

function renderDataReliabilityMarkdown(report) {
  const r = report.dataReliability || {};
  return `## 데이터 신뢰도

- 전체 데이터 신뢰도 등급: ${r.grade || "LOW"}
- 분석 신뢰도: ${r.analysisReliability || "LOW"}
- 주문 실행 신뢰도: ${r.executionReliability || "LOW"}
- ETF breadth 신뢰도: ${r.etfBreadthReliability || "LOW"}
- 신뢰도 해석: ${(r.reliabilityNotes || []).join(", ") || "핵심 데이터 제한 없음"}
- 리포트 생성 시각: ${r.reportGeneratedAtKST || report.generatedAt} KST
- 가격 기준 거래일: ${r.priceAsOfLabel || "데이터 없음"}
- 뉴스 수집 시각: ${formatTimestampKst(r.newsFetchedAt || r.newsLastUpdatedAt)}
- 가장 최근 뉴스 발행 시각: ${formatTimestampKst(r.latestNewsPublishedAt)}
- 뉴스 신선도 상태: ${r.newsFreshnessStatus || "UNKNOWN"}
- 뉴스 소스: ${r.newsSources || "데이터 없음"}
- 뉴스 소스 상태: ${r.newsSourceStatus || "데이터 없음"}
- 뉴스 신뢰도: ${r.newsReliability || "LOW"}
- 추천 적용 거래일: ${r.recommendationSession || "데이터 없음"}
- 가격/거래량 데이터 상태: ${statusLabel(r.priceVolumeStatus)}
- 뉴스 데이터 상태: ${statusLabel(r.newsStatus)}
- ETF 구성종목 확산도 상태: ${statusLabel(r.etfBreadthStatus)}
- ETF 구성종목 샘플 수: ${r.etfBreadthSampleCount || "0"}
- 거래대금 유동성 데이터 상태: ${statusLabel(r.liquidityStatus)}
- 프리마켓/애프터마켓 데이터 상태: ${r.prePostMarketStatus || "UNAVAILABLE"}
- 데이터 provider: ${r.providers || "데이터 없음"}
- 실전 사용 경고: ${r.warning || REAL_WARNING}`;
}

function renderTodayDecisionMarkdown(report) {
  const d = report.todayDecision || {};
  return `## 오늘 결론

- 오늘 결론: ${d.label || "매매 보류"}
- 신규 진입 후보: ${d.entryReadyCount ?? 0}개
- 조건부 진입 후보: ${d.conditionalCount ?? 0}개
- 관찰 후보: ${d.watchCount ?? 0}개
- 주요 제한 요인: ${(d.mainLimiters || []).join(", ") || "특이 제한 없음"}
- 주문 판단: ${d.orderDecision || "시장가 금지 / 지정가 또는 관찰"}
- 실전 판단: ${d.noTradeMessage || "후보 조건이 충분히 충족될 때까지 관찰한다."}

### 후보 제한 요인 집계

${(report.actionGateSummary?.items || []).map((item) => `- ${item.label}: ${item.count}개`).join("\n") || "- 집계 데이터 없음"}`;
}

function renderActionMarkdown(row) {
  return `### ${row.rank}. [${row.ticker}] ${row.name || row.ticker}
- 자산 유형: ${row.assetType}
- linkedNarrative: ${row.linkedNarrative || "미분류"}
- narrativeStatus: ${row.narrativeStatus || "관찰"}
- narrativeScore: ${row.narrativeScore ?? 0}
- Trend Strength Index: ${row.trendStrengthIndex ?? "데이터 없음"}
- Exhaustion Risk: ${row.exhaustionRisk ?? "데이터 없음"} (${row.exhaustionRiskLabel || "데이터 없음"})
- Entry Quality Score: ${row.entryQualityScore ?? "데이터 없음"} (${row.entryQualityLabel || "데이터 없음"})
- 트렌드 판단: ${row.trendDecisionLine || "데이터 없음"}
- moneyFlowScore: ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- finalRawScore: ${finalRawScore(row)}
- reasonConfidence: ${row.reasonConfidence}
- reasonConfidenceExplanation: ${row.reasonConfidenceExplanation}
- tieBreakerReason: ${row.tieBreakerReason}
- 후보별 시장 해석: ${row.marketContext ? `${row.marketContext.marketRegime} / ${row.marketContext.candidateEnvironment} - ${row.marketContext.reason}` : "데이터 없음"}
- 게이트 사유: ${row.actionGate?.reasons?.join("; ") || "통과"}
- 주문 실행: ${orderExecutionLabel(row)}
${row.reasonConfidence === "HIGH" ? `- ${row.directCatalyst}` : ""}
- 왜 돈이 몰리는가: ${row.whyMoneyIsFlowing}
- 누가 더 비싸게 사줄 수 있는지: ${row.likelyNextBuyer}
- 진입 조건: ${row.entryCondition}
- 무효화 조건: ${row.invalidationCondition}
- todayActionLabel: ${row.todayActionLabel}
- 차트: ${chartMarkdown(row)}`;
}

function renderReferenceCandidatesMarkdown(report) {
  if (report.actionCandidates.length) return "";
  const etfs = report.referenceCandidates?.etfs || [];
  const stocks = report.referenceCandidates?.stocks || [];
  if (!etfs.length && !stocks.length) return "";
  return `## 참고용 행동 후보

> 실제 행동 후보가 없는 날에만 표시한다. 아래 후보는 매수 추천이 아니라 다음 정규장에서 전일 고점 돌파, RVOL 1.00x 이상, 거래대금 유동성 확인을 기다리는 관찰 리스트다.

### ETF 참고 후보 TOP 3

${etfs.map(renderReferenceCandidateMarkdown).join("\n\n") || "데이터 없음"}

### 개별주 참고 후보 TOP 3

${stocks.map(renderReferenceCandidateMarkdown).join("\n\n") || "데이터 없음"}`;
}

function renderDarkHorseCandidatesMarkdown(report) {
  const rows = report.darkHorseCandidates || [];
  if (!rows.length) return `## 다크호스 후보

다크호스 후보 없음. 상위 서사 정렬, MA20 위 안착, MA5/MA20 구조 개선, RVOL 0.90x 이상 조건을 동시에 충족한 개별주가 없다.

- darkHorseScore: 조건 충족 후보 없음
- 왜 아직 메인이 아닌가: 확인 조건을 통과한 보조 관찰 후보가 없다.

<details>
<summary>darkHorseScore 상세 근거 보기</summary>

- 서사 정렬: 조건 미충족
- 초기 추세 구조: 조건 미충족
- 베이스 돌파/정돈: 조건 미충족
- 거래량 확인: 조건 미충족
- rawScore: 데이터 없음

</details>`;
  return `## 다크호스 후보

> 메인 행동 후보를 대체하지 않는 보조 관찰 섹션이다. 상위 서사 안에서 아직 과열되지 않았지만 초기 추세 전환, 베이스 돌파, 거래량 회복이 시작되는 개별주만 표시한다.

${rows.map(renderDarkHorseCandidateMarkdown).join("\n\n")}`;
}

function renderDarkHorseCandidateMarkdown(row) {
  const d = row.darkHorse || {};
  const b = d.breakdown || {};
  return `### ${row.darkHorseRank}. [${row.ticker}] ${row.name || row.ticker}
- 소속 서사: ${row.linkedNarrative || "미분류"}
- darkHorseScore: ${d.score ?? 0} (${d.label || "제외"})
- 단계: ${d.stage || "초기 관찰"}
- Confidence: ${d.confidence || "LOW"}
- 5D / 20D / RVOL: ${pct(row.market?.return5dPct)} / ${pct(row.market?.return20dPct)} / ${num(row.market?.relativeVolume, 2)}x
- MA 구조: 종가 ${price(row.market?.lastClose)} / MA5 ${price(row.darkHorseInput?.ma5)} / MA20 ${price(row.darkHorseInput?.ma20)}
- 선정 이유: ${d.reason || "데이터 없음"}
- 확인 조건: ${d.confirmCondition || "데이터 없음"}
- 무효화 조건: ${d.invalidationCondition || "데이터 없음"}
- 왜 아직 메인이 아닌가: ${d.whyNotMain || "메인 후보 조건 확인 전"}

<details>
<summary>darkHorseScore 상세 근거 보기</summary>

- 서사 정렬: ${b.narrativeAlignmentScore ?? 0}/20
- 초기 추세 구조: ${b.earlyTrendStructureScore ?? 0}/30
- 베이스 돌파/정돈: ${b.baseBreakoutScore ?? 0}/20
- 거래량 확인: ${b.volumeConfirmationScore ?? 0}/15
- 낮은 과열: ${b.lowExhaustionScore ?? 0}/10
- 유동성 리스크 보정: ${b.liquidityRiskScore ?? 0}/5
- 리스크 차감: -${b.riskPenalty ?? 0}
- rawScore: ${b.rawScore ?? 0}

</details>

- 차트: ${chartMarkdown(row)}`;
}

function renderReferenceCandidateMarkdown(row) {
  return `#### ${row.referenceRank}. [${row.ticker}] ${row.name || row.ticker}
- 상태: 참고용 관찰 후보
- todayActionLabel: ${row.todayActionLabel}
- 제한 사유: ${row.actionGate?.reasons?.join("; ") || "실제 행동 후보 게이트 미충족"}
- 주문 실행: ${orderExecutionLabel(row)}
- moneyFlowScore: ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- Entry Quality: ${row.entryQualityScore ?? "데이터 없음"} (${row.entryQualityLabel || "데이터 없음"})
- RVOL: ${num(row.market?.relativeVolume, 2)}x
- 진입 전 확인: ${row.entryCondition}
- 무효화: ${row.invalidationCondition}`;
}

function renderNarrativesMarkdown(report) {
  const top = report.topNarratives || [];
  return `## 오늘 시장을 지배하는 서사

### 오늘 시장을 지배하는 서사 TOP 3

${top.map((row, index) => `#### ${index + 1}. ${row.name}
- 상태: ${row.status}
- narrativeScore: ${row.narrativeScore}
- reasonConfidence: ${row.reasonConfidence}
- 근거 ETF: ${row.supportEtfs.join(", ") || "데이터 없음"}
- 근거 개별 종목: ${row.supportStocks.join(", ") || "데이터 없음"}
- 돈이 몰리는 이유: ${row.whyMoneyIsFlowing}
- 다음 매수 주체: ${row.likelyNextBuyer}
- 가장 좋은 트레이딩 수단: ${row.bestTradingVehicle}
- 서사가 깨지는 조건: ${row.breakCondition}
- 오늘 행동: ${row.todayAction}

<details>
<summary>상세 narrativeScore 근거 보기</summary>

- rawScore: ${row.rawScore}
- ETF 평균 moneyFlowScore: ${row.etfAvgScore}
- 개별 종목 평균 moneyFlowScore: ${row.stockAvgScore}
- ETF 후보 비율: ${row.etfCandidateRatio}%
- 개별 종목 후보 비율: ${row.stockCandidateRatio}%
- 5일 평균 수익률: ${pct(row.momentum5)}
- 20일 평균 수익률: ${pct(row.momentum20)}
- 평균 상대 거래량: ${num(row.relativeVolumeAvg, 2)}배
- ETF 평균 상대 거래량: ${num(row.etfRelativeVolumeAvg, 2)}배
- 개별주 평균 상대 거래량: ${num(row.stockRelativeVolumeAvg, 2)}배
- 52주 고점 근접 후보 비율: ${row.highProximityRatio}%
- 뉴스 직접성 점수: ${row.newsDirectScore}
- ETF 확산도 점수: ${row.etfBreadthScore}
- 유동성 점수: ${row.liquidityScore}
- 과열 리스크 차감: ${row.overheatPenalty}

</details>`).join("\n\n") || "지배 서사 데이터 없음"}

### 전체 narrative 요약

| 서사명 | 상태 | narrativeScore | reasonConfidence | 대표 ETF | 대표 종목 | 오늘 행동 |
| --- | --- | ---: | --- | --- | --- | --- |
${report.narratives.map((row) => `| ${row.name} | ${row.status} | ${row.narrativeScore} | ${row.reasonConfidence} | ${row.representativeEtfs.join(", ") || "-"} | ${row.representativeStocks.join(", ") || "-"} | ${row.todayAction} |`).join("\n")}`;
}

function renderRecommendationTrackingMarkdown(report) {
  const tracking = report.recommendationTracking || { stockSummary: {}, etfSummary: {}, items: [] };
  return `## 최근 추천 결과 트래킹

개별주는 데이트레이딩 관점으로 추천 이후 첫 정규장의 장중 최고가와 종가를 추적한다. ETF는 테마/스윙 관점으로 추천 이후 1주일 동안의 최고가와 현재 종가를 추적한다.

### 개별주 Top 3 추천 성과 요약
- 최근 5개 리포트 표본: ${tracking.stockSummary.sampleSize ?? 0}개 (${tracking.stockSummary.sampleReliability || trackingSampleReliability(tracking.stockSummary.sampleSize || 0)})
- 장중 최고가 기준 성공률: ${summaryPct(tracking.stockSummary.highSuccessRate)}
- 종가 기준 성공률: ${summaryPct(tracking.stockSummary.closeSuccessRate)}
- 평균 장중 최고 수익률: ${summaryPct(tracking.stockSummary.averageHighReturnPct)}
- 평균 종가 수익률: ${summaryPct(tracking.stockSummary.averageCloseReturnPct)}

### ETF 추천 성과 요약
- 최근 5개 리포트 표본: ${tracking.etfSummary.sampleSize ?? 0}개 (${tracking.etfSummary.sampleReliability || trackingSampleReliability(tracking.etfSummary.sampleSize || 0)})
- 1주 최고가 기준 성공률: ${summaryPct(tracking.etfSummary.weeklyHighSuccessRate)}
- 현재 종가 기준 성공률: ${summaryPct(tracking.etfSummary.latestCloseSuccessRate)}
- 평균 1주 최고 수익률: ${summaryPct(tracking.etfSummary.averageWeeklyHighReturnPct)}
- 평균 현재 수익률: ${summaryPct(tracking.etfSummary.averageLatestCloseReturnPct)}

<details>
<summary>최근 추천 결과 상세 테이블 펼치기</summary>

| 추천일 | 유형 | 순위 | 티커 | 기준가 | 추적 기간 | 상태 | High 수익률 | Close 수익률 | 결과 | 코멘트 |
| --- | --- | ---: | --- | ---: | --- | --- | ---: | ---: | --- | --- |
${tracking.items.map(renderTrackingMarkdownRow).join("\n") || "| - | - | - | 데이터 없음 | - | - | - | - | - | - | - |"}

</details>`;
}

function renderTrendStrengthMarkdown(report) {
  const trends = report.topNarratives || [];
  return `## 트렌드 강도 판단

${trends.map(renderTrendStrengthCardMarkdown).join("\n\n") || "트렌드 강도 데이터 없음"}`;
}

function renderTrendStrengthCardMarkdown(row, index) {
  return `### ${index + 1}. ${row.name}
- Trend Strength Index: ${row.trendStrengthIndex}
- 트렌드 상태 라벨: ${row.trendStateLabel}
- 테마 확산도: ${row.themeBreadthLabel}
- ETF 동조성: ${row.etfSyncLabel}
- 거래량 강도: ${row.volumeStrengthLabel}
- 과열 위험: ${row.exhaustionRiskLabel} (${row.exhaustionRisk})
- 오늘 진입 품질: ${row.entryQualityLabel} (${row.entryQualityScore})
- 한 줄 판단: ${row.trendOneLineJudgment}
- 오늘 접근법: ${row.trendTodayApproach}

<details>
<summary>트렌드 강도 상세 근거 보기</summary>

- 가격 모멘텀: ${row.trendDetailReasons?.priceMomentum || "데이터 없음"}
- 거래량 강도: ${row.trendDetailReasons?.volumeStrength || "데이터 없음"}
- ETF 동조성: ${row.trendDetailReasons?.etfSync || "데이터 없음"}
- 테마 확산도: ${row.trendDetailReasons?.themeBreadth || "데이터 없음"}
- 뉴스 촉매: ${row.trendDetailReasons?.catalystFreshness || "데이터 없음"}
- 과열 리스크: ${row.trendDetailReasons?.exhaustionRisk || "데이터 없음"}
- 시장 환경: ${row.trendDetailReasons?.marketRegime || "데이터 없음"}

</details>`;
}

function renderTrackingMarkdownRow(row) {
  const period = row.assetType === "ETF" ? `${row.trackingStartDate}~${row.trackingEndDate}` : row.trackingSessionDate;
  const highReturn = row.assetType === "ETF" ? row.weeklyHighReturnPct : row.highReturnPct;
  const closeReturn = row.assetType === "ETF" ? row.latestCloseReturnPct : row.closeReturnPct;
  return `| ${row.reportDate} | ${row.assetType} | ${row.rank} | ${row.ticker} | ${price(row.recommendationPrice)} | ${period || "-"} | ${row.trackingStatus} | ${summaryPct(highReturn)} | ${summaryPct(closeReturn)} | ${row.resultLabel || "-"} | ${row.resultComment || "-"} |`;
}

function summaryPct(value) {
  return Number.isFinite(value) ? signedPct(value) : "데이터 없음";
}

function renderMobileSummaryMarkdown(report) {
  return `## 모바일 요약

[오늘의 데일리 트레이딩 요약]

생성 성공 / 데이터 모드: ${report.dataMode}

시장:
- ${report.marketLabel}

시장 지배 서사:
${report.topNarratives.map((row, index) => `${index + 1}. ${row.name} - ${row.status} - ${row.summaryReason}`).join("\n") || "1. 데이터 없음 - 관찰 - 지배 서사 데이터 부족"}

트렌드 강도:
${report.topNarratives.map((row, index) => `${index + 1}. ${row.name} - TSI ${row.trendStrengthIndex} - ${row.trendStateLabel} - 진입품질 ${row.entryQualityLabel}`).join("\n") || "1. 데이터 없음 - TSI 없음 - 관찰"}

오늘 결론:
- ${moneyDirection(report)}
- 행동 후보는 linkedNarrative와 함께 확인한다.
- 추격보다 진입 조건 확인 후 접근한다.

오늘 실제 행동 후보:
${report.actionCandidates.slice(0, 3).map((row, index) => `${index + 1}. ${row.ticker}(${row.assetType}) - ${row.linkedNarrative || "미분류"} - ${row.whyThisCouldTradeHigher}`).join("\n") || "1. 행동 후보 없음 - 미분류 - 조건 충족 후보 없음"}

다크호스 후보:
${(report.darkHorseCandidates || []).slice(0, 3).map((row, index) => `${index + 1}. ${row.ticker} - darkHorseScore ${row.darkHorse?.score ?? 0} - ${row.darkHorse?.stage || "초기 관찰"}`).join("\n") || "1. 다크호스 후보 없음 - 조건 충족 후보 없음"}

ETF 후보 TOP 5:
${report.etfTop5.map((row, index) => `${index + 1}. ${row.ticker} - ${row.linkedNarrative || "미분류"} - ${row.todayActionLabel}`).join("\n") || "데이터 없음"}

웹 리포트:
https://yoolcool.github.io/DailyTradingThesisAgent/`;
}

function renderScoreGuideMarkdown() {
  return `## 참고: moneyFlowScore 산정 방식과 트렌드 강도

moneyFlowScore는 매수 추천 점수가 아니라 현재 ETF 또는 종목으로 돈이 몰리는 정도를 추적하는 트레이딩 후보 점수다.
Trend Strength Index는 테마 전체의 돈 몰림 강도이고, Entry Quality Score는 오늘 실제 진입 품질이다.
강한 트렌드와 매수 가능성은 분리해서 판단한다.

### 기본 산정 요소
- 20일 수익률: 최근 1개월 수준의 중기 추세를 반영한다.
- 5일 수익률: 최근 1주일 수준의 단기 자금 유입을 반영한다.
- 1일 수익률: 직전 거래일의 단기 추격 매수세를 반영한다.
- 상대 거래량: 가격 상승과 함께 거래량이 늘면 실제 자금 유입 가능성을 높게 본다.
- 52주 고점 대비 위치: 고점 근처 자산은 추세 추종 자금 유입 가능성이 있다.
- ETF 대비 상대강도: 개별 종목에만 적용하며, 관련 ETF보다 강할 때 개별 종목 우선 가능성이 올라간다.

### 계산 구조
- moneyFlowScore(1차) = 추세 + 단기 모멘텀 + 중기 모멘텀 + 거래량 + 신고가 근접 + 이동평균
- moneyFlowScore(최종 원점수) = moneyFlowScore(1차) + 뉴스 + ETF 확산도 + 유동성 + 관련 ETF 대비 상대강도 + 리스크 패널티
- moneyFlowScore(최종 표시 점수) = min(100, max(0, 최종 원점수))
- 하위 점수는 각 최대치를 넘지 않도록 cap 처리하고, 상세 근거에 원점수와 상한 적용 점수를 함께 표시한다.
- 리스크 패널티는 음수로 저장하고 계산식에 그대로 더한다.
- 행동 라벨은 Entry Quality, Exhaustion Risk, RVOL, 거래대금 유동성 게이트를 통과해야 진입 가능으로 표시한다.

주의: 점수가 높아도 진입 조건, 무효화 조건, 리스크 패널티 근거를 함께 확인해야 한다.`;
}

function moneyDirection(report) {
  const topEtf = report.etfTop5[0];
  const topStock = report.stockTop5[0];
  if (!topEtf && !topStock) return "데이터 없음";
  if (topEtf && (!topStock || compareFinalScore(topEtf, topStock) <= 0)) {
    return `${topEtf.categoryType} 쪽 ETF 자금 흐름이 가장 선명함`;
  }
  return `${topStock.primaryTheme || topStock.ticker} 개별 종목 흐름이 ETF 대비 강한지 확인 필요`;
}

function scoreInterpretation(score) {
  if (score >= 80) return "강한 자금 유입 후보. 단, 과열 여부 확인 필수.";
  if (score >= 65) return "관심 후보. 눌림 또는 돌파 확인 후 진입 검토.";
  if (score >= 50) return "관찰 후보. 흐름은 있으나 우선순위는 낮음.";
  return "매매 금지 또는 우선순위 낮은 후보.";
}

function renderThemeMarkdown(row, index) {
  return `- ${row.theme}: ${row.tickers.slice(0, 8).join(", ")} | 평균 moneyFlowScore ${row.avgScore.toFixed(0)} | ${themeInterpretation(row)}`;
}

function renderThemeHtml(row, index) {
  return `<p><strong>${index + 1}. ${escapeHtml(row.theme)}:</strong> ${escapeHtml(row.tickers.slice(0, 8).join(", "))} <span class="muted">평균 moneyFlowScore ${escapeHtml(row.avgScore.toFixed(0))} | ${escapeHtml(themeInterpretation(row))}</span></p>`;
}

function themeReasonBullets(row) {
  const members = row.members || [];
  const avg5 = average(members.map((item) => item.market?.return5dPct).filter((value) => Number.isFinite(value)));
  const avg20 = average(members.map((item) => item.market?.return20dPct).filter((value) => Number.isFinite(value)));
  const avgRelVol = average(members.map((item) => item.market?.relativeVolume).filter((value) => Number.isFinite(value)));
  const above20 = members.filter((item) => item.market?.lastClose && item.market?.history?.length && item.market.lastClose >= average(item.market.history.map((bar) => bar.close).filter(Number.isFinite).slice(-20))).length;
  const highScoreCount = members.filter((item) => item.moneyFlowScore >= 65).length;
  const reasons = [];
  if (Number.isFinite(avg5) || Number.isFinite(avg20)) reasons.push(`평균 5일 수익률 ${pct(avg5)}, 평균 20일 수익률 ${pct(avg20)}로 추세가 확인된다.`);
  if (Number.isFinite(avgRelVol)) reasons.push(`평균 상대 거래량 ${num(avgRelVol, 2)}배로 거래 참여가 확인된다.`);
  if (members.length) reasons.push(`${members.length}개 후보 중 ${highScoreCount}개가 관심권 이상 moneyFlowScore를 기록했다.`);
  if (above20) reasons.push(`${above20}개 후보가 20일선 위에서 움직여 추세 유지 근거가 있다.`);
  return reasons.slice(0, 4).length ? reasons.slice(0, 4) : ["데이터가 부족해 가격/거래량 중심으로만 판단한다.", "테마 내 후보 수와 상대강도 변화를 추가 확인한다."];
}

function themeInterpretation(row) {
  if (row.avgScore >= 75) return "단일 종목 이벤트보다 테마 단위 자금 흐름이 선명한 구간으로 본다.";
  if (row.avgScore >= 60) return "추세는 확인되지만 선별 진입이 필요한 중간 강도의 테마로 본다.";
  return "관심은 유지하되 우선순위는 낮추고 추가 거래량 확인을 기다린다.";
}

function scoreOneLine(row) {
  const breakdown = row.moneyFlowScoreBreakdown;
  if (!breakdown) return "산정 근거 데이터 없음";
  const reasons = breakdown.reasons || [];
  const positives = reasons.filter((reason) => !reason.includes("위험") && !reason.includes("미연결")).slice(0, 3).join(", ") || "가점 제한적";
  const cautions = reasons.filter((reason) => reason.includes("위험") || reason.includes("미연결")).slice(0, 2).join(", ") || "큰 감점 제한적";
  return `1차 ${breakdown.initialDisplayScore}, 최종 원점수 ${breakdown.finalRawScore}, 표시 ${breakdown.finalDisplayScore}. ${positives}. 주의: ${cautions}.`;
}

function finalRawScore(row) {
  return row.moneyFlowScoreBreakdown?.finalRawScore ?? row.finalRawScore ?? row.moneyFlowScoreFinal ?? row.moneyFlowScore ?? "데이터 없음";
}

function tieBreakerLine(row) {
  const raw = finalRawScore(row);
  const risk = row.moneyFlowScoreBreakdown?.riskPenalty ?? row.riskPenalty ?? 0;
  const r5 = row.market?.return5dPct;
  const relVol = row.market?.relativeVolume;
  return `최종 원점수 ${raw}, 리스크 패널티 ${signed(risk)}, 5일 수익률 ${pct(r5)}, 상대 거래량 ${num(relVol, 2)}배 순으로 정렬`;
}

function addDecisionExplanations(row) {
  return {
    ...row,
    reasonConfidenceExplanation: reasonConfidenceExplanation(row),
    tieBreakerReason: tieBreakerLine(row)
  };
}

function snapshotNarrative(row) {
  return {
    name: row.name,
    status: row.status,
    narrativeScore: row.narrativeScore,
    rawScore: row.rawScore,
    reasonConfidence: row.reasonConfidence,
    supportEtfs: row.supportEtfs,
    supportStocks: row.supportStocks,
    representativeEtfs: row.representativeEtfs,
    representativeStocks: row.representativeStocks,
    whyMoneyIsFlowing: row.whyMoneyIsFlowing,
    likelyNextBuyer: row.likelyNextBuyer,
    bestTradingVehicle: row.bestTradingVehicle,
    breakCondition: row.breakCondition,
    todayAction: row.todayAction,
    summaryReason: row.summaryReason,
    directNewsCount: row.directNewsCount,
    etfBreadthScore: row.etfBreadthScore,
    relativeVolumeAvg: row.relativeVolumeAvg,
    etfRelativeVolumeAvg: row.etfRelativeVolumeAvg,
    stockRelativeVolumeAvg: row.stockRelativeVolumeAvg
  };
}

function chartMarkdown(row) {
  if (row.market?.history?.length >= 5) return `![${row.ticker} chart](${row.chartPath})`;
  return `차트 미표시 - ${chartMissingReason(row)}`;
}

function chartMissingReason(row) {
  if (!row.market || row.market.dataStatus !== "ok") return row.market?.error || "가격 데이터 수집 실패";
  const count = row.market.history?.length || 0;
  return `차트 생성에 필요한 가격 히스토리가 부족함(${count}개)`;
}

function scoreBreakdownMarkdown(row) {
  const b = row.moneyFlowScoreBreakdown;
  if (!b) return "moneyFlowScore 산정 근거: 데이터 없음";
  const relativeLine = row.assetType === "STOCK" ? `\n  - ETF 대비 상대강도: ${signed(b.relativeStrengthScore ?? 0)}` : "";
  const breadthLine = row.assetType === "ETF" ? `\n  - ETF 확산도: ${signed(b.etfBreadthScore ?? 0)}` : "";
  return `moneyFlowScore(최종) 산정 근거:
  - moneyFlowScore(1차): ${b.initialDisplayScore}
  - 최종 원점수: ${b.finalRawScore}
  - 최종 표시 점수: ${b.finalDisplayScore}
  - cap 적용: ${b.wasCapped ? b.capReason : "cap 미적용"}
  - 계산식: ${b.formulaText}
  - 점수 해석: ${scoreInterpretation(b.finalDisplayScore)}
  - 가격/거래량 1차 점수: ${signed(b.priceVolumeScore)}
    - 추세: ${signed(b.trendScore)}
    - 단기 모멘텀: ${signed(b.shortMomentumScore)}
    - 중기 모멘텀: ${signed(b.mediumMomentumScore)}
    - 거래량: ${signed(b.volumeScore)}
    - 신고가 근접: ${signed(b.highProximityScore)}
    - 이동평균: ${signed(b.movingAverageScore)}
  - 하위 점수 cap:
${componentCapMarkdown(b.componentCaps)}
  - 추가 데이터 가감점:
    - 뉴스: ${signed(b.newsScore)}
    - 유동성: ${signed(b.liquidityScore)}${relativeLine}${breadthLine}
  - 리스크 패널티: ${signed(b.riskPenalty)}
  - 주요 근거: ${scoreOneLine(row)}
  - 리스크 패널티 산정 근거:
${riskPenaltyMarkdown(b.riskPenaltySummary)}`;
}

function componentCapMarkdown(components = []) {
  if (!components.length) return "    - 데이터 없음";
  return components.map((component) => `    - ${component.label}: 원점수 ${signed(component.raw)}, 상한 적용 ${signed(component.capped)} / 최대 ${component.max}${component.wasCapped ? " (cap 적용)" : ""}`).join("\n");
}

function riskPenaltyMarkdown(summary) {
  if (!summary) return "    - 데이터 없음";
  const lines = [
    `    - 총 리스크 패널티: ${signed(summary.totalPenalty)}`,
    `    - 리스크 등급: ${summary.riskLevel}`
  ];
  if (summary.items?.length) {
    lines.push("    - 감점된 리스크:");
    for (const item of summary.items) {
      lines.push(`      - ${item.label}: ${signed(item.penalty)} | 근거: ${item.evidence} | 대응: ${item.action}`);
    }
  } else {
    lines.push("    - 감점된 리스크: 없음");
  }
  lines.push(`    - 관찰 리스크: ${(summary.watchItems || []).join("; ") || "주요 관찰 리스크 없음"}`);
  lines.push(`    - 한 줄 해석: ${summary.summary}`);
  return lines.join("\n");
}

function dataUsageMarkdown(row) {
  const used = row.moneyFlowScoreBreakdown?.dataUsed || {};
  return `  - 가격/거래량: ${used.priceVolume ? "사용" : "미사용"}
  - 뉴스: ${used.news ? "사용" : statusLabel(row.newsSummary?.status)}
  - ETF 확산도: ${row.assetType === "ETF" ? (used.etfBreadth ? "사용" : statusLabel(row.etfBreadthSummary?.status)) : "관련 ETF에서 확인"}
  - 거래대금 유동성: ${used.dollarVolumeLiquidity ? "사용" : statusLabel(row.liquiditySummary?.status)}
  - 관련 ETF 상대강도: ${used.relativeStrength ? "사용" : "미사용"}`;
}

function newsMarkdown(summary) {
  if (!summary) return "  - 최근 뉴스 상태: 데이터 없음";
  const counts = summary.sentimentCounts || {};
  const catalyst = summary.directCatalyst;
  const support = (summary.items || []).find((item) => item !== catalyst && item.directness !== "indirect");
  return `  - 최근 뉴스 상태: ${statusLabel(summary.status)}
  - 뉴스 소스: ${summary.source || "데이터 없음"}
  - 소스별 상태: ${(summary.sourceStatuses || []).map((row) => `${row.source} ${row.status}`).join("; ") || "데이터 없음"}
  - 긍정/중립/부정: ${counts.positive || 0}/${counts.neutral || 0}/${counts.negative || 0}
  - 직접성/방향성/신선도: ${summary.directnessScore ?? 0}/${summary.directionScore ?? 0}/${summary.freshnessScore ?? 0}
  - 강한 촉매 수: ${summary.strongCatalystCount ?? 0}
  - 직접 촉매: ${catalyst ? `${catalyst.source} / ${catalyst.eventType} / ${catalyst.freshnessBucket} / ${catalyst.direction} - ${catalyst.title}` : "없음"}
  - 보조 뉴스: ${support ? `${support.source} ${support.directness} / ${support.eventType} / ${support.freshnessBucket}` : "없음"}
  - 뉴스 수집 시각: ${formatTimestampKst(summary.fetchedAt)}
  - 가장 최근 뉴스 발행 시각: ${formatTimestampKst(summary.lastPublishedAt)}
  - 뉴스 신선도 상태: ${summary.newsFreshnessStatus || newsFreshnessLabel(summary.lastPublishedAt)}
  - 뉴스 이후 가격 반응: ${summary.priceReaction || "UNKNOWN"}
  - 가격 반응 점수 제한: ${summary.priceReactionNote || "데이터 없음"}
  - 핵심 뉴스 요약: ${summary.headlineSummary || "의미 있는 신규 뉴스 없음"}
  - 원점수/상한 점수: ${signed(summary.rawNewsScore || 0)} / ${signed(summary.newsScore || 0)}
  - 점수 반영: ${signed(summary.newsScore || 0)}
  - 주의: ${(summary.notes || []).join("; ") || "특이사항 없음"}`;
}

function etfBreadthMarkdown(summary) {
  if (!summary) return "  - 구성종목 데이터 상태: 데이터 없음";
  return `  - 구성종목 데이터 상태: ${statusLabel(summary.status)}
  - 샘플 수: ${summary.sampledHoldingsCount || 0}/${summary.holdingsCount || 0}
  - 샘플 신뢰도: ${summary.sampleReliability || "UNKNOWN"}
  - 상승 종목 비율: ${summary.advancersRatio !== undefined ? `${Math.round(summary.advancersRatio * 100)}%` : "데이터 없음"}
  - 20일선 위 비율: ${summary.holdingsAbove20DMA !== undefined ? `${Math.round(summary.holdingsAbove20DMA * 100)}%` : "데이터 없음"}
  - 50일선 위 비율: ${summary.holdingsAbove50DMA !== undefined ? `${Math.round(summary.holdingsAbove50DMA * 100)}%` : "데이터 없음"}
  - 상위 기여 종목: ${(summary.topContributors || []).join(", ") || "데이터 없음"}
  - 확산도 판단: ${summary.breadthSignal || "UNKNOWN"}
  - 원점수/샘플 상한/반영 점수: ${signed(summary.rawBreadthScore || 0)} / ${summary.sampleCap ?? "N/A"} / ${signed(summary.etfBreadthScore || 0)}
  - 점수 반영: ${signed(summary.etfBreadthScore || 0)}`;
}

function liquidityMarkdown(summary) {
  if (!summary) return "  - 데이터 상태: 데이터 없음";
  return `  - 데이터 상태: ${statusLabel(summary.status)}
  - 거래대금 기준 유동성: ${summary.dollarVolumeLiquidity || summary.liquiditySignal || "UNKNOWN"}
  - 거래대금: ${summary.dollarVolume ? `$${summary.dollarVolume.toLocaleString("en-US")}` : "데이터 없음"}
  - 평균 거래대금: ${summary.avgDollarVolume20D ? `$${summary.avgDollarVolume20D.toLocaleString("en-US")}` : "데이터 없음"}
  - 주문 영향: ${summary.orderImpact || liquidityImpact(summary)}
  - 매매 영향: ${liquidityImpact(summary)}`;
}

function liquidityImpact(summary) {
  if (!summary) return "데이터 없음";
  if (summary.liquiditySignal === "LIQUID") return "거래대금이 충분해 시장가 가능 범위로 본다";
  if (summary.liquiditySignal === "ACCEPTABLE") return "거래대금은 허용 가능하나 지정가를 우선한다";
  if (["LOW_LIQUIDITY", "LOW"].includes(summary.liquiditySignal)) return "유동성 부족으로 추격 금지 또는 우선순위 하향";
  return "거래대금 유동성 확인 전 우선순위 하향";
}

function confidenceReason(row) {
  const used = row.moneyFlowScoreBreakdown?.dataUsed || {};
  const usedLabels = [
    used.priceVolume ? "가격/거래량" : null,
    used.news ? "뉴스" : null,
    used.etfBreadth ? "ETF 확산도" : null,
    used.dollarVolumeLiquidity ? "거래대금 유동성" : null,
    used.relativeStrength ? "관련 ETF 상대강도" : null
  ].filter(Boolean);
  if (row.reasonConfidence === "HIGH") return `${usedLabels.join(", ")} 데이터가 확인되어 신뢰도를 높게 본다.`;
  if (row.reasonConfidence === "MEDIUM") return `${usedLabels.join(", ") || "가격/거래량"}은 확인됐지만 일부 보조 데이터가 미연결 또는 fallback이라 중간으로 제한한다.`;
  return "가격/거래량이 약하거나 주요 데이터가 부족해 낮음.";
}

function renderDataCollectionMarkdown(report) {
  const rows = Object.values(report.supplementalData?.byTicker || {});
  const newsCount = rows.reduce((sum, row) => sum + (row.news?.itemCount || 0), 0);
  const breadthCount = rows.filter((row) => row.etfBreadth?.sampledHoldingsCount > 0).length;
  const liquidityFallback = rows.filter((row) => row.liquidity?.status === "PARTIAL").length;
  return `- 가격/거래량:
  - 상태: ${statusLabel(report.dataConnectionStatus.priceVolume)}
  - 소스: yfinance
  - 비고: REAL_TEST 가격/거래량 및 차트 생성 사용

- 뉴스:
  - 상태: ${statusLabel(report.dataConnectionStatus.news)}
  - 소스: ${(report.dataConnectionStatus.newsSources || []).map((row) => row.source).join(", ") || "Yahoo Finance RSS"}
  - 소스별 상태: ${(report.dataConnectionStatus.newsSources || []).map((row) => `${row.source} ${row.status}`).join("; ") || "데이터 없음"}
  - 수집 뉴스 수: ${newsCount}
  - 실패/제한 사유: ${providerNotes(rows, "news")}

- ETF 구성종목 확산도:
  - 상태: ${statusLabel(report.dataConnectionStatus.etfBreadth)}
  - 소스: config/etfHoldingsFallback.json 샘플
  - 수집 가능 ETF 수: ${breadthCount}
  - fallback 사용 여부: 사용

- Nasdaq-100 구성종목:
  - 상태: ${report.stockUniverse.fetchStatus}
  - 소스: ${report.stockUniverse.source}
  - 총 구성종목 수: ${report.stockUniverse.members.length}
  - 비고: ${(report.stockUniverse.notes || []).join("; ") || "특이사항 없음"}

- 전일 추천 snapshot:
  - 상태: ${report.previousSnapshot ? "연결됨" : "데이터 없음"}
  - 점검 대상: ${report.previousRecommendationReviews.length}
  - 저장 위치: data/latest-report.json, data/previous-report.json, data/dailyReports/

- 거래대금 유동성:
  - 상태: ${statusLabel(report.dataConnectionStatus.liquidity)}
  - 소스: 가격/거래량 기반 거래대금 fallback
  - 거래대금 fallback 사용 여부: ${liquidityFallback > 0 ? "사용" : "미사용"}

- 전체 비고:
${mdList((report.dataConnectionStatus.notes || []).map((note) => note), "- 특이사항 없음")}`;
}

function renderDataCollectionHtml(report) {
  return htmlList(renderDataCollectionMarkdown(report).split("\n").filter((line) => line.trim()).map((line) => escapeHtml(line.replace(/^\s*-\s*/, ""))));
}

function orderExecutionLabel(row) {
  const liquidity = row?.liquiditySummary || {};
  return liquidity.orderImpact || "지정가 권장";
}

function providerNotes(rows, key) {
  const notes = rows.flatMap((row) => row[key]?.notes || []).filter(Boolean);
  return unique(notes).slice(0, 3).join("; ") || "특이사항 없음";
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
- linkedNarrative: ${row.linkedNarrative || "미분류"}
- narrativeStatus: ${row.narrativeStatus || "관찰"}
- narrativeScore: ${row.narrativeScore ?? 0}
- moneyFlowScore: ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- finalRawScore: ${finalRawScore(row)}
- tieBreakerReason: ${row.tieBreakerReason}
- 과열 리스크: ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- reasonConfidenceExplanation: ${row.reasonConfidenceExplanation}
${row.reasonConfidence === "HIGH" ? `- ${row.directCatalyst}` : ""}
- todayActionLabel: ${row.todayActionLabel}
- 주문 실행: ${orderExecutionLabel(row)}
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
- 차트: ${chartMarkdown(row)}

#### 상세 근거
<details>
<summary>${row.ticker} 상세 근거 펼치기</summary>

- ${scoreBreakdownMarkdown(row)}
- 데이터 사용 현황:
${dataUsageMarkdown(row)}
- 뉴스 확인:
${newsMarkdown(row.newsSummary)}
- ETF 구성종목 확산도:
${etfBreadthMarkdown(row.etfBreadthSummary)}
- 거래대금 유동성:
${liquidityMarkdown(row.liquiditySummary)}
- reasonConfidence 근거: ${confidenceReason(row)}
- 차트 요약: ${row.chartSummary}
- ${marketLine(row.market)}

</details>`;
}

function renderStockMarkdown(row) {
  return `### [${row.ticker}] ${row.name}
- 자산 유형: STOCK
- 상태: ${row.status}
- primaryTheme: ${row.primaryTheme || "데이터 없음"}
- primarySector: ${row.primarySector || "데이터 없음"}
- relatedEtfs: ${row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "관련 ETF 데이터 부족"}
- linkedNarrative: ${row.linkedNarrative || "미분류"}
- narrativeStatus: ${row.narrativeStatus || "관찰"}
- narrativeScore: ${row.narrativeScore ?? 0}
- moneyFlowScore: ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- finalRawScore: ${finalRawScore(row)}
- tieBreakerReason: ${row.tieBreakerReason}
- 과열 리스크: ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- reasonConfidenceExplanation: ${row.reasonConfidenceExplanation}
${row.reasonConfidence === "HIGH" ? `- ${row.directCatalyst}` : ""}
- todayActionLabel: ${row.todayActionLabel}
- 주문 실행: ${orderExecutionLabel(row)}
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
- 왜 ETF가 아니라 이 종목인가: ${row.whyStockOverEtf}
- ETF가 더 나은 경우: ${row.whenEtfIsBetter}
- 진입 조건: ${row.entryCondition}
- 무효화 조건: ${row.invalidationCondition}
${row.holdingInfo ? `- 보유 정보: ${row.holdingInfo}\n` : ""}- 차트: ${chartMarkdown(row)}

#### 상세 근거
<details>
<summary>${row.ticker} 상세 근거 펼치기</summary>

- ${scoreBreakdownMarkdown(row)}
- 데이터 사용 현황:
${dataUsageMarkdown(row)}
- 뉴스 확인:
${newsMarkdown(row.newsSummary)}
- ETF 구성종목 확산도: 관련 ETF에서 확인
- 거래대금 유동성:
${liquidityMarkdown(row.liquiditySummary)}
- reasonConfidence 근거: ${confidenceReason(row)}
- 차트 요약: ${row.chartSummary}
- ${marketLine(row.market)}

</details>`;
}

function renderPreviousReviewMarkdown(row) {
  return `#### [${row.ticker}] ${row.name || row.ticker}
- 전일 추천일: ${row.recommendationDate || "데이터 없음"}
- 전일 actionLabel: ${row.actionLabel || "데이터 없음"}
- 전일 moneyFlowScore: ${row.moneyFlowScore ?? "데이터 없음"}
- 전일 종가 또는 추천 기준가: ${price(row.closePriceAtRecommendation)}
- 오늘 종가: ${price(row.todayClose)}
- 추천 이후 수익률: ${row.returnSinceRecommendation === null || row.returnSinceRecommendation === undefined ? "데이터 없음" : pct(row.returnSinceRecommendation)}
- 진입 조건 충족 여부: ${row.entryConditionMet ? "충족 또는 유지" : "미충족"}
- 무효화 조건 발생 여부: ${row.invalidationTriggered ? "발생" : "미발생"}
- 관련 ETF 대비 상대강도 유지 여부: ${row.relativeStrengthMaintained ? "유지" : "약화"}
- 오늘 상태: ${row.todayStatus}
- 오늘 판단 근거: ${row.todayReason}
- 다음 확인 조건: ${row.nextCondition || "데이터 없음"}`;
}

function renderStockUniverseScoreMarkdown(scan) {
  if (!scan) return "Nasdaq-100 전체 스캔 데이터 없음";
  const failures = scan.results.filter((row) => row.scanStatus !== "OK");
  return `이 표는 Nasdaq-100 전체 구성종목을 가격/거래량/추세 중심으로 빠르게 스캔한 moneyFlowScore(1차) 결과다. 뉴스, 유동성, 관련 ETF 대비 상대강도, 리스크 패널티를 반영한 최종 추천 점수는 Top5 카드의 moneyFlowScore(최종)에서 확인한다.

주의: Top5 카드의 moneyFlowScore(최종)는 1차 점수에 상세 데이터 가감점과 리스크 패널티를 더한 값이다. 따라서 아래 전체 표의 1차 순위와 Top5 최종 순위는 다를 수 있다.

- 총 스캔 종목 수: ${scan.totalCount}
- 점수 계산 성공: ${scan.successCount}
- 점수 계산 실패: ${scan.failedCount}
- moneyFlowScore(1차) 80점 이상: ${scan.scoreBands.strong}
- moneyFlowScore(1차) 65~79점: ${scan.scoreBands.interest}
- moneyFlowScore(1차) 50~64점: ${scan.scoreBands.watch}
- moneyFlowScore(1차) 50점 미만: ${scan.scoreBands.low}

상위 20개 요약:

${stockScoreTableMarkdown(scan.results.slice(0, 20))}

<details>
<summary>Nasdaq-100 전체 moneyFlowScore(1차) 표 펼치기</summary>

${stockScoreTableMarkdown(scan.results)}

</details>

#### 데이터 수집 실패 종목
${failures.length ? failures.map((row) => `- ${row.ticker}: ${row.failureReason || "score calculation failed"}`).join("\n") : "데이터 수집 실패 종목 없음"}`;
}

function stockScoreTableMarkdown(rows) {
  return `| 순위 | 티커 | 이름 | moneyFlowScore(1차) | 최종 표시 점수 | 최종 원점수 | 점수 구간 | 오늘 판단 | 신뢰도 | 1일 | 5일 | 20일 | 상대 거래량 | 관련 ETF |
|---:|---|---|---:|---:|---:|---|---|---|---:|---:|---:|---:|---|
${rows.map((row, index) => `| ${index + 1} | ${row.ticker} | ${escapePipes(row.name || row.ticker)} | ${row.moneyFlowScoreInitial ?? row.moneyFlowScore ?? "N/A"} | ${row.moneyFlowScoreFinal ?? "-"} | ${row.finalRawScore ?? "-"} | ${row.scoreBandLabel || "-"} | ${row.todayActionLabel || "-"} | ${row.reasonConfidence || "-"} | ${pctOrDash(row.oneDayReturn)} | ${pctOrDash(row.fiveDayReturn)} | ${pctOrDash(row.twentyDayReturn)} | ${row.relativeVolume === null || row.relativeVolume === undefined ? "-" : num(row.relativeVolume, 2)} | ${(row.relatedEtfs || []).join(", ") || "-"} |`).join("\n")}`;
}

function escapePipes(value) {
  return String(value || "").replace(/\|/g, "/");
}

function pctOrDash(value) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? "-" : pct(value);
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
    .sticky-nav { position: sticky; top: 0; z-index: 20; display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; margin: 0 0 12px; background: rgba(244, 246, 248, 0.96); backdrop-filter: blur(10px); border-bottom: 1px solid #d9dee3; }
    .sticky-nav a { flex: 0 0 auto; border: 1px solid #cbd5e1; border-radius: 999px; padding: 7px 11px; color: #334155; text-decoration: none; font-size: 12px; font-weight: 900; background: #fff; }
    section, article, .hero { background: #fff; border: 1px solid #d9dee3; border-radius: 8px; margin: 10px 0; padding: 14px; }
    .decision-panel { border: 2px solid #111827; }
    .decision-label { display: inline-flex; align-items: center; border-radius: 999px; padding: 7px 11px; font-weight: 900; color: #fff; background: #111827; }
    .limiter-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .limiter-pill { border: 1px solid #f59e0b; background: #fffbeb; color: #7c2d12; border-radius: 999px; padding: 6px 9px; font-size: 12px; font-weight: 900; }
    h1 { margin: 0 0 6px; font-size: 25px; } h2 { margin: 0 0 10px; font-size: 20px; } h3 { margin: 0 0 8px; font-size: 18px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .action-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: start; }
    .tile { border: 1px solid #d9dee3; border-radius: 8px; padding: 9px; background: #fbfcfd; }
    .tile strong { display: block; color: #5d6670; font-size: 12px; margin-bottom: 4px; }
    .compact-card { display: flex; flex-direction: column; gap: 7px; padding: 11px; }
    .card-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: start; min-height: 40px; }
    .card-head h3 { margin: 0; font-size: 16px; line-height: 1.25; }
    .card-subtitle { color: #5d6670; font-size: 12px; font-weight: 700; margin-top: 2px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .market-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .metric-chip { min-width: 0; border: 1px solid #d9dee3; border-radius: 6px; padding: 5px 6px; background: #fbfcfd; }
    .metric-chip strong { display: block; color: #172026; font-size: 15px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .metric-chip span { display: block; color: #5d6670; font-size: 10px; font-weight: 800; line-height: 1.2; margin-top: 2px; text-transform: uppercase; }
    .insight-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
    .insight { min-width: 0; border-top: 1px solid #edf0f2; padding-top: 6px; }
    .insight strong { display: block; color: #4b5563; font-size: 11px; margin-bottom: 3px; }
    .insight p { margin: 0; font-size: 12.5px; line-height: 1.32; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .compact-card details { margin-top: 2px; border-top: 1px solid #edf0f2; padding-top: 7px; }
    .compact-card summary { cursor: pointer; color: #172026; font-size: 13px; }
    .narrative-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: stretch; }
    .narrative-card { display: flex; flex-direction: column; gap: 8px; margin: 0; }
    .narrative-card h3 { margin: 0; font-size: 16px; line-height: 1.25; }
    .narrative-card p { margin: 0; font-size: 13px; line-height: 1.4; }
    .narrative-card .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .narrative-table { margin-top: 12px; }
    .tracking-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 10px 0 12px; }
    .tracking-summary-card { border: 1px solid #d9dee3; border-radius: 8px; padding: 10px; background: #fff; }
    .tracking-summary-card h3 { margin: 0 0 8px; font-size: 16px; line-height: 1.3; }
    .tracking-table-scroll { overflow-x: auto; }
    .trend-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: stretch; }
    .trend-card { display: flex; flex-direction: column; gap: 8px; margin: 0; }
    .trend-card h3 { margin: 0; font-size: 16px; line-height: 1.25; }
    .trend-card p { margin: 0; font-size: 13px; line-height: 1.4; }
    .result-success { background: #047857; }
    .result-neutral { background: #64748b; }
    .result-watch { background: #7c3aed; }
    .result-fail { background: #b91c1c; }
    .mobile-card-list, .mobile-action-summary, .mobile-only { display: none; }
    .summary-card { display: flex; flex-direction: column; gap: 8px; margin: 8px 0; }
    .summary-card h3 { margin: 0; font-size: 16px; line-height: 1.35; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .chip { display: inline-flex; align-items: center; max-width: 100%; border: 1px solid #d9dee3; border-radius: 999px; padding: 4px 8px; background: #fbfcfd; font-size: 12px; font-weight: 800; line-height: 1.2; }
    .field-line { margin: 0; font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }
    .ticker-list { display: flex; flex-wrap: wrap; gap: 4px 6px; }
    .ticker-list span { border: 1px solid #e5e7eb; border-radius: 999px; padding: 2px 6px; background: #fff; font-size: 12px; font-weight: 800; }
    .badge { display: inline-flex; border-radius: 999px; color: #fff; padding: 4px 8px; font-size: 12px; font-weight: 800; }
    .ready { background: #047857; } .candidate { background: #2563eb; } .watch, .hold { background: #4f46e5; } .profit { background: #0f766e; } .exit { background: #c2410c; } .ban { background: #991b1b; }
    .muted { color: #5d6670; font-size: 14px; } .purpose { font-weight: 800; }
    .warning-note { border: 1px solid #f59e0b; border-radius: 8px; background: #fffbeb; color: #7c2d12; padding: 9px 10px; font-size: 13px; font-weight: 800; line-height: 1.45; }
    .trading-chart { width: 100%; border: 1px solid #d9dee3; border-radius: 8px; background: #fff; overflow: hidden; }
    .chart-toolbar { display: flex; justify-content: space-between; gap: 8px; align-items: center; padding: 8px 10px; border-bottom: 1px solid #edf0f2; }
    .chart-title { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .chart-title strong { font-size: 14px; line-height: 1.1; }
    .chart-title span { color: #5d6670; font-size: 11px; font-weight: 800; }
    .range-toggle { display: inline-flex; border: 1px solid #d9dee3; border-radius: 6px; overflow: hidden; flex: 0 0 auto; }
    .range-toggle button { appearance: none; border: 0; border-left: 1px solid #d9dee3; background: #fbfcfd; color: #374151; min-width: 38px; min-height: 30px; padding: 5px 8px; font-size: 12px; font-weight: 800; cursor: pointer; }
    .range-toggle button:first-child { border-left: 0; }
    .range-toggle button.active { background: #172026; color: #fff; }
    .chart-stage { position: relative; height: 420px; }
    .candlestick-chart { display: none; width: 100%; height: 420px; }
    .candlestick-chart.active { display: block; }
    .chart-bg { fill: #fff; }
    .chart-grid { stroke: #edf0f2; stroke-width: 1; }
    .axis-line { stroke: #9aa4af; stroke-width: 1; }
    .axis-label, .panel-label { fill: #5d6670; font-size: 11px; font-weight: 700; }
    .chart-summary-text { fill: #172026; font-size: 13px; font-weight: 900; }
    .date-label { text-anchor: middle; }
    .candle-up .wick, .candle-up .body { stroke: #059669; fill: #059669; }
    .candle-down .wick, .candle-down .body { stroke: #dc2626; fill: #dc2626; }
    .volume-bar { opacity: 0.26; }
    .ma-line { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; }
    .ma5 { stroke: #2563eb; }
    .ma20 { stroke: #ea580c; }
    .ref-line line { stroke-width: 1.4; vector-effect: non-scaling-stroke; }
    .ref-leader { fill: none; stroke-width: 1; opacity: 0.72; vector-effect: non-scaling-stroke; }
    .ref-label-box { fill: #fff; stroke-width: 1; rx: 4; }
    .ref-label, .ref-price { font-size: 10px; font-weight: 900; }
    .axis-marker rect { rx: 4; }
    .axis-marker text { fill: #fff; font-size: 10px; font-weight: 900; }
    .recommendation-marker line { stroke: #7c3aed; stroke-width: 1.2; }
    .recommendation-marker rect { fill: #7c3aed; }
    .recommendation-marker circle { fill: #7c3aed; stroke: #fff; stroke-width: 1.5; }
    .recommendation-marker text { fill: #fff; font-size: 10px; font-weight: 900; }
    .chart-hit { fill: transparent; pointer-events: all; }
    .chart-tooltip { position: absolute; z-index: 3; display: none; max-width: min(280px, calc(100% - 20px)); pointer-events: none; border: 1px solid #172026; border-radius: 6px; background: rgba(255,255,255,0.96); box-shadow: 0 8px 18px rgba(15,23,42,0.14); padding: 7px 8px; color: #172026; font-size: 12px; font-weight: 800; line-height: 1.35; }
    .chart-legend { display: flex; flex-wrap: wrap; gap: 6px 10px; padding: 7px 10px 9px; border-top: 1px solid #edf0f2; color: #5d6670; font-size: 11px; font-weight: 800; }
    .chart-legend span { display: inline-flex; align-items: center; gap: 4px; }
    .chart-legend i { display: inline-block; width: 14px; height: 3px; border-radius: 999px; }
    .legend-up { background: #059669; } .legend-down { background: #dc2626; } .legend-ma5 { background: #2563eb; } .legend-ma20 { background: #ea580c; } .legend-prev-high { background: #0f766e; } .legend-recommend { background: #2563eb; } .legend-invalid { background: #b91c1c; }
    .chart-fallback { display: none; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; } th, td { border-top: 1px solid #d9dee3; padding: 8px; text-align: left; vertical-align: top; }
    td.num, th.num { text-align: right; white-space: nowrap; } td.ticker { font-weight: 800; white-space: nowrap; }
    ul { padding-left: 20px; } li { margin: 4px 0; }
    @media (max-width: 1199px) and (min-width: 768px) { .action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 767px) {
      html, body { max-width: 100%; overflow-x: hidden; }
      main { width: min(100% - 16px, 1120px); }
      .grid, .action-grid, .metric-grid, .market-grid, .insight-grid, .narrative-grid, .tracking-summary-grid, .trend-grid { grid-template-columns: 1fr; }
      h1 { font-size: 22px; }
      section, article, .hero { padding: 12px; }
      .desktop-table, .desktop-action-full { display: none !important; }
      .mobile-card-list, .mobile-action-summary, .mobile-only { display: block; }
      .summary-card, .compact-card { width: 100%; box-sizing: border-box; }
      .chart-toolbar { align-items: flex-start; }
      .chart-stage { height: 260px; }
      .candlestick-chart { height: 260px; }
      .axis-label, .panel-label, .ref-label, .recommendation-marker text { font-size: 9px; }
      .chart-legend { gap: 5px 8px; font-size: 10px; }
      .mobile-action-summary .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .insight p { display: block; overflow: visible; }
      .card-head { grid-template-columns: 1fr; min-height: 0; }
      .metric-chip strong { white-space: normal; overflow-wrap: anywhere; }
      .tile, .field-line, p, li, summary, td, th { word-break: keep-all; overflow-wrap: anywhere; }
      .table-scroll { overflow-x: visible; }
      .tracking-table-scroll { overflow-x: auto; }
      .narrative-section-table-title { display: none; }
    }
  </style>
</head>
<body>
  <main>
    <div class="banner" data-report-warning>${escapeHtml(report.dataWarning)}</div>
    ${renderStickyNavHtml()}
    <div class="hero">
      <h1>오늘의 데일리 트레이딩 요약</h1>
      <p class="purpose">${escapeHtml(PURPOSE)}</p>
      <p class="muted">생성 시각: ${escapeHtml(report.generatedAt)}</p>
      <p><strong>핵심 질문:</strong> 현재 가격에서 누가 사고 있고, 누가 앞으로 더 비싸게 사줄 수 있는가?</p>
      <p class="muted">보조 데이터는 연결 상태에 따라 점수 반영 범위가 달라진다.</p>
    </div>
    ${renderTodayDecisionHtml(report)}
    ${renderDataReliabilityHtml(report)}
    ${renderMarketStatusHtml(report)}
    ${renderNarrativesHtml(report)}
    ${renderTrendStrengthHtml(report)}
    ${renderRecommendationTrackingHtml(report)}
    ${renderActionCandidatesHtml(report)}
    ${renderDarkHorseCandidatesHtml(report)}
    ${renderReferenceCandidatesHtml(report)}
    ${renderSplitConclusionHtml(report)}
    ${renderMobileNarrativeSummarySectionHtml(report.narratives)}
    <section><h2>오늘 돈이 몰리는 테마</h2>${report.themes.slice(0, 6).map(renderThemeHtml).join("") || "<p>데이터 없음</p>"}</section>
    <section id="etf"><h2>1. ETF 트레이딩 보고서</h2>
      <h3>1-1. ETF 결론</h3>
      ${htmlList([
        `ETF 우선 후보: ${escapeHtml(report.etfActionCandidates.filter((row) => row.status === STATUS.ENTRY_READY).map((row) => row.ticker).join(", ") || "없음")}`,
        `ETF 관찰 후보: ${escapeHtml(report.etfs.filter((row) => row.status === STATUS.WATCH).slice(0, 5).map((row) => row.ticker).join(", ") || "없음")}`,
        `ETF 매매 금지: ${escapeHtml(report.etfBanRows.map((row) => row.ticker).join(", ") || "없음")}`,
        `오늘 ETF 최우선 1개: ${escapeHtml(etfBest ? `${etfBest.ticker} - ${etfBest.entryCondition}` : "없음")}`,
        "ETF 섹션 해석: 이 섹션은 개별 종목 선택이 아니라 테마/섹터 단위 자금 흐름을 ETF로 매매할지 판단하기 위한 영역이다."
      ])}
      <h3>1-2. ETF 후보 TOP 5</h3>${report.etfTop5.map(renderEtfHtml).join("") || "<p>데이터 없음</p>"}
      <h3>1-3. ETF 과열/주의 후보</h3>${htmlList(report.etfOverheat.slice(0, 5).map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | ${escapeHtml(row.overheatingRisk)} | ${escapeHtml(row.overheatingReason)}`))}
      <h3>1-4. ETF 제외/매매 금지 후보</h3>${htmlList(report.etfBanRows.map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | 해제 조건 ${escapeHtml(row.entryCondition)}`))}
    </section>
    <section id="stocks"><h2>2. 개별 종목 트레이딩 보고서</h2>
      <h3>2-1. 오늘 Nasdaq-100 신규 발굴 요약</h3>
      ${htmlList([
        "신규 발굴 풀: Nasdaq-100 구성종목 전체",
        `universe source: ${escapeHtml(report.stockUniverse.source)}`,
        `universe fetchStatus: ${escapeHtml(report.stockUniverse.fetchStatus)}`,
        `총 스캔 종목 수: ${report.stockScanSummary.total}`,
        `데이터 수집 성공: ${report.stockScanSummary.success}`,
        `데이터 수집 실패: ${report.stockScanSummary.failed}`,
        `상세 데이터 수집 대상: 가격/거래량 1차 스캔 상위 ${report.stockScanSummary.detailedCount}개`,
        `개별 종목 진입 후보: ${escapeHtml(report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음")}`,
        `개별 종목 눌림 대기: ${escapeHtml(report.stockActionCandidates.filter((row) => row.stockVsEtfDecision !== "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "없음")}`,
        `개별 종목 매매 금지: ${escapeHtml(report.stockCautionRows.filter((row) => row.status === STATUS.BAN).map((row) => row.ticker).join(", ") || "없음")}`,
        `오늘 개별 종목 최우선 1개: ${escapeHtml(stockBest ? `${stockBest.ticker} - ${stockBest.relativeStrengthVsEtf}` : "없음")}`,
        "개별 종목 섹션 해석: 이 섹션은 ETF로 확인된 테마 자금 흐름 안에서 ETF보다 더 강한 돌파 가능성이 있는 개별 종목만 선별하는 영역이다."
      ])}
      <h3>2-2. 오늘 개별 종목 신규 후보 TOP 5</h3>${report.stockTop5.map(renderStockHtml).join("") || "<p>데이터 없음</p>"}
      <h3>2-3. 전일 추천 종목 점검</h3>
      <p class="muted">이 섹션은 실제 계좌 보유 종목이 아니라 전일 리포트에서 제시된 개별 종목 후보의 사후 점검이다. 실제 보유 수량/평단이 입력되지 않았으므로 계좌 수익률이 아니라 추천 기준일 이후 가격 변화를 추적한다.</p>
      ${report.previousRecommendationReviews.length ? report.previousRecommendationReviews.map(renderPreviousReviewHtml).join("") : "<p>전일 추천 종목 데이터 없음</p>"}
      <h3>2-4. ETF 대비 개별 종목 판단 로직</h3>${htmlList(["관련 ETF의 5일/20일 수익률과 개별 종목의 5일/20일 수익률을 비교한다.", "관련 ETF의 상대 거래량과 개별 종목의 상대 거래량을 비교한다.", "개별 종목이 관련 ETF보다 강하면 개별 종목 우선 가능성으로 본다.", "관련 ETF가 더 강하면 개별 종목 대신 ETF를 우선한다."])}
      <h3>2-5. 개별 종목 제외/주의 후보</h3>${htmlList(report.stockCautionRows.map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | 해제 조건 ${escapeHtml(row.entryCondition)}`))}
      <h3 id="score-table">Nasdaq-100 전체 moneyFlowScore(1차) 표</h3>${renderStockUniverseScoreHtml(report.stockUniverseScan)}
    </section>
    <section><h2>감시 ETF 목록</h2>${renderEtfTable(report.etfs)}</section>
    <section><h2>3. 최종 실행 판단</h2>
      <h3>3-1. 오늘 실제로 할 일</h3>
      ${htmlList([
        `ETF에서 할 일: ${escapeHtml(etfBest ? `${etfBest.ticker} 포함 ETF 후보의 전일 고점 돌파와 5일선 유지를 확인한다.` : "ETF 후보는 관찰한다.")}`,
        `개별 종목에서 할 일: ${escapeHtml(stockBest ? `${stockBest.ticker} 등은 관련 ETF 대비 상대강도가 유지되는지 확인하고 눌림 또는 돌파 조건에서만 검토한다.` : "개별 종목은 관련 ETF 대비 상대강도 확인 전까지 관찰한다.")}`,
        "하지 말아야 할 일: ETF와 개별 종목을 같은 테마 안에서 중복 매수하지 않는다."
      ])}
      <h3>3-2. 내일 확인할 조건</h3>
      ${htmlList(["ETF 확인 조건: ETF 후보 TOP 5가 20일선 위에서 유지되는지 확인", "개별 종목 확인 조건: 관련 ETF 대비 5일/20일 상대강도와 상대 거래량 유지 확인", "시장 상태 확인 조건: QQQ/SPY의 5일/20일 추세와 위험선호 유지 여부 확인", "데이터 보강 필요 항목: 뉴스, ETF 구성종목 확산도, 프리마켓/정규장 거래량, 실제 보유 진입가"])}
    </section>
    <section><h2>데이터 수집 상태</h2>
      <div class="desktop-table">${renderDataCollectionHtml(report)}</div>
      <details class="mobile-card-list">
        <summary><strong>데이터 사용 현황과 보조 데이터 보기</strong></summary>
        ${renderDataCollectionHtml(report)}
      </details>
    </section>
    ${renderScoreGuideHtml()}
  </main>
  <script>
    document.querySelectorAll("[data-trading-chart]").forEach(function(chart) {
      var tooltip = chart.querySelector("[data-chart-tooltip]");
      chart.querySelectorAll("[data-chart-range]").forEach(function(button) {
        button.addEventListener("click", function() {
          var range = button.getAttribute("data-chart-range");
          chart.querySelectorAll("[data-chart-range]").forEach(function(item) { item.classList.toggle("active", item === button); });
          chart.querySelectorAll("[data-range-panel]").forEach(function(panel) { panel.classList.toggle("active", panel.getAttribute("data-range-panel") === range); });
        });
      });
      chart.querySelectorAll("[data-chart-hit]").forEach(function(hit) {
        hit.addEventListener("pointermove", function(event) {
          if (!tooltip) return;
          tooltip.textContent = hit.getAttribute("data-tooltip") || "";
          tooltip.style.display = "block";
          var stage = chart.querySelector(".chart-stage").getBoundingClientRect();
          var x = Math.min(stage.width - 12, Math.max(8, event.clientX - stage.left + 12));
          var y = Math.min(stage.height - 42, Math.max(8, event.clientY - stage.top - 10));
          tooltip.style.left = x + "px";
          tooltip.style.top = y + "px";
        });
        hit.addEventListener("pointerleave", function() {
          if (tooltip) tooltip.style.display = "none";
        });
      });
    });
  </script>
</body>
</html>`;
}

function renderStickyNavHtml() {
  return `<nav class="sticky-nav" aria-label="Report navigation">
    <a href="#decision">결론</a>
    <a href="#reliability">신뢰도</a>
    <a href="#market">시장</a>
    <a href="#actions">행동 후보</a>
    <a href="#dark-horse">다크호스</a>
    <a href="#etf">ETF</a>
    <a href="#stocks">개별주</a>
    <a href="#tracking">트래킹</a>
    <a href="#score-table">점수표</a>
  </nav>`;
}

function renderTodayDecisionHtml(report) {
  const d = report.todayDecision || {};
  return `<section id="decision" class="decision-panel" data-today-decision>
    <h2>오늘 결론</h2>
    <p><span class="decision-label">${escapeHtml(d.label || "매매 보류")}</span></p>
    <div class="grid">
      ${tile("신규 진입 후보", `${d.entryReadyCount ?? 0}개`)}
      ${tile("조건부 진입 후보", `${d.conditionalCount ?? 0}개`)}
      ${tile("관찰 후보", `${d.watchCount ?? 0}개`)}
      ${tile("오늘 행동 후보", `${d.actionCandidateCount ?? 0}개`)}
      ${tile("주문 판단", d.orderDecision || "시장가 금지 / 지정가 또는 관찰")}
      ${tile("주요 제한 요인", (d.mainLimiters || []).join(", ") || "특이 제한 없음")}
    </div>
    <p><strong>실전 판단:</strong> ${escapeHtml(d.noTradeMessage || "후보 조건이 충분히 충족될 때까지 관찰한다.")}</p>
    <div data-action-gate-summary>
      <h3>후보 제한 요인 집계</h3>
      <div class="limiter-list">${(report.actionGateSummary?.items || []).map((item) => `<span class="limiter-pill">${escapeHtml(item.label)}: ${item.count}개</span>`).join("") || "<span class=\"limiter-pill\">집계 데이터 없음</span>"}</div>
    </div>
  </section>`;
}

function renderDataReliabilityHtml(report) {
  const r = report.dataReliability || {};
  return `<section id="reliability" data-data-reliability>
    <h2>데이터 신뢰도</h2>
    <div class="grid">
      ${tile("전체 신뢰도", r.grade || "LOW")}
      ${tile("분석 신뢰도", r.analysisReliability || "LOW")}
      ${tile("주문 실행 신뢰도", r.executionReliability || "LOW")}
      ${tile("ETF breadth 신뢰도", r.etfBreadthReliability || "LOW")}
      ${tile("리포트 생성 시각", `${r.reportGeneratedAtKST || report.generatedAt} KST`)}
      ${tile("가격 기준 거래일", r.priceAsOfLabel || "데이터 없음")}
      ${tile("뉴스 수집 시각", formatTimestampKst(r.newsFetchedAt || r.newsLastUpdatedAt))}
      ${tile("최근 뉴스 발행", formatTimestampKst(r.latestNewsPublishedAt))}
      ${tile("뉴스 신선도", r.newsFreshnessStatus || "UNKNOWN")}
      ${tile("뉴스 소스", r.newsSources || "데이터 없음")}
      ${tile("뉴스 소스 상태", r.newsSourceStatus || "데이터 없음")}
      ${tile("뉴스 신뢰도", r.newsReliability || "LOW")}
      ${tile("추천 적용 거래일", r.recommendationSession || "데이터 없음")}
      ${tile("가격/거래량", statusLabel(r.priceVolumeStatus))}
      ${tile("뉴스", statusLabel(r.newsStatus))}
      ${tile("ETF 확산도", statusLabel(r.etfBreadthStatus))}
      ${tile("ETF 샘플 수", r.etfBreadthSampleCount || "0")}
      ${tile("거래대금 유동성", statusLabel(r.liquidityStatus))}
      ${tile("프리/애프터마켓", r.prePostMarketStatus || "UNAVAILABLE")}
      ${tile("Provider", r.providers || "데이터 없음")}
    </div>
    <p class="muted"><strong>신뢰도 해석:</strong> ${escapeHtml((r.reliabilityNotes || []).join(", ") || "핵심 데이터 제한 없음")}</p>
    <p class="warning-note">${escapeHtml(r.warning || REAL_WARNING)}</p>
  </section>`;
}

function renderMarketStatusHtml(report) {
  return `<section id="market"><h2>0. 시장 상태</h2><div class="grid">
    ${tile("데이터 모드", report.dataMode)}
    ${tile("가격/거래량", statusLabel(report.dataConnectionStatus.priceVolume))}
    ${tile("뉴스", statusLabel(report.dataConnectionStatus.news))}
    ${tile("ETF 구성종목 확산도", statusLabel(report.dataConnectionStatus.etfBreadth))}
    ${tile("거래대금 유동성", statusLabel(report.dataConnectionStatus.liquidity))}
    ${tile("생성 시각", report.generatedAt)}
    ${tile("시장 상태", report.marketLabel)}
    ${tile("후보별 진입 환경", "개별 게이트로 별도 판단")}
    ${tile("오늘 돈의 방향", moneyDirection(report))}
    ${tile("강한 테마 TOP 3", report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "데이터 없음")}
  </div>${htmlList(["전체 시장 상태와 후보별 진입 환경은 분리한다.", "종목은 강해도 당일 음봉, 고점 이탈, 거래량 둔화, 실적 후 매물 출회가 있으면 후보별 환경은 제한적일 수 있다.", "수집 실패 데이터는 점수 반영에서 제외하거나 confidence를 제한한다."])}</section>`;
}

function renderNarrativesHtml(report) {
  return `<section data-narrative-section><h2>오늘 시장을 지배하는 서사</h2>
    <h3>오늘 시장을 지배하는 서사 TOP 3</h3>
    <div class="narrative-grid">${report.topNarratives.map(renderNarrativeCardHtml).join("") || "<p>지배 서사 데이터 없음</p>"}</div>
    <h3 class="narrative-table narrative-section-table-title">전체 narrative 요약</h3>
    <div class="table-scroll desktop-table">${renderNarrativeTableHtml(report.narratives)}</div>
  </section>`;
}

function renderTrendStrengthHtml(report) {
  return `<section data-trend-strength-section>
    <h2>트렌드 강도 판단</h2>
    <div class="trend-grid">${(report.topNarratives || []).map(renderTrendStrengthCardHtml).join("") || "<p>트렌드 강도 데이터 없음</p>"}</div>
  </section>`;
}

function renderTrendStrengthCardHtml(row, index) {
  return `<article class="trend-card" data-trend-card="${escapeHtml(row.name)}">
    <h3>${index + 1}. ${escapeHtml(row.name)}</h3>
    <div class="metric-grid">
      ${metricChip("Trend Strength", row.trendStrengthIndex)}
      ${metricChip("상태", row.trendStateLabel)}
      ${metricChip("확산도", row.themeBreadthLabel)}
      ${metricChip("ETF 동조성", row.etfSyncLabel)}
      ${metricChip("거래량", row.volumeStrengthLabel)}
      ${metricChip("과열 위험", `${row.exhaustionRiskLabel} ${row.exhaustionRisk}`)}
      ${metricChip("진입 품질", `${row.entryQualityLabel} ${row.entryQualityScore}`)}
    </div>
    <p><strong>판단:</strong> ${escapeHtml(row.trendOneLineJudgment || "데이터 없음")}</p>
    <p><strong>오늘 접근법:</strong> ${escapeHtml(row.trendTodayApproach || "데이터 없음")}</p>
    <details>
      <summary><strong>트렌드 강도 상세 근거 보기</strong></summary>
      ${htmlList([
        `<strong>가격 모멘텀</strong> ${escapeHtml(row.trendDetailReasons?.priceMomentum || "데이터 없음")}`,
        `<strong>거래량 강도</strong> ${escapeHtml(row.trendDetailReasons?.volumeStrength || "데이터 없음")}`,
        `<strong>ETF 동조성</strong> ${escapeHtml(row.trendDetailReasons?.etfSync || "데이터 없음")}`,
        `<strong>테마 확산도</strong> ${escapeHtml(row.trendDetailReasons?.themeBreadth || "데이터 없음")}`,
        `<strong>뉴스 촉매</strong> ${escapeHtml(row.trendDetailReasons?.catalystFreshness || "데이터 없음")}`,
        `<strong>과열 리스크</strong> ${escapeHtml(row.trendDetailReasons?.exhaustionRisk || "데이터 없음")}`,
        `<strong>시장 환경</strong> ${escapeHtml(row.trendDetailReasons?.marketRegime || "데이터 없음")}`
      ])}
    </details>
  </article>`;
}

function renderRecommendationTrackingHtml(report) {
  const tracking = report.recommendationTracking || { stockSummary: {}, etfSummary: {}, items: [] };
  return `<section id="tracking" data-recommendation-tracking>
    <h2>최근 추천 결과 트래킹</h2>
    <p class="muted">개별주는 데이트레이딩 관점으로 추천 이후 첫 정규장의 장중 최고가와 종가를 추적한다. ETF는 테마/스윙 관점으로 추천 이후 1주일 동안의 최고가와 현재 종가를 추적한다.</p>
    <div class="tracking-summary-grid">
      ${renderTrackingSummaryCardHtml(tracking.stockSummary, [
        ["장중 최고가 기준 성공률", tracking.stockSummary.highSuccessRate],
        ["종가 기준 성공률", tracking.stockSummary.closeSuccessRate],
        ["평균 장중 최고 수익률", tracking.stockSummary.averageHighReturnPct],
        ["평균 종가 수익률", tracking.stockSummary.averageCloseReturnPct]
      ])}
      ${renderTrackingSummaryCardHtml(tracking.etfSummary, [
        ["1주 최고가 기준 성공률", tracking.etfSummary.weeklyHighSuccessRate],
        ["현재 종가 기준 성공률", tracking.etfSummary.latestCloseSuccessRate],
        ["평균 1주 최고 수익률", tracking.etfSummary.averageWeeklyHighReturnPct],
        ["평균 현재 수익률", tracking.etfSummary.averageLatestCloseReturnPct]
      ])}
    </div>
    <details>
      <summary><strong>최근 추천 결과 상세 테이블 펼치기</strong></summary>
      <div class="tracking-table-scroll">${renderTrackingTableHtml(tracking.items)}</div>
    </details>
  </section>`;
}

function renderTrackingSummaryCardHtml(summary, metrics) {
  return `<article class="tracking-summary-card">
    <h3>${escapeHtml(summary.title || "성과 요약")}</h3>
    <p class="muted">최근 5개 리포트 표본: ${escapeHtml(summary.sampleSize ?? 0)}개 · ${escapeHtml(summary.sampleReliability || trackingSampleReliability(summary.sampleSize || 0))}</p>
    <div class="metric-grid">${metrics.map(([label, value]) => metricChip(label, summaryPct(value))).join("")}</div>
  </article>`;
}

function renderTrackingTableHtml(items) {
  if (!items?.length) return "<p>추천 결과 트래킹 데이터 없음</p>";
  return `<table data-recommendation-tracking-table><thead><tr><th>추천일</th><th>유형</th><th class="num">순위</th><th>티커</th><th class="num">기준가</th><th>추적 기간</th><th>상태</th><th class="num">High 수익률</th><th class="num">Close 수익률</th><th>결과</th><th>코멘트</th></tr></thead><tbody>${items.map((row) => {
    const period = row.assetType === "ETF" ? `${row.trackingStartDate}~${row.trackingEndDate}` : row.trackingSessionDate;
    const highReturn = row.assetType === "ETF" ? row.weeklyHighReturnPct : row.highReturnPct;
    const closeReturn = row.assetType === "ETF" ? row.latestCloseReturnPct : row.closeReturnPct;
    return `<tr><td>${escapeHtml(row.reportDate)}</td><td>${escapeHtml(row.assetType)}</td><td class="num">${escapeHtml(row.rank)}</td><td class="ticker">${escapeHtml(row.ticker)}</td><td class="num">${escapeHtml(price(row.recommendationPrice))}</td><td>${escapeHtml(period || "-")}</td><td>${escapeHtml(row.trackingStatus || "-")}</td><td class="num">${escapeHtml(summaryPct(highReturn))}</td><td class="num">${escapeHtml(summaryPct(closeReturn))}</td><td>${resultBadge(row.resultLabel)}</td><td>${escapeHtml(row.resultComment || "-")}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function resultBadge(label) {
  const value = label || "추적 대기";
  const className = value === "성공"
    ? "result-success"
    : ["단타 유효", "단기 고점 후 반납"].includes(value)
      ? "result-neutral"
      : ["제한적 유효", "진행 중", "추적 대기"].includes(value)
        ? "result-watch"
        : value === "실패"
          ? "result-fail"
          : "watch";
  return `<span class="badge ${className}">${escapeHtml(value)}</span>`;
}

function renderNarrativeCardHtml(row, index) {
  return `<article class="narrative-card" data-narrative-card="${escapeHtml(row.name)}">
    <h3>${index + 1}. ${escapeHtml(row.name)}</h3>
    <div class="metric-grid">
      ${metricChip("Status", row.status)}
      ${metricChip("narrativeScore", row.narrativeScore)}
      ${metricChip("Confidence", row.reasonConfidence)}
    </div>
    <p><strong>근거 ETF:</strong> ${escapeHtml(row.supportEtfs.join(", ") || "데이터 없음")}</p>
    <p><strong>근거 개별 종목:</strong> ${escapeHtml(row.supportStocks.join(", ") || "데이터 없음")}</p>
    <p><strong>돈이 몰리는 이유:</strong> ${escapeHtml(row.whyMoneyIsFlowing)}</p>
    <p><strong>오늘 행동:</strong> ${escapeHtml(row.todayAction)}</p>
    <details>
      <summary><strong>서사 상세 근거 보기</strong></summary>
      ${htmlList([
        `<strong>다음 매수 주체</strong> ${escapeHtml(row.likelyNextBuyer)}`,
        `<strong>가장 좋은 트레이딩 수단</strong> ${escapeHtml(row.bestTradingVehicle)}`,
        `<strong>서사가 깨지는 조건</strong> ${escapeHtml(row.breakCondition)}`,
        `<strong>rawScore</strong> ${escapeHtml(row.rawScore)}`,
        `<strong>ETF 평균 moneyFlowScore</strong> ${escapeHtml(row.etfAvgScore)}`,
        `<strong>개별 종목 평균 moneyFlowScore</strong> ${escapeHtml(row.stockAvgScore)}`,
        `<strong>평균 상대 거래량</strong> ${escapeHtml(num(row.relativeVolumeAvg, 2))}배`,
        `<strong>ETF 평균 상대 거래량</strong> ${escapeHtml(num(row.etfRelativeVolumeAvg, 2))}배`,
        `<strong>개별주 평균 상대 거래량</strong> ${escapeHtml(num(row.stockRelativeVolumeAvg, 2))}배`,
        `<strong>뉴스 직접성 점수</strong> ${escapeHtml(row.newsDirectScore)}`,
        `<strong>ETF 확산도 점수</strong> ${escapeHtml(row.etfBreadthScore)}`,
        `<strong>유동성 점수</strong> ${escapeHtml(row.liquidityScore)}`,
        `<strong>과열 리스크 차감</strong> ${escapeHtml(row.overheatPenalty)}`
      ])}
    </details>
  </article>`;
}

function renderNarrativeTableHtml(narratives) {
  return `<table data-narrative-table><thead><tr><th>서사명</th><th>상태</th><th class="num">narrativeScore</th><th>reasonConfidence</th><th>대표 ETF</th><th>대표 종목</th><th>오늘 행동</th></tr></thead><tbody>${narratives.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.status)}</td><td class="num">${row.narrativeScore}</td><td>${escapeHtml(row.reasonConfidence)}</td><td>${escapeHtml(row.representativeEtfs.join(", ") || "-")}</td><td>${escapeHtml(row.representativeStocks.join(", ") || "-")}</td><td>${escapeHtml(row.todayAction)}</td></tr>`).join("")}</tbody></table>`;
}

function renderNarrativeSummaryCardsHtml(narratives) {
  return `<div class="mobile-card-list" data-mobile-narrative-cards>${narratives.map((row) => `<article class="summary-card" data-mobile-narrative-card="${escapeHtml(row.name)}">
    <h3>${escapeHtml(row.name)}</h3>
    <div class="chip-row">
      ${chip(row.status)}
      ${chip(`${row.narrativeScore}점`)}
      ${chip(row.reasonConfidence)}
    </div>
    ${fieldLine("대표 ETF", tickerList(row.representativeEtfs))}
    ${fieldLine("대표 종목", tickerList(row.representativeStocks))}
    ${fieldLine("오늘 행동", escapeHtml(row.todayAction))}
  </article>`).join("")}</div>`;
}

function renderMobileNarrativeSummarySectionHtml(narratives) {
  return `<section class="mobile-only" data-mobile-narrative-summary-section>
    <h2>전체 narrative 요약</h2>
    ${renderNarrativeSummaryCardsHtml(narratives)}
  </section>`;
}

function renderSplitConclusionHtml(report) {
  return `<section><h2>오늘의 분리 결론</h2><div class="grid">
    ${tile("ETF 행동 후보", report.etfActionCandidates.map((row) => row.ticker).join(", ") || "없음")}
    ${tile("개별 종목 행동 후보", report.stockActionCandidates.map((row) => row.ticker).join(", ") || "없음")}
  </div></section>`;
}

function renderActionCandidatesHtml(report) {
  const cards = report.actionCandidates.slice(0, 3);
  return `<section id="actions"><h2>오늘 실제 행동 후보</h2>
    ${cards.length ? `<div class="action-grid">${cards.map(renderActionHtml).join("")}</div>` : `<p>${escapeHtml(report.todayDecision?.noTradeMessage || "오늘 즉시 행동 후보 없음. 왜 돈이 몰리는가, 누가 더 비싸게 사줄 수 있는가, 진입 조건이 동시에 충족된 후보가 없어 TOP 5는 관찰 목록으로만 본다.")}</p>`}
  </section>`;
}

function renderDarkHorseCandidatesHtml(report) {
  const rows = report.darkHorseCandidates || [];
  return `<section id="dark-horse" data-dark-horse-candidates>
    <h2>다크호스 후보</h2>
    <p class="warning-note">메인 행동 후보를 대체하지 않는 보조 관찰 섹션이다. 상위 서사 안에서 초기 추세 전환, 베이스 돌파, 거래량 회복이 시작되는 개별주만 표시한다.</p>
    ${rows.length ? `<div class="action-grid">${rows.map(renderDarkHorseCandidateHtml).join("")}</div>` : `<p>다크호스 후보 없음. 상위 서사 정렬, MA20 위 안착, MA5/MA20 구조 개선, RVOL 0.90x 이상 조건을 동시에 충족한 개별주가 없다.</p>
    <div class="grid">
      ${tile("darkHorseScore", "조건 충족 후보 없음")}
      ${tile("아직 메인이 아닌 이유", "확인 조건을 통과한 보조 관찰 후보가 없다.")}
    </div>
    <details>
      <summary><strong>darkHorseScore 상세 근거 보기</strong></summary>
      <div class="grid">
        ${tile("서사 정렬", "조건 미충족")}
        ${tile("초기 추세 구조", "조건 미충족")}
        ${tile("베이스 돌파", "조건 미충족")}
        ${tile("거래량 확인", "조건 미충족")}
        ${tile("rawScore", "데이터 없음")}
      </div>
    </details>`}
  </section>`;
}

function renderDarkHorseCandidateHtml(row) {
  const d = row.darkHorse || {};
  const b = d.breakdown || {};
  return `<article class="compact-card" data-dark-horse-card="${escapeHtml(row.ticker)}">
    ${cardHeader(`${row.darkHorseRank}. [${row.ticker}] ${row.name || row.ticker}`, d.label || "다크호스", d.stage || "초기 관찰")}
    ${chartImage(row)}
    <div class="grid">
      ${tile("darkHorseScore", `${d.score ?? 0}`)}
      ${tile("Confidence", d.confidence || "LOW")}
      ${tile("소속 서사", row.linkedNarrative || "미분류")}
      ${tile("5D", pct(row.market?.return5dPct))}
      ${tile("20D", pct(row.market?.return20dPct))}
      ${tile("RVOL", `${num(row.market?.relativeVolume, 2)}x`)}
      ${tile("MA 구조", `C ${price(row.market?.lastClose)} / MA5 ${price(row.darkHorseInput?.ma5)} / MA20 ${price(row.darkHorseInput?.ma20)}`)}
      ${tile("아직 메인이 아닌 이유", d.whyNotMain || "조건 확인 전")}
    </div>
    ${fieldLine("선정 이유", escapeHtml(d.reason || "데이터 없음"))}
    ${fieldLine("확인 조건", escapeHtml(d.confirmCondition || "데이터 없음"))}
    ${fieldLine("무효화 조건", escapeHtml(d.invalidationCondition || "데이터 없음"))}
    <details>
      <summary><strong>darkHorseScore 상세 근거 보기</strong></summary>
      <div class="grid">
        ${tile("서사 정렬", `${b.narrativeAlignmentScore ?? 0}/20`)}
        ${tile("초기 추세 구조", `${b.earlyTrendStructureScore ?? 0}/30`)}
        ${tile("베이스 돌파", `${b.baseBreakoutScore ?? 0}/20`)}
        ${tile("거래량 확인", `${b.volumeConfirmationScore ?? 0}/15`)}
        ${tile("낮은 과열", `${b.lowExhaustionScore ?? 0}/10`)}
        ${tile("유동성 보정", `${b.liquidityRiskScore ?? 0}/5`)}
        ${tile("리스크 차감", `-${b.riskPenalty ?? 0}`)}
        ${tile("rawScore", b.rawScore ?? 0)}
      </div>
    </details>
  </article>`;
}

function renderReferenceCandidatesHtml(report) {
  if (report.actionCandidates.length) return "";
  const etfs = report.referenceCandidates?.etfs || [];
  const stocks = report.referenceCandidates?.stocks || [];
  if (!etfs.length && !stocks.length) return "";
  return `<section data-reference-candidates>
    <h2>참고용 행동 후보</h2>
    <p class="warning-note">실제 행동 후보가 없는 날에만 표시하는 관찰 리스트다. 매수 추천이 아니며, 전일 고점 돌파, RVOL 1.00x 이상, 거래대금 유동성 확인 전에는 신규 추격하지 않는다.</p>
    <h3>ETF 참고 후보 TOP 3</h3>
    <div class="action-grid">${etfs.map(renderReferenceCandidateHtml).join("")}</div>
    <h3>개별주 참고 후보 TOP 3</h3>
    <div class="action-grid">${stocks.map(renderReferenceCandidateHtml).join("")}</div>
  </section>`;
}

function renderReferenceCandidateHtml(row) {
  return `<article class="compact-card" data-reference-card="${escapeHtml(row.ticker)}">
    ${cardHeader(`${row.referenceRank}. [${row.ticker}] ${row.name || row.ticker}`, row.status, "참고용 관찰")}
    ${chartImage(row)}
    <div class="grid">
      ${tile("제한 사유", row.actionGate?.reasons?.join(" / ") || "실제 행동 후보 게이트 미충족")}
      ${tile("주문 실행", orderExecutionLabel(row))}
      ${tile("Entry Quality", row.entryQualityScore === undefined ? "데이터 없음" : `${row.entryQualityLabel || ""} ${row.entryQualityScore}`)}
      ${tile("RVOL", `${num(row.market?.relativeVolume, 2)}x`)}
      ${tile("moneyFlowScore", row.moneyFlowScoreFinal ?? row.moneyFlowScore)}
      ${tile("후보 환경", row.marketContext?.candidateEnvironment || "데이터 없음")}
    </div>
    ${fieldLine("진입 전 확인", escapeHtml(row.entryCondition || "데이터 없음"))}
    ${fieldLine("무효화", escapeHtml(row.invalidationCondition || "데이터 없음"))}
  </article>`;
}

function renderScoreGuideHtml() {
  return `<section><h2>참고: moneyFlowScore 산정 방식과 트렌드 강도</h2>
    <h3>score의 의미</h3>
    <p>moneyFlowScore는 매수 추천 점수가 아니라 현재 ETF 또는 종목으로 돈이 몰리는 정도를 추적하는 트레이딩 후보 점수다.</p>
    <p>Trend Strength Index는 테마 전체의 돈 몰림 강도이고, Entry Quality Score는 오늘 실제 진입 품질이다. 강한 트렌드와 매수 가능성은 분리해서 판단한다.</p>
    <h3>계산 구조</h3>
    ${htmlList([
      "moneyFlowScore(1차) = 추세 + 단기 모멘텀 + 중기 모멘텀 + 거래량 + 신고가 근접 + 이동평균",
      "moneyFlowScore(최종 원점수) = moneyFlowScore(1차) + 뉴스 + ETF 확산도 + 유동성 + 관련 ETF 대비 상대강도 + 리스크 패널티",
      "moneyFlowScore(최종 표시 점수) = min(100, max(0, 최종 원점수))",
      "하위 점수는 각 최대치를 넘지 않도록 cap 처리하고, 상세 근거에 원점수와 상한 적용 점수를 함께 표시한다.",
      "리스크 패널티는 음수로 저장하고 계산식에 그대로 더한다.",
      "표시 점수 100점 후보가 겹치면 finalRawScore와 tieBreakerReason으로 우선순위를 설명한다.",
      "행동 라벨은 Entry Quality, Exhaustion Risk, RVOL, 거래대금 유동성 게이트를 통과해야 진입 가능으로 표시한다."
    ])}
    <h3>점수 구간 해석</h3>
    ${htmlList(["80점 이상: 강한 자금 유입 후보", "65~79점: 관심 후보", "50~64점: 관찰 후보", "50점 미만: 매매 금지 또는 우선순위 낮음"])}
    <p><strong>주의:</strong> 점수가 높아도 진입 조건, 무효화 조건, 리스크 패널티 근거를 함께 확인해야 한다.</p>
  </section>`;
}

function renderActionHtml(row) {
  return `<article class="compact-card" data-action-card="${escapeHtml(row.ticker)}">
    ${cardHeader(`${row.rank}. [${row.ticker}] ${row.name || row.ticker}`, row.status, row.todayActionLabel)}
    <div class="mobile-action-summary">
      ${chartImage(row)}
      ${mobileActionSummaryHtml(row)}
    </div>
    <div class="desktop-action-full">
      ${chartImage(row)}
      ${coreMetricGrid(row, row.assetType)}
      ${marketMetricGrid(row)}
      ${insightGrid(row)}
      ${scoreBreakdownHtml(row)}
      ${supplementalDetailsHtml(row)}
    </div>
    <details class="mobile-card-list">
      <summary><strong>후보 상세 근거 보기</strong></summary>
      ${coreMetricGrid(row, row.assetType)}
      ${marketMetricGrid(row)}
      ${insightGrid(row)}
      ${scoreBreakdownHtml(row)}
      ${supplementalDetailsHtml(row)}
    </details>
  </article>`;
}

function mobileActionSummaryHtml(row) {
  return `<div class="metric-grid">
      ${metricChip("Status", row.status)}
      ${metricChip("Narrative", row.linkedNarrative || "미분류")}
      ${metricChip("moneyFlowScore", row.moneyFlowScoreFinal ?? row.moneyFlowScore)}
      ${metricChip("finalRawScore", finalRawScore(row))}
      ${metricChip("주문 실행", orderExecutionLabel(row))}
    </div>
    ${fieldLine("왜 돈이 몰리는가", escapeHtml(row.whyMoneyIsFlowing || "데이터 없음"))}
    ${fieldLine("진입 조건", escapeHtml(row.entryCondition || "데이터 없음"))}
    ${fieldLine("무효화 조건", escapeHtml(row.invalidationCondition || "데이터 없음"))}`;
}

function renderEtfHtml(row) {
  return `<article class="compact-card" data-etf-card="${escapeHtml(row.ticker)}">
    ${cardHeader(`[ETF ${row.ticker}] ${row.name}`, row.status, row.etfRole)}
    ${chartImage(row)}
    ${coreMetricGrid(row, "ETF", [
      ["ETF Category", row.etfCategory],
      ["ETF Role", row.etfRole],
      ["Data", row.market.dataStatus]
    ])}
    ${marketMetricGrid(row)}
    ${insightGrid(row)}
    ${scoreBreakdownHtml(row)}
    ${supplementalDetailsHtml(row)}
    <p class="muted">${escapeHtml(marketLine(row.market))}</p>
  </article>`;
}

function renderStockHtml(row) {
  return `<article class="compact-card" data-stock-card="${escapeHtml(row.ticker)}">
    ${cardHeader(`[${row.ticker}] ${row.name}`, row.status, row.primaryTheme || row.todayActionLabel)}
    ${chartImage(row)}
    ${coreMetricGrid(row, "STOCK", [
      ["Theme", row.primaryTheme || "데이터 없음"],
      ["Related ETF", row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "관련 ETF 부족"],
      ["Vs ETF", row.relativeStrengthVsEtf]
    ])}
    ${marketMetricGrid(row)}
    ${insightGrid(row, [
      ["왜 ETF가 아니라 이 종목인가", row.whyStockOverEtf],
      ["ETF가 더 나은 경우", row.whenEtfIsBetter]
    ])}
    ${scoreBreakdownHtml(row)}
    ${supplementalDetailsHtml(row)}
    ${row.holdingInfo ? `<p class="muted">${escapeHtml(row.holdingInfo)}</p>` : ""}
    <p class="muted">${escapeHtml(marketLine(row.market))}</p>
  </article>`;
}

function renderPreviousReviewHtml(row) {
  return `<article data-previous-review-card="${escapeHtml(row.ticker)}"><h3>[${escapeHtml(row.ticker)}] ${escapeHtml(row.name || row.ticker)} ${badge(row.todayStatus)}</h3>
    <div class="grid">
      ${tile("전일 추천일", row.recommendationDate || "데이터 없음")}
      ${tile("전일 actionLabel", row.actionLabel || "데이터 없음")}
      ${tile("전일 moneyFlowScore", row.moneyFlowScore ?? "데이터 없음")}
      ${tile("전일 기준가", price(row.closePriceAtRecommendation))}
      ${tile("오늘 종가", price(row.todayClose))}
      ${tile("추천 이후 수익률", row.returnSinceRecommendation === null || row.returnSinceRecommendation === undefined ? "데이터 없음" : pct(row.returnSinceRecommendation))}
      ${tile("진입 조건", row.entryConditionMet ? "충족 또는 유지" : "미충족")}
      ${tile("무효화 조건", row.invalidationTriggered ? "발생" : "미발생")}
      ${tile("ETF 대비 상대강도", row.relativeStrengthMaintained ? "유지" : "약화")}
    </div>
    ${htmlList([`오늘 판단 근거: ${escapeHtml(row.todayReason)}`, `다음 확인 조건: ${escapeHtml(row.nextCondition || "데이터 없음")}`])}
  </article>`;
}

function renderStockUniverseScoreHtml(scan) {
  if (!scan) return "<p>Nasdaq-100 전체 스캔 데이터 없음</p>";
  const failures = scan.results.filter((row) => row.scanStatus !== "OK");
  return `<p>이 표는 Nasdaq-100 전체 구성종목을 가격/거래량/추세 중심으로 빠르게 스캔한 moneyFlowScore(1차) 결과다. 뉴스, 유동성, 관련 ETF 대비 상대강도, 리스크 패널티를 반영한 최종 추천 점수는 Top5 카드의 moneyFlowScore(최종)에서 확인한다.</p>
    <p class="muted">Top5 카드의 moneyFlowScore(최종)는 1차 점수에 상세 데이터 가감점과 리스크 패널티를 더한 값이다. 따라서 아래 전체 표의 1차 순위와 Top5 최종 순위는 다를 수 있다.</p>
    <div class="grid">
      ${tile("총 스캔 종목 수", scan.totalCount)}
      ${tile("점수 계산 성공", scan.successCount)}
      ${tile("점수 계산 실패", scan.failedCount)}
      ${tile("moneyFlowScore(1차) 80점 이상", scan.scoreBands.strong)}
      ${tile("moneyFlowScore(1차) 65~79점", scan.scoreBands.interest)}
      ${tile("moneyFlowScore(1차) 50~64점", scan.scoreBands.watch)}
      ${tile("moneyFlowScore(1차) 50점 미만", scan.scoreBands.low)}
    </div>
    <h4>상위 20개 요약</h4>
    <div class="table-scroll desktop-table">${stockScoreTableHtml(scan.results.slice(0, 20))}</div>
    ${stockScoreCardsHtml(scan.results.slice(0, 20))}
    <details class="desktop-table">
      <summary><strong>Nasdaq-100 전체 moneyFlowScore(1차) 표 펼치기</strong></summary>
      <div class="table-scroll">${stockScoreTableHtml(scan.results)}</div>
    </details>
    <details class="mobile-card-list">
      <summary><strong>Nasdaq-100 전체 moneyFlowScore(1차) 목록 펼치기</strong></summary>
      ${stockScoreCardsHtml(scan.results)}
    </details>
    <h4>데이터 수집 실패 종목</h4>
    ${htmlList(failures.length ? failures.map((row) => `${escapeHtml(row.ticker)}: ${escapeHtml(row.failureReason || "score calculation failed")}`) : ["데이터 수집 실패 종목 없음"])}`;
}

function stockScoreTableHtml(rows) {
  return `<table data-stock-universe-table><thead><tr><th class="num">순위</th><th>티커</th><th>이름</th><th class="num">moneyFlowScore(1차)</th><th class="num">최종 표시 점수</th><th class="num">최종 원점수</th><th>점수 구간</th><th>오늘 판단</th><th>신뢰도</th><th class="num">1일</th><th class="num">5일</th><th class="num">20일</th><th class="num">상대 거래량</th><th>관련 ETF</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td class="num">${index + 1}</td><td class="ticker">${escapeHtml(row.ticker)}</td><td>${escapeHtml(row.name || row.ticker)}</td><td class="num">${row.moneyFlowScoreInitial ?? row.moneyFlowScore ?? "N/A"}</td><td class="num">${row.moneyFlowScoreFinal ?? "-"}</td><td class="num">${row.finalRawScore ?? "-"}</td><td>${escapeHtml(row.scoreBandLabel || "-")}</td><td>${escapeHtml(row.todayActionLabel || "-")}</td><td>${escapeHtml(row.reasonConfidence || "-")}</td><td class="num">${escapeHtml(pctOrDash(row.oneDayReturn))}</td><td class="num">${escapeHtml(pctOrDash(row.fiveDayReturn))}</td><td class="num">${escapeHtml(pctOrDash(row.twentyDayReturn))}</td><td class="num">${row.relativeVolume === null || row.relativeVolume === undefined ? "-" : escapeHtml(num(row.relativeVolume, 2))}</td><td>${escapeHtml((row.relatedEtfs || []).join(", ") || "-")}</td></tr>`).join("")}</tbody></table>`;
}

function stockScoreCardsHtml(rows) {
  return `<div class="mobile-card-list" data-mobile-stock-score-cards>${rows.map((row, index) => `<article class="summary-card" data-mobile-stock-score-card="${escapeHtml(row.ticker)}">
    <h3>${index + 1}. ${escapeHtml(row.ticker)} ${escapeHtml(row.name || "")}</h3>
    <div class="chip-row">
      ${chip(`1차 ${row.moneyFlowScoreInitial ?? row.moneyFlowScore ?? "N/A"}`)}
      ${chip(`최종 ${row.moneyFlowScoreFinal ?? "-"}`)}
      ${chip(`원점수 ${finalRawScore(row)}`)}
      ${chip(row.reasonConfidence || "-")}
    </div>
    ${fieldLine("오늘 판단", escapeHtml(row.todayActionLabel || "-"))}
    ${fieldLine("수익률", escapeHtml(`1일 ${pctOrDash(row.oneDayReturn)} / 5일 ${pctOrDash(row.fiveDayReturn)} / 20일 ${pctOrDash(row.twentyDayReturn)}`))}
    ${fieldLine("관련 ETF", tickerList(row.relatedEtfs || []))}
  </article>`).join("")}</div>`;
}

function supplementalDetailsHtml(row) {
  return `<details>
    <summary><strong>데이터 사용 현황과 보조 데이터</strong></summary>
    <h4>데이터 사용 현황</h4>${htmlList(dataUsageHtmlItems(row))}
    <h4>뉴스 확인</h4>${htmlList(newsHtmlItems(row.newsSummary))}
    <h4>ETF 구성종목 확산도</h4>${row.assetType === "ETF" ? htmlList(etfBreadthHtmlItems(row.etfBreadthSummary)) : htmlList(["관련 ETF에서 확인"])}
    <h4>거래대금 유동성</h4>${htmlList(liquidityHtmlItems(row.liquiditySummary))}
    <h4>reasonConfidence 근거</h4><p class="muted">${escapeHtml(confidenceReason(row))}</p>
  </details>`;
}

function dataUsageHtmlItems(row) {
  return dataUsageMarkdown(row).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function newsHtmlItems(summary) {
  return newsMarkdown(summary).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function etfBreadthHtmlItems(summary) {
  return etfBreadthMarkdown(summary).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function liquidityHtmlItems(summary) {
  return liquidityMarkdown(summary).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function cardHeader(title, status, subtitle) {
  return `<div class="card-head">
    <div>
      <h3>${escapeHtml(title)}</h3>
      ${subtitle ? `<div class="card-subtitle">${escapeHtml(subtitle)}</div>` : ""}
    </div>
    ${badge(status)}
  </div>`;
}

function metricChip(label, value) {
  const display = value === null || value === undefined || value === "" ? "데이터 없음" : value;
  return `<div class="metric-chip"><strong>${escapeHtml(display)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function chip(value) {
  return `<span class="chip">${escapeHtml(value === null || value === undefined || value === "" ? "데이터 없음" : value)}</span>`;
}

function fieldLine(label, valueHtml) {
  return `<p class="field-line"><strong>${escapeHtml(label)}:</strong> ${valueHtml || "-"}</p>`;
}

function tickerList(values) {
  const items = (values || []).filter(Boolean);
  if (!items.length) return "-";
  return `<span class="ticker-list">${items.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</span>`;
}

function coreMetricGrid(row, assetType, extraMetrics = []) {
  const metrics = [
    ["Asset", assetType],
    ["Narrative", row.linkedNarrative || "미분류"],
    ["Narrative Status", row.narrativeStatus || "관찰"],
    ["Narrative Score", row.narrativeScore ?? 0],
    ["Trend Strength", row.trendStrengthIndex ?? "데이터 없음"],
    ["Exhaustion", row.exhaustionRisk === undefined ? "데이터 없음" : `${row.exhaustionRiskLabel || ""} ${row.exhaustionRisk}`],
    ["Entry Quality", row.entryQualityScore === undefined ? "데이터 없음" : `${row.entryQualityLabel || ""} ${row.entryQualityScore}`],
    ["moneyFlowScore", row.moneyFlowScoreFinal ?? row.moneyFlowScore],
    ["finalRawScore", finalRawScore(row)],
    ["Confidence", row.reasonConfidence],
    ["후보 환경", row.marketContext?.candidateEnvironment || "데이터 없음"],
    ["Action", row.todayActionLabel],
    ["주문 실행", orderExecutionLabel(row)],
    ...extraMetrics
  ];
  return `<div class="metric-grid">${metrics.map(([label, value]) => metricChip(label, value)).join("")}</div>`;
}

function marketMetricGrid(row) {
  const market = row.market || {};
  const liquidity = row.liquiditySummary?.dollarVolumeLiquidity || row.liquiditySummary?.liquiditySignal || "확인";
  const breadth = row.assetType === "ETF"
    ? row.etfBreadthSummary?.breadthLabel || row.etfBreadthSummary?.status || row.etfBreadthSummary?.breadthStatus || "확인"
    : (row.relatedEtfs || []).map((etf) => etf.ticker).join(", ") || "관련 ETF 부족";
  const metrics = [
    ["1D", pct(market.dailyChangePct)],
    ["5D", pct(market.return5dPct)],
    ["20D", pct(market.return20dPct)],
    ["RVOL", `${num(market.relativeVolume, 2)}x`],
    ["52W Gap", pct(market.drawdownFrom52wHighPct)],
    ["Liquidity", liquidity],
    ["ETF Breadth", breadth],
    ["Overheat", row.overheatingRisk || "데이터 없음"]
  ];
  return `<div class="market-grid">${metrics.map(([label, value]) => metricChip(label, value)).join("")}</div>`;
}

function insightGrid(row, extraItems = []) {
  const items = [
    ["트렌드 판단", row.trendDecisionLine],
    ["왜 돈이 몰리는가", row.whyMoneyIsFlowing],
    ["다음 매수 주체", row.likelyNextBuyer],
    ["직접 촉매", row.directCatalyst || "직접 촉매 없음"],
    ["시장 해석", row.marketContext ? `${row.marketContext.marketRegime} / 후보 환경 ${row.marketContext.candidateEnvironment}: ${row.marketContext.reason}` : "데이터 없음"],
    ["게이트", row.actionGate?.reasons?.join(" / ") || "통과"],
    ["더 비싸게 갈 수 있는 이유", row.whyThisCouldTradeHigher],
    ["진입 조건", row.entryCondition],
    ["무효화 조건", row.invalidationCondition],
    ["tieBreakerReason", row.tieBreakerReason],
    ["reasonConfidenceExplanation", row.reasonConfidenceExplanation],
    ...extraItems
  ];
  return `<div class="insight-grid">${items.map(([label, value]) => insightItem(label, value)).join("")}</div>
    <details>
      <summary><strong>핵심 판단 문장 전체 보기</strong></summary>
      ${htmlList(items.map(([label, value]) => `<strong>${escapeHtml(label)}</strong> ${escapeHtml(value || "데이터 없음")}`))}
    </details>`;
}

function insightItem(label, value) {
  return `<div class="insight"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(value || "데이터 없음")}</p></div>`;
}

function fieldList(row) {
  return htmlList([
    `<strong>기준일</strong> ${escapeHtml(row.market?.dataDate || "데이터 없음")} / <strong>종가:</strong> ${escapeHtml(price(row.market?.lastClose))} / <strong>1일</strong> ${escapeHtml(pct(row.market?.dailyChangePct))} / <strong>5일</strong> ${escapeHtml(pct(row.market?.return5dPct))} / <strong>20일</strong> ${escapeHtml(pct(row.market?.return20dPct))} / <strong>상대 거래량</strong> ${escapeHtml(num(row.market?.relativeVolume, 2))}배`,
    `<strong>왜 돈이 몰리는가:</strong> ${escapeHtml(row.whyMoneyIsFlowing)}`,
    `<strong>누가 더 비싸게 사줄 수 있는가:</strong> ${escapeHtml(row.likelyNextBuyer)}`,
    `<strong>상승 여지:</strong> ${escapeHtml(row.whyThisCouldTradeHigher)}`,
    `<strong>진입 조건:</strong> ${escapeHtml(row.entryCondition)}`,
    `<strong>무효화 조건:</strong> ${escapeHtml(row.invalidationCondition)}`,
    `<strong>차트 요약:</strong> ${escapeHtml(row.chartSummary)}`
  ]);
}

function scoreBreakdownHtml(row) {
  const b = row.moneyFlowScoreBreakdown;
  if (!b) return "<p>moneyFlowScore 산정 근거: 데이터 없음</p>";
  const relative = row.assetType === "STOCK" ? `${tile("ETF 대비 상대강도", signed(b.relativeStrengthScore ?? 0))}` : "";
  const breadth = row.assetType === "ETF" ? `${tile("ETF 확산도", signed(b.etfBreadthScore ?? 0))}` : "";
  return `<details class="score-details">
    <summary><strong>moneyFlowScore(최종) 산정 근거 보기</strong></summary>
    <div class="grid">
      ${tile("moneyFlowScore(1차)", b.initialDisplayScore)}
      ${tile("최종 원점수", b.finalRawScore)}
      ${tile("최종 표시 점수", b.finalDisplayScore)}
      ${tile("cap 적용", b.wasCapped ? b.capReason : "cap 미적용")}
      ${tile("가격/거래량 1차 점수", signed(b.priceVolumeScore))}
      ${tile("추세", signed(b.trendScore))}
      ${tile("단기 모멘텀", signed(b.shortMomentumScore))}
      ${tile("중기 모멘텀", signed(b.mediumMomentumScore))}
      ${tile("거래량", signed(b.volumeScore))}
      ${tile("신고가 근접", signed(b.highProximityScore))}
      ${tile("이동평균", signed(b.movingAverageScore))}
      ${tile("하위 점수 cap", (b.componentCaps || []).filter((component) => component.wasCapped).length ? `${(b.componentCaps || []).filter((component) => component.wasCapped).length}개 적용` : "초과 없음")}
      ${tile("뉴스", signed(b.newsScore))}
      ${breadth}
      ${tile("유동성", signed(b.liquidityScore))}
      ${relative}
      ${tile("리스크 패널티", signed(b.riskPenalty))}
    </div>
    <p class="muted"><strong>계산식:</strong> ${escapeHtml(b.formulaText || "")}</p>
    <ul>${(b.componentCaps || []).map((component) => `<li>${escapeHtml(component.label)}: 원점수 ${escapeHtml(signed(component.raw))}, 상한 적용 ${escapeHtml(signed(component.capped))} / 최대 ${escapeHtml(component.max)}${component.wasCapped ? " (cap 적용)" : ""}</li>`).join("")}</ul>
    <p class="muted">${escapeHtml(scoreOneLine(row))}</p>
    ${riskPenaltyHtml(b.riskPenaltySummary)}
  </details>`;
}

function riskPenaltyHtml(summary) {
  if (!summary) return "<p class=\"muted\">리스크 패널티 산정 근거: 데이터 없음</p>";
  const items = summary.items?.length
    ? summary.items.map((item) => `<li><strong>${escapeHtml(item.label)}</strong> ${escapeHtml(signed(item.penalty))}<br><span class="muted">근거: ${escapeHtml(item.evidence)} / 대응: ${escapeHtml(item.action)}</span></li>`).join("")
    : "<li>감점된 리스크 없음</li>";
  const watchItems = (summary.watchItems || []).length ? summary.watchItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>주요 관찰 리스크 없음</li>";
  return `<details>
    <summary><strong>리스크 패널티 산정 근거 보기</strong></summary>
    <div class="grid">
      ${tile("총 리스크 패널티", signed(summary.totalPenalty))}
      ${tile("리스크 등급", summary.riskLevel)}
    </div>
    <h4>감점된 리스크</h4><ul>${items}</ul>
    <h4>관찰 리스크</h4><ul>${watchItems}</ul>
    <p class="muted">${escapeHtml(summary.summary)}</p>
  </details>`;
}

function renderEtfTable(etfs) {
  return `<div class="desktop-table"><table><thead><tr><th>티커</th><th>카테고리</th><th>moneyFlowScore</th><th>finalRawScore</th><th>상태</th><th>reasonConfidence</th><th>주요 이유</th></tr></thead><tbody>${etfs.map((row) => `<tr><td>${escapeHtml(row.ticker)}</td><td>${escapeHtml(row.categoryType)}</td><td>${row.moneyFlowScore}</td><td>${escapeHtml(finalRawScore(row))}</td><td>${badge(row.status)}</td><td>${escapeHtml(row.reasonConfidence)}</td><td>${escapeHtml(row.whyMoneyIsFlowing)}</td></tr>`).join("")}</tbody></table></div>
  <div class="mobile-card-list" data-mobile-etf-summary-cards>${etfs.map((row) => `<article class="summary-card" data-mobile-etf-summary-card="${escapeHtml(row.ticker)}">
    <h3>${escapeHtml(row.ticker)} ${escapeHtml(row.categoryType)}</h3>
    <div class="chip-row">
      ${chip(row.status)}
      ${chip(`moneyFlow ${row.moneyFlowScore}`)}
      ${chip(`원점수 ${finalRawScore(row)}`)}
      ${chip(row.reasonConfidence)}
    </div>
    ${fieldLine("주요 이유", escapeHtml(row.whyMoneyIsFlowing))}
  </article>`).join("")}</div>`;
}

function tile(label, value) {
  return `<div class="tile"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`;
}

function badge(value) {
  return `<span class="badge ${STATUS_CLASS[value] || "watch"}">${escapeHtml(value)}</span>`;
}

function chartImage(row) {
  if (!row.market?.history?.length) return `<p class="muted">차트 미표시: ${escapeHtml(chartMissingReason(row))}</p>`;
  return renderTradingChart(row);
}

function generateCharts(tickers, marketData) {
  ensureDir(CHARTS_DIR);
  let count = 0;
  for (const ticker of tickers) {
    const item = marketItem(marketData, ticker);
    if (!item.history || item.history.length < 5) continue;
    const filePath = path.join(CHARTS_DIR, `${ticker}.png`);
    writeChartPng(filePath, ticker, item.history.slice(-66));
    count += 1;
  }
  return count;
}

function chartBars(history, count) {
  return (history || [])
    .filter((bar) => ["open", "high", "low", "close"].every((key) => Number.isFinite(Number(bar[key]))))
    .slice(-count)
    .map((bar) => ({
      date: bar.date,
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number.isFinite(Number(bar.volume)) ? Number(bar.volume) : 0
    }));
}

function chartReferenceLevels(row, bars) {
  const closes = bars.map((bar) => bar.close);
  const ma20 = movingAverage(closes, 20);
  const latest = bars.at(-1);
  const previous = bars.at(-2);
  const recommendationPrice = Number(row.closePriceAtRecommendation ?? row.recommendationPrice ?? row.market?.lastClose);
  const invalidationPrice = ma20.at(-1);
  return [
    latest ? { key: "current", label: "현재", shortLabel: "현재", value: latest.close, color: latest.close >= (previous?.close ?? latest.close) ? "#059669" : "#dc2626", dash: "" } : null,
    Number.isFinite(recommendationPrice) ? { key: "recommendation", label: "추천가", shortLabel: "추천", value: recommendationPrice, color: "#2563eb", dash: "4 4" } : null,
    previous ? { key: "previous-high", label: "전일 고점", shortLabel: "전고", value: previous.high, color: "#0f766e", dash: "6 4" } : null,
    Number.isFinite(invalidationPrice) ? { key: "invalidation", label: "무효화", shortLabel: "무효", value: invalidationPrice, color: "#b91c1c", dash: "3 5" } : null
  ].filter(Boolean);
}

function renderTradingChart(row) {
  const ranges = [
    { key: "1M", label: "1M", count: 22 },
    { key: "3M", label: "3M", count: 66 },
    { key: "6M", label: "6M", count: 132 }
  ];
  const panels = ranges
    .map((range) => renderChartSvg(row, range, range.key === "3M"))
    .filter(Boolean)
    .join("");
  if (!panels) return `<p class="muted">차트 미표시: ${escapeHtml(chartMissingReason(row))}</p>`;
  return `<div class="trading-chart" data-trading-chart="${escapeHtml(row.ticker)}">
    <div class="chart-toolbar">
      <div class="chart-title"><strong>${escapeHtml(row.ticker)}</strong><span>일봉 OHLCV · MA5/MA20</span></div>
      <div class="range-toggle" role="group" aria-label="${escapeHtml(row.ticker)} chart range">
        ${ranges.map((range) => `<button type="button" data-chart-range="${range.key}"${range.key === "3M" ? " class=\"active\"" : ""}>${range.label}</button>`).join("")}
      </div>
    </div>
    <div class="chart-stage">
      ${panels}
      <div class="chart-tooltip" data-chart-tooltip></div>
    </div>
    <div class="chart-legend">
      <span><i class="legend-up"></i>상승</span>
      <span><i class="legend-down"></i>하락</span>
      <span><i class="legend-ma5"></i>MA5</span>
      <span><i class="legend-ma20"></i>MA20</span>
      <span><i class="legend-prev-high"></i>전고</span>
      <span><i class="legend-recommend"></i>추천</span>
      <span><i class="legend-invalid"></i>무효</span>
    </div>
    <img class="chart chart-fallback" src="${escapeHtml(row.chartPath)}" alt="${escapeHtml(row.ticker)} candlestick chart">
  </div>`;
}

function renderChartSvg(row, range, active) {
  const bars = chartBars(row.market?.history, range.count);
  if (bars.length < 5) return "";
  const width = 860;
  const height = 420;
  const priceTop = 24;
  const priceHeight = 286;
  const volumeTop = 322;
  const volumeHeight = 74;
  const layout = { left: 18, axisWidth: 62, gutterWidth: 116 };
  const plotRight = width - layout.axisWidth - layout.gutterWidth;
  const axisX = plotRight + 8;
  const gutterX = plotRight + layout.axisWidth + 8;
  const closes = bars.map((bar) => bar.close);
  const ma5 = movingAverage(closes, 5);
  const ma20 = movingAverage(closes, 20);
  const refs = chartReferenceLevels(row, bars);
  const currentRef = refs.find((ref) => ref.key === "current");
  const annotationRefs = refs.filter((ref) => ref.key !== "current");
  const priceValues = [
    ...bars.flatMap((bar) => [bar.open, bar.high, bar.low, bar.close]),
    ...ma5.filter(Number.isFinite),
    ...ma20.filter(Number.isFinite),
    ...refs.map((ref) => ref.value).filter(Number.isFinite)
  ];
  const min = Math.min(...priceValues);
  const max = Math.max(...priceValues);
  const pad = Math.max((max - min) * 0.08, max * 0.005, 0.5);
  const priceMin = min - pad;
  const priceMax = max + pad;
  const priceSpan = priceMax - priceMin || 1;
  const maxVolume = Math.max(...bars.map((bar) => bar.volume), 1);
  const plotWidth = plotRight - layout.left;
  const step = plotWidth / bars.length;
  const candleWidth = clamp(step * 0.58, 3, 10);
  const xCenter = (index) => layout.left + step * index + step / 2;
  const yPrice = (value) => priceTop + ((priceMax - value) / priceSpan) * priceHeight;
  const yVolume = (value) => volumeTop + volumeHeight - (value / maxVolume) * volumeHeight;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = priceTop + ratio * priceHeight;
    const value = priceMax - ratio * priceSpan;
    return `<line x1="${layout.left}" y1="${num(y, 1)}" x2="${plotRight}" y2="${num(y, 1)}" class="chart-grid"></line><text x="${axisX}" y="${num(y + 4, 1)}" class="axis-label">${escapeHtml(priceFixed(value))}</text>`;
  }).join("");
  const dateTicks = chartDateTicks(bars).map(({ index, label }) => `<text x="${num(xCenter(index), 1)}" y="${height - 6}" class="axis-label date-label">${escapeHtml(label)}</text>`).join("");
  const candles = bars.map((bar, index) => {
    const x = xCenter(index);
    const up = bar.close >= bar.open;
    const bodyTop = yPrice(Math.max(bar.open, bar.close));
    const bodyHeight = Math.max(1, Math.abs(yPrice(bar.open) - yPrice(bar.close)));
    const volumeY = yVolume(bar.volume);
    const tooltip = `${bar.date} | O ${priceFixed(bar.open)} H ${priceFixed(bar.high)} L ${priceFixed(bar.low)} C ${priceFixed(bar.close)} | Vol ${formatVolume(bar.volume)}`;
    return `<g class="${up ? "candle-up" : "candle-down"}">
      <line x1="${num(x, 1)}" y1="${num(yPrice(bar.high), 1)}" x2="${num(x, 1)}" y2="${num(yPrice(bar.low), 1)}" class="wick"></line>
      <rect x="${num(x - candleWidth / 2, 1)}" y="${num(bodyTop, 1)}" width="${num(candleWidth, 1)}" height="${num(bodyHeight, 1)}" class="body"></rect>
      <rect x="${num(x - candleWidth / 2, 1)}" y="${num(volumeY, 1)}" width="${num(candleWidth, 1)}" height="${num(volumeTop + volumeHeight - volumeY, 1)}" class="volume-bar"></rect>
      <rect x="${num(x - step / 2, 1)}" y="${priceTop}" width="${num(step, 1)}" height="${volumeTop + volumeHeight - priceTop}" class="chart-hit" data-chart-hit data-tooltip="${escapeHtml(tooltip)}"><title>${escapeHtml(tooltip)}</title></rect>
    </g>`;
  }).join("");
  const ma5Path = seriesPath(ma5, xCenter, yPrice);
  const ma20Path = seriesPath(ma20, xCenter, yPrice);
  const refLinesSvg = annotationRefs.map((ref) => {
    const y = yPrice(ref.value);
    return `<g class="ref-line ref-${escapeHtml(ref.key)}">
      <line x1="${layout.left}" y1="${num(y, 1)}" x2="${plotRight}" y2="${num(y, 1)}" stroke="${ref.color}" stroke-dasharray="${ref.dash}"></line>
    </g>`;
  }).join("");
  const annotationLabels = layoutAnnotationLabels(annotationRefs, yPrice, priceTop + 12, priceTop + priceHeight - 12, priceSpan);
  const refLabelsSvg = annotationLabels.map((label) => {
    const leader = Math.abs(label.y - label.targetY) > 2
      ? `<path d="M${plotRight} ${num(label.targetY, 1)} L${num(gutterX - 8, 1)} ${num(label.y, 1)}" class="ref-leader" stroke="${label.color}"></path>`
      : `<line x1="${plotRight}" y1="${num(label.targetY, 1)}" x2="${num(gutterX - 8, 1)}" y2="${num(label.y, 1)}" class="ref-leader" stroke="${label.color}"></line>`;
    return `<g class="ref-label-group">
      ${leader}
      <rect x="${gutterX}" y="${num(label.y - 13, 1)}" width="100" height="26" rx="4" class="ref-label-box" stroke="${label.color}"></rect>
      <text x="${num(gutterX + 6, 1)}" y="${num(label.y - 2, 1)}" class="ref-label" fill="${label.color}">${escapeHtml(label.label)}</text>
      <text x="${num(gutterX + 6, 1)}" y="${num(label.y + 10, 1)}" class="ref-price" fill="${label.color}">${escapeHtml(label.priceText)}</text>
    </g>`;
  }).join("");
  const currentMarker = currentRef ? renderCurrentAxisMarker(currentRef, yPrice(currentRef.value), axisX) : "";
  const markerDate = row.recommendationDate || row.market?.dataDate;
  const markerIndex = Math.max(0, bars.findIndex((bar) => bar.date === markerDate));
  const marker = markerIndex >= 0
    ? `<g class="recommendation-marker"><line x1="${num(xCenter(markerIndex), 1)}" y1="${priceTop}" x2="${num(xCenter(markerIndex), 1)}" y2="${volumeTop + volumeHeight}" stroke-dasharray="3 5"></line><rect x="${num(xCenter(markerIndex) + 5, 1)}" y="${priceTop + 4}" width="30" height="16" rx="4"></rect><text x="${num(xCenter(markerIndex) + 10, 1)}" y="${priceTop + 16}">추천</text></g>`
    : "";
  const summary = chartSummaryLine(row, range, bars);
  return `<svg class="candlestick-chart${active ? " active" : ""}" data-range-panel="${range.key}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(row.ticker)} ${range.label} candlestick chart">
    <rect x="0" y="0" width="${width}" height="${height}" class="chart-bg"></rect>
    <text x="${layout.left}" y="16" class="chart-summary-text">${escapeHtml(summary)}</text>
    ${grid}
    <line x1="${layout.left}" y1="${priceTop + priceHeight}" x2="${plotRight}" y2="${priceTop + priceHeight}" class="axis-line"></line>
    <line x1="${layout.left}" y1="${volumeTop + volumeHeight}" x2="${plotRight}" y2="${volumeTop + volumeHeight}" class="axis-line"></line>
    <line x1="${plotRight}" y1="${priceTop}" x2="${plotRight}" y2="${volumeTop + volumeHeight}" class="axis-line"></line>
    <text x="${layout.left}" y="${volumeTop - 8}" class="panel-label">Volume</text>
    ${refLinesSvg}
    ${candles}
    ${ma5Path ? `<path d="${ma5Path}" class="ma-line ma5"></path>` : ""}
    ${ma20Path ? `<path d="${ma20Path}" class="ma-line ma20"></path>` : ""}
    ${currentMarker}
    ${refLabelsSvg}
    ${marker}
    ${dateTicks}
  </svg>`;
}

function priceFixed(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "데이터 없음";
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function chartSummaryLine(row, range, bars) {
  const latest = bars.at(-1);
  return `${row.ticker} · ${range.label} Daily · Close ${priceFixed(latest?.close)} · 5D ${pct(row.market?.return5dPct)} · 20D ${pct(row.market?.return20dPct)} · RVOL ${row.market?.relativeVolume === null || row.market?.relativeVolume === undefined ? "데이터 없음" : `${num(row.market.relativeVolume, 2)}x`}`;
}

function renderCurrentAxisMarker(ref, y, axisX) {
  const markerY = clamp(y, 20, 306);
  return `<g class="axis-marker">
    <rect x="${axisX - 2}" y="${num(markerY - 11, 1)}" width="58" height="22" fill="${ref.color}"></rect>
    <text x="${axisX + 4}" y="${num(markerY + 4, 1)}">${escapeHtml(priceFixed(ref.value))}</text>
  </g>`;
}

function layoutAnnotationLabels(refs, yPrice, top, bottom, priceSpan) {
  const candidates = refs
    .map((ref) => ({ ...ref, targetY: yPrice(ref.value) }))
    .sort((a, b) => a.targetY - b.targetY);
  const groups = [];
  for (const ref of candidates) {
    const last = groups.at(-1);
    const averageValue = last ? average(last.refs.map((item) => item.value)) : null;
    const closeByPixel = last && Math.abs(ref.targetY - last.targetY) <= 10;
    const closeByPrice = last && averageValue && Math.abs(ref.value - averageValue) <= Math.max(priceSpan * 0.01, averageValue * 0.003);
    if (last && (closeByPixel || closeByPrice)) {
      last.refs.push(ref);
      last.targetY = average(last.refs.map((item) => item.targetY));
      last.valueMin = Math.min(last.valueMin, ref.value);
      last.valueMax = Math.max(last.valueMax, ref.value);
      last.color = last.refs.some((item) => item.key === "invalidation") ? "#b91c1c" : last.refs[0].color;
    } else {
      groups.push({
        refs: [ref],
        targetY: ref.targetY,
        valueMin: ref.value,
        valueMax: ref.value,
        color: ref.color
      });
    }
  }

  const minGap = 30;
  const labels = groups.map((group) => ({
    ...group,
    y: clamp(group.targetY, top, bottom),
    label: group.refs.map((ref) => ref.shortLabel).join(" / "),
    priceText: Math.abs(group.valueMax - group.valueMin) < 0.005
      ? priceFixed(group.valueMax)
      : `${priceFixed(group.valueMin)} ~ ${priceFixed(group.valueMax)}`
  }));

  for (let index = 1; index < labels.length; index += 1) {
    if (labels[index].y - labels[index - 1].y < minGap) {
      labels[index].y = labels[index - 1].y + minGap;
    }
  }
  const overflow = labels.length ? labels.at(-1).y - bottom : 0;
  if (overflow > 0) {
    for (const label of labels) label.y -= overflow;
  }
  for (let index = labels.length - 2; index >= 0; index -= 1) {
    if (labels[index + 1].y - labels[index].y < minGap) {
      labels[index].y = labels[index + 1].y - minGap;
    }
  }
  const underflow = labels.length ? top - labels[0].y : 0;
  if (underflow > 0) {
    for (const label of labels) label.y += underflow;
  }
  return labels.map((label) => ({ ...label, y: clamp(label.y, top, bottom) }));
}

function chartDateTicks(bars) {
  const maxTicks = bars.length > 90 ? 6 : bars.length > 40 ? 5 : 4;
  const used = new Set();
  return Array.from({ length: maxTicks }, (_, i) => Math.round((i / Math.max(1, maxTicks - 1)) * (bars.length - 1)))
    .filter((index) => !used.has(index) && used.add(index))
    .map((index) => ({ index, label: bars[index].date.slice(5) }));
}

function seriesPath(values, x, y) {
  return values.reduce((path, value, index) => {
    if (!Number.isFinite(value)) return path;
    const command = path ? "L" : "M";
    return `${path}${command}${num(x(index), 1)} ${num(y(value), 1)} `;
  }, "").trim();
}

function formatVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "데이터 없음";
  if (number >= 1000000000) return `${num(number / 1000000000, 2)}B`;
  if (number >= 1000000) return `${num(number / 1000000, 1)}M`;
  if (number >= 1000) return `${num(number / 1000, 0)}K`;
  return num(number, 0);
}

function writeChartPng(filePath, ticker, history) {
  const bars = chartBars(history, 66);
  const width = 760;
  const height = 420;
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
  const rect = (x, y, w, h, color) => {
    for (let py = Math.max(0, Math.round(y)); py <= Math.min(height - 1, Math.round(y + h)); py += 1) {
      for (let px = Math.max(0, Math.round(x)); px <= Math.min(width - 1, Math.round(x + w)); px += 1) setPixel(px, py, color);
    }
  };
  if (bars.length < 5) {
    fs.writeFileSync(filePath, encodePng(width, height, pixels));
    return;
  }
  const margin = { left: 28, right: 66, top: 24 };
  const priceHeight = 286;
  const volumeTop = 322;
  const volumeHeight = 74;
  const prices = bars.flatMap((bar) => [bar.open, bar.high, bar.low, bar.close]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = Math.max((max - min) * 0.08, max * 0.005, 0.5);
  const priceMin = min - pad;
  const priceMax = max + pad;
  const span = priceMax - priceMin || 1;
  const plotWidth = width - margin.left - margin.right;
  const step = plotWidth / bars.length;
  const candleWidth = clamp(step * 0.58, 3, 10);
  const maxVolume = Math.max(...bars.map((bar) => bar.volume), 1);
  const x = (i) => margin.left + step * i + step / 2;
  const y = (value) => margin.top + ((priceMax - value) / span) * priceHeight;
  const yVolume = (value) => volumeTop + volumeHeight - (value / maxVolume) * volumeHeight;
  for (let gx = margin.left; gx < width - margin.right; gx += 90) line(gx, margin.top, gx, volumeTop + volumeHeight, [235, 239, 242, 255]);
  for (let gy = margin.top; gy <= margin.top + priceHeight; gy += 58) line(margin.left, gy, width - margin.right, gy, [235, 239, 242, 255]);
  line(margin.left, margin.top + priceHeight, width - margin.right, margin.top + priceHeight, [120, 130, 140, 255]);
  line(margin.left, volumeTop + volumeHeight, width - margin.right, volumeTop + volumeHeight, [120, 130, 140, 255]);
  bars.forEach((bar, index) => {
    const up = bar.close >= bar.open;
    const color = up ? [5, 150, 105, 255] : [220, 38, 38, 255];
    const cx = x(index);
    line(cx, y(bar.high), cx, y(bar.low), color);
    rect(cx - candleWidth / 2, Math.min(y(bar.open), y(bar.close)), candleWidth, Math.max(1, Math.abs(y(bar.open) - y(bar.close))), color);
    rect(cx - candleWidth / 2, yVolume(bar.volume), candleWidth, volumeTop + volumeHeight - yVolume(bar.volume), [color[0], color[1], color[2], 110]);
  });
  const closes = bars.map((bar) => bar.close);
  drawSeries(movingAverage(closes, 5), x, y, line, [37, 99, 235, 255]);
  drawSeries(movingAverage(closes, 20), x, y, line, [234, 88, 12, 255]);
  const latest = bars.at(-1);
  if (latest) {
    const ly = y(latest.close);
    line(margin.left, ly, width - margin.right, ly, [23, 32, 38, 255]);
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

async function main() {
  const report = await buildReport();
  writeReport("latest.md", renderMarkdown(report));
  writeReport("latest.html", renderHtml(report));
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.md")}`);
  console.log(`Generated ${path.join(REPORTS_DIR, "latest.html")}`);
  console.log(`Generated charts: ${report.chartCount}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

