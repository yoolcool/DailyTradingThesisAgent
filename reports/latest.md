# 오늘의 데일리 트레이딩 요약

**REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스 연결, ETF 구성종목 확산도/스프레드/유동성 일부 연결, 옵션 수집 실패로 점수 반영 제한**

**목적:** 이 리포트는 최근 오른 자산을 나열하는 것이 아니라, 돈이 몰리는 근거와 다음 매수 주체가 확인되는 트레이딩 후보를 찾기 위한 보고서다.

> 핵심 질문: 현재 가격에서 살까, 누가 왜 더 비싸게 사줄 수 있는가?

## 0. 시장 상태

- 데이터 모드: REAL_TEST
- 가격/거래량: 연결됨
- 뉴스: 연결됨
- 옵션: 실패
- ETF 구성종목 확산도: 일부 연결
- 스프레드/유동성: 일부 연결
- 생성 시각: 2026년 6월 2일 화요일 오후 12:09
- 시장 상태: 위험선호
- 오늘 돈의 방향: 성장/테마 ETF 쪽 ETF 자금 흐름이 가장 선명함
- 강한 테마 TOP 3: 반도체 공급망(97), AI 소프트웨어(97), AI 플랫폼(90)
- 오늘의 원칙: ETF는 테마 자금 흐름, 개별 종목은 ETF보다 강할 때만 알파 후보로 본다.
- 데이터 한계:
  - API 키 또는 provider 상태에 따라 뉴스/옵션/확산도/스프레드 반영 범위가 달라짐
  - 수집 실패 데이터는 점수 반영에서 제외하거나 confidence를 제한
  - reasonConfidence HIGH는 추가 데이터가 충분히 연결된 후보에만 사용

## 오늘의 분리 결론

- ETF 행동 후보: IGV, AIQ, CIBR, HACK, IPO
- 개별 종목 행동 후보: TSM, PLTR, NVDA
- ETF 우선 테마: 성장/테마 ETF
- 개별 종목 우선 테마: 관련 ETF 대비 추가 확인 필요
- 오늘 최우선 실행 후보: IGV - IGV는 ETF라 테마 단위 자금 흐름을 직접 먹는 후보이고, 현재 점수가 개별 종목 후보보다 우선한다.
- 하지 말아야 할 것: 추격 매수 금지 / ETF와 개별 종목 중복 베팅 금지 / 데이터 미연결 상태에서 과신 금지

## moneyFlowScore 산정 방식

### score의 의미
moneyFlowScore는 “현재 해당 ETF 또는 종목으로 돈이 몰리고 있는 정도”를 가격, 거래량, 추세, 신고가 근접도, ETF 대비 상대강도 등을 바탕으로 수치화한 점수다.

이 점수는 장기 가치평가 점수가 아니다.
이 점수는 “지금 시장 참여자들이 더 비싸게 사줄 가능성이 있는 트레이딩 후보인가?”를 판단하기 위한 단기/중기 모멘텀 점수다.

### 기본 산정 요소
- 20일 수익률: 최근 1개월 수준의 중기 추세를 반영한다.
- 5일 수익률: 최근 1주일 수준의 단기 자금 유입을 반영한다.
- 1일 수익률: 직전 거래일의 단기 추격 매수세를 반영한다.
- 상대 거래량: 가격 상승과 함께 거래량이 늘면 실제 자금 유입 가능성을 높게 본다.
- 52주 고점 대비 위치: 고점 근처 자산은 추세 추종 자금 유입 가능성이 있다.
- 추세 상태: 5일선/20일선/50일선 위에 있는지 확인한다.
- ETF 대비 상대강도: 개별 종목에만 적용하며, 관련 ETF보다 강할 때 개별 종목 우선 가능성이 올라간다.
- 데이터 신뢰도 패널티: 뉴스/옵션/스프레드/ETF 구성종목 확산도 데이터가 미연결이면 HIGH confidence를 사용하지 않는다.

### 점수 구간 해석
- 80점 이상: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
- 65점 이상 80점 미만: 관심 후보. 눌림 또는 돌파 확인 후 진입 검토.
- 50점 이상 65점 미만: 관찰 후보. 흐름은 있으나 우선순위는 낮음.
- 50점 미만: 매매 금지 또는 후순위 후보.

### 주의 문구
moneyFlowScore는 매수 추천 점수가 아니다.
가격/거래량 기반의 자금 흐름 후보 점수이며, 진입 여부는 반드시 진입 조건과 무효화 조건을 함께 확인해야 한다.

## 오늘 돈이 몰리는 테마

- **반도체 공급망**: TSM | 평균 moneyFlowScore 97
- **AI 소프트웨어**: PLTR | 평균 moneyFlowScore 97
- **AI 플랫폼**: MSFT | 평균 moneyFlowScore 90
- **AI 반도체**: NVDA | 평균 moneyFlowScore 84
- **반도체/기술 ETF**: DRAM, SMH, SOXX, SOXQ | 평균 moneyFlowScore 76
- **성장/테마 ETF**: IGV, AIQ, BOTZ, ROBO, CIBR, HACK | 평균 moneyFlowScore 44

## 1. ETF 트레이딩 보고서

### 1-1. ETF 결론
- ETF 우선 후보: IGV, AIQ, CIBR, HACK, IPO
- ETF 관찰 후보: DRAM, BOTZ, IHAK, ITA, PPA
- ETF 매매 금지: IFRA, URA, NLR, OIH, KWEB
- 오늘 ETF 최우선 1개: IGV - 20일선 위에서 눌림 후 재상승 확인
- ETF 섹션 해석: 이 섹션은 개별 종목 선택이 아니라 테마/섹터 단위의 자금 흐름을 ETF로 매매할지 판단하기 위한 영역이다.

### 1-2. ETF 후보 TOP 5

### [ETF IGV] iShares Expanded Tech-Software Sector ETF
- 자산 유형: ETF
- ETF 세부 카테고리: 성장/테마 ETF
- ETF 역할: 테마 베타 매수
- 상태: 진입 가능
- moneyFlowScore: 100
- moneyFlowScore 산정 근거:
  - 총점: 100
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +102
  - 추세 점수: +29
  - 단기 모멘텀: +19
  - 중기 모멘텀: +16
  - 거래량 점수: +18
  - 신고가 근접 점수: +6
  - 이동평균 점수: +14
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - ETF 확산도 점수: +8
  - 유동성 점수: +5
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음
- reasonConfidence: HIGH
- todayActionLabel: ETF 우선
- 기준일: 2026-06-01
- 종가: $107.7
- 1일 수익률: +5.94%
- 5일 수익률: +14.56%
- 20일 수익률: +24.32%
- 상대 거래량: 1.82배
- 52주 고점 대비 위치: -8.72%
- whyMoneyIsFlowing: 20일 +24.32%, 5일 +14.56%, 상대 거래량 1.82배로 가격과 거래량이 함께 개선. 뉴스: Exchange-Traded Funds, Equity Futures Higher Pre-Bell Monday as AI Optimism Overshadows Middle East Risks / ETF 확산도: BROAD_ADVANCE / 유동성: LIQUID
- likelyNextBuyer: 섹터 베타를 사려는 단기 모멘텀 자금과 리밸런싱 자금
- whyThisCouldTradeHigher: 단기 추세가 유지되고 거래량이 1.0배 이상이면 되돌림 이후 재상승을 시도할 수 있음
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 사용
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 4/4/0
  - 핵심 뉴스 요약: Exchange-Traded Funds, Equity Futures Higher Pre-Bell Monday as AI Optimism Overshadows Middle East Risks
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도:
  - 구성종목 데이터 상태: 일부 연결
  - 샘플 수: 3/3
  - 상승 종목 비율: 67%
  - 20일선 위 비율: 100%
  - 50일선 위 비율: 100%
  - 상위 기여 종목: PLTR, MSFT, AAPL
  - 확산도 판단: BROAD_ADVANCE
  - 점수 반영: +8
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $4,263,490,498
  - 평균 거래대금: $2,347,499,851
  - 유동성 판단: LIQUID
  - 매매 영향: 거래대금 기준 실제 매매 가능성에 큰 문제는 낮음
