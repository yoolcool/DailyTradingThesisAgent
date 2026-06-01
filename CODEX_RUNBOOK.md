# Daily Trading Thesis Agent Runbook

이 프로젝트는 장기투자 리포트가 아니라 매일의 트레이딩 판단을 돕는 로컬 리포트 생성기다.

핵심 질문은 다음과 같다.

> 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

## 모바일 실행

모바일에서 매일 사용할 한 줄 명령:

```text
모바일 데일리 루틴 실행
```

이 명령을 받으면 `daily-publish` 또는 `daily-check:win + prepare-pages`를 실행하고, 모바일 요약에는 반드시 아래 웹 리포트 링크를 포함한다.

https://yoolcool.github.io/DailyTradingThesisAgent/

상세 절차와 모바일 보고 형식은 `MOBILE_DAILY_PROMPT.md`를 따른다.

## Windows 운영 표준 명령

PowerShell의 `npm.ps1` 실행 정책 문제를 피하기 위해 Windows에서는 아래 명령을 표준으로 사용한다.

```powershell
npm.cmd run daily-publish
```

`daily-publish`가 없으면 아래 순서로 실행한다.

```powershell
npm.cmd run daily-check:win
npm.cmd run prepare-pages
```

성공하면 아래 파일이 모두 갱신되고 검증된다.

- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`
- `docs/index.html`
- `docs/latest.md`
- `docs/latest.png`

## ETF 판단 철학

ETF는 개별 종목보다 낮은 수익률을 의미하지 않는다. 트레이딩 관점에서 ETF는 특정 테마의 추세를 더 안정적으로 추종하는 수단이 될 수 있다.

개별 종목 알파보다 테마 베타가 더 강한 날에는 ETF를 우선 검토한다. 반대로 특정 종목의 실적, 가이던스, 뉴스 촉매가 뚜렷하면 개별 종목을 우선 검토한다.

## 데이터 위치

- 관심 종목: `data/watchlist.json`
- 보유 종목: `data/holdings.json`
- ETF 후보: `data/watchlist_etfs.json`

현재는 `MOCK DATA` 모드다. 리포트 상단과 ETF 섹션에 `MOCK DATA - 실전 투자 판단 사용 금지` 경고가 표시되어야 한다.
