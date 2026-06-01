const { spawnSync } = require("child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function main() {
  let status = run("npm.cmd", ["run", "daily-publish:real-test"]);
  if (status !== 0) process.exit(status);

  status = run("git", ["add", "data/market_data_real.json", "reports", "docs"]);
  if (status !== 0) process.exit(status);

  const staged = capture("git", ["diff", "--cached", "--quiet"]);
  if (staged.status === 0) {
    console.log("변경사항 없음, push 생략");
    return;
  }

  status = run("git", ["commit", "-m", "Update daily trading report"]);
  if (status !== 0) process.exit(status);

  status = run("git", ["push"]);
  if (status !== 0) {
    console.error("git push 실패: 인증 실패, 원격 저장소 설정 없음, 네트워크 실패, 충돌 발생, 권한 없음 중 하나를 확인하세요.");
    process.exit(status);
  }
}

main();
