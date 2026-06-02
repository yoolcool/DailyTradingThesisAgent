function fetchLiquiditySpread(ticker, marketItem) {
  if (!marketItem || marketItem.dataStatus !== "ok") {
    return {
      ticker,
      status: "FAILED",
      source: "price-volume fallback",
      hasQuoteData: false,
      liquiditySignal: "UNKNOWN",
      liquidityScore: 0,
      notes: ["price/volume data unavailable for liquidity fallback"]
    };
  }

  const dollarVolume = marketItem.lastClose && marketItem.volume ? Math.round(marketItem.lastClose * marketItem.volume) : null;
  const avgDollarVolume20D = marketItem.lastClose && marketItem.avgVolume20d ? Math.round(marketItem.lastClose * marketItem.avgVolume20d) : null;
  const liquiditySignal =
    dollarVolume === null
      ? "UNKNOWN"
      : dollarVolume >= 1_000_000_000
        ? "LIQUID"
        : dollarVolume >= 100_000_000
          ? "ACCEPTABLE"
          : "LOW_LIQUIDITY";
  const liquidityScore = liquiditySignal === "LIQUID" ? 5 : liquiditySignal === "ACCEPTABLE" ? 3 : liquiditySignal === "LOW_LIQUIDITY" ? -5 : 0;
  return {
    ticker,
    status: "PARTIAL",
    source: "price-volume dollar-volume fallback",
    hasQuoteData: false,
    bid: null,
    ask: null,
    mid: null,
    spreadPct: null,
    dollarVolume,
    avgDollarVolume20D,
    liquiditySignal,
    liquidityScore,
    notes: ["bid/ask quote unavailable; liquidity estimated from close * volume"]
  };
}

module.exports = {
  fetchLiquiditySpread
};
