const crypto = require("crypto");
const { failedStatus, fetchText } = require("./providerUtils");

const LOOKBACK_DAYS = 14;
const POSITIVE_WORDS = ["상승", "강세", "수주", "계약", "공급", "실적", "호조", "흑자", "증가", "개선", "투자", "증설", "목표가", "상향"];
const NEGATIVE_WORDS = ["하락", "약세", "적자", "감소", "부진", "소송", "리콜", "압수수색", "하향", "유상증자", "경고", "중단"];
const STRONG_CATALYST_WORDS = ["수주", "계약", "공급", "실적", "영업이익", "투자", "증설", "합병", "인수", "매각", "목표가", "상향"];

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return decodeEntities(String(value || "")).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractTag(raw, tag) {
  const cdata = raw.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"))?.[1];
  if (cdata) return cdata;
  return raw.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "";
}

function hash(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex").slice(0, 16);
}

function normalizeDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function freshnessBucket(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "stale";
  const ageHours = (Date.now() - timestamp) / 36e5;
  if (ageHours <= 6) return "under_6h";
  if (ageHours <= 24) return "under_24h";
  if (ageHours <= 72) return "under_72h";
  return "stale";
}

function freshnessScore(value) {
  return { under_6h: 4, under_24h: 3, under_72h: 2, stale: 0 }[value] || 0;
}

function classifyDirection(text) {
  const positive = POSITIVE_WORDS.some((word) => text.includes(word));
  const negative = NEGATIVE_WORDS.some((word) => text.includes(word));
  if (positive && negative) return "mixed";
  if (positive) return "positive";
  if (negative) return "negative";
  return "neutral";
}

function classifyEventType(text) {
  if (text.includes("실적") || text.includes("영업이익") || text.includes("매출")) return "earnings";
  if (text.includes("수주") || text.includes("계약") || text.includes("공급")) return "contract";
  if (text.includes("투자") || text.includes("증설")) return "capex";
  if (text.includes("목표가") || text.includes("상향") || text.includes("하향")) return text.includes("하향") ? "analyst_downgrade" : "analyst_upgrade";
  if (text.includes("합병") || text.includes("인수") || text.includes("매각")) return "mna";
  if (text.includes("유상증자") || text.includes("전환사채")) return "offering";
  if (text.includes("소송") || text.includes("리콜") || text.includes("압수수색")) return "risk";
  return "general_market";
}

function relevanceScore(text, companyName) {
  let score = 0;
  if (companyName && text.includes(companyName)) score += 5;
  for (const word of [...POSITIVE_WORDS, ...NEGATIVE_WORDS, ...STRONG_CATALYST_WORDS]) {
    if (text.includes(word)) score += 1;
  }
  return score;
}

function normalizeNewsItem(input, ticker, companyName) {
  const text = `${input.title || ""} ${input.summary || ""}`;
  const publishedAt = normalizeDate(input.publishedAt);
  const fresh = freshnessBucket(publishedAt);
  const eventType = classifyEventType(text);
  const direction = classifyDirection(text);
  const directness = companyName && text.includes(companyName) ? "direct_ticker" : "sector_theme";
  const strongCatalyst = STRONG_CATALYST_WORDS.some((word) => text.includes(word));
  const relevance = relevanceScore(text, companyName);
  const dedupeKey = `${input.title}|${input.source}|${publishedAt || ""}`;
  return {
    id: `KOREAN_NEWS:${hash(dedupeKey)}`,
    source: input.source || "Google News RSS",
    sourceTier: "tier2",
    sourceType: "korean_news_search",
    title: input.title,
    summary: input.summary,
    url: input.url,
    publishedAt,
    tickers: [ticker],
    relatedThemes: [],
    eventType,
    eventLabel: koreanEventLabel(eventType),
    directness,
    direction,
    freshnessBucket: fresh,
    sentimentScore: direction === "positive" ? 1 : direction === "negative" ? -1 : 0,
    priceReactionAfterNews: "unknown",
    confidence: directness === "direct_ticker" && fresh !== "stale" ? "MEDIUM" : "LOW",
    dedupeKey,
    relevanceScore: relevance,
    directnessScore: directness === "direct_ticker" ? 4 : 2,
    freshnessScore: freshnessScore(fresh),
    strongCatalyst
  };
}

function koreanEventLabel(value) {
  return {
    earnings: "실적",
    contract: "계약/수주",
    capex: "투자/증설",
    analyst_upgrade: "목표가/의견 상향",
    analyst_downgrade: "목표가/의견 하향",
    mna: "M&A",
    offering: "자금조달",
    risk: "리스크",
    general_market: "시장 일반"
  }[value] || "일반 뉴스";
}