- reasonConfidence 근거: 가격/거래량, 뉴스, ETF 확산도, 유동성 데이터가 확인되어 신뢰도를 높임.
- 진입 조건: 20일선 위에서 눌림 후 재상승 확인
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![IGV chart](charts/IGV.png)
- 기준일 2026-06-01 | 종가 $107.7 | 1일 +5.94% | 5일 +14.56% | 20일 +24.32% | 상대 거래량 1.82배 | 52주 고점 대비 -8.72% | 데이터 소스: yfinance

### [ETF AIQ] Global X Artificial Intelligence & Technology ETF
- 자산 유형: ETF
- ETF 세부 카테고리: 성장/테마 ETF
- ETF 역할: 테마 베타 매수
- 상태: 진입 가능
- moneyFlowScore: 100
- moneyFlowScore 산정 근거:
  - 총점: 100
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +97
  - 추세 점수: +27
  - 단기 모멘텀: +12
  - 중기 모멘텀: +14
  - 거래량 점수: +18
  - 신고가 근접 점수: +12
  - 이동평균 점수: +14
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - ETF 확산도 점수: +8
  - 유동성 점수: +3
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음~중간
- reasonConfidence: HIGH
- todayActionLabel: ETF 우선
- 기준일: 2026-06-01
- 종가: $69.44
- 1일 수익률: +3.15%
- 5일 수익률: +10.56%
- 20일 수익률: +22.21%
- 상대 거래량: 1.59배
- 52주 고점 대비 위치: -0.56%
- whyMoneyIsFlowing: 20일 +22.21%, 5일 +10.56%, 상대 거래량 1.59배로 가격과 거래량이 함께 개선. 뉴스: OpenAI Reportedly Set to File for IPO as Early as Friday / ETF 확산도: BROAD_ADVANCE / 유동성: ACCEPTABLE
- likelyNextBuyer: 섹터 베타를 사려는 단기 모멘텀 자금과 리밸런싱 자금
- whyThisCouldTradeHigher: 52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 사용
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 4/4/0
  - 핵심 뉴스 요약: OpenAI Reportedly Set to File for IPO as Early as Friday
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도:
  - 구성종목 데이터 상태: 일부 연결
  - 샘플 수: 4/4
  - 상승 종목 비율: 75%
  - 20일선 위 비율: 100%
  - 50일선 위 비율: 100%
  - 상위 기여 종목: PLTR, MSFT, NVDA, AAPL
  - 확산도 판단: BROAD_ADVANCE
  - 점수 반영: +8
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $244,751,627
  - 평균 거래대금: $154,162,841
  - 유동성 판단: ACCEPTABLE
  - 매매 영향: 거래대금은 수용 가능하나 bid/ask 확인 필요
- reasonConfidence 근거: 가격/거래량, 뉴스, ETF 확산도, 유동성 데이터가 확인되어 신뢰도를 높임.
- 진입 조건: 전일 고점 돌파 후 5일선 위 유지
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![AIQ chart](charts/AIQ.png)
- 기준일 2026-06-01 | 종가 $69.44 | 1일 +3.15% | 5일 +10.56% | 20일 +22.21% | 상대 거래량 1.59배 | 52주 고점 대비 -0.56% | 데이터 소스: yfinance

### [ETF CIBR] First Trust NASDAQ Cybersecurity ETF
- 자산 유형: ETF
- ETF 세부 카테고리: 성장/테마 ETF
- ETF 역할: 테마 베타 매수
- 상태: 진입 가능
- moneyFlowScore: 100
- moneyFlowScore 산정 근거:
  - 총점: 100
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +102
  - 추세 점수: +30
  - 단기 모멘텀: +16
  - 중기 모멘텀: +16
  - 거래량 점수: +14
  - 신고가 근접 점수: +12
  - 이동평균 점수: +14
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - ETF 확산도 점수: +8
  - 유동성 점수: +3
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음~중간
- reasonConfidence: HIGH
- todayActionLabel: ETF 우선
- 기준일: 2026-06-01
- 종가: $94.15
- 1일 수익률: +5.74%
- 5일 수익률: +11.71%
- 20일 수익률: +36.93%
- 상대 거래량: 1.45배
- 52주 고점 대비 위치: -0.17%
- whyMoneyIsFlowing: 20일 +36.93%, 5일 +11.71%, 상대 거래량 1.45배로 가격과 거래량이 함께 개선. 뉴스: The Asymmetric AI Winner: Cybersecurity ETFs Gaining From Cloud Buildout / ETF 확산도: BROAD_ADVANCE / 유동성: ACCEPTABLE
- likelyNextBuyer: 섹터 베타를 사려는 단기 모멘텀 자금과 리밸런싱 자금
- whyThisCouldTradeHigher: 52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 사용
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 4/4/0
  - 핵심 뉴스 요약: The Asymmetric AI Winner: Cybersecurity ETFs Gaining From Cloud Buildout
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도:
  - 구성종목 데이터 상태: 일부 연결
  - 샘플 수: 2/2
  - 상승 종목 비율: 100%
  - 20일선 위 비율: 100%
  - 50일선 위 비율: 100%
  - 상위 기여 종목: PLTR, MSFT
  - 확산도 판단: BROAD_ADVANCE
  - 점수 반영: +8
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $235,661,122
  - 평균 거래대금: $162,205,951
  - 유동성 판단: ACCEPTABLE
  - 매매 영향: 거래대금은 수용 가능하나 bid/ask 확인 필요
- reasonConfidence 근거: 가격/거래량, 뉴스, ETF 확산도, 유동성 데이터가 확인되어 신뢰도를 높임.
- 진입 조건: 전일 고점 돌파 후 5일선 위 유지
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![CIBR chart](charts/CIBR.png)
- 기준일 2026-06-01 | 종가 $94.15 | 1일 +5.74% | 5일 +11.71% | 20일 +36.93% | 상대 거래량 1.45배 | 52주 고점 대비 -0.17% | 데이터 소스: yfinance

