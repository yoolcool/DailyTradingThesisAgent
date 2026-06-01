# Daily Trading Thesis Agent Runbook

이 프로젝트는 장기투자 리포트가 아니라 매일의 트레이딩 판단을 돕는 로컬 리포트 생성기다.

핵심 질문은 다음과 같다.

> 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

## 모바일 실행

모바일에서는 아래 한 줄만 입력하면 된다.

```text
MOBILE_DAILY_PROMPT.md 절차대로 오늘 리포트 생성하고 모바일 요약으로 보고해줘.
```

상세 절차는 `MOBILE_DAILY_PROMPT.md`를 따른다.

## Windows 운영 표준 명령

PowerShell의 `npm.ps1` 실행 정책 문제를 피하기 위해 Windows에서는 아래 명령을 표준으로 사용한다.

```powershell
npm.cmd run daily-check:win
```

성공하면 아래 세 파일이 모두 갱신되고 검증된다.

- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`

## ETF 판단 철학

ETF는 개별 종목보다 낮은 수익률을 의미하지 않는다. 트레이딩 관점에서 ETF는 특정 테마의 추세를 더 안정적으로 추종하는 수단이 될 수 있다.

개별 종목 알파보다 테마 베타가 더 강한 날에는 ETF를 우선 검토한다. 반대로 특정 종목의 실적, 가이던스, 뉴스 촉매가 뚜렷하면 개별 종목을 우선 검토한다.

## 데이터 위치

- 관심 종목: `data/watchlist.json`
- 보유 종목: `data/holdings.json`
- ETF 후보: `data/watchlist_etfs.json`

현재는 `MOCK DATA` 모드다. 리포트 상단과 ETF 섹션에 `MOCK DATA - 실전 투자 판단 사용 금지` 경고가 표시되어야 한다.
