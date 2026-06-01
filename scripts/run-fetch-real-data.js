const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const script = path.join(ROOT, "scripts", "fetch_market_data.py");

const candidates = [
  process.env.PYTHON,
  process.env.CODEX_PYTHON,
  "python",
  "py",
  path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe")
].filter(Boolean);

function commandExists(command) {
  if (command.includes("\\") || command.includes("/")) {
    return fs.existsSync(command);
  }
  const probe = spawnSync(command, command === "py" ? ["-3", "--version"] : ["--version"], {
    encoding: "utf8",
    shell: false
  });
  return probe.status === 0;
}

function main() {
  const python = candidates.find(commandExists);
  if (!python) {
    throw new Error("Python executable was not found. Install Python or set PYTHON to python.exe.");
  }

  const args = python === "py" ? ["-3", script] : [script];
  const result = spawnSync(python, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`fetch_market_data.py failed with exit code ${result.status}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