### [ETF HACK] Amplify Cybersecurity ETF
- 자산 유형: ETF
- ETF 세부 카테고리: 성장/테마 ETF
- ETF 역할: 테마 베타 매수
- 상태: 진입 가능
- moneyFlowScore: 100
- moneyFlowScore 산정 근거:
  - 총점: 100
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +104
  - 추세 점수: +29
  - 단기 모멘텀: +15
  - 중기 모멘텀: +16
  - 거래량 점수: +18
  - 신고가 근접 점수: +12
  - 이동평균 점수: +14
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - ETF 확산도 점수: +8
  - 유동성 점수: -5
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음~중간
- reasonConfidence: MEDIUM
- todayActionLabel: ETF 우선
- 기준일: 2026-06-01
- 종가: $105
- 1일 수익률: +5.69%
- 5일 수익률: +10.70%
- 20일 수익률: +29.98%
- 상대 거래량: 1.56배
- 52주 고점 대비 위치: -0.38%
- whyMoneyIsFlowing: 20일 +29.98%, 5일 +10.70%, 상대 거래량 1.56배로 가격과 거래량이 함께 개선. 뉴스: The Asymmetric AI Winner: Cybersecurity ETFs Gaining From Cloud Buildout / ETF 확산도: BROAD_ADVANCE
- likelyNextBuyer: 섹터 베타를 사려는 단기 모멘텀 자금과 리밸런싱 자금
- whyThisCouldTradeHigher: 52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 사용
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 4/4/0
  - 핵심 뉴스 요약: The Asymmetric AI Winner: Cybersecurity ETFs Gaining From Cloud Buildout
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도:
  - 구성종목 데이터 상태: 일부 연결
  - 샘플 수: 2/2
  - 상승 종목 비율: 100%
  - 20일선 위 비율: 100%
  - 50일선 위 비율: 100%
  - 상위 기여 종목: PLTR, MSFT
  - 확산도 판단: BROAD_ADVANCE
  - 점수 반영: +8
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $23,248,155
  - 평균 거래대금: $14,913,150
  - 유동성 판단: LOW_LIQUIDITY
  - 매매 영향: 유동성 부족으로 추격 금지 또는 우선순위 하향
- reasonConfidence 근거: 가격/거래량, 뉴스, ETF 확산도, 유동성은 확인되었지만 일부 보조 데이터가 미연결 또는 fallback이라 중간으로 제한.
- 진입 조건: 전일 고점 돌파 후 5일선 위 유지
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![HACK chart](charts/HACK.png)
- 기준일 2026-06-01 | 종가 $105 | 1일 +5.69% | 5일 +10.70% | 20일 +29.98% | 상대 거래량 1.56배 | 52주 고점 대비 -0.38% | 데이터 소스: yfinance

### [ETF IPO] Renaissance IPO ETF
- 자산 유형: ETF
- ETF 세부 카테고리: 성장/테마 ETF
- ETF 역할: 테마 베타 매수
- 상태: 진입 가능
- moneyFlowScore: 94
- moneyFlowScore 산정 근거:
  - 총점: 94
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +89
  - 추세 점수: +23
  - 단기 모멘텀: +11
  - 중기 모멘텀: +11
  - 거래량 점수: +18
  - 신고가 근접 점수: +12
  - 이동평균 점수: +14
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - ETF 확산도 점수: 0
  - 유동성 점수: -5
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패, ETF 구성종목 확산도 데이터 미연결.
- 과열 리스크: 낮음~중간
- reasonConfidence: MEDIUM
- todayActionLabel: ETF 우선
- 기준일: 2026-06-01
- 종가: $58.12
- 1일 수익률: +2.69%
- 5일 수익률: +9.54%
- 20일 수익률: +17.01%
- 상대 거래량: 2.35배
- 52주 고점 대비 위치: -1.06%
- whyMoneyIsFlowing: 20일 +17.01%, 5일 +9.54%, 상대 거래량 2.35배로 가격과 거래량이 함께 개선. 뉴스: Bill Ackman’s Pershing Square to Raise $5 Billion from IPO
- likelyNextBuyer: 섹터 베타를 사려는 단기 모멘텀 자금과 리밸런싱 자금
- whyThisCouldTradeHigher: 52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 미연결
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 4/4/0
  - 핵심 뉴스 요약: Bill Ackman’s Pershing Square to Raise $5 Billion from IPO
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도:
  - 구성종목 데이터 상태: 미연결
  - 샘플 수: 0/0
  - 상승 종목 비율: 데이터 없음
  - 20일선 위 비율: 데이터 없음
  - 50일선 위 비율: 데이터 없음
  - 상위 기여 종목: 데이터 없음
  - 확산도 판단: UNKNOWN
  - 점수 반영: 0
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $4,691,388
  - 평균 거래대금: $1,993,516
  - 유동성 판단: LOW_LIQUIDITY
  - 매매 영향: 유동성 부족으로 추격 금지 또는 우선순위 하향
- reasonConfidence 근거: 가격/거래량, 뉴스, 유동성은 확인되었지만 일부 보조 데이터가 미연결 또는 fallback이라 중간으로 제한.
- 진입 조건: 전일 고점 돌파 후 5일선 위 유지
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![IPO chart](charts/IPO.png)
- 기준일 2026-06-01 | 종가 $58.12 | 1일 +2.69% | 5일 +9.54% | 20일 +17.01% | 상대 거래량 2.35배 | 52주 고점 대비 -1.06% | 데이터 소스: yfinance

### 1-3. ETF 과열/주의 후보

#### [AIQ] Global X Artificial Intelligence & Technology ETF
- moneyFlowScore: 100
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음~중간
- 과열 근거: 성장/테마 ETF 기준 단기 급등과 고점 근접 조합 확인
- 대응: 돌파 확인 후 진입

#### [CIBR] First Trust NASDAQ Cybersecurity ETF
- moneyFlowScore: 100
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음~중간
- 과열 근거: 성장/테마 ETF 기준 단기 급등과 고점 근접 조합 확인
- 대응: 돌파 확인 후 진입

#### [HACK] Amplify Cybersecurity ETF
- moneyFlowScore: 100
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음~중간
- 과열 근거: 성장/테마 ETF 기준 단기 급등과 고점 근접 조합 확인
- 대응: 돌파 확인 후 진입

#### [IPO] Renaissance IPO ETF
- moneyFlowScore: 94
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패, ETF 구성종목 확산도 데이터 미연결.
- 과열 리스크: 낮음~중간
- 과열 근거: 성장/테마 ETF 기준 단기 급등과 고점 근접 조합 확인
- 대응: 돌파 확인 후 진입

#### [IHAK] iShares Cybersecurity and Tech ETF
- moneyFlowScore: 88
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 단기 과열/추격 위험 존재, 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 중간
- 과열 근거: 성장/테마 ETF 기준 단기 급등과 고점 근접 조합 확인
- 대응: 눌림 대기


### 1-4. ETF 제외/매매 금지 후보

#### [IFRA] iShares U.S. Infrastructure ETF
- moneyFlowScore: 0
- moneyFlowScore 산정 근거 요약: 유동성/스프레드 주의. 주의: 옵션 데이터 미연결 또는 수집 실패, ETF 구성종목 확산도 데이터 미연결.
- 제외 사유: 테마 자금 흐름 약함
- 재검토 조건: 상대 거래량 1.0배 회복 후 관찰

#### [URA] Global X Uranium ETF
- moneyFlowScore: 0
- moneyFlowScore 산정 근거 요약: 뉴스 흐름이 가격/거래량 근거를 보강, 거래대금 기준 유동성 양호. 주의: 옵션 데이터 미연결 또는 수집 실패, ETF 구성종목 확산도 데이터 미연결.
- 제외 사유: 테마 자금 흐름 약함
- 재검토 조건: 상대 거래량 1.0배 회복 후 관찰

