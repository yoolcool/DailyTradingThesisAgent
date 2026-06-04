function fetchLiquidityProfile(ticker, marketItem) {
  if (!marketItem || marketItem.dataStatus !== "ok") {
    return {
      ticker,
      status: "FAILED",
      source: "price-volume fallback",
      liquiditySignal: "UNKNOWN",
      dollarVolumeLiquidity: "UNKNOWN",
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
      ? "시장가 가능"
      : liquiditySignal === "ACCEPTABLE"
        ? "지정가 권장"
        : liquiditySignal === "LOW"
          ? "추격 금지"
          : "지정가 권장";
  return {
    ticker,
    status: "PARTIAL",
    source: "price-volume dollar-volume fallback",
    dollarVolume,
    avgDollarVolume20D,
    liquiditySignal,
    dollarVolumeLiquidity: liquiditySignal,
    orderImpact,
    liquidityScore: normalizedLiquidityScore,
    notes: ["liquidity estimated from close * volume"]
  };
}

module.exports = {
  fetchLiquidityProfile
};
