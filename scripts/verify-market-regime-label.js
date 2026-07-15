const assert = require("assert");
const { marketRegimeLabel } = require("../src/marketRegimeLabel");

const healthyBenchmark = {
  dataStatus: "ok",
  aboveMa50: true,
  aboveMa200: true,
  return5dPct: 1,
  return20dPct: 4,
  return60dPct: 8
};

const healthyBenchmarks = [
  { ...healthyBenchmark, ticker: "A" },
  { ...healthyBenchmark, ticker: "B" }
];

assert.strictEqual(marketRegimeLabel(70, healthyBenchmarks, 52), "강세장");
assert.strictEqual(
  marketRegimeLabel(85, [{ ...healthyBenchmarks[0], aboveMa50: false }, healthyBenchmarks[1]], 60),
  "기간 조정"
);
assert.strictEqual(marketRegimeLabel(85, healthyBenchmarks, 51), "기간 조정");
assert.strictEqual(marketRegimeLabel(70, [], 60), "중립-상승");
assert.strictEqual(marketRegimeLabel(54, healthyBenchmarks, 60), "중립");
assert.strictEqual(marketRegimeLabel(24, healthyBenchmarks, 60), "약세장");

console.log("Verified Stock Tracker-compatible market regime labels.");
