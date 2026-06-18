const fs = require("fs");
const path = require("path");

const DEFAULT_MARKET_ID = "us";

const BUILTIN_MARKETS = {
  us: {
    id: "us",
    label: "US market",
    timezone: "America/New_York",
    currency: "USD",
    universeName: "NASDAQ_100",
    universeLabel: "Nasdaq-100",
    benchmarkTickers: ["QQQ", "SPY", "IWM"],
    sessionLabel: "US regular session",
    closeLabel: "US regular close",
    nextSessionTimezone: "America/New_York",
    nextSessionSuffix: "US regular session",
    marketRegimeLabel: "QQQ/SPY/IWM",
    prePostMarketLabel: "프리/애프터마켓",
    prePostUnavailableNote: "프리/애프터마켓 확인 불가",
    paths: {
      configDir: "config",
      dataDir: "data/us",
      reportsDir: "reports/us",
      docsDir: "docs/us"
    }
  },
  kr: {
    id: "kr",
    label: "Korean market",
    timezone: "Asia/Seoul",
    currency: "KRW",
    universeName: "KOSPI200",
    universeLabel: "KOSPI200",
    benchmarkTickers: ["069500.KS", "229200.KS"],
    sessionLabel: "KRX regular session",
    closeLabel: "KRX 정규장 종가",
    nextSessionTimezone: "Asia/Seoul",
    nextSessionSuffix: "KRX 정규장",
    marketRegimeLabel: "KOSPI200/KODEX 200/KODEX KOSDAQ150",
    prePostMarketLabel: "장전/시간외",
    prePostUnavailableNote: "장전/시간외 데이터 확인 불가",
    paths: {
      configDir: "config/markets/kr",
      dataDir: "data/kr",
      reportsDir: "reports/kr",
      docsDir: "docs/kr"
    }
  }
};

function marketArg(argv = process.argv, env = process.env) {
  const explicit = argv.find((arg) => arg.startsWith("--market="));
  if (explicit) return explicit.split("=")[1];
  const index = argv.indexOf("--market");
  if (index >= 0 && argv[index + 1]) return argv[index + 1];
  return env.MARKET || env.REPORT_MARKET || DEFAULT_MARKET_ID;
}

function normalizeMarketId(value) {
  return String(value || DEFAULT_MARKET_ID).trim().toLowerCase();
}

function deepMerge(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? deepMerge(result[key] || {}, value)
      : value;
  }
  return result;
}

function readProfileConfig(root, id) {
  const filePath = path.join(root, "config", "markets", id, "market.json");
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function absolutePaths(root, pathsConfig) {
  return Object.fromEntries(Object.entries(pathsConfig).map(([key, value]) => [key, path.join(root, value)]));
}

function loadMarketProfile({ root, argv = process.argv, env = process.env } = {}) {
  const repoRoot = root || path.resolve(__dirname, "..");
  const id = normalizeMarketId(marketArg(argv, env));
  const builtin = BUILTIN_MARKETS[id];
  if (!builtin) {
    throw new Error(`Unsupported market: ${id}. Expected one of: ${Object.keys(BUILTIN_MARKETS).join(", ")}`);
  }
  const configured = readProfileConfig(repoRoot, id);
  const merged = deepMerge(builtin, configured);
  return {
    ...merged,
    id,
    root: repoRoot,
    paths: absolutePaths(repoRoot, merged.paths)
  };
}

module.exports = {
  DEFAULT_MARKET_ID,
  loadMarketProfile,
  marketArg,
  normalizeMarketId
};
