const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");
const SRC_MAIN = path.join(ROOT, "src", "main.js");
const NARRATIVE_DEFINITIONS_CONFIG = path.join(ROOT, "config", "narrativeDefinitions.json");
const DAILY_REPORTS_DIR = path.join(DATA_DIR, "dailyReports");
const NASDAQ_FALLBACK = path.join(ROOT, "config", "nasdaq100Fallback.json");
const NARRATIVE_STOCKS = path.join(ROOT, "config", "narrativeStocks.json");

const LOOKBACK_REPORTS = 10;
const TOP_NEW_CANDIDATES = 5;

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function extractNarrativeDefinitions() {
  const configured = readJson(NARRATIVE_DEFINITIONS_CONFIG, null);
  if (Array.isArray(configured) && configured.length) return configured;

  const source = fs.readFileSync(SRC_MAIN, "utf8");
  const startToken = source.includes("const DEFAULT_NARRATIVE_DEFINITIONS = ")
    ? "const DEFAULT_NARRATIVE_DEFINITIONS = "
    : "const NARRATIVE_DEFINITIONS = ";
  const start = source.indexOf(startToken);
  if (start < 0) throw new Error("Could not find NARRATIVE_DEFINITIONS in src/main.js");

  const arrayStart = source.indexOf("[", start);
  const endToken = "\n];";
  const end = source.indexOf(endToken, arrayStart);
  if (arrayStart < 0 || end < 0) throw new Error("Could not parse NARRATIVE_DEFINITIONS array");

  const literal = source.slice(arrayStart, end + 2);
  return Function(`"use strict"; return (${literal});`)();
}

function loadDailyReports() {
  if (!fs.existsSync(DAILY_REPORTS_DIR)) return [];
  return fs.readdirSync(DAILY_REPORTS_DIR)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .slice(-LOOKBACK_REPORTS)
    .map((name) => ({
      fileName: name,
      date: name.replace(/\.json$/, ""),
      data: readJson(path.join(DAILY_REPORTS_DIR, name), {})
    }));
}

function avg(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : 0;
}

function rounded(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function collectItems(snapshot) {
  const reference = snapshot.referenceCandidates || {};
  return [
    ...(snapshot.actionCandidates || []),
    ...(snapshot.stockActionCandidates || []),
    ...(snapshot.etfActionCandidates || []),
    ...(snapshot.stockEntryCandidates || []),
    ...(snapshot.stockPullbackCandidates || []),
    ...(snapshot.stockWatchCandidates || []),
    ...(snapshot.etfWatchCandidates || []),
    ...(snapshot.darkHorseCandidates || []),
    ...(reference.stocks || []),
    ...(reference.etfs || [])
  ].filter((row) => row && row.ticker);
}

function summarizeExistingNarratives(definitions, reports) {
  return definitions.map((definition) => {
    const daily = reports.map((report) => {
      const narrative = (report.data.narratives || []).find((row) => row.name === definition.name);
      const topRank = (report.data.topNarratives || []).findIndex((row) => row.name === definition.name);
      const items = collectItems(report.data).filter((row) => row.linkedNarrative === definition.name);
      return {
        date: report.date,
        score: Number(narrative?.narrativeScore || 0),
        trendStrengthIndex: Number(narrative?.trendStrengthIndex || 0),
        status: narrative?.status || "없음",
        reasonConfidence: narrative?.reasonConfidence || "LOW",
        directNewsCount: Number(narrative?.directNewsCount || 0),
        topRank: topRank >= 0 ? topRank + 1 : null,
        itemCount: items.length,
        actionCount: items.filter((row) => ["진입 후보", "조건부 진입"].includes(row.actionLabel)).length
      };
    });
    const avgScore = avg(daily.map((row) => row.score));
    const avgTrend = avg(daily.map((row) => row.trendStrengthIndex));
    const top3Days = daily.filter((row) => row.topRank).length;
    const directNewsDays = daily.filter((row) => row.directNewsCount > 0).length;
    const itemDays = daily.filter((row) => row.itemCount > 0).length;
    const latest = daily.at(-1) || {};
    const statusCounts = countBy(daily.map((row) => row.status));
    const verdict = existingNarrativeVerdict({ avgScore, avgTrend, top3Days, directNewsDays, itemDays, latest });
    return {
      name: definition.name,
      verdict,
      avgScore: rounded(avgScore),
      avgTrendStrengthIndex: rounded(avgTrend),
      top3Days,
      directNewsDays,
      itemDays,
      latestStatus: latest.status || "없음",
      latestScore: latest.score || 0,
      statusCounts,
      daily
    };
  });
}

function existingNarrativeVerdict(summary) {
  if (summary.top3Days >= 3 || summary.avgScore >= 45 || summary.avgTrend >= 45) return "KEEP";
  if (summary.itemDays >= 3 || summary.directNewsDays >= 2 || summary.latest.score >= 20) return "REWORK";
  return "RETIRE_WATCH";
}

function loadTickerMetadata() {
  const rows = [
    ...asRows(readJson(NASDAQ_FALLBACK, [])),
    ...asRows(readJson(NARRATIVE_STOCKS, []))
  ];
  const byTicker = new Map();
  for (const row of rows) {
    if (!row?.ticker) continue;
    byTicker.set(row.ticker, {
      ticker: row.ticker,
      name: row.name || row.ticker,
      sector: row.sector || "Unknown",
      industry: row.industry || "Unknown"
    });
  }
  return byTicker;
}

function asRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.members)) return value.members;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function buildClusterKey(row, metadata) {
  if (row.assetType === "ETF") return row.linkedNarrative || row.name || row.ticker;
  const meta = metadata.get(row.ticker) || {};
  if (meta.industry && meta.industry !== "Unknown") return meta.industry;
  if (meta.sector && meta.sector !== "Unknown") return meta.sector;
  return row.linkedNarrative || "Unclassified";
}

