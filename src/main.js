const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { calculateEtfBreadth, fetchEtfHoldings } = require("./data/etfHoldingsProvider");
const { fetchLiquiditySpread } = require("./data/liquidityProvider");
const { fetchNasdaq100Universe } = require("./data/nasdaq100Universe");
const { fetchNewsForTicker } = require("./data/newsProvider");
const { fetchOptionsFlow } = require("./data/optionsProvider");
const { aggregateStatus, statusLabel } = require("./data/providerUtils");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");
const CHARTS_DIR = path.join(REPORTS_DIR, "charts");
const DAILY_REPORTS_DIR = path.join(DATA_DIR, "dailyReports");

const MODE = process.env.REPORT_MODE === "REAL_TEST" || process.argv.includes("--real-test") ? "REAL_TEST" : "MOCK";
const REAL_WARNING = "REAL DATA TEST - 媛寃?嫄곕옒?됱? ?ㅼ젣 ?곗씠?? 蹂댁“ ?곗씠???곌껐 ?곹깭???고??꾩뿉 ?숈쟻?쇰줈 ?쒖떆";
const MOCK_WARNING = "MOCK DATA - ?ㅼ쟾 留ㅻℓ ?먮떒 ?ъ슜 湲덉?";
const PURPOSE =
  "??由ы룷?몃뒗 理쒓렐 ?ㅻⅨ ?먯궛???섏뿴?섎뒗 寃껋씠 ?꾨땲?? ?덉씠 紐곕━??洹쇨굅? ?ㅼ쓬 留ㅼ닔 二쇱껜媛 ?뺤씤?섎뒗 ?몃젅?대뵫 ?꾨낫瑜?李얘린 ?꾪븳 蹂닿퀬?쒕떎.";

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
  DRAM: "諛섎룄泥?湲곗닠 ETF",
  SMH: "諛섎룄泥?湲곗닠 ETF",
  SOXX: "諛섎룄泥?湲곗닠 ETF",
  SOXQ: "諛섎룄泥?湲곗닠 ETF",
  IGV: "?깆옣/?뚮쭏 ETF",
  AIQ: "?깆옣/?뚮쭏 ETF",
  BOTZ: "?깆옣/?뚮쭏 ETF",
  ROBO: "?깆옣/?뚮쭏 ETF",
  CIBR: "?깆옣/?뚮쭏 ETF",
  HACK: "?깆옣/?뚮쭏 ETF",
  IHAK: "?깆옣/?뚮쭏 ETF",
  ITA: "諛⑹궛 ETF",
  XAR: "諛⑹궛 ETF",
  SHLD: "諛⑹궛 ETF",
  PPA: "諛⑹궛 ETF",
  QQQ: "?쒖옣 湲곗? ETF",
  SPY: "?쒖옣 湲곗? ETF",
  IWM: "?쒖옣 湲곗? ETF",
  TLT: "梨꾧텒 ETF",
  GLD: "湲?ETF",
  IBIT: "鍮꾪듃肄붿씤 ETF",
  BLOK: "鍮꾪듃肄붿씤 ETF"
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
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "?곗씠???놁쓬";
  return `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}

function num(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "?곗씠???놁쓬";
  return Number(value).toFixed(digits);
}

function price(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "?곗씠???놁쓬";
  return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function mdList(items, empty = "- ?대떦 ?놁쓬") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

function htmlList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("") || "<li>?대떦 ?놁쓬</li>"}</ul>`;
}

function marketItem(marketData, ticker) {
  return marketData?.items?.[ticker] || { ticker, dataStatus: "missing", error: "?곗씠???놁쓬" };
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
  if (scoreA !== scoreB) return scoreB - scoreA;
  const rawA = Number.isFinite(a.moneyFlowScoreBreakdown?.finalRawScore) ? a.moneyFlowScoreBreakdown.finalRawScore : scoreA;
  const rawB = Number.isFinite(b.moneyFlowScoreBreakdown?.finalRawScore) ? b.moneyFlowScoreBreakdown.finalRawScore : scoreB;
  if (rawA !== rawB) return rawB - rawA;
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
      ? `${items.length}媛?媛먯젏 由ъ뒪?щ줈 珥?${totalPenalty}??諛섏쁺.`
      : "吏곸젒 媛먯젏??二쇱슂 由ъ뒪?щ뒗 ?놁?留?愿李?由ъ뒪?щ뒗 怨꾩냽 ?뺤씤?댁빞 ?쒕떎."
  };
}

function riskItem(riskType, label, penalty, evidence, action) {
  return { riskType, label, penalty: -Math.abs(penalty), evidence, action };
}

function scoreAsset(item, assetType, relatedEtfStrength = 0, supplemental = {}) {
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
      optionsScore: 0,
      etfBreadthScore: assetType === "ETF" ? 0 : undefined,
      liquidityScore: 0,
      riskPenalty: 0,
      riskPenaltySummary: riskSummary,
      dataConfidencePenalty: 0,
      wasCapped: false,
      capReason: "cap not applied",
      formulaText: "0 = price/volume data missing",
      reasons: ["媛寃?嫄곕옒???곗씠???놁쓬"],
      dataUsed: dataUsedFlags(supplemental, false)
    };
    return {
      moneyFlowScore: 0,
      moneyFlowScoreInitial: 0,
      moneyFlowScoreFinal: 0,
      moneyFlowScoreBreakdown: emptyBreakdown,
      moneyFlowScoreReasons: emptyBreakdown.reasons,
      overheatingRisk: "?곗씠???놁쓬",
      overheatingReason: "媛寃?嫄곕옒???곗씠???놁쓬",
      reasonConfidence: "LOW",
      status: STATUS.BAN,
      whyMoneyIsFlowing: "?곗씠???놁쓬",
      likelyNextBuyer: "?곗씠???놁쓬",
      whyThisCouldTradeHigher: "?곗씠???놁쓬"
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
  const newsScore = Number(supplemental.news?.newsScore || 0);
  const optionsScore = Number(supplemental.options?.optionsScore || 0);
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

  const trendScore = clamp(r5 * 1.0, -6, 12) + clamp(r20 * 0.45, -4, 12) + (trendAcceleration ? 6 : 0);
  const shortMomentumScore = clamp(daily * 1.2, -6, 8) + clamp(r5 * 0.8, -6, 12);
  const mediumMomentumScore = clamp(r20 * 0.65, -8, 16);
  const volumeScore = relVol >= 1.5 ? 18 : relVol >= 1.2 ? 14 : relVol >= 1 ? 10 : -8;
  const highProximityScore = highProximity ? 12 : drawdown > -12 ? 6 : 0;
  const movingAverageScore = (aboveMa5 ? 4 : 0) + (aboveMa20 ? 6 : -6) + (aboveMa50 ? 4 : 0);
  const relativeStrengthScore = assetType === "STOCK" ? clamp(relatedEtfStrength / 12, 0, 8) : undefined;
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
  if ((supplemental.options?.optionsScore || 0) < 0) {
    riskItems.push(riskItem("OPTIONS_BEARISH", "bearish options signal", Math.abs(supplemental.options.optionsScore), "Options score is negative.", "Watch until options flow improves."));
  }
  if ((supplemental.liquidity?.liquidityScore || 0) < 0) {
    const riskType = supplemental.liquidity?.liquiditySignal === "LOW_LIQUIDITY" ? "LOW_LIQUIDITY" : "WIDE_SPREAD";
    riskItems.push(riskItem(riskType, riskType === "LOW_LIQUIDITY" ? "low liquidity" : "wide spread", Math.abs(supplemental.liquidity.liquidityScore), `Liquidity signal: ${supplemental.liquidity?.liquiditySignal || "UNKNOWN"}.`, "Avoid market-order chasing."));
  }
  const watchItems = [];
  if (!isConnectedLike(supplemental.news?.status)) watchItems.push("news data not connected or unavailable");
  if (!isConnectedLike(supplemental.options?.status)) watchItems.push("options data not connected or unavailable");
  if (assetType === "ETF" && !isConnectedLike(supplemental.etfBreadth?.status)) watchItems.push("ETF breadth data not connected");
  if (!isConnectedLike(supplemental.liquidity?.status)) watchItems.push("liquidity/spread data is fallback or unavailable");
  if (assetType === "STOCK" && relatedEtfStrength <= 0) watchItems.push("related ETF relative strength mapping needs confirmation");
  const riskSummary = riskPenaltySummary(riskItems, watchItems);
  const riskPenalty = riskSummary.totalPenalty;
  const dataConfidencePenalty = 0;
  const reasons = [];
  if (r20 > 8) reasons.push("20???섏씡瑜?媛뺥븿");
  if (r5 > 5) reasons.push("5???섏씡瑜?媛뺥븿");
  if (daily > 2) reasons.push("1???④린 紐⑤찘? ?뺤씤");
  if (relVol >= 1.2) reasons.push("?곷? 嫄곕옒??利앷?");
  if (highProximity) reasons.push("52二?怨좎젏 洹쇱쿂");
  if (aboveMa5 && aboveMa20) reasons.push("?대룞?됯퇏 ??異붿꽭 ?좎?");
  if (assetType === "STOCK" && relatedEtfStrength > 0) reasons.push("愿??ETF 媛뺤꽭 ?뚮쭏 ?덉쓽 媛쒕퀎 醫낅ぉ");
  if (newsScore > 0) reasons.push("?댁뒪 ?먮쫫??媛寃?嫄곕옒??洹쇨굅瑜?蹂닿컯");
  if (optionsScore > 0) reasons.push("?듭뀡 ?섍툒???④린 留ㅼ닔?몃? 蹂닿컯");
  if (assetType === "ETF" && etfBreadthScore > 0) reasons.push("ETF 구성종목 확산도 양호");
  if (liquidityScore > 0) reasons.push("嫄곕옒?湲?湲곗? ?좊룞???묓샇");
  if (newsScore < 0) reasons.push("부정 뉴스 또는 이벤트 리스크");
  if (optionsScore < 0) reasons.push("옵션 수급 방어적");
  if (liquidityScore < 0) reasons.push("?좊룞???ㅽ봽?덈뱶 二쇱쓽");
  if (riskPenalty < 0) reasons.push("?④린 怨쇱뿴/異붽꺽 ?꾪뿕 議댁옱");
  if (!isConnectedLike(supplemental.news?.status)) reasons.push("?댁뒪 ?곗씠??誘몄뿰寃??먮뒗 ?섏쭛 ?ㅽ뙣");
  if (!isConnectedLike(supplemental.options?.status)) reasons.push("?듭뀡 ?곗씠??誘몄뿰寃??먮뒗 ?섏쭛 ?ㅽ뙣");
  if (assetType === "ETF" && !isConnectedLike(supplemental.etfBreadth?.status)) reasons.push("ETF 구성종목 확산도 데이터 미연결");
  if (!isConnectedLike(supplemental.liquidity?.status)) reasons.push("?ㅽ봽?덈뱶/?좊룞???곗씠??誘몄뿰寃??먮뒗 fallback ?쒗븳");

  const priceVolumeScore = trendScore + shortMomentumScore + mediumMomentumScore + volumeScore + highProximityScore + movingAverageScore;
  const initialRawScore = rounded(priceVolumeScore);
  const initialDisplayScore = displayScore(initialRawScore);
  const etfBreadthComponent = assetType === "ETF" ? etfBreadthScore : 0;
  const relativeStrengthComponent = assetType === "STOCK" ? relativeStrengthScore : 0;
  const finalRawScore = rounded(initialRawScore + newsScore + optionsScore + etfBreadthComponent + liquidityScore + relativeStrengthComponent + riskPenalty - dataConfidencePenalty);
  const finalDisplayScore = displayScore(finalRawScore);
  const wasCapped = finalRawScore !== finalDisplayScore;
  const capReason = wasCapped
    ? `raw score ${finalRawScore} capped to displayed score ${finalDisplayScore}`
    : "cap not applied";
  const formulaText = `${[initialRawScore, newsScore, optionsScore, etfBreadthComponent, liquidityScore, relativeStrengthComponent, riskPenalty, dataConfidencePenalty ? -dataConfidencePenalty : 0].map(signed).join(" + ").replace(/\+ -/g, "- ")} = ${finalRawScore}${wasCapped ? ` -> ${finalDisplayScore}` : ""}`;
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
    optionsScore,
    etfBreadthScore: assetType === "ETF" ? etfBreadthScore : undefined,
    liquidityScore,
    relativeStrengthScore: assetType === "STOCK" ? rounded(relativeStrengthScore) : undefined,
    riskPenalty,
    riskPenaltySummary: riskSummary,
    dataConfidencePenalty,
    wasCapped,
    capReason,
    formulaText,
    reasons,
    dataUsed: dataUsedFlags(supplemental, true)
  };

  const reasonConfidence = computeReasonConfidence(assetType, item, finalDisplayScore, weakVolume, supplemental, relatedEtfStrength);
  const status = finalDisplayScore >= 72 && !overheatingFlag ? STATUS.ENTRY_READY : finalDisplayScore >= 58 && !overheatingFlag ? STATUS.ENTRY_CANDIDATE : finalDisplayScore >= 35 ? STATUS.WATCH : STATUS.BAN;
  const overheatingRisk = blowoffFlag ? "?믪쓬" : overheatingFlag ? "以묎컙" : highProximity && daily > 2 ? "??쓬~以묎컙" : "??쓬";
  const overheatingReason = etfOverheatingReason(assetType, item, overheatingRisk);

  const whyMoneyIsFlowing = weakVolume
    ? `理쒓렐 ?섏씡瑜좎? ?뺤씤?섏?留??곷? 嫄곕옒??${num(relVol, 2)}諛곕씪 ?좉퇋 ?먭툑 ?좎엯 媛뺣룄???쏀븿`
    : `20??${pct(r20)}, 5??${pct(r5)}, ?곷? 嫄곕옒??${num(relVol, 2)}諛곕줈 媛寃⑷낵 嫄곕옒?됱씠 ?④퍡 媛쒖꽑`;
  const supplementalReason = supplementalReasonLine(assetType, supplemental);
  const likelyNextBuyer =
    assetType === "ETF"
      ? "?뱁꽣 踰좏?瑜??щ젮???④린 紐⑤찘? ?먭툑怨?由щ갭?곗떛 ?먭툑"
      : "媛쒕퀎 二쇰룄二쇰? ?곕씪遺숇뒗 ?④린 紐⑤찘? ?먭툑怨?愿??ETF 媛뺤꽭瑜??뺤씤???ㅼ쐷 ?몃젅?대뜑";
  const whyThisCouldTradeHigher = highProximity
    ? "52二?怨좎젏 遺洹쇱씠???뚰뙆媛 ?뺤씤?섎㈃ ?좉퀬媛 異붿쥌 留ㅼ닔媛 遺숈쓣 ???덉쓬"
    : "?④린 異붿꽭媛 ?좎??섍퀬 嫄곕옒?됱씠 1.0諛??댁긽?대㈃ ?섎룎由??댄썑 ?ъ긽?뱀쓣 ?쒕룄?????덉쓬";

  return {
    moneyFlowScore: finalDisplayScore,
    moneyFlowScoreInitial: initialDisplayScore,
    moneyFlowScoreFinal: finalDisplayScore,
    moneyFlowScoreBreakdown: breakdown,
    moneyFlowScoreReasons: reasons,
    overheatingRisk,
    overheatingReason,
    reasonConfidence,
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
    options: isConnectedLike(supplemental.options?.status) && Boolean(supplemental.options?.hasOptionsData),
    etfBreadth: isConnectedLike(supplemental.etfBreadth?.status) && Boolean(supplemental.etfBreadth?.sampledHoldingsCount),
    liquiditySpread: isConnectedLike(supplemental.liquidity?.status),
    relativeStrength: priceVolume
  };
}

