const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");
const DOCS_DIR = path.join(ROOT, "docs");
const REPORT_CHARTS_DIR = path.join(REPORTS_DIR, "charts");
const DOCS_CHARTS_DIR = path.join(DOCS_DIR, "charts");
const DATA_DIR = path.join(ROOT, "data");
const DOCS_DATA_DIR = path.join(DOCS_DIR, "data");

const files = {
  html: path.join(REPORTS_DIR, "latest.html"),
  markdown: path.join(REPORTS_DIR, "latest.md"),
  png: path.join(REPORTS_DIR, "latest.png")
};

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required report file: ${filePath}`);
  }
}

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function extractGeneratedAt(html) {
  const text = html.replace(/<[^>]+>/g, " ");
  const match = text.match(/생성 시각:\s*([^<\n]+)/);
  return match ? match[1].trim().replace(/\s+/g, " ") : new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function detectDataMode(html) {
  if (html.includes("REAL DATA TEST")) {
    return "REAL_TEST - 가격/거래량은 실제 데이터, 보조 데이터는 연결 상태에 따라 반영";
  }
  if (html.includes("MOCK DATA")) {
    return "MOCK DATA - 실전 매매 판단 사용 금지";
  }
  return "UNKNOWN";
}

function injectPagesLinks(html) {
  const generatedAt = extractGeneratedAt(html);
  const dataMode = detectDataMode(html);
  const links = `
    <section class="pages-links" data-pages-links>
      <h2>리포트 링크</h2>
      <p><strong>데이터 모드:</strong> ${dataMode}</p>
      <p><strong>생성 시각:</strong> ${generatedAt}</p>
      <p>
        <a href="latest.md">Markdown 원문 보기</a>
        <span aria-hidden="true"> - </span>
        <a href="latest.png">스크린샷 보기</a>
      </p>
    </section>`;

  const styles = `
    <style data-pages-links-style>
      .pages-links {
        background: #fff7ed;
        border: 1px solid #fdba74;
      }
      .pages-links a {
        color: #0f766e;
        font-weight: 700;
      }
    </style>`;

  const withoutOldLinks = html.replace(/\s*<section class="pages-links"[\s\S]*?<\/section>/, "");
  const withStyles = withoutOldLinks.includes("data-pages-links-style")
    ? withoutOldLinks
    : withoutOldLinks.replace("</head>", `${styles}\n</head>`);

  return withStyles.replace("<main>", `<main>${links}`);
}

function main() {
  Object.values(files).forEach(assertFile);
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const html = fs.readFileSync(files.html, "utf8");
  const indexHtml = injectPagesLinks(html);

  fs.writeFileSync(path.join(DOCS_DIR, "index.html"), indexHtml, "utf8");
  fs.copyFileSync(files.markdown, path.join(DOCS_DIR, "latest.md"));
  fs.copyFileSync(files.png, path.join(DOCS_DIR, "latest.png"));
  copyDir(REPORT_CHARTS_DIR, DOCS_CHARTS_DIR);
  copyDir(path.join(DATA_DIR, "dailyReports"), path.join(DOCS_DATA_DIR, "dailyReports"));
  for (const name of ["latest-report.json", "previous-report.json"]) {
    const source = path.join(DATA_DIR, name);
    if (fs.existsSync(source)) {
      fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
      fs.copyFileSync(source, path.join(DOCS_DATA_DIR, name));
    }
  }

  console.log(`Prepared ${path.join(DOCS_DIR, "index.html")}`);
  console.log(`Prepared ${path.join(DOCS_DIR, "latest.md")}`);
  console.log(`Prepared ${path.join(DOCS_DIR, "latest.png")}`);
  if (fs.existsSync(DOCS_CHARTS_DIR)) console.log(`Prepared ${DOCS_CHARTS_DIR}`);
  if (fs.existsSync(DOCS_DATA_DIR)) console.log(`Prepared ${DOCS_DATA_DIR}`);
}

main();
