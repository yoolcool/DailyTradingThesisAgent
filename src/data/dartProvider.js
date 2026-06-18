const { disabledStatus, failedStatus, fetchJson } = require("./providerUtils");

const MATERIAL_REPORT_KEYWORDS = [
  "주요사항보고서",
  "단일판매",
  "공급계약",
  "잠정실적",
  "영업실적",
  "자기주식",
  "유상증자",
  "무상증자",
  "전환사채",
  "신주인수권",
  "최대주주",
  "투자판단",
  "합병",
  "분할",
  "소송",
  "시설투자"
];

const POSITIVE_KEYWORDS = ["공급계약", "수주", "자기주식", "실적", "증가", "투자", "취득"];
const NEGATIVE_KEYWORDS = ["소송", "감소", "손상", "횡령", "배임", "유상증자", "전환사채", "불성실"];
let recentDartRowsPromise = null;

function dartTicker(ticker) {
  const value = String(ticker || "").trim();
  const match = value.match(/^(\d{6})/);
  return match ? match[1] : value;
}

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function classifyDirection(title) {
  const text = String(title || "");
  const positive = POSITIVE_KEYWORDS.some((keyword) => text.includes(keyword));
  const negative = NEGATIVE_KEYWORDS.some((keyword) => text.includes(keyword));
  if (positive && negative) return "mixed";
  if (positive) return "positive";
  if (negative) return "negative";
  return "neutral";
}

function eventType(title) {
  const text = String(title || "");
  if (text.includes("단일판매") || text.includes("공급계약")) return "contract";
  if (text.includes("잠정실적") || text.includes("영업실적")) return "earnings";
  if (text.includes("자기주식")) return "buyback";
  if (text.includes("유상증자") || text.includes("전환사채") || text.includes("신주인수권")) return "financing";
  if (text.includes("투자") || text.includes("시설")) return "capex";
  if (text.includes("합병") || text.includes("분할")) return "restructuring";
  if (text.includes("최대주주")) return "ownership";
  return "filing";
}

function isMaterial(title) {
  return MATERIAL_REPORT_KEYWORDS.some((keyword) => String(title || "").includes(keyword));
}

function normalizeDartItem(row, ticker) {
  const title = row.report_nm || "";
  const direction = classifyDirection(title);
  const publishedAt = row.rcept_dt
    ? `${String(row.rcept_dt).slice(0, 4)}-${String(row.rcept_dt).slice(4, 6)}-${String(row.rcept_dt).slice(6, 8)}T00:00:00.000+09:00`
    : null;
  return {
    id: `DART:${row.rcept_no || `${ticker}:${title}`}`,
    source: "DART",
    sourceTier: "official",
    sourceType: "official_filing",
    title,
    summary: row.corp_name ? `${row.corp_name} ${title}` : title,
    url: row.rcept_no ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(row.rcept_no)}` : "",
    publishedAt,
    tickers: [ticker],
    relatedThemes: [],
    eventType: eventType(title),
    directness: "direct_ticker",
    direction,
    freshnessBucket: "under_72h",
    sentimentScore: direction === "positive" ? 1 : direction === "negative" ? -1 : 0,
    priceReactionAfterNews: "unknown",
    confidence: isMaterial(title) ? "HIGH" : "MEDIUM",
    dedupeKey: row.rcept_no || `${ticker}:${title}`,
    relevanceScore: isMaterial(title) ? 3 : 1,
    directnessScore: 4,
    freshnessScore: 2,
    strongCatalyst: isMaterial(title)
  };
}

function summarizeDart(ticker, items, providerStatus = "CONNECTED", notes = [], sourceStatuses = []) {
  const positive = items.filter((item) => item.direction === "positive").length;
  const negative = items.filter((item) => item.direction === "negative").length;
  const neutral = items.length - positive - negative;
  const lastPublishedTimestamp = items
    .map((item) => Date.parse(item.publishedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const directCatalyst = items.find((item) => item.strongCatalyst) || items[0];
  const directionScore = positive > negative ? 1 : negative > positive ? -1 : 0;
  const rawNewsScore = directCatalyst
    ? 4 + Math.min(4, items.filter((item) => item.strongCatalyst).length * 2) + directionScore
    : 0;
  return {
    ticker,
    status: providerStatus,
    source: "DART",
    sourceStatuses,
    fetchedAt: new Date().toISOString(),
    lastPublishedAt: lastPublishedTimestamp ? new Date(lastPublishedTimestamp).toISOString() : null,
    items,
    itemCount: items.length,
    sentimentCounts: { positive, neutral, negative },
    headlineSummary: directCatalyst?.title || "의미 있는 신규 DART 공시 없음",
    directnessScore: directCatalyst ? 4 : 0,
    directionScore,
    freshnessScore: directCatalyst ? 2 : 0,
    strongCatalystCount: items.filter((item) => item.strongCatalyst).length,
    directCatalyst,
    rawNewsScore,
    newsScore: Math.max(-6, Math.min(12, rawNewsScore)),
    notes: items.length ? notes : [...notes, "해당 티커의 의미 있는 신규 DART 공시가 없거나 API 결과가 비어 있음"]
  };
}

async function fetchDartDisclosuresForTicker(ticker) {
  const token = process.env.DART_API_KEY || process.env.OPENDART_API_KEY;
  if (!token) {
    return summarizeDart(
      ticker,
      [],
      "DISABLED",
      ["DART_API_KEY not configured"],
      [{ source: "DART", status: "DISABLED" }]
    );
  }
  const end = new Date();
  const start = new Date(Date.now() - 7 * 86400000);
  try {
    const payloads = await fetchRecentDartPayloads(token, start, end);
    const rows = payloads.flatMap((payload) => Array.isArray(payload.list) ? payload.list : []);
    const stockCode = dartTicker(ticker);
    const items = rows
      .filter((row) => String(row.stock_code || "") === stockCode)
      .map((row) => normalizeDartItem(row, ticker))
      .filter((item) => item.title)
      .slice(0, 16);
    const failedPayload = payloads.find((payload) => payload.status && payload.status !== "000");
    const status = items.length ? "CONNECTED" : failedPayload ? "PARTIAL" : "CONNECTED";
    const notes = failedPayload ? [`DART status ${failedPayload.status}: ${failedPayload.message || "unknown"}`] : [];
    return summarizeDart(ticker, items, status, notes, [{ source: "DART", status }]);
  } catch (error) {
    return summarizeDart(ticker, [], "FAILED", failedStatus("DART", error).notes, [{ source: "DART", status: "FAILED" }]);
  }
}

async function fetchRecentDartPayloads(token, start, end) {
  if (recentDartRowsPromise) return recentDartRowsPromise;
  recentDartRowsPromise = (async () => {
    const payloads = [];
    for (let page = 1; page <= 5; page += 1) {
      const url = [
        "https://opendart.fss.or.kr/api/list.json",
        `?crtfc_key=${encodeURIComponent(token)}`,
        `&bgn_de=${yyyymmdd(start)}`,
        `&end_de=${yyyymmdd(end)}`,
        `&page_no=${page}`,
        "&page_count=100"
      ].join("");
      const payload = await fetchJson(url, { timeoutMs: 10000 });
      payloads.push(payload);
      const totalPage = Number(payload.total_page || 1);
      if (!Number.isFinite(totalPage) || page >= totalPage) break;
    }
    return payloads;
  })();
  return recentDartRowsPromise;
}

module.exports = {
  fetchDartDisclosuresForTicker,
  summarizeDart
};
