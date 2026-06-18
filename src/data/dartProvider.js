const { failedStatus, fetchJson } = require("./providerUtils");

const LOOKBACK_DAYS = 14;
const MAX_PAGES = 8;

const EVENT_RULES = [
  {
    type: "contract",
    label: "공급계약/수주",
    keywords: ["단일판매", "공급계약", "판매ㆍ공급계약", "수주"],
    direction: "positive",
    materialityScore: 5
  },
  {
    type: "earnings",
    label: "잠정실적/영업실적",
    keywords: ["잠정실적", "영업실적", "매출액", "손익구조"],
    direction: "positive",
    materialityScore: 5
  },
  {
    type: "buyback",
    label: "자사주/주주환원",
    keywords: ["자기주식", "취득", "소각", "배당"],
    direction: "positive",
    materialityScore: 4
  },
  {
    type: "capex",
    label: "시설투자/CAPEX",
    keywords: ["시설투자", "신규시설", "투자결정"],
    direction: "positive",
    materialityScore: 4
  },
  {
    type: "mna",
    label: "합병/분할/M&A",
    keywords: ["합병", "분할", "영업양수", "영업양도", "타법인주식"],
    direction: "mixed",
    materialityScore: 4
  },
  {
    type: "ownership",
    label: "최대주주/지분변동",
    keywords: ["최대주주", "주식등의대량보유", "임원ㆍ주요주주"],
    direction: "mixed",
    materialityScore: 3
  },
  {
    type: "financing",
    label: "증자/CB/BW",
    keywords: ["유상증자", "전환사채", "신주인수권", "교환사채"],
    direction: "negative",
    materialityScore: 4
  },
  {
    type: "risk",
    label: "소송/제재/거래위험",
    keywords: ["소송", "횡령", "배임", "상장적격성", "거래정지", "불성실공시", "감사의견"],
    direction: "negative",
    materialityScore: 5
  },
  {
    type: "filing",
    label: "정기/기타공시",
    keywords: ["분기보고서", "반기보고서", "사업보고서", "주요사항보고서"],
    direction: "neutral",
    materialityScore: 2
  }
];

const POSITIVE_WORDS = ["증가", "흑자", "취득", "수주", "공급계약", "배당", "소각", "투자"];
const NEGATIVE_WORDS = ["감소", "적자", "손실", "유상증자", "전환사채", "소송", "횡령", "배임", "거래정지", "불성실"];

let recentDartRowsPromise = null;

function dartTicker(ticker) {
  const value = String(ticker || "").trim();
  const match = value.match(/^(\d{6})/);
  return match ? match[1] : value;
}

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function firstMatchingRule(title) {
  const text = String(title || "");
  return EVENT_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword))) || EVENT_RULES.at(-1);
}

function classifyDirection(title, rule) {
  const text = String(title || "");
  const positive = POSITIVE_WORDS.some((keyword) => text.includes(keyword));
  const negative = NEGATIVE_WORDS.some((keyword) => text.includes(keyword));
  if (positive && negative) return "mixed";
  if (negative) return "negative";
  if (positive) return "positive";
  return rule.direction;
}

function freshnessBucket(publishedAt) {
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return "under_72h";
  const ageHours = (Date.now() - timestamp) / 36e5;
  if (ageHours <= 6) return "under_6h";
  if (ageHours <= 24) return "under_24h";
  if (ageHours <= 72) return "under_72h";
  return "stale";
}

