const crypto = require("crypto");
const { aggregateStatus, disabledStatus, failedStatus, fetchJson, fetchText } = require("./providerUtils");

const POSITIVE_KEYWORDS = ["beat", "beats", "raise", "raised", "growth", "upgrade", "contract", "partnership", "ai", "cybersecurity", "data center", "chip", "approval", "buyback"];
const NEGATIVE_KEYWORDS = ["miss", "cut", "cuts", "downgrade", "lawsuit", "investigation", "offering", "dilution", "probe", "warning", "falls", "slumps"];
const STRONG_CATALYST_KEYWORDS = ["earnings", "guidance", "contract", "award", "order", "policy", "regulation", "approval", "partnership", "acquisition", "buyback", "8-k", "10-q", "10-k", "s-1"];
const ANALYST_KEYWORDS = ["upgrade", "downgrade", "price target", "initiates", "rating"];
const MACRO_KEYWORDS = ["fed", "federal reserve", "rates", "inflation", "jobs", "payrolls", "cpi", "pce", "treasury"];
const SOURCE_PRIORITY = { official: 5, tier1: 4, api_aggregator: 3, tier2: 2, low_quality: 1 };

const RSS_SOURCES = [
  {
    name: "Yahoo Finance RSS",
    sourceTier: "tier2",
    sourceType: "tier1_financial_news",
    url: (ticker) => `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`,
    scope: "ticker"
  },
  {
    name: "MarketWatch RSS",
    sourceTier: "tier1",
    sourceType: "market_commentary",
    url: () => "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    scope: "market"
  },
  {
    name: "CNBC Markets RSS",
    sourceTier: "tier1",
    sourceType: "market_commentary",
    url: () => "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    scope: "market"
  },
  {
    name: "SEC EDGAR RSS",
    sourceTier: "official",
    sourceType: "official_filing",
    url: () => "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K%2C10-Q%2C10-K%2CS-1%2C13D%2C13G%2C4&count=80&output=atom",
    scope: "official"
  },
  {
    name: "Federal Reserve RSS",
    sourceTier: "official",
    sourceType: "macro_policy",
    url: () => "https://www.federalreserve.gov/feeds/press_all.xml",
    scope: "macro"
  }
];

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function timeBucket(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "unknown";
  return new Date(Math.floor(timestamp / 21600000) * 21600000).toISOString();
}

function hash(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex").slice(0, 16);
}

function extractTag(raw, tag) {
  const cdata = raw.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"))?.[1];
  if (cdata) return cdata;
  return raw.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "";
}

function parseRssLikeItems(xml, ticker, sourceConfig) {
  const itemMatches = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  const entryMatches = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  const matches = (itemMatches.length ? itemMatches : entryMatches).slice(0, sourceConfig.scope === "ticker" ? 8 : 24);
  return matches.map((match) => normalizeNewsItem({
    ticker,
    source: sourceConfig.name,
    sourceTier: sourceConfig.sourceTier,
    sourceType: sourceConfig.sourceType,
    title: stripTags(extractTag(match[1], "title")),
    summary: stripTags(extractTag(match[1], "description") || extractTag(match[1], "summary") || extractTag(match[1], "content")),
    url: stripTags(extractTag(match[1], "link")) || (match[1].match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || ""),
    publishedAt: stripTags(extractTag(match[1], "pubDate") || extractTag(match[1], "updated") || extractTag(match[1], "published")),
    sourceScope: sourceConfig.scope
  })).filter((item) => item.title);
}

function normalizeNewsItem(input) {
  const text = `${input.title || ""} ${input.summary || ""}`;
  const tickers = inferTickers(text, input.ticker);
  const eventType = classifyEventType(text, input.sourceType);
  const directness = classifyDirectness(text, input.ticker, tickers, input.sourceType, input.sourceScope);
  const direction = classifyDirection(text);
  const freshnessBucket = classifyFreshness(input.publishedAt);
  const sentimentScore = direction === "positive" ? 1 : direction === "negative" ? -1 : 0;
  const dedupeKey = [
    normalizeTitle(input.title),
    input.ticker || tickers[0] || "MARKET",
    timeBucket(input.publishedAt)
  ].join("|");
  return {
    id: `${input.source}:${hash(dedupeKey)}`,
    source: input.source,
    sourceTier: input.sourceTier,
    sourceType: input.sourceType,
    title: input.title,
    summary: input.summary,
    url: input.url,
    publishedAt: normalizeDate(input.publishedAt),
    tickers,
    relatedThemes: inferThemes(text),
    eventType,
    directness,
    direction,
    freshnessBucket,
    sentimentScore,
    priceReactionAfterNews: "unknown",
    confidence: itemConfidence(input.sourceTier, directness, freshnessBucket),
    dedupeKey,
    relevanceScore: relevanceScore(text),
    directnessScore: directnessScoreFromLabel(directness),
    freshnessScore: freshnessScoreFromBucket(freshnessBucket),
    strongCatalyst: isStrongCatalyst(eventType, input.sourceType)
  };
}

function normalizeDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function inferTickers(text, ticker) {
  const found = new Set();
  if (ticker && new RegExp(`\\b${escapeRegExp(ticker)}\\b`, "i").test(text)) found.add(ticker);
  return [...found];
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferThemes(text) {
  const lower = String(text || "").toLowerCase();
  return [
    lower.includes("ai") || lower.includes("artificial intelligence") ? "AI" : null,
    lower.includes("semiconductor") || lower.includes("chip") ? "semiconductors" : null,
    lower.includes("cyber") ? "cybersecurity" : null,
    lower.includes("data center") ? "data center" : null,
    MACRO_KEYWORDS.some((keyword) => lower.includes(keyword)) ? "macro_policy" : null
  ].filter(Boolean);
}

function classifyEventType(text, sourceType) {
  const lower = String(text || "").toLowerCase();
  if (sourceType === "macro_policy" || MACRO_KEYWORDS.some((keyword) => lower.includes(keyword))) return "macro";
  if (lower.includes("8-k") || lower.includes("10-q") || lower.includes("10-k") || lower.includes("earnings")) return "earnings";
  if (lower.includes("guidance") || lower.includes("outlook")) return "guidance";
  if (lower.includes("contract") || lower.includes("award") || lower.includes("order")) return "contract";
  if (lower.includes("product") || lower.includes("launch")) return "product";
  if (lower.includes("regulation") || lower.includes("approval") || lower.includes("policy")) return "regulation";
  if (lower.includes("acquisition") || lower.includes("merger") || lower.includes("deal")) return "mna";
  if (ANALYST_KEYWORDS.some((keyword) => lower.includes(keyword))) return lower.includes("downgrade") ? "analyst_downgrade" : "analyst_upgrade";
  if (lower.includes("offering")) return "offering";
  if (lower.includes("insider buy")) return "insider_buy";
  if (lower.includes("insider sell") || lower.includes("form 4")) return "insider_sell";
  return "general_market";
}

function classifyDirectness(text, ticker, tickers, sourceType, sourceScope) {
  if (sourceType === "official_filing" && tickers.length) return "direct_ticker";
  if (ticker && new RegExp(`\\b${escapeRegExp(ticker)}\\b`, "i").test(text)) return "direct_ticker";
  if (sourceScope === "ticker" && relevanceScore(text) > 0) return "sector_theme";
  if (sourceType === "macro_policy") return "market_macro";
  if (inferThemes(text).length) return "sector_theme";
  return "indirect";
}

function classifyDirection(text) {
  const lower = String(text || "").toLowerCase();
  const negative = NEGATIVE_KEYWORDS.some((keyword) => lower.includes(keyword));
  const positive = POSITIVE_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (positive && negative) return "mixed";
  if (positive) return "positive";
  if (negative) return "negative";
  return "neutral";
}

function classifyFreshness(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "stale";
  const ageHours = (Date.now() - timestamp) / 36e5;
  if (ageHours <= 6) return "under_6h";
  if (ageHours <= 24) return "under_24h";
  if (ageHours <= 72) return "under_72h";
  return "stale";
}

function itemConfidence(sourceTier, directness, freshnessBucket) {
  let score = SOURCE_PRIORITY[sourceTier] || 1;
  if (directness === "direct_ticker") score += 2;
  if (freshnessBucket === "under_6h" || freshnessBucket === "under_24h") score += 1;
  return score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
}

function relevanceScore(text) {
  const lower = String(text || "").toLowerCase();
  return [...POSITIVE_KEYWORDS, ...NEGATIVE_KEYWORDS, ...STRONG_CATALYST_KEYWORDS].reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0);
}

function directnessScoreFromLabel(value) {
  return { direct_ticker: 4, sector_theme: 2, market_macro: 1, indirect: 0 }[value] || 0;
}

function freshnessScoreFromBucket(value) {
  return { under_6h: 4, under_24h: 3, under_72h: 2, stale: 0 }[value] || 0;
}

function isStrongCatalyst(eventType, sourceType) {
  return sourceType === "official_filing" || ["earnings", "guidance", "contract", "regulation", "mna", "offering"].includes(eventType);
}

function dedupeNewsItems(items) {
  const best = new Map();
  for (const item of items) {
    const previous = best.get(item.dedupeKey);
    if (!previous || itemRank(item) > itemRank(previous)) best.set(item.dedupeKey, item);
  }
  return [...best.values()].sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
}

function itemRank(item) {
  return (SOURCE_PRIORITY[item.sourceTier] || 0) * 100 + item.directnessScore * 10 + item.freshnessScore + (item.strongCatalyst ? 5 : 0);
}

