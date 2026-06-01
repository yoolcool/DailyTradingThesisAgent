# Daily Trading Thesis Agent Runbook

이 프로젝트는 장기투자 리포트가 아니라 매일의 트레이딩 판단을 돕는 로컬 리포트 생성기입니다.

핵심 질문:

> 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

## 모바일 실행

모바일에서 매일 사용할 한 줄 명령:

```text
모바일 데일리 루틴 실행
```

이 명령은 `REAL_TEST` 모드 실행을 의미합니다. 즉, 실제 가격/거래량 데이터를 수집한 뒤 `daily-publish:real-test`를 실행하고, GitHub Pages 웹 리포트를 갱신하며, 모바일 요약에는 반드시 아래 웹 리포트 링크를 포함합니다.

https://yoolcool.github.io/DailyTradingThesisAgent/

기존 mock 실행이 필요할 경우에는 별도 명령으로 분리합니다.

mock 실행 명령:

```text
모바일 데일리 루틴 MOCK 실행
```

mock 실행은 기존 mock 모드 리포트를 생성할 때만 사용합니다.

자세한 절차와 모바일 보고 형식은 `MOBILE_DAILY_PROMPT.md`를 따릅니다.

## Windows 운영 표준 명령

PowerShell의 `npm.ps1` 실행 정책 문제를 피하기 위해 Windows에서는 `npm.cmd`를 표준으로 사용합니다.

모바일 기본 루틴과 같은 REAL_TEST:

```powershell
npm.cmd run daily-publish:real-test
```

`daily-publish:real-test`가 없으면 아래 순서로 실행합니다.

```powershell
npm.cmd run fetch-real-data
npm.cmd run daily-report:real-test
npm.cmd run verify-report
npm.cmd run screenshot-report
npm.cmd run prepare-pages
```

기존 mock 리포트가 필요할 때만 아래 명령을 사용합니다.

```powershell
npm.cmd run daily-publish
```

성공하면 아래 파일이 모두 갱신되고 검증됩니다.

- `data/market_data_real.json`
- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`
- `docs/index.html`
- `docs/latest.md`
- `docs/latest.png`

## 데이터 모드

- `REAL_TEST`: 가격/거래량은 yfinance 실제 데이터를 사용합니다. 뉴스, 옵션, ETF 구성종목 확산도, 스프레드, 일부 판단 로직은 아직 검증 중입니다.
- `MOCK`: mock 데이터입니다. 실전 투자 판단에 사용하면 안 되며, 별도 mock 명령으로만 실행합니다.

REAL_TEST 실행 전 Python 의존성을 확인합니다.

```powershell
python -m pip install -r requirements.txt
```

현재 PC에서 `python`이 PATH에 없으면 `fetch-real-data` 스크립트가 `PYTHON`, `python`, `py`, Codex 번들 Python 순서로 실행 파일을 자동 탐색합니다.

데이터 수집 실패 시 숫자를 지어내지 않고 `데이터 없음`으로 표시합니다.

REAL_TEST 배너:

```text
REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스/옵션/일부 판단 로직은 검증 중
```

## 데이터 위치

- 관심 종목: `data/watchlist.json`
- 보유 종목: `data/holdings.json`
- ETF 후보: `data/watchlist_etfs.json`
- REAL_TEST 수집 데이터: `data/market_data_real.json`

## ETF 판단 철학

ETF는 개별 종목보다 특정 테마의 추세를 더 안정적으로 추종할 수 있습니다. 테마 베타가 강하고 개별 승자를 고르기 어려운 날에는 ETF를 우선 검토하고, 특정 종목의 실적, 가이던스, 뉴스 촉매가 뚜렷한 날에는 개별 종목을 우선 검토합니다.
