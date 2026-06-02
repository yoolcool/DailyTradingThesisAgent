const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");
const htmlPath = path.join(REPORTS_DIR, "latest.html");
const pngPath = path.join(REPORTS_DIR, "latest.png");

const browserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

function findExecutable() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

async function main() {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing HTML report: ${htmlPath}. Run npm.cmd run daily-report first.`);
  }

  const executablePath = findExecutable();
  if (!executablePath) {
    throw new Error("Could not find Chrome or Edge for Playwright. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE.");
  }

  let browser;
  try {
    browser = await chromium.launch({ executablePath, headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 1200 } });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });

    const checks = await page.evaluate(() => {
      const body = document.body.textContent || "";
      const warning = document.querySelector("[data-report-warning]")?.textContent || "";
      return {
        title: document.title,
        h1: document.querySelector("h1")?.textContent || "",
        warning,
        stockCards: document.querySelectorAll("[data-stock-card]").length,
        etfCards: document.querySelectorAll("[data-etf-card]").length,
        chartImages: document.querySelectorAll("img.chart").length,
        detailsCount: document.querySelectorAll("details").length,
        hasValidWarning: warning.includes("MOCK DATA") || warning.includes("REAL DATA TEST"),
        hasConclusion: body.includes("오늘의 분리 결론"),
        hasScoreGuide: body.includes("moneyFlowScore 산정 방식"),
        hasInitialFinalLabels: body.includes("moneyFlowScore(1차)") && body.includes("moneyFlowScore(최종)"),
        hasRiskDetails: body.includes("리스크 패널티 산정 근거"),
        hasStockUniverseTable: Boolean(document.querySelector("[data-stock-universe-table]")),
        hasTableScroll: Boolean(document.querySelector(".table-scroll"))
      };
    });

    if (checks.title !== "Daily Trading Thesis Report") throw new Error(`Unexpected page title: ${checks.title}`);
    if (!checks.h1) throw new Error("Rendered page is missing h1.");
    if (!checks.hasValidWarning) throw new Error("Rendered page is missing a recognized data mode warning banner.");
    if (!checks.hasConclusion) throw new Error("Rendered page is missing split conclusion section.");
    if (!checks.hasScoreGuide) throw new Error("Rendered page is missing moneyFlowScore guide section.");
    if (!checks.hasInitialFinalLabels) throw new Error("Rendered page is missing initial/final moneyFlowScore labels.");
    if (!checks.hasRiskDetails) throw new Error("Rendered page is missing risk penalty details.");
    if (!checks.hasStockUniverseTable) throw new Error("Rendered page is missing Nasdaq-100 table.");
    if (!checks.hasTableScroll) throw new Error("Rendered page is missing horizontal table scroll wrapper.");
    if (checks.detailsCount < 1) throw new Error("Rendered page is missing mobile-friendly details blocks.");
    if (checks.stockCards < 1) throw new Error("Rendered page has no stock cards.");
    if (checks.etfCards !== 5) throw new Error(`Rendered page should have exactly 5 detailed ETF cards, found ${checks.etfCards}.`);
    if (checks.chartImages < 1) throw new Error("Rendered page has no chart images.");

    await page.screenshot({ path: pngPath, fullPage: true });
  } catch (error) {
    throw new Error(`Playwright screenshot verification failed: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }

  const size = fs.statSync(pngPath).size;
  if (size < 10_000) throw new Error(`Screenshot was generated but looks too small: ${size} bytes`);

  console.log(`Generated ${pngPath}`);
  console.log("Playwright screenshot verification passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