function publishedAtFromRow(row) {
  if (!row.rcept_dt) return null;
  const value = String(row.rcept_dt);
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000+09:00`;
}

function normalizeDartItem(row, ticker) {
  const title = row.report_nm || "";
  const rule = firstMatchingRule(title);
  const direction = classifyDirection(title, rule);
  const publishedAt = publishedAtFromRow(row);
  const strongCatalyst = rule.materialityScore >= 4 && direction !== "neutral";
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
    eventType: rule.type,
    eventLabel: rule.label,
    materialityScore: rule.materialityScore,
    directness: "direct_ticker",
    direction,
    freshnessBucket: freshnessBucket(publishedAt),
    sentimentScore: direction === "positive" ? 1 : direction === "negative" ? -1 : 0,
    priceReactionAfterNews: "unknown",
    confidence: rule.materialityScore >= 4 ? "HIGH" : rule.materialityScore >= 3 ? "MEDIUM" : "LOW",
    dedupeKey: row.rcept_no || `${ticker}:${title}`,
    relevanceScore: rule.materialityScore,
    directnessScore: 4,
    freshnessScore: 2,
    strongCatalyst,
    riskFlag: direction === "negative"
  };
}

function rankDartItem(item) {
  const directionBonus = item.direction === "positive" ? 2 : item.direction === "negative" ? 1 : 0;
  const freshness = { under_6h: 4, under_24h: 3, under_72h: 2, stale: 0 }[item.freshnessBucket] || 0;
  return item.materialityScore * 10 + directionBonus + freshness;
}

function summarizeDart(ticker, items, providerStatus = "CONNECTED", notes = [], sourceStatuses = []) {
  const sortedItems = [...items].sort((a, b) => rankDartItem(b) - rankDartItem(a));
  const positive = sortedItems.filter((item) => item.direction === "positive").length;
  const negative = sortedItems.filter((item) => item.direction === "negative").length;
  const neutral = sortedItems.length - positive - negative;
  const materialItems = sortedItems.filter((item) => item.materialityScore >= 4);
  const lastPublishedTimestamp = sortedItems
    .map((item) => Date.parse(item.publishedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const directCatalyst = materialItems[0] || sortedItems[0];
  const directionScore = positive > negative ? 1 : negative > positive ? -1 : 0;
  const materialityBonus = directCatalyst ? Math.min(6, Number(directCatalyst.materialityScore || 0)) : 0;
  const strongCatalystCount = materialItems.length;
  const rawNewsScore = directCatalyst
    ? directionScore < 0
      ? -4 - Math.min(3, negative) - Math.min(2, materialityBonus / 2)
      : 3 + materialityBonus + Math.min(3, strongCatalystCount) + directionScore
    : 0;
  return {
    ticker,
    status: providerStatus,
    source: "DART",
    sourceStatuses,
    fetchedAt: new Date().toISOString(),
    lastPublishedAt: lastPublishedTimestamp ? new Date(lastPublishedTimestamp).toISOString() : null,
    items: sortedItems,
    itemCount: sortedItems.length,
    sentimentCounts: { positive, neutral, negative },
    headlineSummary: directCatalyst?.title || "의미 있는 신규 DART 공시 없음",
    directnessScore: directCatalyst ? 4 : 0,
    directionScore,
    freshnessScore: directCatalyst ? 2 : 0,
    strongCatalystCount,
    materialDisclosureCount: materialItems.length,
    directCatalyst,
    rawNewsScore,
    newsScore: Math.max(-8, Math.min(14, rawNewsScore)),
    notes: sortedItems.length ? notes : [...notes, "해당 티커의 신규 DART 공시가 없거나 API 결과가 비어 있음"]
  };
}

async function fetchDartDisclosuresForTicker(ticker) {
  const token = process.env.DART_API_KEY || process.env.OPENDART_API_KEY;
  if (!token) {
    return summarizeDart(
      ticker,
      [],
      "DISABLED",
      ["DART_API_KEY 또는 OPENDART_API_KEY not configured"],
      [{ source: "DART", status: "DISABLED" }]
    );
  }
  const end = new Date();
  const start = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
  try {
    const payloads = await fetchRecentDartPayloads(token, start, end);
    const rows = payloads.flatMap((payload) => Array.isArray(payload.list) ? payload.list : []);
    const stockCode = dartTicker(ticker);
    const items = rows
      .filter((row) => String(row.stock_code || "") === stockCode)
      .map((row) => normalizeDartItem(row, ticker))
      .filter((item) => item.title)
      .slice(0, 24);
    const failedPayload = payloads.find((payload) => payload.status && !["000", "013"].includes(String(payload.status)));
    const status = failedPayload ? "PARTIAL" : "CONNECTED";
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
    for (let page = 1; page <= MAX_PAGES; page += 1) {
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