function discoverNewCandidates(definitions, reports) {
  const latest = reports.at(-1)?.data || readJson(path.join(DATA_DIR, "latest-report.json"), {});
  const metadata = loadTickerMetadata();
  const existingNames = new Set(definitions.map((row) => row.name));
  const definitionTickers = new Set(definitions.flatMap((row) => [...(row.etfs || []), ...(row.stocks || [])]));
  const clusters = new Map();

  for (const report of reports) {
    for (const row of collectItems(report.data)) {
      const key = buildClusterKey(row, metadata);
      if (!key || existingNames.has(key)) continue;
      const cluster = clusters.get(key) || {
        key,
        tickers: new Map(),
        etfs: new Set(),
        stocks: new Set(),
        dates: new Set(),
        scores: [],
        finalRawScores: [],
        relativeVolumes: [],
        linkedNarratives: new Set(),
        confidenceCounts: {}
      };
      const meta = metadata.get(row.ticker) || {};
      cluster.tickers.set(row.ticker, {
        ticker: row.ticker,
        name: row.name || meta.name || row.ticker,
        assetType: row.assetType || "STOCK",
        sector: meta.sector || "",
        industry: meta.industry || "",
        alreadyCovered: definitionTickers.has(row.ticker)
      });
      if (row.assetType === "ETF") cluster.etfs.add(row.ticker);
      else cluster.stocks.add(row.ticker);
      for (const symbol of parseSymbols(row.relatedEtfs)) cluster.etfs.add(symbol);
      cluster.dates.add(report.date);
      cluster.scores.push(Number(row.moneyFlowScoreFinal ?? row.moneyFlowScore ?? 0));
      cluster.finalRawScores.push(Number(row.finalRawScore ?? row.moneyFlowScoreFinal ?? 0));
      cluster.relativeVolumes.push(Number(row.relativeVolume ?? row.market?.relativeVolume ?? 0));
      if (row.linkedNarrative) cluster.linkedNarratives.add(row.linkedNarrative);
      const confidence = row.reasonConfidence || "LOW";
      cluster.confidenceCounts[confidence] = (cluster.confidenceCounts[confidence] || 0) + 1;
      clusters.set(key, cluster);
    }
  }

  const currentScanRows = latest.stockUniverseScan?.results || [];
  for (const row of currentScanRows.slice(0, 30)) {
    const meta = metadata.get(row.ticker);
    if (!meta) continue;
    const key = meta.industry && meta.industry !== "Unknown" ? meta.industry : meta.sector;
    const cluster = clusters.get(key) || {
      key,
      tickers: new Map(),
      etfs: new Set(),
      stocks: new Set(),
      dates: new Set(),
      scores: [],
      finalRawScores: [],
      relativeVolumes: [],
      linkedNarratives: new Set(),
      confidenceCounts: {}
    };
    cluster.tickers.set(row.ticker, {
      ticker: row.ticker,
      name: row.name || meta.name || row.ticker,
      assetType: "STOCK",
      sector: meta.sector || "",
      industry: meta.industry || "",
      alreadyCovered: definitionTickers.has(row.ticker)
    });
    cluster.stocks.add(row.ticker);
    cluster.dates.add(latest.reportDate || "latest");
    cluster.scores.push(Number(row.moneyFlowScoreFinal ?? row.moneyFlowScoreInitial ?? 0));
    cluster.finalRawScores.push(Number(row.finalRawScore ?? row.moneyFlowScoreFinal ?? 0));
    clusters.set(key, cluster);
  }

  return [...clusters.values()]
    .map((cluster) => scoreCluster(cluster, definitions))
    .filter((cluster) => cluster.members.length >= 2)
    .sort((a, b) => b.discoveryScore - a.discoveryScore)
    .slice(0, TOP_NEW_CANDIDATES);
}