#### [NLR] VanEck Uranium and Nuclear ETF
- moneyFlowScore: 0
- moneyFlowScore 산정 근거 요약: 뉴스 흐름이 가격/거래량 근거를 보강, 유동성/스프레드 주의. 주의: 옵션 데이터 미연결 또는 수집 실패, ETF 구성종목 확산도 데이터 미연결.
- 제외 사유: 테마 자금 흐름 약함
- 재검토 조건: 상대 거래량 1.0배 회복 후 관찰

#### [OIH] VanEck Oil Services ETF
- moneyFlowScore: 0
- moneyFlowScore 산정 근거 요약: 뉴스 흐름이 가격/거래량 근거를 보강, 거래대금 기준 유동성 양호. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 제외 사유: 테마 자금 흐름 약함
- 재검토 조건: 상대 거래량 1.0배 회복 후 관찰

#### [KWEB] KraneShares CSI China Internet ETF
- moneyFlowScore: 0
- moneyFlowScore 산정 근거 요약: 1일 단기 모멘텀 확인, 거래대금 기준 유동성 양호. 주의: 옵션 데이터 미연결 또는 수집 실패, ETF 구성종목 확산도 데이터 미연결.
- 제외 사유: 테마 자금 흐름 약함
- 재검토 조건: 상대 거래량 1.0배 회복 후 관찰


## 2. 개별 종목 트레이딩 보고서

### 2-1. 개별 종목 결론
- 개별 종목 진입 후보: 없음
- 개별 종목 눌림 대기: TSM, PLTR, NVDA
- 개별 종목 보유 점검: MSFT, AAPL
- 개별 종목 매매 금지: XOM
- 오늘 개별 종목 최우선 1개: TSM - 관련 ETF와 비슷함 | 주식 5일 +7.69% vs ETF 평균 +6.04%, 주식 20일 +9.55% vs ETF 평균 +21.48%, 상대 거래량 1.35배 vs ETF 평균 0.84배
- 개별 종목 섹션 해석: 이 섹션은 ETF로 확인된 테마 자금 흐름 안에서 ETF보다 더 나은 알파를 줄 수 있는 개별 종목만 선별하는 영역이다.

### 2-2. 개별 종목 후보 TOP 5

### [TSM] Taiwan Semiconductor
- 자산 유형: STOCK
- 상태: 진입 가능
- primaryTheme: 반도체 공급망
- primarySector: 반도체
- relatedEtfs: SMH, SOXX, SOXQ
- moneyFlowScore: 97
- moneyFlowScore 산정 근거:
  - 총점: 97
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +75
  - 추세 점수: +18
  - 단기 모멘텀: +11
  - 중기 모멘텀: +6
  - 거래량 점수: +14
  - 신고가 근접 점수: +12
  - 이동평균 점수: +14
  - ETF 대비 상대강도 점수: +7
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - 유동성 점수: +5
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음~중간
- reasonConfidence: HIGH
- todayActionLabel: 개별 종목 우선
- 기준일: 2026-06-01
- 종가: $435.63
- 1일 수익률: +4.11%
- 5일 수익률: +7.69%
- 20일 수익률: +9.55%
- 상대 거래량: 1.35배
- 52주 고점 대비 위치: -3.06%
- 관련 ETF 대비 상대강도: 관련 ETF와 비슷함 | 주식 5일 +7.69% vs ETF 평균 +6.04%, 주식 20일 +9.55% vs ETF 평균 +21.48%, 상대 거래량 1.35배 vs ETF 평균 0.84배
- whyMoneyIsFlowing: 20일 +9.55%, 5일 +7.69%, 상대 거래량 1.35배로 가격과 거래량이 함께 개선. 뉴스: Nvidia Expands Into CPUs As AI Partnerships Grow And Valuation Stretches / 유동성: LIQUID
- likelyNextBuyer: 개별 주도주를 따라붙는 단기 모멘텀 자금과 관련 ETF 강세를 확인한 스윙 트레이더
- whyThisCouldTradeHigher: 52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음
- 왜 ETF가 아니라 이 종목인가?: 관련 ETF와 비슷함 | 주식 5일 +7.69% vs ETF 평균 +6.04%, 주식 20일 +9.55% vs ETF 평균 +21.48%, 상대 거래량 1.35배 vs ETF 평균 0.84배. 개별 종목 우선으로 격상하려면 관련 ETF 대비 상대강도 유지가 더 필요하다.
- ETF가 더 나은 경우: TSM가 관련 ETF 평균보다 약하거나 거래량이 둔화되면 개별 종목 대신 관련 ETF를 우선한다.
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 관련 ETF에서 확인
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 7/1/0
  - 핵심 뉴스 요약: Nvidia Expands Into CPUs As AI Partnerships Grow And Valuation Stretches
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도: 관련 ETF에서 확인
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $7,836,474,449
  - 평균 거래대금: $5,795,238,601
  - 유동성 판단: LIQUID
  - 매매 영향: 거래대금 기준 실제 매매 가능성에 큰 문제는 낮음
- reasonConfidence 근거: 가격/거래량, 뉴스, 유동성 데이터가 확인되어 신뢰도를 높임.
- 진입 조건: 전일 고점 돌파 후 5일선 위 유지
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![TSM chart](charts/TSM.png)
- 기준일 2026-06-01 | 종가 $435.63 | 1일 +4.11% | 5일 +7.69% | 20일 +9.55% | 상대 거래량 1.35배 | 52주 고점 대비 -3.06% | 데이터 소스: yfinance

### [PLTR] Palantir
- 자산 유형: STOCK
- 상태: 진입 가능
- primaryTheme: AI 소프트웨어
- primarySector: 소프트웨어
- relatedEtfs: IGV, AIQ, CIBR, QQQ
- moneyFlowScore: 97
- moneyFlowScore 산정 근거:
  - 총점: 97
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +74
  - 추세 점수: +23
  - 단기 모멘텀: +15
  - 중기 모멘텀: +7
  - 거래량 점수: +14
  - 신고가 근접 점수: 0
  - 이동평균 점수: +14
  - ETF 대비 상대강도 점수: +8
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - 유동성 점수: +5
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음
- reasonConfidence: HIGH
- todayActionLabel: 개별 종목 우선
- 기준일: 2026-06-01
- 종가: $160.65
- 1일 수익률: +2.63%
- 5일 수익률: +17.37%
- 20일 수익률: +11.51%
- 상대 거래량: 1.22배
- 52주 고점 대비 위치: -22.59%
- 관련 ETF 대비 상대강도: 관련 ETF와 비슷함 | 주식 5일 +17.37% vs ETF 평균 +10.08%, 주식 20일 +11.51% vs ETF 평균 +23.41%, 상대 거래량 1.22배 vs ETF 평균 1.42배
- whyMoneyIsFlowing: 20일 +11.51%, 5일 +17.37%, 상대 거래량 1.22배로 가격과 거래량이 함께 개선. 뉴스: Nvidia Highlights New AI Products at Computex / 유동성: LIQUID
- likelyNextBuyer: 개별 주도주를 따라붙는 단기 모멘텀 자금과 관련 ETF 강세를 확인한 스윙 트레이더
- whyThisCouldTradeHigher: 단기 추세가 유지되고 거래량이 1.0배 이상이면 되돌림 이후 재상승을 시도할 수 있음
- 왜 ETF가 아니라 이 종목인가?: 관련 ETF와 비슷함 | 주식 5일 +17.37% vs ETF 평균 +10.08%, 주식 20일 +11.51% vs ETF 평균 +23.41%, 상대 거래량 1.22배 vs ETF 평균 1.42배. 개별 종목 우선으로 격상하려면 관련 ETF 대비 상대강도 유지가 더 필요하다.
- ETF가 더 나은 경우: PLTR가 관련 ETF 평균보다 약하거나 거래량이 둔화되면 개별 종목 대신 관련 ETF를 우선한다.
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 관련 ETF에서 확인
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 4/4/0
  - 핵심 뉴스 요약: Nvidia Highlights New AI Products at Computex
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도: 관련 ETF에서 확인
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $9,095,577,759
  - 평균 거래대금: $7,426,751,022
  - 유동성 판단: LIQUID
  - 매매 영향: 거래대금 기준 실제 매매 가능성에 큰 문제는 낮음
