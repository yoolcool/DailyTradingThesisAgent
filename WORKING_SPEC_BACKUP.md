# DailyTradingThesisAgent 작업 명세 백업

이 문서는 DailyTradingThesisAgent의 현재 구현 의도와 구조를 복원하기 위한 백업용 작업 명세서다. 단순 README가 아니라, 코드가 꼬이거나 브랜치를 되돌려야 할 때 현재 리포트 구조와 개선 방향을 다시 구현할 수 있도록 기획 의도, 데이터 처리 방식, 점수 체계, UI 구조, 차트 시스템, 검증 기준, 향후 TODO를 함께 기록한다.

작성 기준 상태:

- 프로젝트 루트: `C:\Users\yool\Documents\Daily Trading Thesis Agent`
- 기본 운영 모드: `REAL_TEST`
- 기본 생성/검증 명령: `npm.cmd run daily-publish:real-test`
- Pages 결과 URL: `https://yoolcool.github.io/DailyTradingThesisAgent/`

## 1. 프로젝트 목적

DailyTradingThesisAgent는 장기 가치투자 리포트가 아니라, 미국 주식/ETF 시장에서 단기적으로 돈이 몰리는 트렌드에 탑승해 시세차익 기회를 찾기 위한 데일리 트레이딩 리포트 생성기다.

핵심 질문:

- 현재 가격에서 누가 사고 있는가?
- 앞으로 누가 더 비싸게 사줄 수 있는가?
- 지금 돈이 몰리는 트렌드는 얼마나 강한가?
- 이 트렌드는 아직 탈 만한가, 아니면 이미 과열인가?
- 오늘 실제 행동 후보는 무엇인가?

중요 원칙:

- 단순히 최근 오른 종목을 나열하지 않는다.
- 돈이 몰리는 이유, 다음 매수 주체, 트렌드 강도, 진입 품질, 무효화 조건을 함께 판단한다.
- 개별주는 주로 데이트레이딩 관점으로 본다.
- ETF는 테마/스윙 관점으로 본다.
- `강한 테마`와 `오늘 사도 되는 자리`는 반드시 분리해서 판단한다.

## 2. 현재 리포트 전체 구조

현재 리포트는 `src/main.js`에서 Markdown, HTML, PNG, daily snapshot을 생성한다. Pages 배포용 파일은 `scripts/prepare-pages.js`가 `reports`와 `data` 산출물을 `docs`로 복사한다.

권장/현재 리포트 흐름:

1. 데이터 모드 경고와 생성 시각
2. 오늘의 데일리 트레이딩 요약
3. 시장 상태
4. 오늘 시장을 지배하는 서사
5. 트렌드 강도 판단
6. 최근 추천 결과 트래킹
7. 오늘 실제 행동 후보
8. ETF 트레이딩 보고서
9. 개별 종목 트레이딩 보고서
10. Nasdaq-100 전체 moneyFlowScore 1차 표
11. 감시 ETF 목록
12. 최종 실행 판단
13. 데이터 수집 상태
14. moneyFlowScore 산정 방식과 트렌드 강도 설명

이 순서가 중요한 이유:

- 먼저 시장을 지배하는 서사를 파악한다.
- 그 서사의 돈 몰림 강도를 판단한다.
- 과거 추천 결과로 모델의 신뢰도를 확인한다.
- 마지막으로 오늘 실제 행동 후보를 본다.

주요 산출물:

- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`
- `reports/charts/*.png`
- `data/latest-report.json`
- `data/previous-report.json`
- `data/recommendation-history.json`
- `data/dailyReports/YYYY-MM-DD.json`
- `docs/index.html`
- `docs/latest.md`
- `docs/latest.png`
- `docs/data/*`

## 3. 시장 상태 섹션

시장 상태는 리포트 상단에서 오늘 매매 환경을 요약한다.

현재 포함 정보:

- 데이터 모드
- 가격/거래량 연결 여부
- 뉴스 연결 여부
- ETF 구성종목 확산도 연결 여부
- 스프레드/유동성 연결 여부
- 생성 시각
- 시장 상태
- 오늘 돈의 방향
- 강한 테마 TOP 3

현재 시장 상태 라벨:

- `위험선호`
- `중립`
- `위험회피`

현재 구현:

- `marketStatus(etfs)`가 QQQ와 SPY의 5D/20D 수익률을 중심으로 판단한다.
- QQQ/SPY 데이터가 부족하면 `중립`으로 둔다.

확장 가능한 데이터:

- SPY 1D / 5D / 20D
- QQQ 1D / 5D / 20D
- IWM 1D / 5D
- VIX 변화
- HYG/LQD 상대강도
- ARKK/QQQ 상대강도
- SOXX/QQQ 상대강도
- TLT, GLD, DXY 흐름

해석 원칙:

- 시장이 위험선호이면 성장주, 고베타, AI, 소프트웨어, 반도체 후보의 성공 확률이 높아진다.
- 시장이 위험회피이면 개별 테마가 강하더라도 추격매수를 경계한다.
- 시장 상태는 오늘 행동 후보의 confidence와 entry quality에 영향을 준다.

## 4. 오늘 시장을 지배하는 서사

이 섹션은 당일 시장에서 돈이 몰리는 주요 테마/서사를 정리한다.

현재 narrative 정의는 `src/main.js`의 `NARRATIVE_DEFINITIONS`에 있다. 대표 서사는 다음과 같다.

- AI 인프라 재가속
- AI 소프트웨어/사이버보안 확산
- 위험선호 성장주 재진입
- 방산/안보 프리미엄
- 전력망/원전/인프라 병목
- 비트코인/디지털 자산 위험선호
- 매크로 방어/헤지

각 서사 카드 포함 정보:

- 서사명
- 상태
- narrativeScore
- reasonConfidence
- 근거 ETF
- 근거 개별 종목
- 돈이 몰리는 이유
- 오늘 행동
- 다음 매수 주체
- 가장 좋은 트레이딩 수단
- 서사가 깨지는 조건
- 상세 점수 근거

서사 상태 예시:

- 잠복
- 부상
- 지배
- 관찰
- 과열
- 약화
- 소멸

현재 구현상 주요 상태:

- `지배`
- `부상`
- `관찰`
- `약화`
- `소멸`

설계 원칙:

- 서사 점수는 특정 종목 하나의 급등만으로 높게 주면 안 된다.
- ETF, 관련 개별 종목, 거래량, 뉴스 촉매, 시장 환경을 함께 본다.
- 좋은 서사와 오늘 진입 가능한 자리는 분리해서 판단한다.
- 뉴스 데이터가 미연결이거나 직접 촉매가 약하면 `HIGH` confidence로 승격하지 않는다.

## 5. 트렌드 강도 판단 엔진

이 프로젝트에서 가장 중요한 핵심 엔진이다.

목적:

- 돈이 몰리는 트렌드가 얼마나 강한지 판단한다.
- 이 흐름이 테마 전체로 확산되는지 확인한다.
- 아직 진입 가능한지, 아니면 과열인지 구분한다.

핵심 지표:

1. Trend Strength Index, TSI
2. Exhaustion Risk
3. Entry Quality Score
4. Theme Breadth Score
5. Market Regime Score

현재 구현 위치:

- `buildNarrativeTrendMetrics`
- `trendPriceMomentumScore`
- `trendVolumeScore`
- `trendThemeBreadthScore`
- `trendEtfSyncScore`
- `trendCatalystScore`
- `trendMarketRegimeScore`
- `trendExhaustionRisk`
- `itemEntryQualityScore`

### 5.1 Trend Strength Index

Trend Strength Index는 테마/서사 단위의 돈 몰림 강도 점수다.

총점:

- 0~100점

구성 개념:

A. 가격 모멘텀 강도, 25점

- 5D 수익률
- 20D 수익률
- 1D/5D 가속도
- 52주 고점 근접 또는 돌파
- 5일선/20일선 상회 여부

B. 거래량/거래대금 강도, 20점

- RVOL
- 거래대금 증가
- 상승일 거래량이 하락일 거래량보다 강한지
- 프리마켓 또는 장중 거래 활성도

C. 테마 확산도, 20점

- 테마 구성 종목 중 5D 상승 비율
- 테마 구성 종목 중 20일선 위 종목 비율
- 테마 구성 종목 중 RVOL 1.2 이상 비율
- 전일 고점 돌파 종목 수
- 상위 1~2개 종목 쏠림도는 감점

D. ETF/섹터 동조성, 15점

- 관련 ETF 5D/20D 강세
- 관련 ETF 거래량 증가
- 관련 ETF가 SPY/QQQ 대비 강한지
- 복수 ETF가 같은 방향인지

E. 뉴스/촉매 신선도, 10점

- 최근 24~72시간 내 직접 뉴스
- 실적, 가이던스, 수주, 정책, 규제, 제품 발표 등 가격 설명력이 있는지
- 뉴스가 테마 전체에 영향을 주는지, 특정 종목만의 이벤트인지 구분

F. 시장 위험선호 환경, 10점

- QQQ/SPY/IWM 상태
- VIX 변화
- HYG/LQD 상대강도
- 성장주/고베타 ETF 상태
- 시장 상태가 해당 테마 매매에 우호적인지

현재 구현은 위 설계 개념을 완전한 외부 데이터 기반으로 모두 채운 상태는 아니다. 가격/거래량, 관련 ETF/종목 동조성, confidence 제한, 일부 뉴스/provider 상태를 중심으로 계산한다.

### 5.2 Exhaustion Risk

Exhaustion Risk는 이미 너무 오른 상태인지, 추격매수 위험이 큰지 판단하는 점수다.

총점:

- 0~100점

반영 조건:

- 5D 수익률 과도
- 20D 수익률 과도
- 52주 신고가 부근
- 갭상승 후 종가 약함
- 거래량 폭증 후 가격 둔화
- 뉴스 발표 직후 과도한 급등
- ETF는 약한데 개별주만 급등
- 테마 내 상위 1~2개 종목 쏠림 과도
- RSI 등 과열 지표는 향후 확장 가능

판정:

- 0~30: 과열 낮음
- 31~60: 주의
- 61~80: 추격 위험
- 81~100: 소진 위험

현재 구현은 `trendExhaustionRisk`와 개별 `scoreAsset`의 risk penalty를 통해 과열/추격 위험을 반영한다.

### 5.3 Entry Quality Score

Entry Quality Score는 오늘 실제 진입하기 좋은지를 판단하는 점수다.

계산 개념:

- Trend Strength Index
- moneyFlowScore
- Market Regime Score
- Catalyst Freshness

에서 긍정 점수를 얻고,

- Exhaustion Risk
- Liquidity Risk
- Gap Risk
- Spread Risk

를 차감한다.

중요:

- Trend Strength가 높다고 무조건 매수 후보가 되면 안 된다.
- Trend Strength는 높지만 Exhaustion Risk도 높으면 `강하지만 추격 위험`으로 표시한다.
- Trend Strength는 중간이지만 Entry Quality가 좋으면 `초기 진입 후보`로 표시한다.

## 6. moneyFlowScore 체계

moneyFlowScore는 매수 추천 점수가 아니라 현재 ETF 또는 종목으로 돈이 몰리는 정도를 추적하는 트레이딩 후보 점수다.

현재 하단 설명:

- `moneyFlowScore(1차) = 추세 + 단기 모멘텀 + 중기 모멘텀 + 거래량 + 신고가 근접 + 이동평균`
- `moneyFlowScore(최종 원점수) = moneyFlowScore(1차) + 뉴스 + ETF 확산도 + 유동성 + 관련 ETF 대비 상대강도 + 리스크 패널티`
- `moneyFlowScore(최종 표시 점수) = min(100, max(0, 최종 원점수))`

주요 저장 필드:

- `moneyFlowScore`
- `moneyFlowScoreInitial`
- `moneyFlowScoreFinal`
- `finalRawScore`
- `finalDisplayScore`
- `wasCapped`
- `capReason`
- `formulaText`
- `riskPenalty`
- `riskPenaltySummary`
- `reasonConfidence`
- `reasonConfidenceExplanation`
- `tieBreakerReason`

점수 구간:

- 80점 이상: 강한 자금 유입 후보
- 65~79점: 관심 후보
- 50~64점: 관찰 후보
- 50점 미만: 매매 금지 또는 우선순위 낮음

예외 처리:

- 가격/거래량 데이터가 없으면 점수는 0 또는 `데이터 없음`으로 처리한다.
- provider 수집 실패는 전체 빌드를 실패시키지 않는다.
- 데이터 부족은 confidence를 낮추고 리포트의 데이터 수집 상태에 남긴다.

## 7. 오늘 실제 행동 후보 선정 로직

오늘 행동 후보는 단순히 moneyFlowScore 순서로 고르면 안 된다.

현재 구현:

- `chooseActionCandidates(stocks, etfs)`가 ETF와 개별 종목 후보를 섞어 최대 3개 행동 후보를 고른다.
- ETF와 개별 종목은 `compareActionCandidateScore` 및 관련 tie-break 기준으로 정렬된다.
- 개별 종목은 관련 ETF 대비 상대강도를 함께 본다.
- 진입 후보에는 `진입 후보` 또는 `진입 가능` 상태만 들어가야 한다.
- `관찰` 상태는 실제 행동 후보에 섞지 않는 것을 목표로 한다.

개별주 후보 선정 기준:

1. 소속 테마의 Trend Strength Index
2. 해당 종목의 moneyFlowScore
3. Entry Quality Score
4. Exhaustion Risk
5. 유동성/스프레드
6. 무효화 조건 명확성
7. 직접 촉매 여부
8. 다음 매수 주체 존재 여부
9. 관련 ETF 대비 상대강도

개별주 필수 조건 예시:

- 소속 테마 TSI >= 70
- 해당 종목 moneyFlowScore >= 75
- RVOL >= 1.2
- 거래대금 충분
- 무효화 조건 명확

개별주 제외 조건:

- 5D 급등이 과도하고 윗꼬리 발생
- ETF는 약한데 개별주만 급등
- 거래량 급증 후 종가 약함
- 유동성 부족
- 스프레드 과도

ETF 후보 선정 기준:

1. ETF 자체 moneyFlowScore
2. 해당 테마의 Trend Strength Index
3. ETF 구성종목 확산도
4. SPY/QQQ 대비 상대강도
5. 거래대금과 스프레드
6. 과열 리스크

ETF 제외 조건:

- 한 종목 급등 때문에 ETF만 오른 경우
- 구성종목 대부분 약한데 ETF만 버틴 경우
- 거래대금 부족
- 추세 약화

## 8. 최근 추천 결과 트래킹

목적:

- 과거 추천이 실제로 장중 기회를 줬는지, 종가 기준으로 유지됐는지 검증한다.
- 리포트의 신뢰도를 매일 추적한다.

위치:

- `트렌드 강도 판단` 아래
- `오늘 실제 행동 후보` 위

현재 구현:

- `updateRecommendationTrackingHistory(report)`가 `data/recommendation-history.json`을 갱신한다.
- `buildTrackingSeedEntries(report)`가 오늘 추천 seed를 만든다.
- `reviewStockTrackingItem`과 `reviewEtfTrackingItem`이 추천 이후 성과를 계산한다.
- 실패한 추천도 보존한다.
- survivorship bias를 피하기 위해 과거 추천 기록을 덮어쓰지 않는 것을 원칙으로 한다.

### 8.1 개별주 트래킹

개별주는 데이트레이딩 후보이므로 추천 이후 첫 정규장의 장중 최고가와 종가를 추적한다.

대상:

- 개별주 추천 Top 3

추적 기준:

- 리포트 생성 시간이 미국 정규장 시작 전이면 같은 날짜의 정규장을 추적한다.
- 리포트 생성 시간이 미국 정규장 중이면 가능하면 추천 시각 이후의 장중 최고가와 해당일 종가를 추적한다.
- 리포트 생성 시간이 미국 정규장 마감 후이면 다음 거래일의 정규장을 추적한다.
- intraday 데이터가 있으면 추천 시각 이후 high를 사용한다.
- 현재 구현은 주로 일봉 high/close 기반이며, intraday 정밀 추적은 향후 TODO다.

저장 필드:

- `reportDate`
- `reportGeneratedAt`
- `reportGeneratedAtET`
- `ticker`
- `assetType: STOCK`
- `rank`
- `recommendationPrice`
- `trackingSessionDate`
- `trackingStatus`
- `intradayHighAfterRecommendation`
- `trackingClose`
- `highReturnPct`
- `closeReturnPct`
- `resultLabel`
- `resultComment`

결과 판정:

- `highReturnPct >= 3` and `closeReturnPct >= 1`: 성공
- `highReturnPct >= 3` and `closeReturnPct < 1`: 단타 유효
- `highReturnPct >= 1` and `< 3`: 제한적 유효
- `highReturnPct < 1` and `closeReturnPct < 0`: 실패
- 데이터 부족: 추적 대기

### 8.2 ETF 트래킹

ETF는 테마/스윙 후보이므로 추천 이후 1주일 동안의 최고가와 현재 종가를 추적한다.

대상:

- ETF 추천 Top 3

추적 기준:

- 추천일 이후 5거래일 또는 1주일
- `weeklyHigh`는 추적 기간 내 최고가
- `latestClose`는 현재 확보 가능한 가장 최근 종가
- 아직 5거래일이 지나지 않았으면 `in_progress`
- 완료되면 `complete`

저장 필드:

- `reportDate`
- `ticker`
- `assetType: ETF`
- `rank`
- `recommendationPrice`
- `trackingStartDate`
- `trackingEndDate`
- `trackingStatus`
- `weeklyHigh`
- `latestClose`
- `weeklyHighReturnPct`
- `latestCloseReturnPct`
- `resultLabel`
- `resultComment`

결과 판정:

- `weeklyHighReturnPct >= 2` and `latestCloseReturnPct >= 1`: 성공
- `weeklyHighReturnPct >= 2` and `latestCloseReturnPct < 0.5`: 단기 고점 후 반납
- `latestCloseReturnPct < -1.5`: 실패
- `trackingStatus = in_progress`: 진행 중

UI:

- 요약 카드 2개
- 개별주 Top 3 추천 성과 요약
- ETF 추천 성과 요약
- 상세 테이블은 기본 접힘
- 실패한 추천도 반드시 보존

## 9. 차트 시스템 명세

현재 차트는 단순 라인 차트에서 캔들 차트 기반으로 개선되었다.

목적:

- 차트는 단순 장식이 아니라, 리포트의 진입 조건과 무효화 조건을 시각적으로 검증하는 도구다.
- 텍스트에 있는 `전일 고점 돌파`, `5일선 유지`, `20일선 이탈` 조건이 차트에서 바로 확인되어야 한다.

현재 구현 위치:

- HTML/SVG 차트: `renderTradingChart`, `renderChartSvg`
- 정적 PNG fallback: `writeChartPng`
- 데이터 정규화: `chartBars`
- 기준선 계산: `chartReferenceLevels`
- 라벨 충돌 회피: `layoutAnnotationLabels`
- 현재가 축 배지: `renderCurrentAxisMarker`

현재 포함 요소:

- 캔들 차트
- 일봉 OHLCV
- MA5
- MA20
- 거래량 바
- 1M / 3M / 6M 기간 토글
- 날짜 축
- 가격 축
- 현재가 axis marker
- 전일 고점 / 추천가 / 무효화 기준선
- 오른쪽 annotation gutter
- annotation label collision avoidance
- 병합 라벨
- leader line
- 추천 시점 마커
- 범례
- OHLCV tooltip

### 9.1 차트 데이터 필드

각 티커별 필요 데이터:

- `date`
- `open`
- `high`
- `low`
- `close`
- `volume`
- `ma5`, 차트 렌더링 시 계산
- `ma20`, 차트 렌더링 시 계산
- `previousHigh`, 전일 bar의 high
- `recommendationPrice`
- `invalidationPrice`, 현재는 최신 MA20을 사용
- `currentPrice`
- `reportDate`
- `relativeVolume`
- `return5dPct`
- `return20dPct`

현재 `scripts/fetch_market_data.py`는 yfinance 일봉 1년 데이터를 받고, chart history로 최근 132거래일 OHLCV를 저장한다.

### 9.2 차트 헤더

차트 상단 요약 줄은 다음 형식을 따른다.

```text
AIQ · 3M Daily · Close $72.32 · 5D +6.10% · 20D +18.40% · RVOL 1.12x
```

포함 필드:

- ticker
- selectedRange
- lastClose
- return5D
- return20D
- RVOL

### 9.3 기준선

기준선 종류:

- 현재가
- 추천가
- 전일 고점
- 무효화
- 52주 고점은 향후 선택 확장 가능

스타일:

- 현재가: 가격축 배지
- 추천가: 파란 점선
- 전일 고점: 청록 점선
- 무효화: 빨간 점선
- 52주 고점: 얇은 회색선, 향후 TODO

라벨 축약:

- 전일 고점 -> 전고
- 추천가 -> 추천
- 무효화 -> 무효

가격 포맷:

- 축과 라벨은 소수점 2자리 고정
- 예: `$71.20`

### 9.4 오른쪽 라벨 겹침 해결

현재 반영된 해결 방식:

1. 오른쪽에 라벨 전용 gutter 영역을 확보한다.

   - 캔들 플롯 영역, 가격축, 라벨 영역을 분리한다.
   - SVG 너비를 넓히고 `axisWidth`, `gutterWidth`를 분리한다.

2. 현재가는 일반 annotation이 아니라 가격축 배지(axis marker)로 표시한다.

   - 현재가 숫자만 우측 가격축에 강조 표시한다.
   - 직전 종가 대비 상승/하락 색상을 반영한다.

3. 전일 고점, 추천가, 무효화 라벨은 오른쪽 gutter에 세로 스택 방식으로 배치한다.

   - 원래 y좌표 기준으로 정렬한다.
   - 서로 겹치면 자동 오프셋을 적용한다.
   - 라벨이 이동하면 원래 기준선과 라벨을 leader line으로 연결한다.

4. annotation collision avoidance 로직을 추가했다.

   - 라벨 후보를 y값 기준으로 정렬한다.
   - 인접 라벨 간 최소 간격을 유지한다.
   - 간격이 부족하면 아래 라벨을 밀어낸다.
   - overflow가 발생하면 전체를 위로 당긴다.
   - 다시 위쪽에서 간격을 보정하고 underflow를 처리한다.
   - 라벨 텍스트는 이동해도 기준선 위치는 움직이지 않는다.

5. 가격 차이가 매우 작은 라벨은 병합 표시한다.

   - `추천`과 `전고`가 가까우면 하나의 그룹 라벨로 표시 가능하다.
   - 예:

```text
전고 / 추천
$71.20 ~ $71.50
```

6. 추천 시점 표시는 오른쪽 라벨 그룹에서 분리한다.

   - 추천 시점은 세로 점선 상단에 작은 `추천` 배지로 표시한다.
   - 오른쪽 라벨 충돌 회피 대상에 포함하지 않는다.

7. 범례는 전고, 추천, 무효를 독립 색상으로 표시한다.

### 9.5 차트 해석 문구 TODO

차트 아래에 한 줄 해석을 추가하는 것이 다음 개선 과제다.

예시:

- 현재가는 MA5 위에 있으나 전일 고점 아래에서 눌림 중이다. 거래량이 20일 평균 이상으로 재증가하면 돌파 시도 가능성이 높아진다.
- 현재가는 추천가 아래로 내려왔고 MA5도 이탈했다. 추격보다 재돌파 확인 전까지 관찰 우선이다.
- 현재가 > MA5 > MA20 구조가 유지되고 있어 상승 추세는 유효하지만, 전일 고점 근처에서 과열 라벨이 있으면 추격 매수는 제한한다.

## 10. 데이터 저장 및 히스토리

추천 기록과 추적 결과는 누적 저장해야 한다.

원칙:

- 매일 리포트 생성 시 해당 날짜의 추천 결과를 history JSON에 저장한다.
- 기존 추천 history를 덮어쓰지 않는다.
- 실패한 추천도 남긴다.
- 데이터 수집 실패 시 confidence를 낮추거나 해당 점수 반영을 제외한다.
- 수집 실패 데이터는 `데이터 없음` 또는 `추적 대기`로 표시한다.

추천 기록 공통 필드:

- `reportDate`
- `reportGeneratedAt`
- `reportGeneratedAtET`
- `ticker`
- `assetType`
- `rank`
- `recommendationPrice`
- `recommendationClosePrice`
- `narrative`
- `narrativeStatus`
- `moneyFlowScore`
- `finalRawScore`
- `trendStrengthIndex`
- `exhaustionRisk`
- `entryQualityScore`
- `confidence`
- `actionLabel`
- `entryCondition`
- `invalidationCondition`
- `reason`
- `nextBuyer`
- `catalyst`
- `liquidityStatus`
- `spreadStatus`

현재 파일:

- `data/recommendation-history.json`
- `data/latest-report.json`
- `data/previous-report.json`
- `data/dailyReports/YYYY-MM-DD.json`
- `docs/data/*`

## 11. 데이터 파이프라인

현재 REAL_TEST 데이터 수집:

- `npm.cmd run fetch-real-data`
- 내부적으로 `node scripts/run-fetch-real-data.js`
- Python 스크립트 `scripts/fetch_market_data.py` 실행
- yfinance로 Nasdaq-100, watchlist, holdings, ETF watchlist를 batch download

필수 입력 파일:

- `data/watchlist.json`
- `data/holdings.json`
- `data/watchlist_etfs.json`
- `config/nasdaq100Fallback.json`
- `config/etfHoldingsFallback.json`

출력 파일:

- `data/market_data_real.json`

각 market item 주요 필드:

- `ticker`
- `assetType`
- `lastClose`
- `dailyChangePct`
- `return5dPct`
- `return20dPct`
- `volume`
- `avgVolume20d`
- `relativeVolume`
- `high52w`
- `drawdownFrom52wHighPct`
- `dataDate`
- `dataSource`
- `dataStatus`
- `history`

`history` 필드:

- 최근 132거래일
- `date`
- `open`
- `high`
- `low`
- `close`
- `volume`

예외 처리:

- yfinance empty history -> `dataStatus: missing`
- 가격 이력 부족 -> `dataStatus: missing`
- 일부 ticker 실패는 전체 빌드 실패로 처리하지 않는다.
- batch 실패 시 개별 fetch로 fallback한다.

## 12. UI 원칙

전체 UI 원칙:

- 모바일 가독성을 해치지 않는다.
- 정보는 많지만 기본적으로 접힘 구조를 활용한다.
- 오늘 행동 후보를 보기 전에 시장 서사, 트렌드 강도, 추천 결과 트래킹을 먼저 확인할 수 있게 한다.
- 숫자와 라벨은 한눈에 해석 가능해야 한다.
- `강하다`와 `지금 사도 된다`를 분리해서 표현한다.

카드 UI:

- 데스크톱에서는 카드 2~3개를 한 줄에 배치할 수 있다.
- 모바일에서는 세로 스택으로 자연스럽게 전환한다.
- 카드 내부 텍스트가 세로로 너무 길어지지 않도록 요약 우선 구조를 유지한다.
- 상세 근거는 기본 접힘 처리한다.
- 행동 후보 카드에는 차트, 핵심 점수, 시장 지표, 근거, score breakdown이 함께 들어간다.

표 UI:

- 모바일에서는 필요한 경우 가로 스크롤 허용
- 중요한 컬럼은 왼쪽에 배치
- 숫자는 부호 포함
- 예: `+3.24%`, `-1.08%`

배지:

- 성공: 긍정
- 단타 유효 / 단기 고점 후 반납: 중립
- 제한적 유효 / 진행 중: 관찰
- 실패: 부정
- 과열: 경고
- 추적 대기: 중립

## 13. 출력 문장 규칙

리포트 문장은 다음 원칙을 따른다.

- `강하다`와 `사도 된다`를 분리해서 표현한다.
- Trend Strength가 높지만 Exhaustion Risk가 높으면 `강하지만 추격 위험`이라고 표시한다.
- Trend Strength는 중간이지만 Entry Quality가 좋으면 `초기 진입 후보`로 표시한다.
- 테마 확산도가 낮으면 `개별 종목 이벤트성`이라고 표시한다.
- ETF 동조성이 약하면 `테마 자금 확인 부족`이라고 표시한다.
- 시장 위험선호가 약하면 `시장 환경 비우호`라고 표시한다.
- 직접 촉매가 없으면 `가격/거래량 중심 후보`라고 표시한다.
- 데이터가 부족하면 단정하지 말고 confidence를 낮춘다.

## 14. 현재까지의 주요 개선 히스토리

현재까지 반영된 주요 방향:

1. 옵션 데이터는 수집/해석이 어렵고 리포트 목적과 맞지 않아 제거
2. 오늘의 원칙 섹션 제거
3. 오늘의 분리 결론을 ETF 행동 후보와 개별 종목 행동 후보 중심으로 단순화
4. moneyFlowScore 산정 방식은 리포트 하단으로 이동
5. 오늘 돈이 몰리는 테마에는 `돈이 몰리는 이유`를 설명
6. 각 추천의 moneyFlowScore 산정 근거는 기본 접힘 처리
7. 추천 결과 트래킹 섹션 추가
8. 개별주 Top 3는 추천 이후 첫 정규장의 장중 최고가와 종가 추적
9. ETF Top 3는 추천 이후 1주일 최고가와 현재 종가 추적
10. 트렌드 강도 판단 엔진 설계 및 일부 구현
11. Nasdaq-100 전체 스캔 도입
12. 캔들 차트 도입
13. OHLCV 132거래일 저장
14. MA5/MA20, 거래량, 날짜/가격 축, 기준선 도입
15. 오른쪽 기준선 라벨 겹침 개선
16. 현재가 axis marker 도입
17. 전고/추천/무효 라벨 gutter stack 및 collision avoidance 도입
18. 추천 시점 마커 분리
19. 차트 상단 요약 줄 강화

## 15. 향후 TODO

우선순위 높음:

1. Trend Strength Index 계산 로직 추가 정교화
2. Exhaustion Risk와 Entry Quality Score를 행동 후보 선정에 더 강하게 반영
3. 추천 후보 정렬 기준을 moneyFlowScore 단독에서 Entry Quality 중심으로 변경
4. 추천 결과 트래킹 데이터의 자동 갱신 안정화
5. ETF 구성종목 확산도 계산 강화
6. 거래량 20일 평균선 및 RVOL 시각화
7. 차트 한 줄 해석 자동 생성
8. 모바일 차트 가독성 추가 개선

우선순위 중간:

1. 추천일 마커와 추천가 기준의 실제 추천 시각 정밀화
2. 테마별 breadth 시각화
3. 시장 위험선호 점수화
4. 뉴스 촉매 직접성 점수 개선
5. 데이터 수집 실패 시 fallback 로직 개선
6. 52주 고점 라인 선택 표시
7. ETF와 개별 종목 상대강도 차트 보조 표시

우선순위 낮음:

1. 5분봉/15분봉 intraday 차트 확장
2. 프리마켓/애프터마켓 반영
3. ETF와 개별 종목 비교 오버레이
4. 사용자 관심 티커 watchlist 저장 UI
5. 과거 추천 성과 대시보드 별도 페이지화

## 16. 복원 체크리스트

나중에 프로젝트를 복원할 때 아래가 모두 있으면 현재 의도를 거의 재현할 수 있다.

- 시장 상태 섹션이 있는가?
- 오늘 시장을 지배하는 서사 TOP 3가 있는가?
- 각 서사에 근거 ETF, 근거 개별 종목, 돈이 몰리는 이유가 있는가?
- Trend Strength / Exhaustion Risk / Entry Quality 개념이 분리되어 있는가?
- 최근 추천 결과 트래킹이 있는가?
- 개별주는 다음 정규장 장중 최고가와 종가를 추적하는가?
- ETF는 1주일 최고가와 현재 종가를 추적하는가?
- 오늘 실제 행동 후보가 ETF와 개별주를 함께 고려하되 최대 3개로 제한되는가?
- ETF 후보와 개별주 후보가 각각 따로 표시되는가?
- 각 후보에 진입 조건과 무효화 조건이 있는가?
- 차트가 캔들 기반인가?
- 차트에 MA5/MA20, 거래량, 날짜축, 가격축이 있는가?
- 추천가, 전일 고점, 무효화선이 차트에 표시되는가?
- 현재가는 axis marker로 분리되어 있는가?
- 오른쪽 라벨 충돌 회피 로직이 있는가?
- 가격이 가까운 라벨은 병합되는가?
- leader line이 있는가?
- 상세 근거는 기본 접힘 처리되어 있는가?
- 모바일 가독성이 유지되는가?
- moneyFlowScore 산정 방식은 하단에 설명되어 있는가?
- 데이터 부족 시 confidence가 낮아지는가?

## 17. 운영 및 검증 절차

기본 운영 명령:

```powershell
npm.cmd run daily-publish:real-test
```

이 명령은 다음을 수행한다.

1. `fetch-real-data`
2. `daily-report:real-test`
3. `verify-report`
4. `screenshot-report`
5. `prepare-pages`

검증 기준:

- 리포트 상단 데이터 모드가 `REAL_TEST`인지 확인
- chart PNG가 생성되는지 확인
- HTML에 interactive trading chart가 있는지 확인
- 캔들 차트, tooltip hit area, axis marker, gutter label, chart summary line이 있는지 확인
- Nasdaq-100 전체 표가 있는지 확인
- details/summary가 기본 접힘 구조인지 확인
- 오늘 실제 행동 후보가 3개 이하인지 확인
- scored item에 `reasonConfidence`, `finalRawScore`, `tieBreakerReason`, `linkedNarrative`가 있는지 확인

작업 완료 원칙:

- 사용자가 별도로 금지하지 않는 한 코드, 리포트, 데이터 파이프라인, UI를 수정한 뒤에는 관련 빌드/검증을 실행한다.
- 검증이 통과하면 변경사항을 커밋하고 현재 브랜치를 원격에 푸시한다.
- 검증이 실패하면 커밋/푸시하지 않고 실패 원인과 남은 문제를 보고한다.

## 18. 문서 저장 위치

이 문서는 프로젝트 루트에 저장한다.

파일명:

```text
WORKING_SPEC_BACKUP.md
```

향후 업데이트 원칙:

- 대규모 구조 변경이 있을 때 이 문서를 함께 갱신한다.
- 기존 문서가 있으면 삭제보다 변경점 중심으로 업데이트한다.
- 차트, 점수 체계, 추천 트래킹, 데이터 파이프라인 변경은 반드시 기록한다.
