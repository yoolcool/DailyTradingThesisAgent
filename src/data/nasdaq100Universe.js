const fs = require("fs");
const path = require("path");
const { fetchText } = require("./providerUtils");

const ROOT = path.resolve(__dirname, "..", "..");
const FALLBACK_PATH = path.join(ROOT, "config", "nasdaq100Fallback.json");

function normalizeTicker(ticker) {
  return String(ticker || "").trim().replace(".", "-").toUpperCase();
}

function fallbackUniverse(note = "using local fallback") {
  const fallback = JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf8"));
  const members = (fallback.members || []).map((member) => ({
    ...member,
    ticker: normalizeTicker(member.ticker),
    source: member.source || "fallback",
    asOfDate: member.asOfDate || fallback.asOfDate,
    isActive: member.isActive !== false
  })).filter((member) => member.ticker && member.isActive);
  return {
    universeName: "NASDAQ_100",
    asOfDate: fallback.asOfDate,
    members,
    source: fallback.source || "config/nasdaq100Fallback.json",
    fetchStatus: "FALLBACK",
    notes: [note]
  };
}

function parseStockAnalysisNasdaq100(html) {
  const rows = [...html.matchAll(/<a[^>]+href="\/stocks\/([a-z0-9.-]+)\/"[^>]*>([A-Z0-9.-]+)<\/a>\s*([^<\n]+?)\s*(?:\d|\$)/g)];
  const seen = new Set();
  const members = [];
  for (const row of rows) {
    const ticker = normalizeTicker(row[2] || row[1]);
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    members.push({
      ticker,
      name: String(row[3] || ticker).trim(),
      source: "stockanalysis.com/list/nasdaq-100-stocks",
      asOfDate: new Date().toISOString().slice(0, 10),
      isActive: true
    });
  }
  return members;
}

async function fetchNasdaq100Universe() {
  if (process.env.DISABLE_NASDAQ100_PROVIDER === "1") {
    return fallbackUniverse("DISABLE_NASDAQ100_PROVIDER=1");
  }
  try {
    const html = await fetchText("https://stockanalysis.com/list/nasdaq-100-stocks/");
    const members = parseStockAnalysisNasdaq100(html);
    if (members.length < 90) {
      return fallbackUniverse(`remote source returned too few members: ${members.length}`);
    }
    return {
      universeName: "NASDAQ_100",
      asOfDate: new Date().toISOString().slice(0, 10),
      members,
      source: "https://stockanalysis.com/list/nasdaq-100-stocks/",
      fetchStatus: "CONNECTED",
      notes: []
    };
  } catch (error) {
    return fallbackUniverse(error.message || "remote universe fetch failed");
  }
}

function loadNasdaq100FallbackUniverse() {
  return fallbackUniverse("loaded for local price collection");
}

module.exports = {
  fetchNasdaq100Universe,
  loadNasdaq100FallbackUniverse,
  normalizeTicker
};
