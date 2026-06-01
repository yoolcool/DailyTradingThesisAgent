# Mobile Daily Prompt

모바일 ChatGPT 앱의 Codex 탭에서 아래 한 줄만 입력하면 된다.

```text
MOBILE_DAILY_PROMPT.md 절차대로 오늘 리포트 생성하고 모바일 요약으로 보고해줘.
```

## 프로젝트 경로

```text
C:\Users\yool\Documents\Daily Trading Thesis Agent
```

## 실행 전 확인

1. 현재 위치가 프로젝트 루트인지 확인한다.
2. `package.json`이 있는지 확인한다.
3. 현재 폴더가 다르면 올바른 프로젝트 루트로 이동한다.
4. 실행 전 `git status`를 확인한다.

## 실행 명령

기본 리포트만 생성할 때:

```powershell
npm.cmd run daily-check:win
```

GitHub Pages 배포용 `docs/` 파일까지 준비할 때:

```powershell
npm.cmd run daily-publish
```

## 생성 확인

- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`
- `docs/index.html`
- `docs/latest.md`
- `docs/latest.png`

## 주의사항

- mock 데이터면 반드시 mock이라고 표시한다.
- 실제 데이터처럼 단정하지 않는다.
- Codex 인앱 브라우저 스냅샷 실패는 치명 오류로 보지 않는다.
- `reports/latest.png` 또는 `docs/latest.png` 생성 성공을 시각 검증 성공 기준으로 본다.
- 리포트 전체를 모바일에 길게 붙여넣지 말고 요약만 보고한다.
- 배포 실패는 로컬 리포트 생성 실패와 구분해서 보고한다.
- `git push`가 필요하면 사용자 확인을 먼저 요청한다.

## 웹 리포트 링크

실제 GitHub Pages URL을 모를 때는 아래 placeholder를 사용한다.

```text
https://yoolcool.github.io/DailyTradingThesisAgent/
```

## 완료 후 모바일 보고 형식

```text
[오늘의 데일리 트레이딩 요약]

- 생성 성공 여부:
- 데이터 모드:
- 시장 상태:
- 강한 테마 TOP 3:
- ETF 후보 TOP 5:
- 개별 종목보다 ETF가 나은 테마:
- 진입 후보 TOP 3:
- 보유 유지:
- 청산/주의:
- ETF 과열 주의:
- 오늘 반드시 확인할 조건 3개:
- 리포트 파일 위치:
- 웹 리포트 링크:
- 남은 문제:
```