function scoreCluster(cluster, definitions) {
  const members = [...cluster.tickers.values()]
    .sort((a, b) => Number(a.alreadyCovered) - Number(b.alreadyCovered) || a.ticker.localeCompare(b.ticker));
  const coveredCount = members.filter((row) => row.alreadyCovered).length;
  const overlapPenalty = members.length ? (coveredCount / members.length) * 18 : 0;
  const recurrence = cluster.dates.size;
  const avgScore = avg(cluster.scores);
  const avgRaw = avg(cluster.finalRawScores);
  const avgRvol = avg(cluster.relativeVolumes);
  const highConfidence = Number(cluster.confidenceCounts.HIGH || 0);
  const mediumConfidence = Number(cluster.confidenceCounts.MEDIUM || 0);
  const discoveryScore = rounded(
    Math.min(recurrence, LOOKBACK_REPORTS) * 7 +
    Math.min(members.length, 8) * 4 +
    avgScore * 0.25 +
    avgRaw * 0.15 +
    Math.max(0, avgRvol - 1) * 8 +
    highConfidence * 8 +
    mediumConfidence * 3 -
    overlapPenalty
  );
  const proposedName = proposeNarrativeName(cluster.key, members);
  const proposedDefinition = proposeDefinition(proposedName, cluster, members, definitions);
  return {
    key: cluster.key,
    proposedName,
    discoveryScore,
    recurrenceDays: recurrence,
    avgCandidateScore: rounded(avgScore),
    avgRawScore: rounded(avgRaw),
    avgRelativeVolume: rounded(avgRvol, 2),
    confidenceCounts: cluster.confidenceCounts,
    linkedNarratives: [...cluster.linkedNarratives],
    overlapWithExistingTemplateCount: coveredCount,
    members,
    proposedDefinition
  };
}

function proposeNarrativeName(key, members) {
  const lower = key.toLowerCase();
  if (lower.includes("semiconductor equipment")) return "반도체 장비 사이클 재평가";
  if (lower.includes("semiconductor")) return "반도체 설계/공급망 재가속";
  if (lower.includes("cybersecurity")) return "사이버보안 지출 재가속";
  if (lower.includes("software")) return "소프트웨어 실적/AI 수익화";
  if (lower.includes("biotech") || lower.includes("pharma")) return "바이오/헬스케어 촉매";
  if (lower.includes("beverage")) return "필수소비재 음료 방어 성장";
  if (lower.includes("retail") || lower.includes("consumer")) return "소비 회복/방어주 선별";
  if (lower.includes("electric") || lower.includes("utilities")) return "전력 유틸리티 수요 재평가";
  const sector = members.find((row) => row.sector)?.sector;
  return `${key || sector || "신규"} 자금 유입`;
}

function proposeDefinition(name, cluster, members) {
  const etfs = unique([...cluster.etfs]).slice(0, 5);
  const stocks = unique([...cluster.stocks]).slice(0, 8);
  const preferredEtfs = etfs.slice(0, 3);
  const preferredStocks = stocks.slice(0, 4);
  const themeLabel = name.replace(/\s+/g, " ");
  return {
    name,
    etfs,
    stocks,
    nextBuyer: `${themeLabel}을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금`,
    preferredEtfs,
    preferredStocks,
    breakCondition: `${preferredEtfs[0] || preferredStocks[0] || "대표 자산"} 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈`,
    todayAction: "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
  };
}

