const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_MAIN = path.join(ROOT, "src", "main.js");
const REVIEW_PATH = path.join(ROOT, "reports", "narrative-review.json");
const OUTPUT_PATH = path.join(ROOT, "config", "narrativeDefinitions.json");

const REQUIRED_FIELDS = [
  "name",
  "etfs",
  "stocks",
  "nextBuyer",
  "preferredEtfs",
  "preferredStocks",
  "breakCondition",
  "todayAction"
];

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function extractDefaultDefinitions() {
  const source = fs.readFileSync(SRC_MAIN, "utf8");
  const startToken = source.includes("const DEFAULT_NARRATIVE_DEFINITIONS = ")
    ? "const DEFAULT_NARRATIVE_DEFINITIONS = "
    : "const NARRATIVE_DEFINITIONS = ";
  const start = source.indexOf(startToken);
  if (start < 0) throw new Error("Could not find default narrative definitions in src/main.js");

  const arrayStart = source.indexOf("[", start);
  const end = source.indexOf("\n];", arrayStart);
  if (arrayStart < 0 || end < 0) throw new Error("Could not parse narrative definitions array");

  const literal = source.slice(arrayStart, end + 2);
  return Function(`"use strict"; return (${literal});`)();
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(String).map((value) => value.trim()).filter(Boolean))];
}

function cleanDefinition(definition) {
  const clean = {
    name: String(definition.name || "").trim(),
    etfs: uniqueStrings(definition.etfs),
    stocks: uniqueStrings(definition.stocks),
    nextBuyer: String(definition.nextBuyer || "").trim(),
    preferredEtfs: uniqueStrings(definition.preferredEtfs),
    preferredStocks: uniqueStrings(definition.preferredStocks),
    breakCondition: String(definition.breakCondition || "").trim(),
    todayAction: String(definition.todayAction || "").trim()
  };

  for (const field of REQUIRED_FIELDS) {
    if (clean[field] === "" || (Array.isArray(clean[field]) && clean[field].length === 0)) {
      throw new Error(`Invalid narrative definition for ${definition.name || "unknown"}: missing ${field}`);
    }
  }
  return clean;
}

function main() {
  const review = readJson(REVIEW_PATH, null);
  if (!review) throw new Error(`Missing narrative review: ${REVIEW_PATH}`);

  const currentDefinitions = readJson(OUTPUT_PATH, null) || extractDefaultDefinitions();
  const byName = new Map(currentDefinitions.map((definition) => [definition.name, cleanDefinition(definition)]));

  for (const candidate of review.newCandidates || []) {
    if (!candidate?.proposedDefinition) continue;
    const definition = cleanDefinition(candidate.proposedDefinition);
    byName.set(definition.name, definition);
  }

  const applied = [...byName.values()];
  writeJson(OUTPUT_PATH, applied);
  console.log(`Applied ${(review.newCandidates || []).length} narrative review candidates to ${OUTPUT_PATH}`);
  console.log(`Active narrative definitions: ${applied.length}`);
}

main();