function computeReasonConfidence(assetType, item, score, weakVolume, supplemental, relatedEtfStrength) {
  if (!item || item.dataStatus !== "ok" || weakVolume || score < 35) return "LOW";
  const used = dataUsedFlags(supplemental, true);
  const connectedCount = [used.news, used.options, used.etfBreadth, used.liquiditySpread].filter(Boolean).length;
  const hasNewsOrOptions = used.news || used.options;
  const hasNegativeNews = (supplemental.news?.sentimentCounts?.negative || 0) > (supplemental.news?.sentimentCounts?.positive || 0);
  const badLiquidity = ["WIDE_SPREAD", "LOW_LIQUIDITY"].includes(supplemental.liquidity?.liquiditySignal);
  const etfOk = assetType !== "ETF" || used.etfBreadth;
  const stockOk = assetType !== "STOCK" || relatedEtfStrength > 0;
  if (connectedCount >= 2 && hasNewsOrOptions && etfOk && stockOk && !hasNegativeNews && !badLiquidity) return "HIGH";
  return "MEDIUM";
}

function supplementalReasonLine(assetType, supplemental) {
  const parts = [];
  if ((supplemental.news?.newsScore || 0) > 0) parts.push(`?댁뒪: ${supplemental.news.headlineSummary}`);
  if ((supplemental.options?.optionsScore || 0) > 0) parts.push("?듭뀡: 肄??섍툒 ?곗쐞 ?뺤씤");
  if (assetType === "ETF" && (supplemental.etfBreadth?.etfBreadthScore || 0) > 0) parts.push(`ETF ?뺤궛?? ${supplemental.etfBreadth.breadthSignal}`);
  if ((supplemental.liquidity?.liquidityScore || 0) > 0) parts.push(`?좊룞?? ${supplemental.liquidity.liquiditySignal}`);
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
  if (history.length < 20) return "李⑦듃 ?곗씠???놁쓬";
  const closes = history.map((row) => row.close).filter((value) => Number.isFinite(value));
  const last = closes.at(-1);
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  if (last >= ma5 && ma5 >= ma20) return "理쒓렐 20嫄곕옒???곗긽?? 5?쇱꽑??20?쇱꽑 ?꾩뿉 ?덉쓬";
  if (last >= ma20 && last < ma5) return "20?쇱꽑 ?꾩뿉???④린 ?뚮┝ ?뺤씤 援ш컙";
  if (last < ma20) return "20?쇱꽑 ?꾨옒??異붿꽭 ?뺤씤 ?꾧퉴吏 蹂댁닔???묎렐";
  return "?④린 異붿꽭??以묐┰";
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function enrichEtf(etf, marketData, supplementalData = {}) {
  const market = marketItem(marketData, etf.ticker);
  const supplemental = supplementalData.byTicker?.[etf.ticker] || {};
  const scored = MODE === "REAL_TEST" ? scoreAsset(market, "ETF", 0, supplemental) : scoreAsset(mockMarket(etf), "ETF", 0, supplemental);
  const categoryType = ETF_CATEGORY[etf.ticker] || "?깆옣/?뚮쭏 ETF";
  return {
    ...etf,
    assetType: "ETF",
    categoryType,
    etfCategory: categoryType,
    etfRole: etfRole(etf.ticker, categoryType),
    newsSummary: supplemental.news,
    optionsSummary: supplemental.options,
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
}

function enrichStock(stock, etfs, marketData, supplementalData = {}) {
  const market = marketItem(marketData, stock.ticker);
  const relatedEtfs = relatedEtfsForStock(stock.ticker, etfs, stock);
  const relatedEtfStrength = relatedEtfs.length ? Math.max(...relatedEtfs.map((etf) => etf.moneyFlowScore || 0)) : 0;
  const supplemental = supplementalData.byTicker?.[stock.ticker] || {};
  const scored = MODE === "REAL_TEST" ? scoreAsset(market, "STOCK", relatedEtfStrength, supplemental) : scoreAsset(mockMarket(stock), "STOCK", relatedEtfStrength, supplemental);
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
    primaryTheme: stock.primaryTheme || STOCK_META[stock.ticker]?.primaryTheme,
    primarySector: stock.primarySector || STOCK_META[stock.ticker]?.primarySector,
    market,
    relatedEtfs,
    newsSummary: supplemental.news,
    optionsSummary: supplemental.options,
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
    holdingInfo: isHolding ? "蹂댁쑀 ?뺣낫 誘몄엯??- 湲곗〈 mock 吏꾩엯媛/?섏씡瑜좎? ?ㅼ쟾 ?먮떒???ъ슜?섏? ?딆쓬" : ""
  };
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

function universeMemberToStock(member) {
  const mapping = relatedEtfSymbolsForUniverseMember(member);
  return {
    ticker: member.ticker,
    name: member.name || member.ticker,
    market: "US",
    theme: member.sector || "Nasdaq-100",
    primaryTheme: member.sector || "Nasdaq-100",
    primarySector: member.sector || "?곗씠???놁쓬",
    industry: member.industry || "?곗씠???놁쓬",
    isNewScanCandidate: true,
    universeName: "NASDAQ_100",
    universeSource: member.source,
    universeAsOfDate: member.asOfDate,
    relatedEtfSymbols: mapping.symbols,
    relatedEtfMappingNote: mapping.mappingNote
  };
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
  if (qqq?.dataStatus !== "ok" || spy?.dataStatus !== "ok") return "以묐┰";
  const avg20 = ((qqq.return20dPct ?? 0) + (spy.return20dPct ?? 0)) / 2;
  const avg5 = ((qqq.return5dPct ?? 0) + (spy.return5dPct ?? 0)) / 2;
  if (avg20 > 2 && avg5 > 0) return "?꾪뿕?좏샇";
  if (avg20 < -2 && avg5 < 0) return "?꾪뿕?뚰뵾";
  return "以묐┰";
}

function groupThemes(stocks, etfs) {
  const rows = new Map();
  for (const stock of stocks) {
    const theme = stock.primaryTheme || stock.theme || "湲고?";
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
    .sort(compareFinalScore)
    .slice(0, 3)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

async function buildReport() {
  const rawWatchlist = readJson("watchlist.json", []);
  const rawHoldings = readJson("holdings.json", []);
  const marketData = MODE === "REAL_TEST" ? readJson("market_data_real.json", { items: {} }) : null;
  const rawEtfs = readJson("watchlist_etfs.json", []);
  const stockUniverse = await fetchNasdaq100Universe();
  const rawScanStocks = stockUniverse.members.map(universeMemberToStock);
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
  const etfTop5 = [...validEtfs].sort(compareFinalScore).slice(0, 5);
  const stockTop5 = [...stocks].sort(compareFinalScore).slice(0, 5);
  const etfActionCandidates = validEtfs.filter((row) => [STATUS.ENTRY_CANDIDATE, STATUS.ENTRY_READY].includes(row.status)).sort(compareFinalScore).slice(0, 5);
  const stockActionCandidates = watchlist.filter((row) => [STATUS.ENTRY_CANDIDATE, STATUS.ENTRY_READY].includes(row.status)).sort(compareFinalScore).slice(0, 5);
  const entryCandidates = stockActionCandidates;
  const cautionRows = stocks.filter((row) => [STATUS.EXIT, STATUS.BAN].includes(row.status));
  const etfOverheat = validEtfs.filter((row) => ["?믪쓬", "以묎컙", "??쓬~以묎컙"].includes(row.overheatingRisk)).sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const stockCautionRows = watchlist.filter((row) => [STATUS.WATCH, STATUS.BAN].includes(row.status) || row.stockVsEtfDecision !== "STOCK_PREFERRED").sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 5);
  const etfBanRows = validEtfs.filter((row) => row.status === STATUS.BAN || row.moneyFlowScore < 50).sort((a, b) => a.moneyFlowScore - b.moneyFlowScore).slice(0, 5);
  const overheat = etfOverheat;
  const actionCandidates = chooseActionCandidates(stocks, etfs);
  const topExecutionCandidate = chooseTopExecutionCandidate(etfActionCandidates, stockActionCandidates);
  const previousSnapshot = loadPreviousRecommendationSnapshot();
  const previousRecommendationReviews = buildPreviousRecommendationReviews(previousSnapshot, stocks, etfs);
  const stockScanSummary = buildStockScanSummary(stockUniverse, stocks, detailedScanTickers);
  const stockUniverseScan = buildStockUniverseScanSummary(stockUniverse, stocks);
  const chartTickers = unique([
    ...actionCandidates.map((row) => row.ticker),
    ...etfTop5.map((row) => row.ticker),
    ...stockTop5.slice(0, 5).map((row) => row.ticker),
    ...previousRecommendationReviews.map((row) => row.ticker)
  ]);
  const chartCount = generateCharts(chartTickers, marketData);

  const report = {
    generatedAt: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "full", timeStyle: "short" }).format(new Date()),
    reportDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()),
    dataMode: MODE,
    dataWarning: MODE === "REAL_TEST" ? dynamicDataWarning(supplementalData.connectionStatus) : MOCK_WARNING,
    dataConnectionStatus: supplementalData.connectionStatus,
    supplementalData,
    marketData,
    marketLabel: marketStatus(etfs),
    stockUniverse,
    stockScanSummary,
    stockUniverseScan,
    previousSnapshot,
    previousRecommendationReviews,
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
  saveDailyRecommendationSnapshot(report);
  return report;
}

function createBaseSupplementalData(rawStocks, rawEtfs, marketData) {
  const tickers = unique([...rawStocks.map((row) => row.ticker), ...rawEtfs.map((row) => row.ticker)]);
  const byTicker = Object.fromEntries(tickers.map((ticker) => [ticker, {
    liquidity: fetchLiquiditySpread(ticker, marketItem(marketData, ticker))
  }]));
  return {
    byTicker,
    connectionStatus: {
      priceVolume: marketData?.items && Object.values(marketData.items).some((item) => item.dataStatus === "ok") ? "CONNECTED" : "FAILED",
      news: "DISABLED",
      options: "DISABLED",
      etfBreadth: "DISABLED",
      liquiditySpread: aggregateStatus(tickers.map((ticker) => byTicker[ticker]?.liquidity?.status)),
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
    relatedEtfs: row.relatedEtfs?.map((etf) => etf.ticker) || row.relatedEtfSymbols || ["QQQ 湲곕낯 留ㅽ븨"],
    scoreBandLabel: ok ? scoreBandLabel(row.moneyFlowScoreInitial) : "怨꾩궛 ?ㅽ뙣",
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
  if (score >= 80) return "媛뺥븳 ?먭툑 ?좎엯 ?꾨낫";
  if (score >= 65) return "愿???꾨낫";
  if (score >= 50) return "愿李??꾨낫";
  return "?꾩닚??留ㅻℓ 湲덉?";
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
    etfActionCandidates: report.etfActionCandidates.map(snapshotItem),
    stockActionCandidates: report.stockActionCandidates.map(snapshotItem),
    stockEntryCandidates: report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map(snapshotItem),
    stockPullbackCandidates: report.stockActionCandidates.filter((row) => row.stockVsEtfDecision !== "STOCK_PREFERRED").map(snapshotItem),
    stockWatchCandidates: report.stockCautionRows.filter((row) => row.status === STATUS.WATCH).map(snapshotItem),
    finalTopPick: report.topExecutionCandidate ? snapshotItem(report.topExecutionCandidate) : undefined,
    dataMode: report.dataMode
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
    entryCondition: row.entryCondition,
    invalidationCondition: row.invalidationCondition,
    relatedEtfs: row.relatedEtfs?.map((etf) => etf.ticker) || [],
    closePriceAtRecommendation: row.market?.lastClose ?? null,
    recommendationDate: row.market?.dataDate || new Date().toISOString().slice(0, 10)
  };
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

  const [newsRows, optionRows] = await Promise.all([
    Promise.all(tickers.map((ticker) => fetchNewsForTicker(ticker))),
    Promise.all(tickers.map((ticker) => fetchOptionsFlow(ticker)))
  ]);
  for (const row of newsRows) byTicker[row.ticker].news = row;
  for (const row of optionRows) byTicker[row.ticker].options = row;
  for (const ticker of tickers) {
    byTicker[ticker].liquidity = fetchLiquiditySpread(ticker, marketItem(marketData, ticker));
  }
  for (const etf of etfTickers) {
    const holdings = await fetchEtfHoldings(etf);
    byTicker[etf].etfBreadth = await calculateEtfBreadth(etf, holdings, marketData);
  }

  const connectionStatus = {
    priceVolume: marketData?.items && Object.values(marketData.items).some((item) => item.dataStatus === "ok") ? "CONNECTED" : "FAILED",
    news: aggregateStatus(newsRows.map((row) => row.status)),
    options: aggregateStatus(optionRows.map((row) => row.status)),
    etfBreadth: aggregateStatus(etfTickers.map((ticker) => byTicker[ticker]?.etfBreadth?.status)),
    liquiditySpread: aggregateStatus(tickers.map((ticker) => byTicker[ticker]?.liquidity?.status)),
    lastUpdated: new Date().toISOString(),
    notes: supplementalNotes(byTicker)
  };
  return { byTicker, connectionStatus };
}

function supplementalNotes(byTicker) {
  const notes = [];
  const rows = Object.values(byTicker);
  const failedNews = rows.filter((row) => row.news?.status === "FAILED").length;
  const failedOptions = rows.filter((row) => row.options?.status === "FAILED").length;
  const fallbackLiquidity = rows.filter((row) => row.liquidity?.status === "PARTIAL").length;
  const fallbackBreadth = rows.filter((row) => row.etfBreadth?.status === "PARTIAL").length;
  if (failedNews) notes.push(`뉴스 수집 실패 티커 ${failedNews}개`);
  if (failedOptions) notes.push(`옵션 수집 실패 티커 ${failedOptions}개`);
  if (fallbackBreadth) notes.push(`ETF 구성종목 확산도 fallback sample ${fallbackBreadth}개 사용`);
  if (fallbackLiquidity) notes.push(`스프레드/유동성 bid/ask 대신 거래대금 fallback ${fallbackLiquidity}개 사용`);
  return notes;
}

function dynamicDataWarning(status) {
  if (!status) return REAL_WARNING;
  const optional = [
    ["뉴스", status.news],
    ["옵션", status.options],
    ["ETF 구성종목 확산도", status.etfBreadth],
    ["스프레드/유동성", status.liquiditySpread]
  ];
  const connected = optional.filter(([, value]) => value === "CONNECTED").map(([label]) => label);
  const partial = optional.filter(([, value]) => value === "PARTIAL").map(([label]) => label);
  const failed = optional.filter(([, value]) => value === "FAILED").map(([label]) => label);
  const disabled = optional.filter(([, value]) => value === "DISABLED").map(([label]) => label);
  if (connected.length === optional.length) return "REAL DATA TEST - 가격/거래량, 뉴스, 옵션, ETF 확산도, 스프레드 데이터 반영";
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
      explanation: `${bestEtf.ticker}??ETF???뚮쭏 ?⑥쐞 ?먭툑 ?먮쫫??吏곸젒 癒밸뒗 ?꾨낫?닿퀬, ?꾩옱 ?먯닔媛 媛쒕퀎 醫낅ぉ ?꾨낫蹂대떎 ?곗꽑?쒕떎.`
    };
  }
  return {
    ...bestStock,
    explanation: `${bestStock.ticker}??愿??ETF ?鍮??곷?媛뺣룄 ?뺤씤???꾩슂??媛쒕퀎 醫낅ぉ ?꾨낫??議곌굔 異⑹” ??ETF蹂대떎 ?뚰뙆瑜?湲곕??????덈떎.`
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function marketLine(item) {
  if (!item || item.dataStatus !== "ok") return "?곗씠???곹깭: ?곗씠???놁쓬";
  return `湲곗???${item.dataDate} | 醫낃? ${price(item.lastClose)} | 1??${pct(item.dailyChangePct)} | 5??${pct(item.return5dPct)} | 20??${pct(item.return20dPct)} | ?곷? 嫄곕옒??${num(item.relativeVolume, 2)}諛?| 52二?怨좎젏 ?鍮?${pct(item.drawdownFrom52wHighPct)} | ?곗씠???뚯뒪: ${item.dataSource}`;
}

function renderMarkdown(report) {
  const etfBest = report.etfActionCandidates[0];
  const stockBest = report.stockActionCandidates[0];
  return `# ?ㅻ뒛???곗씪由??몃젅?대뵫 ?붿빟

**${report.dataWarning}**

**紐⑹쟻:** ${PURPOSE}

> ?듭떖 吏덈Ц: ?꾩옱 媛寃⑹뿉???닿퉴, ?꾧? ????鍮꾩떥寃??ъ쨪 ???덈뒗媛?

## 0. ?쒖옣 ?곹깭

- ?곗씠??紐⑤뱶: ${report.dataMode}
- 媛寃?嫄곕옒?? ${statusLabel(report.dataConnectionStatus.priceVolume)}
- ?댁뒪: ${statusLabel(report.dataConnectionStatus.news)}
- ?듭뀡: ${statusLabel(report.dataConnectionStatus.options)}
- ETF 援ъ꽦醫낅ぉ ?뺤궛?? ${statusLabel(report.dataConnectionStatus.etfBreadth)}
- ?ㅽ봽?덈뱶/?좊룞?? ${statusLabel(report.dataConnectionStatus.liquiditySpread)}
- ?앹꽦 ?쒓컖: ${report.generatedAt}
- ?쒖옣 ?곹깭: ${report.marketLabel}
- ?ㅻ뒛 ?덉쓽 諛⑺뼢: ${moneyDirection(report)}
- 媛뺥븳 ?뚮쭏 TOP 3: ${report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "?곗씠???놁쓬"}
- ?ㅻ뒛???먯튃: ETF???뚮쭏 ?먭툑 ?먮쫫, 媛쒕퀎 醫낅ぉ? ETF蹂대떎 媛뺥븷 ?뚮쭔 ?뚰뙆 ?꾨낫濡?蹂몃떎.
- ?곗씠???쒓퀎:
  - API ???먮뒗 provider ?곹깭???곕씪 ?댁뒪/?듭뀡/?뺤궛???ㅽ봽?덈뱶 諛섏쁺 踰붿쐞媛 ?щ씪吏?  - ?섏쭛 ?ㅽ뙣 ?곗씠?곕뒗 ?먯닔 諛섏쁺?먯꽌 ?쒖쇅?섍굅??confidence瑜??쒗븳
  - reasonConfidence HIGH??異붽? ?곗씠?곌? 異⑸텇???곌껐???꾨낫?먮쭔 ?ъ슜

## ?ㅻ뒛??遺꾨━ 寃곕줎

- ETF ?됰룞 ?꾨낫: ${report.etfActionCandidates.map((row) => row.ticker).join(", ") || "?놁쓬"}
- 媛쒕퀎 醫낅ぉ ?됰룞 ?꾨낫: ${report.stockActionCandidates.map((row) => row.ticker).join(", ") || "?놁쓬"}
- Nasdaq-100 ?좉퇋 ?ㅼ틪 寃곌낵:
  - 珥??ㅼ틪: ${report.stockScanSummary.total}
  - 理쒖쥌 ?꾨낫: ${report.stockActionCandidates.length}
  - ?쒖쇅: ${report.stockScanSummary.failed + report.stockScanSummary.ban}
- ?꾩씪 異붿쿇 醫낅ぉ ?먭?:
  - ?먭? ??? ${report.previousRecommendationReviews.length}
  - 유지: ${report.previousRecommendationReviews.filter((row) => row.todayStatus === "유지").length}
  - 하향: ${report.previousRecommendationReviews.filter((row) => row.todayStatus === "매매 금지로 하향" || row.todayStatus === "눌림 대기").length}
  - 무효화: ${report.previousRecommendationReviews.filter((row) => row.todayStatus === "무효화").length}
- ETF ?곗꽑 ?뚮쭏: ${report.etfTop5.slice(0, 3).map((row) => row.categoryType).filter((value, index, arr) => arr.indexOf(value) === index).join(", ") || "?곗씠???놁쓬"}
- 媛쒕퀎 醫낅ぉ ?곗꽑 ?뚮쭏: ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.primaryTheme).filter(Boolean).join(", ") || "愿??ETF ?鍮?異붽? ?뺤씤 ?꾩슂"}
- ?ㅻ뒛 理쒖슦???ㅽ뻾 ?꾨낫: ${report.topExecutionCandidate ? `${report.topExecutionCandidate.ticker} - ${report.topExecutionCandidate.explanation}` : "議곌굔 異⑹” ?꾨낫 ?놁쓬"}
- ?섏? 留먯븘????寃? 異붽꺽 留ㅼ닔 湲덉? / ETF? 媛쒕퀎 醫낅ぉ 以묐났 踰좏똿 湲덉? / ?ㅻ뒛 ???꾨낫? ?꾩씪 異붿쿇 ?먭? 醫낅ぉ??媛숈? ?섎?濡??욎뼱 ?댁꽍?섏? ?딄린

## moneyFlowScore ?곗젙 諛⑹떇

### score???섎?
moneyFlowScore???쒗쁽???대떦 ETF ?먮뒗 醫낅ぉ?쇰줈 ?덉씠 紐곕━怨??덈뒗 ?뺣룄?앸? 媛寃? 嫄곕옒?? 異붿꽭, ?좉퀬媛 洹쇱젒?? ETF ?鍮??곷?媛뺣룄 ?깆쓣 諛뷀깢?쇰줈 ?섏튂?뷀븳 ?먯닔??

???먯닔???κ린 媛移섑룊媛 ?먯닔媛 ?꾨땲??
???먯닔???쒖?湲??쒖옣 李몄뿬?먮뱾????鍮꾩떥寃??ъ쨪 媛?μ꽦???덈뒗 ?몃젅?대뵫 ?꾨낫?멸???앸? ?먮떒?섍린 ?꾪븳 ?④린/以묎린 紐⑤찘? ?먯닔??

### 湲곕낯 ?곗젙 ?붿냼
- 20???섏씡瑜? 理쒓렐 1媛쒖썡 ?섏???以묎린 異붿꽭瑜?諛섏쁺?쒕떎.
- 5???섏씡瑜? 理쒓렐 1二쇱씪 ?섏????④린 ?먭툑 ?좎엯??諛섏쁺?쒕떎.
- 1???섏씡瑜? 吏곸쟾 嫄곕옒?쇱쓽 ?④린 異붽꺽 留ㅼ닔?몃? 諛섏쁺?쒕떎.
- ?곷? 嫄곕옒?? 媛寃??곸듅怨??④퍡 嫄곕옒?됱씠 ?섎㈃ ?ㅼ젣 ?먭툑 ?좎엯 媛?μ꽦???믨쾶 蹂몃떎.
- 52二?怨좎젏 ?鍮??꾩튂: 怨좎젏 洹쇱쿂 ?먯궛? 異붿꽭 異붿쥌 ?먭툑 ?좎엯 媛?μ꽦???덈떎.
- 異붿꽭 ?곹깭: 5?쇱꽑/20?쇱꽑/50?쇱꽑 ?꾩뿉 ?덈뒗吏 ?뺤씤?쒕떎.
- ETF ?鍮??곷?媛뺣룄: 媛쒕퀎 醫낅ぉ?먮쭔 ?곸슜?섎ŉ, 愿??ETF蹂대떎 媛뺥븷 ??媛쒕퀎 醫낅ぉ ?곗꽑 媛?μ꽦???щ씪媛꾨떎.
- ?곗씠???좊ː???⑤꼸?? ?댁뒪/?듭뀡/?ㅽ봽?덈뱶/ETF 援ъ꽦醫낅ぉ ?뺤궛???곗씠?곌? 誘몄뿰寃곗씠硫?HIGH confidence瑜??ъ슜?섏? ?딅뒗??

### ?먯닔 援ш컙 ?댁꽍
- 80???댁긽: 媛뺥븳 ?먭툑 ?좎엯 ?꾨낫. ?? 怨쇱뿴 ?щ? ?뺤씤 ?꾩닔.
- 65???댁긽 80??誘몃쭔: 愿???꾨낫. ?뚮┝ ?먮뒗 ?뚰뙆 ?뺤씤 ??吏꾩엯 寃??
- 50???댁긽 65??誘몃쭔: 愿李??꾨낫. ?먮쫫? ?덉쑝???곗꽑?쒖쐞????쓬.
- 50??誘몃쭔: 留ㅻℓ 湲덉? ?먮뒗 ?꾩닚???꾨낫.

### 二쇱쓽 臾멸뎄
moneyFlowScore??留ㅼ닔 異붿쿇 ?먯닔媛 ?꾨땲??
媛寃?嫄곕옒??湲곕컲???먭툑 ?먮쫫 ?꾨낫 ?먯닔?대ŉ, 吏꾩엯 ?щ???諛섎뱶??吏꾩엯 議곌굔怨?臾댄슚??議곌굔???④퍡 ?뺤씤?댁빞 ?쒕떎.

### moneyFlowScore(1차/최종) 계산 구조
- moneyFlowScore(1차) = 추세 + 단기 모멘텀 + 중기 모멘텀 + 거래량 + 신고가 근접 + 이동평균
- moneyFlowScore(최종 원점수) = moneyFlowScore(1차) + 뉴스 + 옵션 + ETF 확산도 + 유동성 + 관련 ETF 대비 상대강도 + 리스크 패널티
- moneyFlowScore(최종 표시 점수) = min(100, max(0, 최종 원점수))
- 리스크 패널티는 -6, -4처럼 음수로 저장하고 계산식에 그대로 더한다.
- 최종 표시 점수가 100점으로 같아도 정렬에는 최종 원점수를 tie-breaker로 사용한다.

## ?ㅻ뒛 ?덉씠 紐곕━???뚮쭏

${mdList(report.themes.slice(0, 6).map((row) => `**${row.theme}**: ${row.tickers.slice(0, 6).join(", ")} | ?됯퇏 moneyFlowScore ${row.avgScore.toFixed(0)}`))}

## 1. ETF ?몃젅?대뵫 蹂닿퀬??
### 1-1. ETF 寃곕줎
- ETF ?곗꽑 ?꾨낫: ${report.etfActionCandidates.filter((row) => row.status === STATUS.ENTRY_READY).map((row) => row.ticker).join(", ") || "?놁쓬"}
- ETF 愿李??꾨낫: ${report.etfs.filter((row) => row.status === STATUS.WATCH).slice(0, 5).map((row) => row.ticker).join(", ") || "?놁쓬"}
- ETF 留ㅻℓ 湲덉?: ${report.etfBanRows.map((row) => row.ticker).join(", ") || "?놁쓬"}
- ?ㅻ뒛 ETF 理쒖슦??1媛? ${etfBest ? `${etfBest.ticker} - ${etfBest.entryCondition}` : "?놁쓬"}
- ETF ?뱀뀡 ?댁꽍: ???뱀뀡? 媛쒕퀎 醫낅ぉ ?좏깮???꾨땲???뚮쭏/?뱁꽣 ?⑥쐞???먭툑 ?먮쫫??ETF濡?留ㅻℓ?좎? ?먮떒?섍린 ?꾪븳 ?곸뿭?대떎.

### 1-2. ETF ?꾨낫 TOP 5

선정 기준: ETF 후보는 가격/거래량 1차 점수에 뉴스, 옵션, ETF 구성종목 확산도, 유동성, 리스크 패널티를 반영한 moneyFlowScore(최종) 기준으로 정렬한다. 최종 표시 점수가 같으면 최종 원점수를 tie-breaker로 사용한다.

${report.etfTop5.map(renderEtfMarkdown).join("\n\n") || "?곗씠???놁쓬"}

### 1-3. ETF 怨쇱뿴/二쇱쓽 ?꾨낫

${report.etfOverheat.slice(0, 5).map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore(최종): ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- moneyFlowScore ?곗젙 洹쇨굅 ?붿빟: ${scoreOneLine(row)}
- 怨쇱뿴 由ъ뒪?? ${row.overheatingRisk}
- 怨쇱뿴 洹쇨굅: ${row.overheatingReason}
- 대응: ${row.overheatingRisk === "높음" ? "추격 금지" : row.overheatingRisk === "중간" ? "눌림 대기" : "돌파 확인 후 진입"}
`).join("\n") || "?대떦 ?놁쓬"}

### 1-4. ETF ?쒖쇅/留ㅻℓ 湲덉? ?꾨낫

${report.etfBanRows.map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore(최종): ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- moneyFlowScore ?곗젙 洹쇨굅 ?붿빟: ${scoreOneLine(row)}
- 제외 사유: ${row.moneyFlowScore < 50 ? "테마 자금 흐름 약함" : "매매 조건 미충족"}
- ?ш???議곌굔: ${row.entryCondition}
`).join("\n") || "?대떦 ?놁쓬"}

## 2. 媛쒕퀎 醫낅ぉ ?몃젅?대뵫 蹂닿퀬??
### 2-1. ?ㅻ뒛 Nasdaq-100 ?좉퇋 諛쒓뎬 ?붿빟
- ?좉퇋 諛쒓뎬 ?: Nasdaq-100 援ъ꽦醫낅ぉ ?꾩껜
- universe source: ${report.stockUniverse.source}
- universe fetchStatus: ${report.stockUniverse.fetchStatus}
- 珥??ㅼ틪 醫낅ぉ ?? ${report.stockScanSummary.total}
- ?곗씠???섏쭛 ?깃났: ${report.stockScanSummary.success}
- ?곗씠???섏쭛 ?ㅽ뙣: ${report.stockScanSummary.failed}
- ?곸꽭 ?곗씠???섏쭛 ??? 媛寃?嫄곕옒??1李??ㅼ틪 ?곸쐞 ${report.stockScanSummary.detailedCount}媛?- ?ㅻ뒛 吏꾩엯 ?꾨낫: ${report.stockScanSummary.entry}
- ?ㅻ뒛 ?뚮┝ ?湲? ${report.stockScanSummary.pullback}
- ?ㅻ뒛 愿李? ${report.stockScanSummary.watch}
- ?ㅻ뒛 留ㅻℓ 湲덉?: ${report.stockScanSummary.ban}
- 媛쒕퀎 醫낅ぉ 吏꾩엯 ?꾨낫: ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "?놁쓬"}
- 媛쒕퀎 醫낅ぉ ?뚮┝ ?湲? ${report.stockActionCandidates.filter((row) => row.stockVsEtfDecision !== "STOCK_PREFERRED").map((row) => row.ticker).join(", ") || "?놁쓬"}
- 媛쒕퀎 醫낅ぉ 留ㅻℓ 湲덉?: ${report.stockCautionRows.filter((row) => row.status === STATUS.BAN).map((row) => row.ticker).join(", ") || "?놁쓬"}
- ?ㅻ뒛 媛쒕퀎 醫낅ぉ 理쒖슦??1媛? ${stockBest ? `${stockBest.ticker} - ${stockBest.relativeStrengthVsEtf}` : "?놁쓬"}
- 媛쒕퀎 醫낅ぉ ?뱀뀡 ?댁꽍: ???뱀뀡? ETF濡??뺤씤???뚮쭏 ?먭툑 ?먮쫫 ?덉뿉??ETF蹂대떎 ???섏? ?뚰뙆瑜?以????덈뒗 媛쒕퀎 醫낅ぉ留??좊퀎?섎뒗 ?곸뿭?대떎.

### 2-2. ?ㅻ뒛 媛쒕퀎 醫낅ぉ ?좉퇋 ?꾨낫 TOP 5

선정 기준:
1. Nasdaq-100 전체를 moneyFlowScore(1차)로 먼저 스캔
2. moneyFlowScore(1차) 상위 ${report.stockScanSummary.detailedCount}개를 상세 분석
3. 뉴스/옵션/유동성/관련 ETF 대비 상대강도/리스크 패널티를 반영
4. moneyFlowScore(최종), 최종 원점수, 리스크 패널티, 5일 수익률, 상대 거래량 순으로 재정렬

${report.stockTop5.map(renderStockMarkdown).join("\n\n") || "?곗씠???놁쓬"}

### 2-3. ?꾩씪 異붿쿇 醫낅ぉ ?먭?
???뱀뀡? ?ㅼ젣 怨꾩쥖 蹂댁쑀 醫낅ぉ???꾨땲???꾩씪 由ы룷?몄뿉???쒖떆??媛쒕퀎 醫낅ぉ ?꾨낫???ы썑 ?먭??대떎.
?ㅼ젣 蹂댁쑀 ?섎웾/?됰떒???낅젰?섏? ?딆븯?쇰?濡?怨꾩쥖 ?섏씡瑜좎씠 ?꾨땲??異붿쿇 湲곗????댄썑 媛寃?蹂?붾? 異붿쟻?쒕떎.

${report.previousRecommendationReviews.length ? report.previousRecommendationReviews.map(renderPreviousReviewMarkdown).join("\n\n") : "?꾩씪 異붿쿇 醫낅ぉ ?곗씠???놁쓬"}

### 2-4. ETF ?鍮?媛쒕퀎 醫낅ぉ ?먮떒 濡쒖쭅

- 愿??ETF??5??20???섏씡瑜좉낵 媛쒕퀎 醫낅ぉ??5??20???섏씡瑜좎쓣 鍮꾧탳?쒕떎.
- 愿??ETF???곷? 嫄곕옒?됯낵 媛쒕퀎 醫낅ぉ???곷? 嫄곕옒?됱쓣 鍮꾧탳?쒕떎.
- 媛쒕퀎 醫낅ぉ??愿??ETF蹂대떎 媛뺥븯硫??쒓컻蹂?醫낅ぉ ?곗꽑??媛?μ쑝濡?蹂몃떎.
- 媛쒕퀎 醫낅ぉ??愿??ETF? 鍮꾩듂?섍굅???쏀븯硫??쏣TF ?곗꽑 / 媛쒕퀎 醫낅ぉ 愿李겸앸줈 ??텣??
- 愿??ETF媛 ??媛뺥븯硫?媛쒕퀎 醫낅ぉ ???ETF瑜??곗꽑?쒕떎.

### 2-5. 媛쒕퀎 醫낅ぉ ?쒖쇅/二쇱쓽 ?꾨낫

${report.stockCautionRows.map((row) => `#### [${row.ticker}] ${row.name}
- moneyFlowScore(최종): ${row.moneyFlowScoreFinal ?? row.moneyFlowScore}
- moneyFlowScore ?곗젙 洹쇨굅 ?붿빟: ${scoreOneLine(row)}
- 제외/주의 사유: ${row.stockVsEtfDecision === "ETF_PREFERRED" ? "ETF 대비 약세" : row.status === STATUS.BAN ? "매매 조건 미충족" : "개별 종목 우선 근거 부족"}
- ?ш???議곌굔: ${row.entryCondition}
`).join("\n") || "?대떦 ?놁쓬"}

### Nasdaq-100 전체 moneyFlowScore(1차) 표
${renderStockUniverseScoreMarkdown(report.stockUniverseScan)}

## 媛먯떆 ETF 紐⑸줉

| ?곗빱 | 移댄뀒怨좊━ | moneyFlowScore | ?곹깭 | reasonConfidence | ??以??댁쑀 |
| --- | --- | ---: | --- | --- | --- |
${report.etfs.map((row) => `| ${row.ticker} | ${row.categoryType} | ${row.moneyFlowScore} | ${row.status} | ${row.reasonConfidence} | ${row.whyMoneyIsFlowing} |`).join("\n")}

## 3. 理쒖쥌 ?ㅽ뻾 ?먮떒

### 3-1. ?ㅻ뒛 ?ㅼ젣濡?????1. ETF?먯꽌 ???? ${etfBest ? `${etfBest.ticker} ?ы븿 ETF ?꾨낫???꾩씪 怨좎젏 ?뚰뙆? 5?쇱꽑 ?좎?瑜??뺤씤?쒕떎.` : "ETF ?꾨낫??愿李고븳??"}
2. 媛쒕퀎 醫낅ぉ?먯꽌 ???? ${stockBest ? `${stockBest.ticker} ?깆? 愿??ETF ?鍮??곷?媛뺣룄媛 ?좎??섎뒗吏 ?뺤씤?????뚮┝ ?먮뒗 ?뚰뙆 議곌굔?먯꽌留?寃?좏븳??` : "媛쒕퀎 醫낅ぉ? 愿??ETF ?鍮??곷?媛뺣룄 ?뺤씤 ?꾧퉴吏 愿李고븳??"}
3. ?섏? 留먯븘?????? ETF? 媛쒕퀎 醫낅ぉ??媛숈? ?뚮쭏 ?덉뿉??以묐났 留ㅼ닔?섏? ?딅뒗??

### 3-2. ?댁씪 ?뺤씤??議곌굔
- ETF ?뺤씤 議곌굔: ETF ?꾨낫 TOP 5媛 20?쇱꽑 ?꾩뿉???좎??섎뒗吏 ?뺤씤
- 媛쒕퀎 醫낅ぉ ?뺤씤 議곌굔: 愿??ETF ?鍮?5??20???곷?媛뺣룄? ?곷? 嫄곕옒???좎? ?뺤씤
- ?쒖옣 ?곹깭 ?뺤씤 議곌굔: QQQ/SPY??5??20??異붿꽭? ?꾪뿕?좏샇 ?좎? ?щ? ?뺤씤
- ?곗씠??蹂닿컯 ?꾩슂 ??ぉ: ?댁뒪, ?듭뀡, ?ㅽ봽?덈뱶, ETF 援ъ꽦醫낅ぉ ?뺤궛?? ?ㅼ젣 蹂댁쑀 吏꾩엯媛

## ?곗씠???섏쭛 ?곹깭

${renderDataCollectionMarkdown(report)}
`;
}

function renderActionMarkdown(row) {
  return `### ${row.rank}. [${row.ticker}] ${row.name || row.ticker}
- ?먯궛 ?좏삎: ${row.assetType}
- ?꾩옱 ?덉씠 紐곕┛?ㅺ퀬 蹂대뒗 ?댁쑀: ${row.whyMoneyIsFlowing}
- ?꾧? ??鍮꾩떥寃??ъ쨪 ???덈뒗吏: ${row.likelyNextBuyer}
- 吏꾩엯 議곌굔: ${row.entryCondition}
- 臾댄슚??議곌굔: ${row.invalidationCondition}
- reasonConfidence: ${row.reasonConfidence}
- todayActionLabel: ${row.todayActionLabel}
- moneyFlowScore: ${row.moneyFlowScore}
- 怨쇱뿴 由ъ뒪?? ${row.overheatingRisk}
- 李⑦듃: ![${row.ticker} chart](${row.chartPath})`;
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

function scoreOneLine(row) {
  const breakdown = row.moneyFlowScoreBreakdown;
  if (!breakdown) return "산정 근거 데이터 없음";
  const reasons = breakdown.reasons || [];
  const positives = reasons.filter((reason) => !reason.includes("위험") && !reason.includes("미연결")).slice(0, 3).join(", ") || "가점 제한적";
  const cautions = reasons.filter((reason) => reason.includes("위험") || reason.includes("미연결")).slice(0, 2).join(", ") || "큰 감점 제한적";
  return `1차 ${breakdown.initialDisplayScore}, 최종 원점수 ${breakdown.finalRawScore}, 표시 ${breakdown.finalDisplayScore}. ${positives}. 주의: ${cautions}.`;
}

function scoreBreakdownMarkdown(row) {
  const b = row.moneyFlowScoreBreakdown;
  if (!b) return "moneyFlowScore ?곗젙 洹쇨굅: ?곗씠???놁쓬";
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
  - 추가 데이터 가감점:
    - 뉴스: ${signed(b.newsScore)}
    - 옵션: ${signed(b.optionsScore)}
    - 유동성: ${signed(b.liquidityScore)}${relativeLine}${breadthLine}
  - 리스크 패널티: ${signed(b.riskPenalty)}
  - 주요 근거: ${scoreOneLine(row)}
  - 리스크 패널티 산정 근거:
${riskPenaltyMarkdown(b.riskPenaltySummary)}`;
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
  - 옵션: ${used.options ? "사용" : statusLabel(row.optionsSummary?.status)}
  - ETF 확산도: ${row.assetType === "ETF" ? (used.etfBreadth ? "사용" : statusLabel(row.etfBreadthSummary?.status)) : "관련 ETF에서 확인"}
  - 유동성/스프레드: ${used.liquiditySpread ? "사용" : statusLabel(row.liquiditySummary?.status)}
  - 관련 ETF 상대강도: ${used.relativeStrength ? "사용" : "미사용"}`;
}

function newsMarkdown(summary) {
  if (!summary) return "  - 理쒓렐 ?댁뒪 ?곹깭: ?곗씠???놁쓬";
  const counts = summary.sentimentCounts || {};
  return `  - 理쒓렐 ?댁뒪 ?곹깭: ${statusLabel(summary.status)}
  - 湲띿젙/以묐┰/遺?? ${counts.positive || 0}/${counts.neutral || 0}/${counts.negative || 0}
  - ?듭떖 ?댁뒪 ?붿빟: ${summary.headlineSummary || "?섎? ?덈뒗 ?좉퇋 ?댁뒪 ?놁쓬"}
  - ?먯닔 諛섏쁺: ${signed(summary.newsScore || 0)}
  - 二쇱쓽: ${(summary.notes || []).join("; ") || "?뱀씠?ы빆 ?놁쓬"}`;
}

function optionsMarkdown(summary) {
  if (!summary) return "  - ?듭뀡 ?곗씠???곹깭: ?곗씠???놁쓬";
  const iv = summary.impliedVolatilityAvg ? `${(summary.impliedVolatilityAvg * 100).toFixed(1)}%` : "?곗씠???놁쓬";
  const interpretation = summary.bullishOptionsSignal
    ? "肄쒖샃???곗쐞濡??④린 ?ш린??留ㅼ닔??媛?μ꽦"
    : summary.bearishOptionsSignal
      ? "?뗭샃???곗쐞濡?諛⑹뼱???섍툒 ?먮뒗 ?섎갑 ?ㅼ? 二쇱쓽"
      : "?쒕졆???듭뀡 諛⑺뼢???놁쓬";
  return `  - ?듭뀡 ?곗씠???곹깭: ${statusLabel(summary.status)}
  - Put/Call 嫄곕옒??鍮꾩쑉: ${summary.putCallVolumeRatio ?? "?곗씠???놁쓬"}
  - 肄?嫄곕옒?? ${summary.callVolume ?? "?곗씠???놁쓬"}
  - ??嫄곕옒?? ${summary.putVolume ?? "?곗씠???놁쓬"}
  - IV ?곹깭: ${iv}
  - ?댁꽍: ${interpretation}
  - ?먯닔 諛섏쁺: ${signed(summary.optionsScore || 0)}`;
}

function etfBreadthMarkdown(summary) {
  if (!summary) return "  - 援ъ꽦醫낅ぉ ?곗씠???곹깭: ?곗씠???놁쓬";
  return `  - 援ъ꽦醫낅ぉ ?곗씠???곹깭: ${statusLabel(summary.status)}
  - ?섑뵆 ?? ${summary.sampledHoldingsCount || 0}/${summary.holdingsCount || 0}
  - ?곸듅 醫낅ぉ 鍮꾩쑉: ${summary.advancersRatio !== undefined ? `${Math.round(summary.advancersRatio * 100)}%` : "?곗씠???놁쓬"}
  - 20?쇱꽑 ??鍮꾩쑉: ${summary.holdingsAbove20DMA !== undefined ? `${Math.round(summary.holdingsAbove20DMA * 100)}%` : "?곗씠???놁쓬"}
  - 50?쇱꽑 ??鍮꾩쑉: ${summary.holdingsAbove50DMA !== undefined ? `${Math.round(summary.holdingsAbove50DMA * 100)}%` : "?곗씠???놁쓬"}
  - ?곸쐞 湲곗뿬 醫낅ぉ: ${(summary.topContributors || []).join(", ") || "?곗씠???놁쓬"}
  - ?뺤궛???먮떒: ${summary.breadthSignal || "UNKNOWN"}
  - ?먯닔 諛섏쁺: ${signed(summary.etfBreadthScore || 0)}`;
}

function liquidityMarkdown(summary) {
  if (!summary) return "  - ?곗씠???곹깭: ?곗씠???놁쓬";
  return `  - ?곗씠???곹깭: ${statusLabel(summary.status)}
  - ?ㅽ봽?덈뱶: ${summary.spreadPct !== null && summary.spreadPct !== undefined ? pct(summary.spreadPct) : "bid/ask ?곗씠???놁쓬"}
  - 嫄곕옒?湲? ${summary.dollarVolume ? `$${summary.dollarVolume.toLocaleString("en-US")}` : "?곗씠???놁쓬"}
  - ?됯퇏 嫄곕옒?湲? ${summary.avgDollarVolume20D ? `$${summary.avgDollarVolume20D.toLocaleString("en-US")}` : "?곗씠???놁쓬"}
  - ?좊룞???먮떒: ${summary.liquiditySignal || "UNKNOWN"}
  - 留ㅻℓ ?곹뼢: ${liquidityImpact(summary)}`;
}

function liquidityImpact(summary) {
  if (!summary) return "?곗씠???놁쓬";
  if (summary.liquiditySignal === "LIQUID") return "嫄곕옒?湲?湲곗? ?ㅼ젣 留ㅻℓ 媛?μ꽦????臾몄젣????쓬";
  if (summary.liquiditySignal === "ACCEPTABLE") return "嫄곕옒?湲덉? ?섏슜 媛?ν븯??bid/ask ?뺤씤 ?꾩슂";
  if (summary.liquiditySignal === "LOW_LIQUIDITY") return "?좊룞??遺議깆쑝濡?異붽꺽 湲덉? ?먮뒗 ?곗꽑?쒖쐞 ?섑뼢";
  return "?ㅽ봽?덈뱶 ?곗씠?곌? ?놁뼱 嫄곕옒?湲?湲곕컲?쇰줈留??먮떒";
}

function confidenceReason(row) {
  const used = row.moneyFlowScoreBreakdown?.dataUsed || {};
  const usedLabels = [
    used.priceVolume ? "가격/거래량" : null,
    used.news ? "뉴스" : null,
    used.options ? "옵션" : null,
    used.etfBreadth ? "ETF 확산도" : null,
    used.liquiditySpread ? "유동성" : null,
    used.relativeStrength ? "관련 ETF 상대강도" : null
  ].filter(Boolean);
  if (row.reasonConfidence === "HIGH") return `${usedLabels.join(", ")} 데이터가 확인되어 신뢰도를 높게 본다.`;
  if (row.reasonConfidence === "MEDIUM") return `${usedLabels.join(", ") || "가격/거래량"}은 확인됐지만 일부 보조 데이터가 미연결 또는 fallback이라 중간으로 제한한다.`;
  return "가격/거래량이 약하거나 주요 데이터가 부족해 낮음.";
}

function renderDataCollectionMarkdown(report) {
  const rows = Object.values(report.supplementalData?.byTicker || {});
  const newsCount = rows.reduce((sum, row) => sum + (row.news?.itemCount || 0), 0);
  const optionsCount = rows.filter((row) => row.options?.hasOptionsData).length;
  const breadthCount = rows.filter((row) => row.etfBreadth?.sampledHoldingsCount > 0).length;
  const quoteCount = rows.filter((row) => row.liquidity?.hasQuoteData).length;
  const liquidityFallback = rows.filter((row) => row.liquidity?.status === "PARTIAL").length;
  return `- 媛寃?嫄곕옒??
  - ?곹깭: ${statusLabel(report.dataConnectionStatus.priceVolume)}
  - ?뚯뒪: yfinance
  - 鍮꾧퀬: 湲곗〈 REAL_TEST 媛寃?嫄곕옒??諛?李⑦듃 ?앹꽦 ?좎?

- ?댁뒪:
  - ?곹깭: ${statusLabel(report.dataConnectionStatus.news)}
  - ?뚯뒪: Yahoo Finance RSS fallback
  - ?섏쭛???댁뒪 ?? ${newsCount}
  - ?ㅽ뙣/?쒗븳 ?ъ쑀: ${providerNotes(rows, "news")}

- ?듭뀡:
  - ?곹깭: ${statusLabel(report.dataConnectionStatus.options)}
  - ?뚯뒪: Yahoo Finance options endpoint
  - ?섏쭛 媛???곗빱 ?? ${optionsCount}
  - ?ㅽ뙣/?쒗븳 ?ъ쑀: ${providerNotes(rows, "options")}

- ETF 援ъ꽦醫낅ぉ ?뺤궛??
  - ?곹깭: ${statusLabel(report.dataConnectionStatus.etfBreadth)}
  - ?뚯뒪: config/etfHoldingsFallback.json ?섑뵆
  - ?섏쭛 媛??ETF ?? ${breadthCount}
  - fallback ?ъ슜 ?щ?: ?ъ슜

- Nasdaq-100 援ъ꽦醫낅ぉ:
  - ?곹깭: ${report.stockUniverse.fetchStatus}
  - ?뚯뒪: ${report.stockUniverse.source}
  - 珥?援ъ꽦醫낅ぉ ?? ${report.stockUniverse.members.length}
  - 鍮꾧퀬: ${(report.stockUniverse.notes || []).join("; ") || "?뱀씠?ы빆 ?놁쓬"}

- ?꾩씪 異붿쿇 snapshot:
  - 상태: ${report.previousSnapshot ? "연결됨" : "데이터 없음"}
  - ?먭? ??? ${report.previousRecommendationReviews.length}
  - ????꾩튂: data/latest-report.json, data/previous-report.json, data/dailyReports/

- ?좊룞???ㅽ봽?덈뱶:
  - ?곹깭: ${statusLabel(report.dataConnectionStatus.liquiditySpread)}
  - ?뚯뒪: 媛寃?嫄곕옒??湲곕컲 嫄곕옒?湲?fallback
  - bid/ask 사용 여부: ${quoteCount > 0 ? "일부 사용" : "미사용"}
  - 거래대금 fallback 사용 여부: ${liquidityFallback > 0 ? "사용" : "미사용"}

- ?꾩껜 鍮꾧퀬:
${mdList((report.dataConnectionStatus.notes || []).map((note) => note), "- ?뱀씠?ы빆 ?놁쓬")}`;
}

function renderDataCollectionHtml(report) {
  return htmlList(renderDataCollectionMarkdown(report).split("\n").filter((line) => line.trim()).map((line) => escapeHtml(line.replace(/^\s*-\s*/, ""))));
}

function providerNotes(rows, key) {
  const notes = rows.flatMap((row) => row[key]?.notes || []).filter(Boolean);
  return unique(notes).slice(0, 3).join("; ") || "?뱀씠?ы빆 ?놁쓬";
}

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : String(number);
}

function renderEtfMarkdown(row) {
  return `### [ETF ${row.ticker}] ${row.name}
- ?먯궛 ?좏삎: ETF
- ETF ?몃? 移댄뀒怨좊━: ${row.etfCategory}
- ETF ??븷: ${row.etfRole}
- ?곹깭: ${row.status}
- moneyFlowScore: ${row.moneyFlowScore}
- ${scoreBreakdownMarkdown(row)}
- 怨쇱뿴 由ъ뒪?? ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- todayActionLabel: ${row.todayActionLabel}
- 湲곗??? ${row.market?.dataDate || "?곗씠???놁쓬"}
- 醫낃?: ${price(row.market?.lastClose)}
- 1???섏씡瑜? ${pct(row.market?.dailyChangePct)}
- 5???섏씡瑜? ${pct(row.market?.return5dPct)}
- 20???섏씡瑜? ${pct(row.market?.return20dPct)}
- ?곷? 嫄곕옒?? ${num(row.market?.relativeVolume, 2)}諛?- 52二?怨좎젏 ?鍮??꾩튂: ${pct(row.market?.drawdownFrom52wHighPct)}
- whyMoneyIsFlowing: ${row.whyMoneyIsFlowing}
- likelyNextBuyer: ${row.likelyNextBuyer}
- whyThisCouldTradeHigher: ${row.whyThisCouldTradeHigher}
- ?곗씠???ъ슜 ?꾪솴:
${dataUsageMarkdown(row)}
- ?댁뒪 ?뺤씤:
${newsMarkdown(row.newsSummary)}
- ?듭뀡 ?섍툒:
${optionsMarkdown(row.optionsSummary)}
- ETF 援ъ꽦醫낅ぉ ?뺤궛??
${etfBreadthMarkdown(row.etfBreadthSummary)}
- ?좊룞???ㅽ봽?덈뱶:
${liquidityMarkdown(row.liquiditySummary)}
- reasonConfidence 洹쇨굅: ${confidenceReason(row)}
- 吏꾩엯 議곌굔: ${row.entryCondition}
- 臾댄슚??議곌굔: ${row.invalidationCondition}
- 李⑦듃 ?붿빟: ${row.chartSummary}
- 李⑦듃: ![${row.ticker} chart](${row.chartPath})
- ${marketLine(row.market)}`;
}

function renderStockMarkdown(row) {
  return `### [${row.ticker}] ${row.name}
- ?먯궛 ?좏삎: STOCK
- ?곹깭: ${row.status}
- primaryTheme: ${row.primaryTheme || "?곗씠???놁쓬"}
- primarySector: ${row.primarySector || "?곗씠???놁쓬"}
- relatedEtfs: ${row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "관련 ETF 데이터 부족"}
- moneyFlowScore: ${row.moneyFlowScore}
- ${scoreBreakdownMarkdown(row)}
- 怨쇱뿴 由ъ뒪?? ${row.overheatingRisk}
- reasonConfidence: ${row.reasonConfidence}
- todayActionLabel: ${row.todayActionLabel}
- 湲곗??? ${row.market?.dataDate || "?곗씠???놁쓬"}
- 醫낃?: ${price(row.market?.lastClose)}
- 1???섏씡瑜? ${pct(row.market?.dailyChangePct)}
- 5???섏씡瑜? ${pct(row.market?.return5dPct)}
- 20???섏씡瑜? ${pct(row.market?.return20dPct)}
- ?곷? 嫄곕옒?? ${num(row.market?.relativeVolume, 2)}諛?- 52二?怨좎젏 ?鍮??꾩튂: ${pct(row.market?.drawdownFrom52wHighPct)}
- 愿??ETF ?鍮??곷?媛뺣룄: ${row.relativeStrengthVsEtf}
- whyMoneyIsFlowing: ${row.whyMoneyIsFlowing}
- likelyNextBuyer: ${row.likelyNextBuyer}
- whyThisCouldTradeHigher: ${row.whyThisCouldTradeHigher}
- ??ETF媛 ?꾨땲????醫낅ぉ?멸??: ${row.whyStockOverEtf}
- ETF媛 ???섏? 寃쎌슦: ${row.whenEtfIsBetter}
- ?곗씠???ъ슜 ?꾪솴:
${dataUsageMarkdown(row)}
- ?댁뒪 ?뺤씤:
${newsMarkdown(row.newsSummary)}
- ?듭뀡 ?섍툒:
${optionsMarkdown(row.optionsSummary)}
- ETF 援ъ꽦醫낅ぉ ?뺤궛?? 愿??ETF?먯꽌 ?뺤씤
- ?좊룞???ㅽ봽?덈뱶:
${liquidityMarkdown(row.liquiditySummary)}
- reasonConfidence 洹쇨굅: ${confidenceReason(row)}
- 吏꾩엯 議곌굔: ${row.entryCondition}
- 臾댄슚??議곌굔: ${row.invalidationCondition}
${row.holdingInfo ? `- 蹂댁쑀 ?뺣낫: ${row.holdingInfo}\n` : ""}- 李⑦듃 ?붿빟: ${row.chartSummary}
- 李⑦듃: ![${row.ticker} chart](${row.chartPath})
- ${marketLine(row.market)}`;
}

function renderPreviousReviewMarkdown(row) {
  return `#### [${row.ticker}] ${row.name || row.ticker}
- ?꾩씪 異붿쿇?? ${row.recommendationDate || "?곗씠???놁쓬"}
- ?꾩씪 actionLabel: ${row.actionLabel || "?곗씠???놁쓬"}
- ?꾩씪 moneyFlowScore: ${row.moneyFlowScore ?? "?곗씠???놁쓬"}
- ?꾩씪 醫낃? ?먮뒗 異붿쿇 湲곗?媛: ${price(row.closePriceAtRecommendation)}
- ?ㅻ뒛 醫낃?: ${price(row.todayClose)}
- 異붿쿇 ?댄썑 ?섏씡瑜? ${row.returnSinceRecommendation === null || row.returnSinceRecommendation === undefined ? "?곗씠???놁쓬" : pct(row.returnSinceRecommendation)}
- 진입 조건 충족 여부: ${row.entryConditionMet ? "충족 또는 유지" : "미충족"}
- 무효화 조건 발생 여부: ${row.invalidationTriggered ? "발생" : "미발생"}
- 관련 ETF 대비 상대강도 유지 여부: ${row.relativeStrengthMaintained ? "유지" : "약화"}
- ?ㅻ뒛 ?곹깭: ${row.todayStatus}
- ?ㅻ뒛 ?먮떒 洹쇨굅: ${row.todayReason}
- ?ㅼ쓬 ?뺤씤 議곌굔: ${row.nextCondition || "?곗씠???놁쓬"}`;
}

function renderStockUniverseScoreMarkdown(scan) {
  if (!scan) return "Nasdaq-100 ?꾩껜 ?ㅼ틪 ?곗씠???놁쓬";
  const failures = scan.results.filter((row) => row.scanStatus !== "OK");
  return `이 표는 Nasdaq-100 전체 구성종목을 가격/거래량/추세 중심으로 빠르게 스캔한 moneyFlowScore(1차) 결과다. 뉴스, 옵션, 유동성, 관련 ETF 대비 상대강도, 리스크 패널티를 모두 반영한 최종 추천 점수는 Top5 카드의 moneyFlowScore(최종)에서 확인한다.

주의: Top5 카드의 moneyFlowScore(최종)는 1차 점수에 상세 데이터 가감점과 리스크 패널티를 더한 값이다. 따라서 아래 전체 표의 1차 순위와 Top5 최종 순위는 다를 수 있다.

- 珥??ㅼ틪 醫낅ぉ ?? ${scan.totalCount}
- ?먯닔 怨꾩궛 ?깃났: ${scan.successCount}
- ?먯닔 怨꾩궛 ?ㅽ뙣: ${scan.failedCount}
- moneyFlowScore(1차) 80점 이상: ${scan.scoreBands.strong}
- moneyFlowScore(1차) 65~79점: ${scan.scoreBands.interest}
- moneyFlowScore(1차) 50~64점: ${scan.scoreBands.watch}
- moneyFlowScore(1차) 50점 미만: ${scan.scoreBands.low}

?곸쐞 20媛??붿빟:

${stockScoreTableMarkdown(scan.results.slice(0, 20))}

<details>
<summary>Nasdaq-100 전체 moneyFlowScore(1차) 표 펼치기</summary>

${stockScoreTableMarkdown(scan.results)}

</details>

#### ?곗씠???섏쭛 ?ㅽ뙣 醫낅ぉ
${failures.length ? failures.map((row) => `- ${row.ticker}: ${row.failureReason || "score calculation failed"}`).join("\n") : "?곗씠???섏쭛 ?ㅽ뙣 醫낅ぉ ?놁쓬"}`;
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
    section, article, .hero { background: #fff; border: 1px solid #d9dee3; border-radius: 8px; margin: 10px 0; padding: 14px; }
    h1 { margin: 0 0 6px; font-size: 25px; } h2 { margin: 0 0 10px; font-size: 20px; } h3 { margin: 0 0 8px; font-size: 18px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .tile { border: 1px solid #d9dee3; border-radius: 8px; padding: 9px; background: #fbfcfd; }
    .tile strong { display: block; color: #5d6670; font-size: 12px; margin-bottom: 4px; }
    .badge { display: inline-flex; border-radius: 999px; color: #fff; padding: 4px 8px; font-size: 12px; font-weight: 800; }
    .ready { background: #047857; } .candidate { background: #2563eb; } .watch, .hold { background: #4f46e5; } .profit { background: #0f766e; } .exit { background: #c2410c; } .ban { background: #991b1b; }
    .muted { color: #5d6670; font-size: 14px; } .purpose { font-weight: 800; }
    .chart { width: 100%; max-width: 520px; height: auto; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; } th, td { border-top: 1px solid #d9dee3; padding: 8px; text-align: left; vertical-align: top; }
    td.num, th.num { text-align: right; white-space: nowrap; } td.ticker { font-weight: 800; white-space: nowrap; }
    ul { padding-left: 20px; } li { margin: 4px 0; }
    @media (max-width: 740px) { main { width: min(100% - 16px, 1120px); } .grid { grid-template-columns: 1fr; } h1 { font-size: 22px; } section, article, .hero { padding: 12px; } table { font-size: 12px; } }
  </style>
</head>
<body>
  <main>
    <div class="banner" data-report-warning>${escapeHtml(report.dataWarning)}</div>
    <div class="hero">
      <h1>?ㅻ뒛???곗씪由??몃젅?대뵫 ?붿빟</h1>
      <p class="purpose">${escapeHtml(PURPOSE)}</p>
      <p class="muted">?앹꽦 ?쒓컖: ${escapeHtml(report.generatedAt)}</p>
      <p><strong>?듭떖 吏덈Ц:</strong> ?꾩옱 媛寃⑹뿉???닿퉴, ?꾧? ????鍮꾩떥寃??ъ쨪 ???덈뒗媛?</p>
      <p class="muted">?댁뒪/?듭뀡/ETF 援ъ꽦醫낅ぉ ?뺤궛???ㅽ봽?덈뱶 ?곗씠?곕뒗 ?꾩쭅 誘몄뿰寃곗씠?? HIGH confidence???ъ슜?섏? ?딅뒗??</p>
    </div>
    ${renderMarketStatusHtml(report)}
    ${renderSplitConclusionHtml(report)}
    ${renderScoreGuideHtml()}
    <section><h2>?ㅻ뒛 ?덉씠 紐곕━???뚮쭏</h2>${htmlList(report.themes.slice(0, 6).map((row) => `${escapeHtml(row.theme)}: ${escapeHtml(row.tickers.slice(0, 6).join(", "))} | ?됯퇏 moneyFlowScore ${row.avgScore.toFixed(0)}`))}</section>
    <section><h2>1. ETF ?몃젅?대뵫 蹂닿퀬??/h2>
      <h3>1-1. ETF 寃곕줎</h3>
      ${htmlList([
        `ETF ?곗꽑 ?꾨낫: ${escapeHtml(report.etfActionCandidates.filter((row) => row.status === STATUS.ENTRY_READY).map((row) => row.ticker).join(", ") || "?놁쓬")}`,
        `ETF 愿李??꾨낫: ${escapeHtml(report.etfs.filter((row) => row.status === STATUS.WATCH).slice(0, 5).map((row) => row.ticker).join(", ") || "?놁쓬")}`,
        `ETF 留ㅻℓ 湲덉?: ${escapeHtml(report.etfBanRows.map((row) => row.ticker).join(", ") || "?놁쓬")}`,
        `?ㅻ뒛 ETF 理쒖슦??1媛? ${escapeHtml(etfBest ? `${etfBest.ticker} - ${etfBest.entryCondition}` : "?놁쓬")}`,
        "ETF ?뱀뀡 ?댁꽍: ???뱀뀡? 媛쒕퀎 醫낅ぉ ?좏깮???꾨땲???뚮쭏/?뱁꽣 ?⑥쐞???먭툑 ?먮쫫??ETF濡?留ㅻℓ?좎? ?먮떒?섍린 ?꾪븳 ?곸뿭?대떎."
      ])}
      <h3>1-2. ETF ?꾨낫 TOP 5</h3>${report.etfTop5.map(renderEtfHtml).join("") || "<p>?곗씠???놁쓬</p>"}
      <h3>1-3. ETF 怨쇱뿴/二쇱쓽 ?꾨낫</h3>${htmlList(report.etfOverheat.slice(0, 5).map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | ${escapeHtml(row.overheatingRisk)} | ${escapeHtml(row.overheatingReason)}`))}
      <h3>1-4. ETF ?쒖쇅/留ㅻℓ 湲덉? ?꾨낫</h3>${htmlList(report.etfBanRows.map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | ?ш??? ${escapeHtml(row.entryCondition)}`))}
    </section>
    <section><h2>2. 媛쒕퀎 醫낅ぉ ?몃젅?대뵫 蹂닿퀬??/h2>
      <h3>2-1. ?ㅻ뒛 Nasdaq-100 ?좉퇋 諛쒓뎬 ?붿빟</h3>
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
        "媛쒕퀎 醫낅ぉ ?뱀뀡 ?댁꽍: ???뱀뀡? ETF濡??뺤씤???뚮쭏 ?먭툑 ?먮쫫 ?덉뿉??ETF蹂대떎 ???섏? ?뚰뙆瑜?以????덈뒗 媛쒕퀎 醫낅ぉ留??좊퀎?섎뒗 ?곸뿭?대떎."
      ])}
      <h3>2-2. ?ㅻ뒛 媛쒕퀎 醫낅ぉ ?좉퇋 ?꾨낫 TOP 5</h3>${report.stockTop5.map(renderStockHtml).join("") || "<p>?곗씠???놁쓬</p>"}
      <h3>2-3. ?꾩씪 異붿쿇 醫낅ぉ ?먭?</h3>
      <p class="muted">???뱀뀡? ?ㅼ젣 怨꾩쥖 蹂댁쑀 醫낅ぉ???꾨땲???꾩씪 由ы룷?몄뿉???쒖떆??媛쒕퀎 醫낅ぉ ?꾨낫???ы썑 ?먭??대떎. ?ㅼ젣 蹂댁쑀 ?섎웾/?됰떒???낅젰?섏? ?딆븯?쇰?濡?怨꾩쥖 ?섏씡瑜좎씠 ?꾨땲??異붿쿇 湲곗????댄썑 媛寃?蹂?붾? 異붿쟻?쒕떎.</p>
      ${report.previousRecommendationReviews.length ? report.previousRecommendationReviews.map(renderPreviousReviewHtml).join("") : "<p>?꾩씪 異붿쿇 醫낅ぉ ?곗씠???놁쓬</p>"}
      <h3>2-4. ETF ?鍮?媛쒕퀎 醫낅ぉ ?먮떒 濡쒖쭅</h3>${htmlList(["愿??ETF??5??20???섏씡瑜좉낵 媛쒕퀎 醫낅ぉ??5??20???섏씡瑜좎쓣 鍮꾧탳?쒕떎.", "愿??ETF???곷? 嫄곕옒?됯낵 媛쒕퀎 醫낅ぉ???곷? 嫄곕옒?됱쓣 鍮꾧탳?쒕떎.", "媛쒕퀎 醫낅ぉ??愿??ETF蹂대떎 媛뺥븯硫?媛쒕퀎 醫낅ぉ ?곗꽑 媛?μ쑝濡?蹂몃떎.", "愿??ETF媛 ??媛뺥븯硫?媛쒕퀎 醫낅ぉ ???ETF瑜??곗꽑?쒕떎."])}
      <h3>2-5. 媛쒕퀎 醫낅ぉ ?쒖쇅/二쇱쓽 ?꾨낫</h3>${htmlList(report.stockCautionRows.map((row) => `${escapeHtml(row.ticker)} | moneyFlowScore ${row.moneyFlowScore} | ${escapeHtml(scoreOneLine(row))} | ?ш??? ${escapeHtml(row.entryCondition)}`))}
      <h3>Nasdaq-100 전체 moneyFlowScore(1차) 표</h3>${renderStockUniverseScoreHtml(report.stockUniverseScan)}
    </section>
    <section><h2>媛먯떆 ETF 紐⑸줉</h2>${renderEtfTable(report.etfs)}</section>
    <section><h2>3. 理쒖쥌 ?ㅽ뻾 ?먮떒</h2>
      <h3>3-1. ?ㅻ뒛 ?ㅼ젣濡?????/h3>
      ${htmlList([
        `ETF?먯꽌 ???? ${escapeHtml(etfBest ? `${etfBest.ticker} ?ы븿 ETF ?꾨낫???꾩씪 怨좎젏 ?뚰뙆? 5?쇱꽑 ?좎?瑜??뺤씤?쒕떎.` : "ETF ?꾨낫??愿李고븳??")}`,
        `媛쒕퀎 醫낅ぉ?먯꽌 ???? ${escapeHtml(stockBest ? `${stockBest.ticker} ?깆? 愿??ETF ?鍮??곷?媛뺣룄媛 ?좎??섎뒗吏 ?뺤씤?????뚮┝ ?먮뒗 ?뚰뙆 議곌굔?먯꽌留?寃?좏븳??` : "媛쒕퀎 醫낅ぉ? 愿??ETF ?鍮??곷?媛뺣룄 ?뺤씤 ?꾧퉴吏 愿李고븳??")}`,
        "?섏? 留먯븘?????? ETF? 媛쒕퀎 醫낅ぉ??媛숈? ?뚮쭏 ?덉뿉??以묐났 留ㅼ닔?섏? ?딅뒗??"
      ])}
      <h3>3-2. ?댁씪 ?뺤씤??議곌굔</h3>
      ${htmlList(["ETF ?뺤씤 議곌굔: ETF ?꾨낫 TOP 5媛 20?쇱꽑 ?꾩뿉???좎??섎뒗吏 ?뺤씤", "媛쒕퀎 醫낅ぉ ?뺤씤 議곌굔: 愿??ETF ?鍮?5??20???곷?媛뺣룄? ?곷? 嫄곕옒???좎? ?뺤씤", "?쒖옣 ?곹깭 ?뺤씤 議곌굔: QQQ/SPY??5??20??異붿꽭? ?꾪뿕?좏샇 ?좎? ?щ? ?뺤씤", "?곗씠??蹂닿컯 ?꾩슂 ??ぉ: ?댁뒪, ?듭뀡, ?ㅽ봽?덈뱶, ETF 援ъ꽦醫낅ぉ ?뺤궛?? ?ㅼ젣 蹂댁쑀 吏꾩엯媛"])}
    </section>
    <section><h2>?곗씠???섏쭛 ?곹깭</h2>${renderDataCollectionHtml(report)}</section>
  </main>
</body>
</html>`;
}

function renderMarketStatusHtml(report) {
  return `<section><h2>0. 시장 상태</h2><div class="grid">
    ${tile("데이터 모드", report.dataMode)}
    ${tile("가격/거래량", statusLabel(report.dataConnectionStatus.priceVolume))}
    ${tile("뉴스", statusLabel(report.dataConnectionStatus.news))}
    ${tile("옵션", statusLabel(report.dataConnectionStatus.options))}
    ${tile("ETF 구성종목 확산도", statusLabel(report.dataConnectionStatus.etfBreadth))}
    ${tile("스프레드/유동성", statusLabel(report.dataConnectionStatus.liquiditySpread))}
    ${tile("생성 시각", report.generatedAt)}
    ${tile("시장 상태", report.marketLabel)}
    ${tile("오늘 돈의 방향", moneyDirection(report))}
    ${tile("강한 테마 TOP 3", report.themes.slice(0, 3).map((row) => `${row.theme}(${row.avgScore.toFixed(0)})`).join(", ") || "데이터 없음")}
    ${tile("오늘의 원칙", "ETF는 테마 자금 흐름, 개별 종목은 ETF보다 강할 때만 우선")}
  </div>${htmlList(["API 또는 provider 상태에 따라 보조 데이터 반영 범위가 달라진다.", "수집 실패 데이터는 점수 반영에서 제외하거나 confidence를 제한한다.", "reasonConfidence HIGH는 보조 데이터가 충분히 연결된 후보에만 사용한다."])}</section>`;
}

function renderSplitConclusionHtml(report) {
  return `<section><h2>오늘의 분리 결론</h2><div class="grid">
    ${tile("ETF 행동 후보", report.etfActionCandidates.map((row) => row.ticker).join(", ") || "없음")}
    ${tile("개별 종목 행동 후보", report.stockActionCandidates.map((row) => row.ticker).join(", ") || "없음")}
    ${tile("Nasdaq-100 신규 스캔 결과", `${report.stockScanSummary.total}개 중 ${report.stockActionCandidates.length}개 후보, 제외 ${report.stockScanSummary.failed + report.stockScanSummary.ban}개`)}
    ${tile("전일 추천 종목 점검", `${report.previousRecommendationReviews.length}개 대상 / 유지 ${report.previousRecommendationReviews.filter((row) => row.todayStatus === "유지").length} / 무효화 ${report.previousRecommendationReviews.filter((row) => row.todayStatus === "무효화").length}`)}
    ${tile("ETF 우선 테마", report.etfTop5.slice(0, 3).map((row) => row.categoryType).filter((value, index, arr) => arr.indexOf(value) === index).join(", ") || "데이터 없음")}
    ${tile("개별 종목 우선 테마", report.stockActionCandidates.filter((row) => row.stockVsEtfDecision === "STOCK_PREFERRED").map((row) => row.primaryTheme).filter(Boolean).join(", ") || "관련 ETF 대비 추가 확인 필요")}
    ${tile("오늘 최우선 실행 후보", report.topExecutionCandidate ? `${report.topExecutionCandidate.ticker} - ${report.topExecutionCandidate.explanation}` : "조건 충족 후보 없음")}
    ${tile("하지 말아야 할 것", "추격 매수 금지 / 신규 후보와 전일 추천 점검을 같은 의미로 섞지 않기")}
  </div></section>`;
}

function renderScoreGuideHtml() {
  return `<section><h2>moneyFlowScore 산정 방식</h2>
    <h3>score의 의미</h3>
    <p>moneyFlowScore는 매수 추천 점수가 아니라 현재 ETF 또는 종목으로 돈이 몰리는 정도를 추적하는 트레이딩 후보 점수다.</p>
    <h3>계산 구조</h3>
    ${htmlList([
      "moneyFlowScore(1차) = 추세 + 단기 모멘텀 + 중기 모멘텀 + 거래량 + 신고가 근접 + 이동평균",
      "moneyFlowScore(최종 원점수) = moneyFlowScore(1차) + 뉴스 + 옵션 + ETF 확산도 + 유동성 + 관련 ETF 대비 상대강도 + 리스크 패널티",
      "moneyFlowScore(최종 표시 점수) = min(100, max(0, 최종 원점수))",
      "리스크 패널티는 음수로 저장하고 계산식에 그대로 더한다.",
      "최종 표시 점수가 같으면 최종 원점수를 tie-breaker로 사용한다."
    ])}
    <h3>점수 구간 해석</h3>
    ${htmlList(["80점 이상: 강한 자금 유입 후보", "65~79점: 관심 후보", "50~64점: 관찰 후보", "50점 미만: 매매 금지 또는 우선순위 낮음"])}
    <p><strong>주의:</strong> 점수가 높아도 진입 조건, 무효화 조건, 리스크 패널티 근거를 함께 확인해야 한다.</p>
  </section>`;
}

function renderActionHtml(row) {
  return `<article data-action-card="${escapeHtml(row.ticker)}"><h3>${row.rank}. [${escapeHtml(row.ticker)}] ${escapeHtml(row.name || row.ticker)} ${badge(row.status)}</h3>
    <div class="grid">${tile("?먯궛 ?좏삎", row.assetType)}${tile("moneyFlowScore(최종)", row.moneyFlowScoreFinal ?? row.moneyFlowScore)}${tile("reasonConfidence", row.reasonConfidence)}</div>
    ${fieldList(row)}
    ${chartImage(row)}
  </article>`;
}

function renderEtfHtml(row) {
  return `<article data-etf-card="${escapeHtml(row.ticker)}"><h3>[ETF ${escapeHtml(row.ticker)}] ${escapeHtml(row.name)} ${badge(row.status)}</h3>
    <div class="grid">${tile("자산 유형", "ETF")}${tile("ETF 세부 카테고리", row.etfCategory)}${tile("ETF 역할", row.etfRole)}${tile("moneyFlowScore(최종)", row.moneyFlowScoreFinal ?? row.moneyFlowScore)}${tile("과열 리스크", row.overheatingRisk)}${tile("reasonConfidence", row.reasonConfidence)}${tile("todayActionLabel", row.todayActionLabel)}${tile("데이터", row.market.dataStatus)}</div>
    ${scoreBreakdownHtml(row)}
    ${supplementalDetailsHtml(row)}
    ${fieldList(row)}
    ${chartImage(row)}
    <p class="muted">${escapeHtml(marketLine(row.market))}</p>
  </article>`;
}

function renderStockHtml(row) {
  return `<article data-stock-card="${escapeHtml(row.ticker)}"><h3>[${escapeHtml(row.ticker)}] ${escapeHtml(row.name)} ${badge(row.status)}</h3>
    <div class="grid">${tile("자산 유형", "STOCK")}${tile("primaryTheme", row.primaryTheme || "데이터 없음")}${tile("relatedEtfs", row.relatedEtfs.map((etf) => etf.ticker).join(", ") || "관련 ETF 데이터 부족")}${tile("moneyFlowScore(최종)", row.moneyFlowScoreFinal ?? row.moneyFlowScore)}${tile("reasonConfidence", row.reasonConfidence)}${tile("todayActionLabel", row.todayActionLabel)}${tile("ETF 대비 상대강도", row.relativeStrengthVsEtf)}</div>
    ${scoreBreakdownHtml(row)}
    ${supplementalDetailsHtml(row)}
    ${fieldList(row)}
    ${htmlList([`<strong>??ETF媛 ?꾨땲????醫낅ぉ?멸??</strong> ${escapeHtml(row.whyStockOverEtf)}`, `<strong>ETF媛 ???섏? 寃쎌슦</strong> ${escapeHtml(row.whenEtfIsBetter)}`])}
    ${row.holdingInfo ? `<p class="muted">${escapeHtml(row.holdingInfo)}</p>` : ""}
    ${chartImage(row)}
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
  if (!scan) return "<p>Nasdaq-100 ?꾩껜 ?ㅼ틪 ?곗씠???놁쓬</p>";
  const failures = scan.results.filter((row) => row.scanStatus !== "OK");
  return `<p>이 표는 Nasdaq-100 전체 구성종목을 가격/거래량/추세 중심으로 빠르게 스캔한 moneyFlowScore(1차) 결과다. 뉴스, 옵션, 유동성, 관련 ETF 대비 상대강도, 리스크 패널티를 모두 반영한 최종 추천 점수는 Top5 카드의 moneyFlowScore(최종)에서 확인한다.</p>
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
    <h4>?곸쐞 20媛??붿빟</h4>
    <div class="table-scroll">${stockScoreTableHtml(scan.results.slice(0, 20))}</div>
    <details>
      <summary><strong>Nasdaq-100 전체 moneyFlowScore(1차) 표 펼치기</strong></summary>
      <div class="table-scroll">${stockScoreTableHtml(scan.results)}</div>
    </details>
    <h4>?곗씠???섏쭛 ?ㅽ뙣 醫낅ぉ</h4>
    ${htmlList(failures.length ? failures.map((row) => `${escapeHtml(row.ticker)}: ${escapeHtml(row.failureReason || "score calculation failed")}`) : ["?곗씠???섏쭛 ?ㅽ뙣 醫낅ぉ ?놁쓬"])}`;
}

function stockScoreTableHtml(rows) {
  return `<table data-stock-universe-table><thead><tr><th class="num">순위</th><th>티커</th><th>이름</th><th class="num">moneyFlowScore(1차)</th><th class="num">최종 표시 점수</th><th class="num">최종 원점수</th><th>점수 구간</th><th>오늘 판단</th><th>신뢰도</th><th class="num">1일</th><th class="num">5일</th><th class="num">20일</th><th class="num">상대 거래량</th><th>관련 ETF</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td class="num">${index + 1}</td><td class="ticker">${escapeHtml(row.ticker)}</td><td>${escapeHtml(row.name || row.ticker)}</td><td class="num">${row.moneyFlowScoreInitial ?? row.moneyFlowScore ?? "N/A"}</td><td class="num">${row.moneyFlowScoreFinal ?? "-"}</td><td class="num">${row.finalRawScore ?? "-"}</td><td>${escapeHtml(row.scoreBandLabel || "-")}</td><td>${escapeHtml(row.todayActionLabel || "-")}</td><td>${escapeHtml(row.reasonConfidence || "-")}</td><td class="num">${escapeHtml(pctOrDash(row.oneDayReturn))}</td><td class="num">${escapeHtml(pctOrDash(row.fiveDayReturn))}</td><td class="num">${escapeHtml(pctOrDash(row.twentyDayReturn))}</td><td class="num">${row.relativeVolume === null || row.relativeVolume === undefined ? "-" : escapeHtml(num(row.relativeVolume, 2))}</td><td>${escapeHtml((row.relatedEtfs || []).join(", ") || "-")}</td></tr>`).join("")}</tbody></table>`;
}

function supplementalDetailsHtml(row) {
  return `<details>
    <summary><strong>?곗씠???ъ슜 ?꾪솴怨?蹂댁“ ?곗씠??/strong></summary>
    <h4>?곗씠???ъ슜 ?꾪솴</h4>${htmlList(dataUsageHtmlItems(row))}
    <h4>?댁뒪 ?뺤씤</h4>${htmlList(newsHtmlItems(row.newsSummary))}
    <h4>?듭뀡 ?섍툒</h4>${htmlList(optionsHtmlItems(row.optionsSummary))}
    <h4>ETF 援ъ꽦醫낅ぉ ?뺤궛??/h4>${row.assetType === "ETF" ? htmlList(etfBreadthHtmlItems(row.etfBreadthSummary)) : htmlList(["愿??ETF?먯꽌 ?뺤씤"])}
    <h4>?좊룞???ㅽ봽?덈뱶</h4>${htmlList(liquidityHtmlItems(row.liquiditySummary))}
    <h4>reasonConfidence 洹쇨굅</h4><p class="muted">${escapeHtml(confidenceReason(row))}</p>
  </details>`;
}

function dataUsageHtmlItems(row) {
  return dataUsageMarkdown(row).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function newsHtmlItems(summary) {
  return newsMarkdown(summary).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function optionsHtmlItems(summary) {
  return optionsMarkdown(summary).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function etfBreadthHtmlItems(summary) {
  return etfBreadthMarkdown(summary).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function liquidityHtmlItems(summary) {
  return liquidityMarkdown(summary).split("\n").map((line) => escapeHtml(line.replace(/^\s*-\s*/, "")));
}

function fieldList(row) {
  return htmlList([
    `<strong>기준일</strong> ${escapeHtml(row.market?.dataDate || "데이터 없음")} / <strong>종가:</strong> ${escapeHtml(price(row.market?.lastClose))} / <strong>1일</strong> ${escapeHtml(pct(row.market?.dailyChangePct))} / <strong>5일</strong> ${escapeHtml(pct(row.market?.return5dPct))} / <strong>20일</strong> ${escapeHtml(pct(row.market?.return20dPct))} / <strong>상대 거래량</strong> ${escapeHtml(num(row.market?.relativeVolume, 2))}배`,
    `<strong>whyMoneyIsFlowing:</strong> ${escapeHtml(row.whyMoneyIsFlowing)}`,
    `<strong>likelyNextBuyer:</strong> ${escapeHtml(row.likelyNextBuyer)}`,
    `<strong>whyThisCouldTradeHigher:</strong> ${escapeHtml(row.whyThisCouldTradeHigher)}`,
    `<strong>吏꾩엯 議곌굔:</strong> ${escapeHtml(row.entryCondition)}`,
    `<strong>臾댄슚??議곌굔:</strong> ${escapeHtml(row.invalidationCondition)}`,
    `<strong>李⑦듃 ?붿빟:</strong> ${escapeHtml(row.chartSummary)}`
  ]);
}

function scoreBreakdownHtml(row) {
  const b = row.moneyFlowScoreBreakdown;
  if (!b) return "<p>moneyFlowScore ?곗젙 洹쇨굅: ?곗씠???놁쓬</p>";
  const relative = row.assetType === "STOCK" ? `${tile("ETF 대비 상대강도", signed(b.relativeStrengthScore ?? 0))}` : "";
  const breadth = row.assetType === "ETF" ? `${tile("ETF 확산도", signed(b.etfBreadthScore ?? 0))}` : "";
  return `<details open>
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
      ${tile("뉴스", signed(b.newsScore))}
      ${tile("옵션", signed(b.optionsScore))}
      ${breadth}
      ${tile("유동성", signed(b.liquidityScore))}
      ${relative}
      ${tile("리스크 패널티", signed(b.riskPenalty))}
    </div>
    <p class="muted"><strong>계산식:</strong> ${escapeHtml(b.formulaText || "")}</p>
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
  return `<table><thead><tr><th>?곗빱</th><th>移댄뀒怨좊━</th><th>moneyFlowScore</th><th>?곹깭</th><th>reasonConfidence</th><th>??以??댁쑀</th></tr></thead><tbody>${etfs.map((row) => `<tr><td>${escapeHtml(row.ticker)}</td><td>${escapeHtml(row.categoryType)}</td><td>${row.moneyFlowScore}</td><td>${badge(row.status)}</td><td>${escapeHtml(row.reasonConfidence)}</td><td>${escapeHtml(row.whyMoneyIsFlowing)}</td></tr>`).join("")}</tbody></table>`;
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