- reasonConfidence 근거: 가격/거래량, 뉴스, 유동성 데이터가 확인되어 신뢰도를 높임.
- 진입 조건: 20일선 위에서 눌림 후 재상승 확인
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![PLTR chart](charts/PLTR.png)
- 기준일 2026-06-01 | 종가 $160.65 | 1일 +2.63% | 5일 +17.37% | 20일 +11.51% | 상대 거래량 1.22배 | 52주 고점 대비 -22.59% | 데이터 소스: yfinance

### [MSFT] Microsoft
- 자산 유형: STOCK
- 상태: 보유 유지
- primaryTheme: AI 플랫폼
- primarySector: 메가캡 기술
- relatedEtfs: QQQ, MAGS, IGV, AIQ
- moneyFlowScore: 90
- moneyFlowScore 산정 근거:
  - 총점: 90
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +67
  - 추세 점수: +21
  - 단기 모멘텀: +11
  - 중기 모멘텀: +7
  - 거래량 점수: +14
  - 신고가 근접 점수: 0
  - 이동평균 점수: +14
  - ETF 대비 상대강도 점수: +8
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - 유동성 점수: +5
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음
- reasonConfidence: HIGH
- todayActionLabel: 보유 정보 확인
- 기준일: 2026-06-01
- 종가: $460.52
- 1일 수익률: +2.28%
- 5일 수익률: +10.02%
- 20일 수익률: +11.12%
- 상대 거래량: 1.45배
- 52주 고점 대비 위치: -17.09%
- 관련 ETF 대비 상대강도: 관련 ETF와 비슷함 | 주식 5일 +10.02% vs ETF 평균 +7.34%, 주식 20일 +11.12% vs ETF 평균 +15.29%, 상대 거래량 1.45배 vs ETF 평균 1.46배
- whyMoneyIsFlowing: 20일 +11.12%, 5일 +10.02%, 상대 거래량 1.45배로 가격과 거래량이 함께 개선. 뉴스: Microsoft And Nvidia RTX Spark Puts AI PCs In Investor Focus / 유동성: LIQUID
- likelyNextBuyer: 개별 주도주를 따라붙는 단기 모멘텀 자금과 관련 ETF 강세를 확인한 스윙 트레이더
- whyThisCouldTradeHigher: 단기 추세가 유지되고 거래량이 1.0배 이상이면 되돌림 이후 재상승을 시도할 수 있음
- 왜 ETF가 아니라 이 종목인가?: 관련 ETF와 비슷함 | 주식 5일 +10.02% vs ETF 평균 +7.34%, 주식 20일 +11.12% vs ETF 평균 +15.29%, 상대 거래량 1.45배 vs ETF 평균 1.46배. 개별 종목 우선으로 격상하려면 관련 ETF 대비 상대강도 유지가 더 필요하다.
- ETF가 더 나은 경우: MSFT가 관련 ETF 평균보다 약하거나 거래량이 둔화되면 개별 종목 대신 관련 ETF를 우선한다.
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 관련 ETF에서 확인
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 6/2/0
  - 핵심 뉴스 요약: Microsoft And Nvidia RTX Spark Puts AI PCs In Investor Focus
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도: 관련 ETF에서 확인
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $23,996,764,647
  - 평균 거래대금: $16,571,590,229
  - 유동성 판단: LIQUID
  - 매매 영향: 거래대금 기준 실제 매매 가능성에 큰 문제는 낮음
- reasonConfidence 근거: 가격/거래량, 뉴스, 유동성 데이터가 확인되어 신뢰도를 높임.
- 진입 조건: 20일선 위에서 눌림 후 재상승 확인
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 보유 정보: 보유 정보 미입력 - 기존 mock 진입가/수익률은 실전 판단에 사용하지 않음
- 차트 요약: 최근 20거래일 우상향, 5일선이 20일선 위에 있음
- 차트: ![MSFT chart](charts/MSFT.png)
- 기준일 2026-06-01 | 종가 $460.52 | 1일 +2.28% | 5일 +10.02% | 20일 +11.12% | 상대 거래량 1.45배 | 52주 고점 대비 -17.09% | 데이터 소스: yfinance

### [NVDA] NVIDIA
- 자산 유형: STOCK
- 상태: 진입 후보
- primaryTheme: AI 반도체
- primarySector: 반도체
- relatedEtfs: SMH, SOXX, SOXQ, AIQ, QQQ
- moneyFlowScore: 84
- moneyFlowScore 산정 근거:
  - 총점: 84
  - 점수 해석: 강한 자금 유입 후보. 단, 과열 여부 확인 필수.
  - 가격/거래량 점수: +65
  - 추세 점수: +16
  - 단기 모멘텀: +11
  - 중기 모멘텀: +8
  - 거래량 점수: +10
  - 신고가 근접 점수: +6
  - 이동평균 점수: +14
  - ETF 대비 상대강도 점수: +8
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - 유동성 점수: +5
  - 리스크 패널티: -4
  - 주요 근거: 20일 수익률 강함, 1일 단기 모멘텀 확인, 이동평균 위 추세 유지. 주의: 단기 과열/추격 위험 존재, 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음
- reasonConfidence: HIGH
- todayActionLabel: 눌림 매수 대기
- 기준일: 2026-06-01
- 종가: $224.36
- 1일 수익률: +6.26%
- 5일 수익률: +4.19%
- 20일 수익률: +13.06%
- 상대 거래량: 1.16배
- 52주 고점 대비 위치: -5.15%
- 관련 ETF 대비 상대강도: 관련 ETF보다 약함 | 주식 5일 +4.19% vs ETF 평균 +6.44%, 주식 20일 +13.06% vs ETF 평균 +19.36%, 상대 거래량 1.16배 vs ETF 평균 0.98배
- whyMoneyIsFlowing: 20일 +13.06%, 5일 +4.19%, 상대 거래량 1.16배로 가격과 거래량이 함께 개선. 뉴스: NYB.AI Launches Vecura 2.0, Bringing Agentic AI Workflows to Molecular Discovery, with NVIDIA / 유동성: LIQUID
- likelyNextBuyer: 개별 주도주를 따라붙는 단기 모멘텀 자금과 관련 ETF 강세를 확인한 스윙 트레이더
- whyThisCouldTradeHigher: 단기 추세가 유지되고 거래량이 1.0배 이상이면 되돌림 이후 재상승을 시도할 수 있음
- 왜 ETF가 아니라 이 종목인가?: NVDA보다 관련 ETF 쪽 흐름이 더 선명해 오늘은 ETF 우선으로 본다.
- ETF가 더 나은 경우: NVDA가 관련 ETF 평균보다 약하거나 거래량이 둔화되면 개별 종목 대신 관련 ETF를 우선한다.
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 관련 ETF에서 확인
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 3/5/0
  - 핵심 뉴스 요약: NYB.AI Launches Vecura 2.0, Bringing Agentic AI Workflows to Molecular Discovery, with NVIDIA
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도: 관련 ETF에서 확인
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $44,250,419,594
  - 평균 거래대금: $38,067,421,906
  - 유동성 판단: LIQUID
  - 매매 영향: 거래대금 기준 실제 매매 가능성에 큰 문제는 낮음