function parseGoogleNewsRss(xml, ticker, companyName) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
    .slice(0, 12)
    .map((match) => {
      const title = stripTags(extractTag(match[1], "title"));
      return normalizeNewsItem({
        title,
        summary: stripTags(extractTag(match[1], "description")),
        url: stripTags(extractTag(match[1], "link")),
        publishedAt: stripTags(extractTag(match[1], "pubDate")),
        source: title.includes(" - ") ? title.split(" - ").at(-1) : "Google News RSS"
      }, ticker, companyName);
    })
    .filter((item) => item.title && (item.directness === "direct_ticker" || item.relevanceScore >= 3))
    .sort((a, b) => rankNewsItem(b) - rankNewsItem(a));
}

function rankNewsItem(item) {
  return item.directnessScore * 20 + item.freshnessScore * 5 + item.relevanceScore * 3 + (item.strongCatalyst ? 12 : 0);
}

function summarizeKoreanNews(ticker, items, providerStatus = "CONNECTED", notes = [], sourceStatuses = []) {
  const sortedItems = [...items].sort((a, b) => rankNewsItem(b) - rankNewsItem(a));
  const positive = sortedItems.filter((item) => item.direction === "positive").length;
  const negative = sortedItems.filter((item) => item.direction === "negative").length;
  const neutral = sortedItems.length - positive - negative;
  const directCatalyst = sortedItems.find((item) => item.directness === "direct_ticker" && item.strongCatalyst) || sortedItems[0];
  const directionScore = positive > negative ? 1 : negative > positive ? -1 : 0;
  const lastPublishedTimestamp = sortedItems
    .map((item) => Date.parse(item.publishedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const rawNewsScore = directCatalyst ? Math.max(-4, Math.min(8, directionScore + directCatalyst.directnessScore + directCatalyst.freshnessScore + (directCatalyst.strongCatalyst ? 2 : 0))) : 0;
  return {
    ticker,
    status: providerStatus,
    source: "Google News RSS",
    sourceStatuses,
    fetchedAt: new Date().toISOString(),
    lastPublishedAt: lastPublishedTimestamp ? new Date(lastPublishedTimestamp).toISOString() : null,
    items: sortedItems.slice(0, 8),
    itemCount: sortedItems.length,
    sentimentCounts: { positive, neutral, negative },
    headlineSummary: directCatalyst?.title || "종목명 기반 일반 뉴스 검색 결과 없음",
    directnessScore: directCatalyst?.directnessScore || 0,
    directionScore,
    freshnessScore: directCatalyst?.freshnessScore || 0,
    strongCatalystCount: sortedItems.filter((item) => item.strongCatalyst).length,
    directCatalyst,
    rawNewsScore,
    newsScore: Math.max(-4, Math.min(8, rawNewsScore)),
    notes: sortedItems.length ? notes : [...notes, "종목명 기반 일반 뉴스 검색 결과가 비어 있음"]
  };
}

async function fetchKoreanNewsForTicker(ticker, companyName, options = {}) {
  const queryName = String(companyName || "").trim();
  if (!queryName) {
    return summarizeKoreanNews(ticker, [], "DISABLED", ["company name missing"], [{ source: "Google News RSS", status: "DISABLED" }]);
  }
  const query = `"${queryName}" 주식 OR 실적 OR 수주 OR 투자 when:${LOOKBACK_DAYS}d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const xml = await fetchText(url, {
      timeoutMs: options.timeoutMs || 8000,
      headers: { "User-Agent": "DailyTradingThesisAgent/1.0" }
    });
    const items = await enrichKoreanNewsItemContent(parseGoogleNewsRss(xml, ticker, queryName));
    return summarizeKoreanNews(ticker, items, items.length ? "CONNECTED" : "PARTIAL", [], [{ source: "Google News RSS", status: items.length ? "CONNECTED" : "PARTIAL" }]);
  } catch (error) {
    return summarizeKoreanNews(ticker, [], "FAILED", failedStatus("Google News RSS", error).notes, [{ source: "Google News RSS", status: "FAILED" }]);
  }
}

async function enrichKoreanNewsItemContent(items) {
  const topItems = items.slice(0, 6);
  const enrichedTop = await Promise.all(topItems.map(async (item) => {
    if (item.summary && item.summary.length > 80) return item;
    const contentSummary = await fetchArticlePreview(item.url);
    return contentSummary ? { ...item, contentSummary } : item;
  }));
  return [...enrichedTop, ...items.slice(topItems.length)];
}

async function fetchArticlePreview(url) {
  if (!url || !/^https?:\/\//i.test(url)) return "";
  if (/^https?:\/\/news\.google\.com\//i.test(url)) return "";
  try {
    const html = await fetchText(url, {
      timeoutMs: 5000,
      headers: { "User-Agent": "DailyTradingThesisAgent/1.0" }
    });
    return extractArticlePreview(html);
  } catch {
    return "";
  }
}

function extractArticlePreview(html) {
  const meta = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]*>/i)?.[1];
  if (meta) return stripTags(meta).slice(0, 420);
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const paragraphs = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((text) => text.length >= 60 && !/cookie|subscribe|newsletter|advertisement|구독|광고/i.test(text));
  return paragraphs[0]?.slice(0, 420) || "";
}

module.exports = {
  fetchKoreanNewsForTicker,
  summarizeKoreanNews
};