function parseSymbols(value) {
  if (Array.isArray(value)) return value.map(String).map((row) => row.trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,/| ]+/)
    .map((row) => row.trim())
    .filter((row) => /^[A-Z][A-Z0-9.]{0,5}$/.test(row));
}

function buildMarkdown(review) {
  const lines = [];
  lines.push("# 네러티브 재점검 제안서");
  lines.push("");
  lines.push(`- 생성 시각: ${review.generatedAtKST}`);
  lines.push(`- 분석 리포트 수: ${review.lookbackReports.length}개 (${review.lookbackReports.join(", ") || "없음"})`);
  lines.push(`- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.`);
  lines.push("");

  lines.push("## 기존 네러티브 점검");
  lines.push("");
  lines.push("| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |");
  lines.push("|---|---:|---:|---:|---:|---:|---|");
  for (const row of review.existingNarratives) {
    lines.push(`| ${row.name} | ${verdictLabel(row.verdict)} | ${row.avgScore} | ${row.top3Days} | ${row.directNewsDays} | ${row.itemDays} | ${row.latestStatus} (${row.latestScore}) |`);
  }
  lines.push("");

  lines.push("## 신규/분리 후보 TOP 5");
  lines.push("");
  if (!review.newCandidates.length) {
    lines.push("- 충분한 반복 후보가 없습니다.");
  }
  for (const [index, candidate] of review.newCandidates.entries()) {
    lines.push(`### ${index + 1}. ${candidate.proposedName}`);
    lines.push("");
    lines.push(`- 발견 점수: ${candidate.discoveryScore}`);
    lines.push(`- 반복 일수: ${candidate.recurrenceDays}`);
    lines.push(`- 평균 후보 점수: ${candidate.avgCandidateScore}`);
    lines.push(`- 기존 템플릿 포함 종목 수: ${candidate.overlapWithExistingTemplateCount}`);
    lines.push(`- 기존 연결 네러티브: ${candidate.linkedNarratives.join(", ") || "없음"}`);
    lines.push(`- 구성 후보: ${candidate.members.map((row) => `${row.ticker}${row.alreadyCovered ? "*" : ""}`).join(", ")}`);
    lines.push("");
    lines.push("```js");
    lines.push(JSON.stringify(candidate.proposedDefinition, null, 2));
    lines.push("```");
    lines.push("");
  }
  lines.push("*표시는 기존 네러티브 템플릿에 이미 포함된 종목/ETF입니다.");
  lines.push("");

  lines.push("## 적용 가이드");
  lines.push("");
  lines.push("1. `KEEP`은 유지합니다.");
  lines.push("2. `REWORK`는 구성 종목/ETF 또는 설명 문구를 조정합니다.");
  lines.push("3. `삭제 관찰`은 바로 삭제하지 말고 1~2회 더 재점검합니다.");
  lines.push("4. 신규 후보는 `reports/narrative-review.json`의 `proposedDefinition`을 검토한 뒤 승인 시 `src/main.js`의 `NARRATIVE_DEFINITIONS`에 반영합니다.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function verdictLabel(value) {
  if (value === "KEEP") return "유지";
  if (value === "REWORK") return "수정";
  if (value === "RETIRE_WATCH") return "삭제 관찰";
  return value;
}

function generatedAtKST() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
    timeStyle: "short"
  }).format(new Date());
}

function main() {
  const definitions = extractNarrativeDefinitions();
  const reports = loadDailyReports();
  const review = {
    generatedAtKST: generatedAtKST(),
    mode: "NARRATIVE_REVIEW",
    source: {
      definitions: "src/main.js NARRATIVE_DEFINITIONS",
      dailyReports: `data/dailyReports/*.json last ${LOOKBACK_REPORTS}`
    },
    lookbackReports: reports.map((report) => report.date),
    existingNarratives: summarizeExistingNarratives(definitions, reports),
    newCandidates: discoverNewCandidates(definitions, reports)
  };

  const jsonPath = path.join(REPORTS_DIR, "narrative-review.json");
  const mdPath = path.join(REPORTS_DIR, "narrative-review.md");
  writeJson(jsonPath, review);
  writeText(mdPath, buildMarkdown(review));
  console.log(`Generated ${jsonPath}`);
  console.log(`Generated ${mdPath}`);
}

main();
