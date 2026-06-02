const { failedStatus, fetchText } = require("./providerUtils");

const POSITIVE_KEYWORDS = ["earnings", "guidance", "upgrade", "contract", "partnership", "ai", "cybersecurity", "data center", "chip"];
const NEGATIVE_KEYWORDS = ["downgrade", "regulation", "lawsuit", "investigation", "offering", "dilution"];

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
    const sentiment = classifySentiment(`${title} ${summary}`);
    return {
      ticker,
      title,
      source,
      publishedAt,
      url,
      summary,
      sentiment,
      relevanceScore: relevanceScore(`${title} ${summary}`)
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

function summarizeNews(ticker, items, providerStatus = "CONNECTED", notes = []) {
  const positive = items.filter((item) => item.sentiment === "POSITIVE").length;
  const negative = items.filter((item) => item.sentiment === "NEGATIVE").length;
  const neutral = items.filter((item) => item.sentiment === "NEUTRAL" || item.sentiment === "UNKNOWN").length;
  const meaningful = items.filter((item) => (item.relevanceScore || 0) > 0);
  const newsScore = positive > negative ? Math.min(10, positive * 3 + meaningful.length) : negative > positive ? -4 : 0;
  return {
    ticker,
    status: providerStatus,
    source: "Yahoo Finance RSS",
    items,
    itemCount: items.length,
    sentimentCounts: { positive, neutral, negative },
    headlineSummary: meaningful[0]?.title || items[0]?.title || "의미 있는 신규 뉴스 없음",
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
