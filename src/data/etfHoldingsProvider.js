const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const FALLBACK_PATH = path.join(ROOT, "config", "etfHoldingsFallback.json");

function readFallback() {
  if (!fs.existsSync(FALLBACK_PATH)) return {};
  return JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf8"));
}

async function fetchEtfHoldings(etf) {
  const fallback = readFallback();
  const tickers = fallback[etf] || [];
  return tickers.map((ticker) => ({
    etf,
    ticker,
    name: ticker,
    weight: null,
    source: "config fallback sample"
  }));
}

async function calculateEtfBreadth(etf, holdings, marketData) {
  const sampled = holdings
    .map((holding) => ({ holding, market: marketData?.items?.[holding.ticker] }))
    .filter((row) => row.market?.dataStatus === "ok");

  if (!holdings.length) {
    return {
      etf,
      status: "DISABLED",
      source: "config fallback sample",
      holdingsAvailable: false,
      holdingsCount: 0,
      sampledHoldingsCount: 0,
      breadthSignal: "UNKNOWN",
      etfBreadthScore: 0,
      topContributors: [],
      notes: ["fallback holdings sample not configured"]
    };
  }

  if (!sampled.length) {
    return {
      etf,
      status: "PARTIAL",
      source: "config fallback sample",
      holdingsAvailable: true,
      holdingsCount: holdings.length,
      sampledHoldingsCount: 0,
      breadthSignal: "UNKNOWN",
      etfBreadthScore: 0,
      topContributors: [],
      notes: ["fallback holdings exist, but sampled tickers are not present in market_data_real.json"]
    };
  }

  const advancers = sampled.filter((row) => (row.market.return5dPct ?? 0) > 0);
  const above20 = sampled.filter((row) => isAboveMovingAverage(row.market, 20));
  const above50 = sampled.filter((row) => isAboveMovingAverage(row.market, 50));
  const advancersRatio = Number((advancers.length / sampled.length).toFixed(2));
  const holdingsAbove20DMA = Number((above20.length / sampled.length).toFixed(2));
  const holdingsAbove50DMA = Number((above50.length / sampled.length).toFixed(2));
  const weightedReturn5D = Number((sampled.reduce((sum, row) => sum + (row.market.return5dPct || 0), 0) / sampled.length).toFixed(2));
  const weightedReturn20D = Number((sampled.reduce((sum, row) => sum + (row.market.return20dPct || 0), 0) / sampled.length).toFixed(2));
  const topContributors = [...sampled]
    .sort((a, b) => (b.market.return5dPct || 0) - (a.market.return5dPct || 0))
    .slice(0, 5)
    .map((row) => row.holding.ticker);
  const sampleReliability =
    sampled.length >= 20
      ? "NORMAL"
      : sampled.length >= 10
        ? "LIMITED"
        : sampled.length >= 5
          ? "LOW_CONFIDENCE"
          : "INSUFFICIENT";
  const rawBreadthSignal =
    advancersRatio >= 0.6 && holdingsAbove20DMA >= 0.6
      ? "BROAD_ADVANCE"
      : advancersRatio < 0.35 || holdingsAbove20DMA < 0.35
        ? "WEAK_BREADTH"
        : "NARROW_LEADERSHIP";
  const breadthSignal = sampleReliability === "INSUFFICIENT" && rawBreadthSignal === "BROAD_ADVANCE" ? "SAMPLE_TOO_SMALL" : rawBreadthSignal;
  const rawBreadthScore = breadthSignal === "BROAD_ADVANCE" ? 8 : breadthSignal === "NARROW_LEADERSHIP" ? 2 : breadthSignal === "WEAK_BREADTH" ? -4 : 0;
  const sampleCap = sampleReliability === "NORMAL" ? 8 : sampleReliability === "LIMITED" ? 4 : sampleReliability === "LOW_CONFIDENCE" ? 2 : 0;
  const etfBreadthScore = Math.max(-4, Math.min(rawBreadthScore, sampleCap));

  return {
    etf,
    status: "PARTIAL",
    source: "config fallback sample",
    holdingsAvailable: true,
    holdingsCount: holdings.length,
    sampledHoldingsCount: sampled.length,
    sampleReliability,
    advancersRatio,
    holdingsAbove20DMA,
    holdingsAbove50DMA,
    weightedReturn5D,
    weightedReturn20D,
    topContributors,
    breadthSignal,
    rawBreadthSignal,
    rawBreadthScore,
    sampleCap,
    etfBreadthScore,
    notes: [`sample-based breadth from fallback holdings; sample reliability ${sampleReliability}; weights may not reflect current issuer holdings`]
  };
}

function isAboveMovingAverage(market, period) {
  const closes = (market.history || []).map((row) => row.close).filter(Number.isFinite);
  if (closes.length < period) return false;
  const last = closes.at(-1);
  const avg = closes.slice(-period).reduce((sum, value) => sum + value, 0) / period;
  return last >= avg;
}

module.exports = {
  calculateEtfBreadth,
  fetchEtfHoldings
};
