# 네러티브 재점검 제안서

- 생성 시각: 2026년 7월 29일 수요일 오전 8:29
- 분석 리포트 수: 10개 (2026-07-15, 2026-07-16, 2026-07-17, 2026-07-20, 2026-07-21, 2026-07-22, 2026-07-23, 2026-07-24, 2026-07-27, 2026-07-28)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 2.2 | 0 | 0 | 5 | 소멸 (0) |
| 반도체 설계/공급망 재가속 | 수정 | 0 | 0 | 0 | 3 | 소멸 (0) |
| 반도체 장비 사이클 재평가 | 수정 | 0.6 | 0 | 0 | 4 | 소멸 (0) |
| AI 소프트웨어/사이버보안 확산 | 수정 | 10 | 1 | 1 | 3 | 약화 (14) |
| 사이버보안 지출 재가속 | 유지 | 23.5 | 5 | 3 | 6 | 약화 (1) |
| 소프트웨어 실적/AI 수익화 | 수정 | 11.4 | 1 | 1 | 7 | 약화 (20) |
| 위험선호 성장주 재진입 | 삭제 관찰 | 3.7 | 1 | 1 | 1 | 소멸 (3) |
| 방산/안보 프리미엄 | 유지 | 13.6 | 3 | 2 | 3 | 약화 (46) |
| 전력망/원전/인프라 병목 | 삭제 관찰 | 4.6 | 0 | 1 | 0 | 소멸 (5) |
| 비트코인/디지털 자산 위험선호 | 수정 | 5.5 | 0 | 2 | 0 | 소멸 (0) |
| 매크로 방어/헤지 | 유지 | 25.3 | 5 | 0 | 2 | 약화 (22) |
| Data Storage 자금 유입 | 삭제 관찰 | 7 | 0 | 0 | 0 | 소멸 (7) |
| 전력 유틸리티 수요 재평가 | 삭제 관찰 | 8.4 | 0 | 0 | 0 | 약화 (6) |
| 필수소비재 음료 방어 성장 | 유지 | 14.8 | 4 | 0 | 0 | 약화 (7) |
| Aerospace & Defense 자금 유입 | 유지 | 19.7 | 6 | 2 | 6 | 약화 (30) |
| 바이오/헬스케어 촉매 | 삭제 관찰 | 1.8 | 0 | 0 | 0 | 약화 (0) |
| Internet Content 자금 유입 | 삭제 관찰 | 8.8 | 2 | 0 | 1 | 약화 (0) |
| Specialty Business Services 자금 유입 | 수정 | 6.2 | 1 | 1 | 0 | 약화 (42) |
| Integrated Oil & Gas 자금 유입 | 수정 | 6 | 1 | 0 | 1 | 약화 (21) |

## 신규/분리 후보 TOP 5

### 1. Aerospace & Defense 자금 유입

- 발견 점수: 162.6
- 반복 일수: 3
- 평균 후보 점수: 91.2
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: 방산/안보 프리미엄
- 구성 후보: AVAV*, LMT*, RTX*

```js
{
  "name": "Aerospace & Defense 자금 유입",
  "etfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "stocks": [
    "RTX",
    "LMT",
    "AVAV"
  ],
  "nextBuyer": "Aerospace & Defense 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "RTX",
    "LMT",
    "AVAV"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. Specialty Business Services 자금 유입

- 발견 점수: 138.7
- 반복 일수: 5
- 평균 후보 점수: 85.2
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: Aerospace & Defense 자금 유입
- 구성 후보: CPRT, CTAS*, TRI*

```js
{
  "name": "Specialty Business Services 자금 유입",
  "etfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "stocks": [
    "TRI",
    "CTAS",
    "CPRT"
  ],
  "nextBuyer": "Specialty Business Services 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "TRI",
    "CTAS",
    "CPRT"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. 사이버보안 지출 재가속

- 발견 점수: 129.4
- 반복 일수: 4
- 평균 후보 점수: 87.8
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: 사이버보안 지출 재가속
- 구성 후보: CRWD*, FTNT*, PANW*

```js
{
  "name": "사이버보안 지출 재가속",
  "etfs": [
    "HACK",
    "CIBR",
    "IHAK",
    "IGV"
  ],
  "stocks": [
    "CRWD",
    "PANW",
    "FTNT"
  ],
  "nextBuyer": "사이버보안 지출 재가속을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "HACK",
    "CIBR",
    "IHAK"
  ],
  "preferredStocks": [
    "CRWD",
    "PANW",
    "FTNT"
  ],
  "breakCondition": "HACK 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. 소프트웨어 실적/AI 수익화

- 발견 점수: 53.9
- 반복 일수: 3
- 평균 후보 점수: 59.3
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: AI 소프트웨어/사이버보안 확산, 소프트웨어 실적/AI 수익화
- 구성 후보: ADSK, INTU, DDOG*, TEAM*, WDAY*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "stocks": [
    "DDOG",
    "WDAY",
    "TEAM",
    "ADSK",
    "INTU"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "DDOG",
    "WDAY",
    "TEAM",
    "ADSK"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 5. Integrated Oil & Gas 자금 유입

- 발견 점수: 44.8
- 반복 일수: 2
- 평균 후보 점수: 79.5
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: 매크로 방어/헤지
- 구성 후보: CVX*, XOM*

```js
{
  "name": "Integrated Oil & Gas 자금 유입",
  "etfs": [
    "QQQ",
    "SPY",
    "IWM",
    "XLE",
    "OIH"
  ],
  "stocks": [
    "CVX",
    "XOM"
  ],
  "nextBuyer": "Integrated Oil & Gas 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "CVX",
    "XOM"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

*표시는 기존 네러티브 템플릿에 이미 포함된 종목/ETF입니다.

## 적용 가이드

1. `KEEP`은 유지합니다.
2. `REWORK`는 구성 종목/ETF 또는 설명 문구를 조정합니다.
3. `삭제 관찰`은 바로 삭제하지 말고 1~2회 더 재점검합니다.
4. 신규 후보는 `reports/narrative-review.json`의 `proposedDefinition`을 검토한 뒤 승인 시 `src/main.js`의 `NARRATIVE_DEFINITIONS`에 반영합니다.

