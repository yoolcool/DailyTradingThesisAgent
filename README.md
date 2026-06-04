# Daily Trading Thesis Agent

매일 트레이딩 판단을 돕는 로컬 리포트 생성기입니다.

핵심 질문:

> 현재 가격에서 누가 사고 있고, 누가 앞으로 더 비싸게 사줄 수 있는가?

## 모바일 데일리 루틴

```text
모바일 데일리 루틴 실행
```

위 요청은 `REAL_TEST` 리포트를 생성하고 GitHub Pages 반영을 위해 `git add`, `git commit`, `git push`까지 수행하는 운영 루틴입니다.

결과 페이지:

https://yoolcool.github.io/DailyTradingThesisAgent/

## 설치

```powershell
npm install
python -m pip install -r requirements.txt
```

## 실행

```powershell
npm.cmd run daily-publish:real-test
```

생성 파일:

- `data/market_data_real.json`
- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`
- `reports/charts/`
- `docs/index.html`
- `docs/latest.md`
- `docs/latest.png`
- `docs/charts/`
- `docs/data/`

GitHub Pages 반영:

```powershell
git add data reports docs src scripts README.md
git commit -m "Update daily trading report"
git push
```

## 데이터 모드

- `REAL_TEST`: yfinance 실제 가격/거래량 데이터를 사용합니다. 뉴스, ETF 구성종목 확산도, 거래대금 유동성은 가능한 provider와 fallback 상태에 따라 보조 반영합니다.
- `MOCK`: mock 데이터 모드입니다. 기본 모바일 데일리 루틴에서는 사용하지 않습니다.

뉴스/ETF 확산도/유동성 데이터가 부족하면 `reasonConfidence`를 제한합니다. 데이터가 없으면 숫자를 지어내지 않고 `데이터 없음`, `미연결`, `수집 실패`, `fallback`으로 표시합니다.

## 선택 데이터 Provider

API 키가 없어도 가격/거래량 기반 REAL_TEST 리포트는 생성됩니다.

- 가격/거래량: yfinance, 필수
- 뉴스: Yahoo Finance RSS fallback, 향후 `FINNHUB_API_KEY`, `NEWS_API_KEY`, `FMP_API_KEY` 등으로 확장 가능
- ETF holdings/breadth: `config/etfHoldingsFallback.json` 샘플 기반 확산도
- 거래대금 유동성: 가격 * 거래량의 거래대금 fallback

provider 호출 실패, API rate limit, API 키 미설정은 전체 빌드를 실패시키지 않습니다. 실패한 데이터는 리포트 하단 `데이터 수집 상태`에 기록하고 점수와 confidence에는 제한적으로만 반영합니다.

## 리포트 주요 필드

- `moneyFlowScore`
- `과열 리스크`
- `reasonConfidence`
- `whyMoneyIsFlowing`
- `likelyNextBuyer`
- `whyThisCouldTradeHigher`
- `오늘 실제로 할 일`
- 실제 데이터 기반 차트

## 개별 종목 신규 스캔

개별 종목 신규 후보는 기본적으로 Nasdaq-100 구성종목 전체를 스캔합니다.

- universe provider: `src/data/nasdaq100Universe.js`
- fallback: `config/nasdaq100Fallback.json`
- 가격/거래량 수집: Nasdaq-100 전체 + ETF watchlist를 yfinance batch download로 수집
- 상세 보조 데이터: 가격/거래량 1차 점수 상위 후보와 ETF 후보에 집중
- related ETF: ticker/sector/industry rule 기반 매핑, 정밀 매핑이 없으면 `QQQ` fallback

전일 추천 종목 점검은 실제 계좌 보유 종목이 아니라 전일 리포트 추천 후보의 사후 추적입니다.

- snapshot: `data/dailyReports/YYYY-MM-DD.json`
- latest: `data/latest-report.json`
- previous: `data/previous-report.json`
- Pages artifact: `docs/data/`

## 표시 원칙

- 상단은 행동 후보 중심으로 짧게 유지합니다.
- ETF 후보와 개별 종목 후보를 명확히 분리합니다.
- 전일 추천 종목 점검은 신규 후보와 섞지 않습니다.
- 카드별 상세 점수/보조 데이터/리스크 근거는 접이식 details로 표시합니다.
- `참고: moneyFlowScore 산정 방식`은 리포트 하단에 배치합니다.
