const { failedStatus, fetchText } = require("./providerUtils");

const POSITIVE_KEYWORDS = ["earnings", "guidance", "upgrade", "contract", "partnership", "ai", "cybersecurity", "data center", "chip"];
const NEGATIVE_KEYWORDS = ["downgrade", "regulation", "lawsuit", "investigation", "offering", "dilution"];
const STRONG_CATALYST_KEYWORDS = ["earnings", "guidance", "contract", "award", "order", "policy", "regulation", "approval", "partnership", "acquisition", "buyback"];

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function parseRssItems(xml, ticker) {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8);
  return itemMatches.map((match) => {
    const raw = match[1];
    const title = stripTags(raw.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)?.[1] || raw.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
    const summary = stripTags(raw.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i)?.[1] || "");
    const source = stripTags(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || "Yahoo Finance RSS");
    const publishedAt = stripTags(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "");
    const url = stripTags(raw.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
    const text = `${title} ${summary}`;
    const sentiment = classifySentiment(text);
    return {
      ticker,
      title,
      source,
      publishedAt,
      url,
      summary,
      sentiment,
      relevanceScore: relevanceScore(text),
      directnessScore: directnessScore(text, ticker),
      freshnessScore: freshnessScore(publishedAt),
      strongCatalyst: STRONG_CATALYST_KEYWORDS.some((keyword) => text.toLowerCase().includes(keyword))
    };
  }).filter((item) => item.title);
}

function classifySentiment(text) {
  const lower = String(text || "").toLowerCase();
  const negative = NEGATIVE_KEYWORDS.some((keyword) => lower.includes(keyword));
  const positive = POSITIVE_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (negative && !positive) return "NEGATIVE";
  if (positive && !negative) return "POSITIVE";
  if (positive && negative) return "NEUTRAL";
  return "UNKNOWN";
}

function relevanceScore(text) {
  const lower = String(text || "").toLowerCase();
  return [...POSITIVE_KEYWORDS, ...NEGATIVE_KEYWORDS].reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0);
}

function directnessScore(text, ticker) {
  const lower = String(text || "").toLowerCase();
  const symbol = String(ticker || "").toLowerCase();
  if (symbol && lower.includes(symbol)) return 3;
  return relevanceScore(text) > 0 ? 1 : 0;
}

function freshnessScore(publishedAt) {
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return 0;
  const ageHours = (Date.now() - timestamp) / 36e5;
  if (ageHours <= 24) return 3;
  if (ageHours <= 72) return 2;
  if (ageHours <= 168) return 1;
  return 0;
}

function summarizeNews(ticker, items, providerStatus = "CONNECTED", notes = []) {
  const positive = items.filter((item) => item.sentiment === "POSITIVE").length;
  const negative = items.filter((item) => item.sentiment === "NEGATIVE").length;
  const neutral = items.filter((item) => item.sentiment === "NEUTRAL" || item.sentiment === "UNKNOWN").length;
  const meaningful = items.filter((item) => (item.relevanceScore || 0) > 0);
  const directness = Math.max(0, ...items.map((item) => item.directnessScore || 0));
  const freshness = Math.max(0, ...items.map((item) => item.freshnessScore || 0));
  const strongCatalystCount = items.filter((item) => item.strongCatalyst).length;
  const directionScore = positive > negative ? 1 : negative > positive ? -1 : 0;
  const rawNewsScore = directionScore > 0
    ? directness + freshness + strongCatalystCount * 2 + positive
    : directionScore < 0
      ? -4
      : 0;
  const newsScore = Math.max(-4, Math.min(10, rawNewsScore));
  const lastPublishedTimestamp = items
    .map((item) => Date.parse(item.publishedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return {
    ticker,
    status: providerStatus,
    source: "Yahoo Finance RSS",
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
    rawNewsScore,
    newsScore,
    notes: items.length ? notes : [...notes, "해당 티커의 의미 있는 신규 뉴스가 없거나 RSS가 비어 있음"]
  };
}

async function fetchNewsForTicker(ticker) {
  if (process.env.DISABLE_NEWS_PROVIDER === "1") {
    return summarizeNews(ticker, [], "DISABLED", ["DISABLE_NEWS_PROVIDER=1"]);
  }
  try {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
    const xml = await fetchText(url);
    const items = parseRssItems(xml, ticker);
    return summarizeNews(ticker, items, items.length ? "CONNECTED" : "PARTIAL");
  } catch (error) {
    const failed = failedStatus("Yahoo Finance RSS", error);
    return summarizeNews(ticker, [], failed.status, failed.notes);
  }
}

module.exports = {
  fetchNewsForTicker,
  summarizeNews
};
