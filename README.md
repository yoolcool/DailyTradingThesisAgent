# Daily Trading Thesis Agent

매일 트레이딩 판단을 돕는 로컬 리포트 생성기입니다.

핵심 질문:

> 현재 가격에서 살까, 누가 왜 더 비싸게 사줄 수 있는가?

## 초심

이 프로젝트의 목적은 장기투자 설명이나 일반 시황 정리가 아닙니다.

1. 현재 실제로 돈이 몰리는 자산을 찾습니다.
2. 왜 돈이 몰리는지 가능한 범위에서 설명합니다.
3. 지금 사면 누가, 왜, 더 비싸게 사줄 수 있는지 트레이딩 관점에서 정리합니다.
4. 진입 조건과 무효화 조건을 분명히 적습니다.
5. 모바일과 웹에서 짧고 직관적으로 볼 수 있게 만듭니다.

## 모바일 데일리 루틴

```text
모바일 데일리 루틴 실행
```

이 명령은 항상 `REAL_TEST` 리포트 생성을 의미합니다. 실행 후 GitHub Pages 반영을 위해 `git add`, `git commit`, `git push`까지 자동 수행합니다. 이 프로젝트에서는 사용자가 이미 push를 허용한 것으로 간주합니다.

웹 리포트:

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

GitHub Pages 반영:

```powershell
git add data/market_data_real.json reports docs
git commit -m "Update daily trading report"
git push
```

commit할 변경사항이 없으면 `변경사항 없음, push 생략`으로 보고합니다.

## 데이터 모드

- `REAL_TEST`: yfinance 실제 가격/거래량 데이터를 사용합니다. 뉴스, 옵션, ETF 구성종목 확산도, 유동성/스프레드는 가능한 provider와 fallback 상태에 따라 동적으로 반영합니다.
- `MOCK`: mock 데이터 모드입니다. 기본 모바일 데일리 루틴에서는 사용하지 않습니다.

뉴스/옵션/ETF 확산도/유동성 데이터가 부족하면 `reasonConfidence`를 `HIGH`로 올리지 않습니다. 데이터가 없으면 숫자를 지어내지 않고 `데이터 없음`, `미연결`, `수집 실패`, `fallback`으로 표시합니다.

## 선택 데이터 provider

API 키가 없어도 가격/거래량 기반 REAL_TEST 리포트는 생성됩니다. 선택 키는 `.env.example` 또는 GitHub Actions secrets에 둘 수 있습니다.

- 가격/거래량: yfinance, 필수
- 뉴스: Yahoo Finance RSS fallback, 향후 `FINNHUB_API_KEY`, `NEWS_API_KEY`, `FMP_API_KEY` 등으로 확장 가능
- 옵션: Yahoo Finance options endpoint fallback, 향후 `POLYGON_API_KEY`, `TRADIER_API_KEY` 등으로 확장 가능
- ETF holdings/breadth: `config/etfHoldingsFallback.json` 샘플 기반 확산도
- 유동성/스프레드: bid/ask가 없으면 가격 * 거래량의 거래대금 fallback

provider 호출 실패, API rate limit, API 키 미설정은 전체 빌드를 실패시키지 않습니다. 실패한 데이터는 리포트 하단 `데이터 수집 상태`에 기록되고 점수와 confidence에는 제한적으로만 반영됩니다.

## 리포트 주요 필드

- `moneyFlowScore`
- `과열 리스크`
- `reasonConfidence`
- `whyMoneyIsFlowing`
- `likelyNextBuyer`
- `whyThisCouldTradeHigher`
- `오늘 실제 행동 후보`
- 실제 데이터 기반 차트

## 모바일 최종 보고

최종 보고는 반드시 `[오늘의 데일리 트레이딩 요약]`으로 시작하며, 짧은 결론 중심으로 작성합니다.

필수 포함:

- 시장 상태
- 오늘 결론 3줄 이내
- 오늘 실제 행동 후보 최대 3개
- ETF 후보 TOP 5
- 개별 종목 요약
- 오늘 체크 3개
- 배포 상태
- 웹 리포트 링크
- 남은 문제