- reasonConfidence 근거: 가격/거래량, 뉴스, 유동성 데이터가 확인되어 신뢰도를 높임.
- 진입 조건: 20일선 위에서 눌림 후 재상승 확인
- 무효화 조건: 20일선 이탈 또는 상대 거래량 0.8배 이하 둔화
- 차트 요약: 단기 추세는 중립
- 차트: ![NVDA chart](charts/NVDA.png)
- 기준일 2026-06-01 | 종가 $224.36 | 1일 +6.26% | 5일 +4.19% | 20일 +13.06% | 상대 거래량 1.16배 | 52주 고점 대비 -5.15% | 데이터 소스: yfinance

### [AAPL] Apple
- 자산 유형: STOCK
- 상태: 보유 유지
- primaryTheme: 메가캡 기술
- primarySector: 소비자 기술
- relatedEtfs: QQQ, MAGS, SPY
- moneyFlowScore: 40
- moneyFlowScore 산정 근거:
  - 총점: 40
  - 점수 해석: 매매 금지 또는 후순위 후보.
  - 가격/거래량 점수: +21
  - 추세 점수: +3
  - 단기 모멘텀: -3
  - 중기 모멘텀: +6
  - 거래량 점수: -8
  - 신고가 근접 점수: +12
  - 이동평균 점수: +10
  - ETF 대비 상대강도 점수: +5
  - 뉴스 점수: +10
  - 옵션 점수: 0
  - 유동성 점수: +5
  - 리스크 패널티: 0
  - 주요 근거: 20일 수익률 강함, 52주 고점 근처, 관련 ETF 강세 테마 안의 개별 종목. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 과열 리스크: 낮음
- reasonConfidence: LOW
- todayActionLabel: 보유 정보 확인
- 기준일: 2026-06-01
- 종가: $306.31
- 1일 수익률: -1.84%
- 5일 수익률: -0.81%
- 20일 수익률: +9.34%
- 상대 거래량: 0.93배
- 52주 고점 대비 위치: -2.76%
- 관련 ETF 대비 상대강도: 관련 ETF와 비슷함 | 주식 5일 -0.81% vs ETF 평균 +1.99%, 주식 20일 +9.34% vs ETF 평균 +6.63%, 상대 거래량 0.93배 vs ETF 평균 1.08배
- whyMoneyIsFlowing: 최근 수익률은 확인되지만 상대 거래량 0.93배라 신규 자금 유입 강도는 약함. 뉴스: TSMC executive drops blunt message on AI chip’s next frontier / 유동성: LIQUID
- likelyNextBuyer: 개별 주도주를 따라붙는 단기 모멘텀 자금과 관련 ETF 강세를 확인한 스윙 트레이더
- whyThisCouldTradeHigher: 52주 고점 부근이라 돌파가 확인되면 신고가 추종 매수가 붙을 수 있음
- 왜 ETF가 아니라 이 종목인가?: 관련 ETF와 비슷함 | 주식 5일 -0.81% vs ETF 평균 +1.99%, 주식 20일 +9.34% vs ETF 평균 +6.63%, 상대 거래량 0.93배 vs ETF 평균 1.08배. 개별 종목 우선으로 격상하려면 관련 ETF 대비 상대강도 유지가 더 필요하다.
- ETF가 더 나은 경우: AAPL가 관련 ETF 평균보다 약하거나 거래량이 둔화되면 개별 종목 대신 관련 ETF를 우선한다.
- 데이터 사용 현황:
  - 가격/거래량: 사용
  - 뉴스: 사용
  - 옵션: 실패
  - ETF 확산도: 관련 ETF에서 확인
  - 유동성/스프레드: 사용
- 뉴스 확인:
  - 최근 뉴스 상태: 연결됨
  - 긍정/중립/부정: 4/4/0
  - 핵심 뉴스 요약: TSMC executive drops blunt message on AI chip’s next frontier
  - 점수 반영: +10
  - 주의: 특이사항 없음
- 옵션 수급:
  - 옵션 데이터 상태: 실패
  - Put/Call 거래량 비율: 데이터 없음
  - 콜 거래량: 데이터 없음
  - 풋 거래량: 데이터 없음
  - IV 상태: 데이터 없음
  - 해석: 뚜렷한 옵션 방향성 없음
  - 점수 반영: 0
- ETF 구성종목 확산도: 관련 ETF에서 확인
- 유동성/스프레드:
  - 데이터 상태: 일부 연결
  - 스프레드: bid/ask 데이터 없음
  - 거래대금: $13,529,890,666
  - 평균 거래대금: $14,481,442,068
  - 유동성 판단: LIQUID
  - 매매 영향: 거래대금 기준 실제 매매 가능성에 큰 문제는 낮음
- reasonConfidence 근거: 가격/거래량이 약하거나 주요 데이터가 부족해 낮음.
- 진입 조건: 상대 거래량 1.0배 회복 후 관찰
- 무효화 조건: 거래량 회복 실패
- 보유 정보: 보유 정보 미입력 - 기존 mock 진입가/수익률은 실전 판단에 사용하지 않음
- 차트 요약: 20일선 위에서 단기 눌림 확인 구간
- 차트: ![AAPL chart](charts/AAPL.png)
- 기준일 2026-06-01 | 종가 $306.31 | 1일 -1.84% | 5일 -0.81% | 20일 +9.34% | 상대 거래량 0.93배 | 52주 고점 대비 -2.76% | 데이터 소스: yfinance

### 2-3. ETF 대비 개별 종목 판단 로직

- 관련 ETF의 5일/20일 수익률과 개별 종목의 5일/20일 수익률을 비교한다.
- 관련 ETF의 상대 거래량과 개별 종목의 상대 거래량을 비교한다.
- 개별 종목이 관련 ETF보다 강하면 “개별 종목 우선” 가능으로 본다.
- 개별 종목이 관련 ETF와 비슷하거나 약하면 “ETF 우선 / 개별 종목 관찰”로 낮춘다.
- 관련 ETF가 더 강하면 개별 종목 대신 ETF를 우선한다.

### 2-4. 개별 종목 제외/주의 후보

#### [TSM] Taiwan Semiconductor
- moneyFlowScore: 97
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 제외/주의 사유: 개별 종목 우선 근거 부족
- 재검토 조건: 전일 고점 돌파 후 5일선 위 유지

#### [PLTR] Palantir
- moneyFlowScore: 97
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 5일 수익률 강함, 1일 단기 모멘텀 확인. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 제외/주의 사유: 개별 종목 우선 근거 부족
- 재검토 조건: 20일선 위에서 눌림 후 재상승 확인

