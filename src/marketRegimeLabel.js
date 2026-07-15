function marketRegimeLabel(score, benchmarks = [], macroScore = 50) {
  const validBenchmarks = benchmarks.filter((row) => row.dataStatus === "ok");
  const hasBenchmarks = validBenchmarks.length > 0;
  const allAboveMa50 = hasBenchmarks && validBenchmarks.every((row) => row.aboveMa50);
  const allAboveMa200 = hasBenchmarks && validBenchmarks.every((row) => row.aboveMa200);
  const allPositive20d = hasBenchmarks && validBenchmarks.every((row) => Number(row.return20dPct) > 0);
  const mostlyPositive60d =
    hasBenchmarks &&
    validBenchmarks.filter((row) => Number(row.return60dPct) > 0).length >= Math.ceil(validBenchmarks.length / 2);
  const longTermTrendAlive =
    hasBenchmarks &&
    validBenchmarks.filter((row) => row.aboveMa200).length >= Math.ceil(validBenchmarks.length / 2);
  const shortTermStalling =
    hasBenchmarks &&
    validBenchmarks.some((row) => !row.aboveMa50 || Number(row.return20dPct) <= 0 || Number(row.return5dPct) <= 0);

  if (score >= 70 && allAboveMa50 && allAboveMa200 && allPositive20d && mostlyPositive60d && macroScore >= 52) {
    return "강세장";
  }
  if (score >= 60 && longTermTrendAlive && (shortTermStalling || macroScore < 52)) return "기간 조정";
  if (score >= 55) return "중립-상승";
  if (score >= 40) return "중립";
  if (score >= 25) return "중립-하락";
  return "약세장";
}

module.exports = { marketRegimeLabel };