function summarizeNews(ticker, items, providerStatus = "CONNECTED", notes = [], sourceStatuses = []) {
  const positive = items.filter((item) => item.direction === "positive").length;
  const negative = items.filter((item) => item.direction === "negative").length;
  const neutral = items.length - positive - negative;
  const meaningful = items.filter((item) => item.directness !== "indirect" || item.relevanceScore > 0);
  const directness = Math.max(0, ...items.map((item) => item.directnessScore || 0));
  const freshness = Math.max(0, ...items.map((item) => item.freshnessScore || 0));
  const strongCatalystCount = items.filter((item) => item.strongCatalyst && item.directness !== "indirect").length;
  const directCatalyst = items.find((item) => item.directness === "direct_ticker" && item.strongCatalyst) || items.find((item) => item.directness === "direct_ticker");
  const directionScore = positive > negative ? 1 : negative > positive ? -1 : 0;
  const sourceTierBonus = Math.max(0, ...items.map((item) => item.sourceTier === "official" ? 3 : item.sourceTier === "tier1" ? 1 : 0));
  const rawNewsScore = directionScore > 0
    ? directness + freshness + strongCatalystCount * 2 + positive + sourceTierBonus
    : directionScore < 0
      ? -4 - Math.min(2, negative)
      : directCatalyst ? Math.min(4, directness + sourceTierBonus) : 0;
  const newsScore = Math.max(-6, Math.min(12, rawNewsScore));
  const lastPublishedTimestamp = items
    .map((item) => Date.parse(item.publishedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return {
    ticker,
    status: providerStatus,
    source: unique(items.map((item) => item.source)).join(", ") || "Multi-source News",
    sourceStatuses,
    fetchedAt: new Date().toISOString(),
    lastPublishedAt: lastPublishedTimestamp ? new Date(lastPublishedTimestamp).toISOString() : null,
    items,
    itemCount: items.length,
    sentimentCounts: { positive, neutral, negative },
    headlineSummary: meaningful[0]?.title || items[0]?.title || "의미 있는 신규 뉴스 없음",
    directnessScore: directness,
    directionScore,
    freshnessScore: freshness,
    strongCatalystCount,
    directCatalyst,
    rawNewsScore,
    newsScore,
    notes: items.length ? notes : [...notes, "해당 티커의 의미 있는 신규 뉴스가 없거나 뉴스 소스가 비어 있음"]
  };
}

async function fetchRssSource(sourceConfig, ticker) {
  try {
    const xml = await fetchText(sourceConfig.url(ticker), sourceConfig.name === "SEC EDGAR RSS" ? { headers: { "User-Agent": "DailyTradingThesisAgent/1.0 contact@example.com" } } : {});
    const items = parseRssLikeItems(xml, ticker, sourceConfig);
    return { status: items.length ? "CONNECTED" : "PARTIAL", source: sourceConfig.name, items, notes: items.length ? [] : ["no matching RSS items"] };
  } catch (error) {
    const failed = failedStatus(sourceConfig.name, error);
    return { ...failed, items: [] };
  }
}

async function fetchFinnhubNews(ticker) {
  const token = process.env.FINNHUB_API_KEY || process.env.FINNHUB_TOKEN;
  if (!token) return { ...disabledStatus("Finnhub API", "FINNHUB_API_KEY not configured"), items: [] };
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  try {
    const rows = await fetchJson(`https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${encodeURIComponent(token)}`);
    const items = (Array.isArray(rows) ? rows : []).slice(0, 12).map((row) => normalizeNewsItem({
      ticker,
      source: "Finnhub API",
      sourceTier: "api_aggregator",
      sourceType: "tier1_financial_news",
      title: row.headline,
      summary: row.summary,
      url: row.url,
      publishedAt: row.datetime ? new Date(row.datetime * 1000).toISOString() : null,
      sourceScope: "ticker"
    })).filter((item) => item.title);
    return { status: items.length ? "CONNECTED" : "PARTIAL", source: "Finnhub API", items, notes: items.length ? [] : ["no Finnhub company news returned"] };
  } catch (error) {
    return { ...failedStatus("Finnhub API", error), items: [] };
  }
}

async function fetchNewsForTicker(ticker) {
  if (process.env.DISABLE_NEWS_PROVIDER === "1") {
    return summarizeNews(ticker, [], "DISABLED", ["DISABLE_NEWS_PROVIDER=1"], [{ source: "Multi-source News", status: "DISABLED" }]);
  }
  const rows = await Promise.all([
    ...RSS_SOURCES.map((source) => fetchRssSource(source, ticker)),
    fetchFinnhubNews(ticker)
  ]);
  const sourceStatuses = rows.map((row) => ({ source: row.source, status: row.status, notes: row.notes || [] }));
  const items = dedupeNewsItems(rows.flatMap((row) => row.items || []))
    .filter((item) => item.directness !== "indirect" || item.sourceType === "macro_policy")
    .slice(0, 16);
  const providerStatus = aggregateStatus(rows.map((row) => row.status));
  const notes = rows.flatMap((row) => (row.notes || []).map((note) => `${row.source}: ${note}`));
  return summarizeNews(ticker, items, providerStatus, notes, sourceStatuses);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

module.exports = {
  fetchNewsForTicker,
  summarizeNews
};