#### [NVDA] NVIDIA
- moneyFlowScore: 84
- moneyFlowScore 산정 근거 요약: 20일 수익률 강함, 1일 단기 모멘텀 확인, 이동평균 위 추세 유지. 주의: 단기 과열/추격 위험 존재, 옵션 데이터 미연결 또는 수집 실패.
- 제외/주의 사유: ETF 대비 약세
- 재검토 조건: 20일선 위에서 눌림 후 재상승 확인

#### [XOM] Exxon Mobil
- moneyFlowScore: 0
- moneyFlowScore 산정 근거 요약: 1일 단기 모멘텀 확인, 관련 ETF 강세 테마 안의 개별 종목, 뉴스 흐름이 가격/거래량 근거를 보강. 주의: 옵션 데이터 미연결 또는 수집 실패.
- 제외/주의 사유: 매매 조건 미충족
- 재검토 조건: 상대 거래량 1.0배 회복 후 관찰


## 감시 ETF 목록

| 티커 | 카테고리 | moneyFlowScore | 상태 | reasonConfidence | 한 줄 이유 |
| --- | --- | ---: | --- | --- | --- |
| DRAM | 반도체/기술 ETF | 75 | 관찰 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.96배라 신규 자금 유입 강도는 약함. 뉴스: Daily ETF Flows: DRAM Back In The Top 10 / 유동성: LIQUID |
| SMH | 반도체/기술 ETF | 74 | 진입 가능 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.83배라 신규 자금 유입 강도는 약함. 뉴스: Top ETF Stories of May 2026: Iran Deal Hopes, AI Rally / ETF 확산도: BROAD_ADVANCE / 유동성: LIQUID |
| SOXX | 반도체/기술 ETF | 78 | 진입 가능 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.80배라 신규 자금 유입 강도는 약함. 뉴스: Exchange-Traded Funds, Equity Futures Higher Pre-Bell Monday as AI Optimism Overshadows Middle East Risks / ETF 확산도: BROAD_ADVANCE / 유동성: LIQUID |
| SOXQ | 반도체/기술 ETF | 76 | 진입 가능 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.89배라 신규 자금 유입 강도는 약함. 뉴스: Your Portfolio Isn’t Invested in the Right Kind of AI Unless You Hold This ETF / ETF 확산도: BROAD_ADVANCE / 유동성: ACCEPTABLE |
| IGV | 성장/테마 ETF | 100 | 진입 가능 | HIGH | 20일 +24.32%, 5일 +14.56%, 상대 거래량 1.82배로 가격과 거래량이 함께 개선. 뉴스: Exchange-Traded Funds, Equity Futures Higher Pre-Bell Monday as AI Optimism Overshadows Middle East Risks / ETF 확산도: BROAD_ADVANCE / 유동성: LIQUID |
| AIQ | 성장/테마 ETF | 100 | 진입 가능 | HIGH | 20일 +22.21%, 5일 +10.56%, 상대 거래량 1.59배로 가격과 거래량이 함께 개선. 뉴스: OpenAI Reportedly Set to File for IPO as Early as Friday / ETF 확산도: BROAD_ADVANCE / 유동성: ACCEPTABLE |
| BOTZ | 성장/테마 ETF | 49 | 관찰 | MEDIUM | 20일 +5.18%, 5일 +0.77%, 상대 거래량 1.13배로 가격과 거래량이 함께 개선. 뉴스: Three Humanoid Robotics ETFs Built for the Tesla Optimus and Figure AI Era Most Investors Have Never Heard Of |
| ROBO | 성장/테마 ETF | 63 | 진입 후보 | MEDIUM | 20일 +9.31%, 5일 +2.60%, 상대 거래량 1.03배로 가격과 거래량이 함께 개선. 뉴스: Three Humanoid Robotics ETFs Built for the Tesla Optimus and Figure AI Era Most Investors Have Never Heard Of |
| CIBR | 성장/테마 ETF | 100 | 진입 가능 | HIGH | 20일 +36.93%, 5일 +11.71%, 상대 거래량 1.45배로 가격과 거래량이 함께 개선. 뉴스: The Asymmetric AI Winner: Cybersecurity ETFs Gaining From Cloud Buildout / ETF 확산도: BROAD_ADVANCE / 유동성: ACCEPTABLE |
| HACK | 성장/테마 ETF | 100 | 진입 가능 | MEDIUM | 20일 +29.98%, 5일 +10.70%, 상대 거래량 1.56배로 가격과 거래량이 함께 개선. 뉴스: The Asymmetric AI Winner: Cybersecurity ETFs Gaining From Cloud Buildout / ETF 확산도: BROAD_ADVANCE |
| IHAK | 성장/테마 ETF | 88 | 관찰 | MEDIUM | 20일 +27.66%, 5일 +8.91%, 상대 거래량 1.11배로 가격과 거래량이 함께 개선. 뉴스: The Asymmetric AI Winner: Cybersecurity ETFs Gaining From Cloud Buildout |
| ITA | 방산 ETF | 47 | 관찰 | MEDIUM | 20일 +6.31%, 5일 +2.01%, 상대 거래량 1.14배로 가격과 거래량이 함께 개선. 뉴스: Ondas Holdings Adds High-Margin AI Software to Its Autonomous Defense Portfolio. Here’s What That Means for ONDS Stock. / 유동성: ACCEPTABLE |
| XAR | 방산 ETF | 60 | 진입 후보 | MEDIUM | 20일 +9.19%, 5일 +3.25%, 상대 거래량 1.70배로 가격과 거래량이 함께 개선. 뉴스: This 1 ETF Can Deliver Massive Gains After This Fragile Ceasefire / 유동성: ACCEPTABLE |
| SHLD | 방산 ETF | 17 | 매매 금지 | LOW | 20일 -3.39%, 5일 +0.72%, 상대 거래량 1.03배로 가격과 거래량이 함께 개선. 뉴스: GLOBAL X ANNOUNCES CHANGES TO RISK RATINGS FOR CERTAIN ETFs / 유동성: ACCEPTABLE |
| PPA | 방산 ETF | 37 | 관찰 | MEDIUM | 20일 +4.84%, 5일 +1.97%, 상대 거래량 1.35배로 가격과 거래량이 함께 개선 |
| PAVE | 성장/테마 ETF | 8 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.69배라 신규 자금 유입 강도는 약함. 뉴스: Thematic ETFs 101: How to Invest in AI, Clean Energy Other Megatrends |
| GRID | 성장/테마 ETF | 15 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.91배라 신규 자금 유입 강도는 약함. 뉴스: Peter Thiel Bets $140M on Ocean-Powered Energy for AI / 유동성: ACCEPTABLE |
| IFRA | 성장/테마 ETF | 0 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.83배라 신규 자금 유입 강도는 약함 |
| XLU | 성장/테마 ETF | 6 | 매매 금지 | LOW | 20일 -7.41%, 5일 -4.96%, 상대 거래량 1.44배로 가격과 거래량이 함께 개선. 뉴스: XLU Investors: Watch PJM’s March 2027 Data Center Framework Decision / 유동성: LIQUID |
| URA | 성장/테마 ETF | 0 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.78배라 신규 자금 유입 강도는 약함. 뉴스: Nuclear Power Is the Only Real Answer to AI Electricity Demand and These 3 ETFs Own the Trade / 유동성: ACCEPTABLE |
| NLR | 성장/테마 ETF | 0 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.77배라 신규 자금 유입 강도는 약함. 뉴스: Nuclear ETFs to Gain as the Globe Rides the Atomic Wave |
| LIT | 성장/테마 ETF | 18 | 매매 금지 | LOW | 20일 -2.96%, 5일 +0.95%, 상대 거래량 2.08배로 가격과 거래량이 함께 개선. 뉴스: 3 Market Themes Driving Stocks Right Now: AI, Alt Energy and Commodities |
| COPX | 성장/테마 ETF | 57 | 관찰 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.87배라 신규 자금 유입 강도는 약함. 뉴스: This Copper ETF Returned 156% in a Year and Pays 9.7% While You Wait for the 4x Case to Play Out. / 유동성: ACCEPTABLE |
| XME | 성장/테마 ETF | 51 | 관찰 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.88배라 신규 자금 유입 강도는 약함. 뉴스: 3 Market Themes Driving Stocks Right Now: AI, Alt Energy and Commodities / 유동성: ACCEPTABLE |
| XLE | 성장/테마 ETF | 20 | 매매 금지 | LOW | 20일 -2.63%, 5일 -3.68%, 상대 거래량 1.32배로 가격과 거래량이 함께 개선. 뉴스: Sector Update: Energy Stocks Gain Monday Afternoon / 유동성: LIQUID |
| OIH | 성장/테마 ETF | 0 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.87배라 신규 자금 유입 강도는 약함. 뉴스: Oil &amp; Gas Following the AI Capex Boom as Crude Hovers at $100 / 유동성: ACCEPTABLE |
| ARKK | 성장/테마 ETF | 30 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.87배라 신규 자금 유입 강도는 약함. 뉴스: Cathie Wood Just Loaded Up on This Sizzling Artificial Intelligence (AI) Semiconductor IPO Stock / 유동성: ACCEPTABLE |
| IPO | 성장/테마 ETF | 94 | 진입 가능 | MEDIUM | 20일 +17.01%, 5일 +9.54%, 상대 거래량 2.35배로 가격과 거래량이 함께 개선. 뉴스: Bill Ackman’s Pershing Square to Raise $5 Billion from IPO |
| KWEB | 성장/테마 ETF | 0 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.62배라 신규 자금 유입 강도는 약함. 유동성: ACCEPTABLE |
| MAGS | 성장/테마 ETF | 58 | 진입 후보 | MEDIUM | 20일 +4.47%, 5일 +0.72%, 상대 거래량 1.60배로 가격과 거래량이 함께 개선. 뉴스: Magnificent Seven Post Best Earnings In Nearly 5 Years. Sign Of A Bubble? / 유동성: ACCEPTABLE |
| QQQ | 시장 기준 ETF | 57 | 관찰 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.81배라 신규 자금 유입 강도는 약함. 뉴스: Dow, S&amp;P 500, Nasdaq Futures Slip After Record Rally As US-Iran War Confusion Eclipses AI Gains: TSLA, BB, META, HPE, NVDA Stocks In Focus / ETF 확산도: BROAD_ADVANCE / 유동성: LIQUID |
| SPY | 시장 기준 ETF | 42 | 관찰 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.82배라 신규 자금 유입 강도는 약함. 뉴스: Dow, S&amp;P 500, Nasdaq Futures Slip After Record Rally As US-Iran War Confusion Eclipses AI Gains: TSLA, BB, META, HPE, NVDA Stocks In Focus / ETF 확산도: NARROW_LEADERSHIP / 유동성: LIQUID |
| IWM | 시장 기준 ETF | 29 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.87배라 신규 자금 유입 강도는 약함. 뉴스: Exchange-Traded Funds, Equity Futures Higher Pre-Bell Monday as AI Optimism Overshadows Middle East Risks / 유동성: LIQUID |
| TLT | 채권 ETF | 10 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.94배라 신규 자금 유입 강도는 약함. 유동성: LIQUID |
| GLD | 금 ETF | 0 | 매매 금지 | LOW | 최근 수익률은 확인되지만 상대 거래량 0.99배라 신규 자금 유입 강도는 약함. 뉴스: Exchange-Traded Funds, Equity Futures Higher Pre-Bell Monday as AI Optimism Overshadows Middle East Risks / 유동성: LIQUID |
| IBIT | 비트코인 ETF | 0 | 매매 금지 | LOW | 20일 -8.95%, 5일 -5.75%, 상대 거래량 1.36배로 가격과 거래량이 함께 개선. 유동성: LIQUID |
| BLOK | 비트코인 ETF | 74 | 진입 가능 | MEDIUM | 20일 +14.36%, 5일 +7.53%, 상대 거래량 1.38배로 가격과 거래량이 함께 개선. 뉴스: Despite Bitcoin Falling 7%, Amplify Blockchain Technology’s ETF has Soared 32% | BLOK |

