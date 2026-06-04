function fetchLiquiditySpread(ticker, marketItem) {
  if (!marketItem || marketItem.dataStatus !== "ok") {
    return {
      ticker,
      status: "FAILED",
      source: "price-volume fallback",
      hasQuoteData: false,
      liquiditySignal: "UNKNOWN",
      dollarVolumeLiquidity: "UNKNOWN",
      spreadStatus: "UNKNOWN",
      orderImpact: "추격 금지",
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
          : "LOW";
  const normalizedLiquidityScore = liquiditySignal === "LIQUID" ? 5 : liquiditySignal === "ACCEPTABLE" ? 2 : liquiditySignal === "LOW" ? -5 : 0;
  const orderImpact =
    liquiditySignal === "LIQUID"
      ? "지정가 권장"
      : liquiditySignal === "ACCEPTABLE"
        ? "시장가 금지"
        : liquiditySignal === "LOW"
          ? "추격 금지"
          : "시장가 금지";
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
    dollarVolumeLiquidity: liquiditySignal,
    spreadStatus: "UNKNOWN",
    orderImpact,
    liquidityScore: normalizedLiquidityScore,
    notes: ["bid/ask quote unavailable; liquidity estimated from close * volume; spread is UNKNOWN"]
  };
}

module.exports = {
  fetchLiquiditySpread
};