## 3. 최종 실행 판단

### 3-1. 오늘 실제로 할 일
1. ETF에서 할 일: IGV 포함 ETF 후보의 전일 고점 돌파와 5일선 유지를 확인한다.
2. 개별 종목에서 할 일: TSM 등은 관련 ETF 대비 상대강도가 유지되는지 확인한 뒤 눌림 또는 돌파 조건에서만 검토한다.
3. 하지 말아야 할 일: ETF와 개별 종목을 같은 테마 안에서 중복 매수하지 않는다.

### 3-2. 내일 확인할 조건
- ETF 확인 조건: ETF 후보 TOP 5가 20일선 위에서 유지되는지 확인
- 개별 종목 확인 조건: 관련 ETF 대비 5일/20일 상대강도와 상대 거래량 유지 확인
- 시장 상태 확인 조건: QQQ/SPY의 5일/20일 추세와 위험선호 유지 여부 확인
- 데이터 보강 필요 항목: 뉴스, 옵션, 스프레드, ETF 구성종목 확산도, 실제 보유 진입가

## 데이터 수집 상태

- 가격/거래량:
  - 상태: 연결됨
  - 소스: yfinance
  - 비고: 기존 REAL_TEST 가격/거래량 및 차트 생성 유지

- 뉴스:
  - 상태: 연결됨
  - 소스: Yahoo Finance RSS fallback
  - 수집된 뉴스 수: 333
  - 실패/제한 사유: 특이사항 없음

- 옵션:
  - 상태: 실패
  - 소스: Yahoo Finance options endpoint
  - 수집 가능 티커 수: 0
  - 실패/제한 사유: HTTP 401 from https://query2.finance.yahoo.com/v7/finance/options/NVDA; HTTP 401 from https://query2.finance.yahoo.com/v7/finance/options/TSM; HTTP 401 from https://query2.finance.yahoo.com/v7/finance/options/PLTR

- ETF 구성종목 확산도:
  - 상태: 일부 연결
  - 소스: config/etfHoldingsFallback.json 샘플
  - 수집 가능 ETF 수: 11
  - fallback 사용 여부: 사용

- 유동성/스프레드:
  - 상태: 일부 연결
  - 소스: 가격/거래량 기반 거래대금 fallback
  - bid/ask 사용 여부: 미사용
  - 거래대금 fallback 사용 여부: 사용

- 전체 비고:
- 옵션 수집 실패 티커 43개
- ETF 구성종목 확산도는 fallback sample 13개 사용
- 스프레드/유동성은 bid/ask 대신 거래대금 fallback 43개 사용
