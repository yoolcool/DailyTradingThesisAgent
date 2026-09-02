# 네러티브 재점검 제안서

- 생성 시각: 2026년 9월 2일 수요일 오전 9:23
- 분석 리포트 수: 10개 (2026-08-13, 2026-08-14, 2026-08-17, 2026-08-18, 2026-08-19, 2026-08-20, 2026-08-21, 2026-08-28, 2026-08-31, 2026-09-01)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 13.2 | 1 | 3 | 10 | 약화 (8) |
| 반도체 설계/공급망 재가속 | 수정 | 8.8 | 0 | 2 | 5 | 약화 (4) |
| 반도체 장비 사이클 재평가 | 수정 | 12 | 0 | 1 | 4 | 약화 (6) |
| AI 소프트웨어/사이버보안 확산 | 유지 | 42.1 | 4 | 5 | 9 | 약화 (56) |
| 사이버보안 지출 재가속 | 유지 | 41.6 | 4 | 5 | 5 | 부상 (87) |
| 소프트웨어 실적/AI 수익화 | 유지 | 39.1 | 3 | 6 | 6 | 약화 (50) |
| 위험선호 성장주 재진입 | 수정 | 21 | 0 | 2 | 1 | 약화 (44) |
| 방산/안보 프리미엄 | 삭제 관찰 | 21.1 | 1 | 1 | 1 | 약화 (4) |
| 전력망/원전/인프라 병목 | 수정 | 15.6 | 1 | 1 | 3 | 약화 (3) |
| 비트코인/디지털 자산 위험선호 | 수정 | 17.6 | 1 | 6 | 2 | 약화 (18) |
| 매크로 방어/헤지 | 유지 | 37.1 | 3 | 3 | 2 | 관찰 (50) |
| Data Storage 자금 유입 | 삭제 관찰 | 25.8 | 2 | 1 | 2 | 약화 (15) |
| 전력 유틸리티 수요 재평가 | 삭제 관찰 | 16.5 | 0 | 0 | 0 | 약화 (13) |
| 필수소비재 음료 방어 성장 | 삭제 관찰 | 2.8 | 0 | 0 | 0 | 약화 (15) |
| Aerospace & Defense 자금 유입 | 삭제 관찰 | 25.1 | 2 | 1 | 2 | 약화 (7) |
| 바이오/헬스케어 촉매 | 유지 | 31.1 | 3 | 0 | 1 | 약화 (31) |
| Internet Content 자금 유입 | 수정 | 20.3 | 0 | 2 | 0 | 약화 (18) |
| Specialty Business Services 자금 유입 | 수정 | 24.6 | 0 | 0 | 3 | 약화 (17) |
| Integrated Oil & Gas 자금 유입 | 유지 | 37 | 4 | 3 | 3 | 관찰 (53) |
| 소비 회복/방어주 선별 | 삭제 관찰 | 11.4 | 0 | 0 | 0 | 소멸 (13) |
| Travel Services 자금 유입 | 수정 | 33.7 | 1 | 1 | 2 | 약화 (25) |

## 신규/분리 후보 TOP 5

### 1. 소프트웨어 실적/AI 수익화

- 발견 점수: 340.2
- 반복 일수: 7
- 평균 후보 점수: 90.1
- 기존 템플릿 포함 종목 수: 1
- 기존 연결 네러티브: 소프트웨어 실적/AI 수익화, AI 소프트웨어/사이버보안 확산
- 구성 후보: ADSK, CDNS, INTU, ROP, SNPS, WDAY, TEAM*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "stocks": [
    "INTU",
    "TEAM",
    "ADSK",
    "WDAY",
    "CDNS",
    "SNPS",
    "ROP"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "INTU",
    "TEAM",
    "ADSK",
    "WDAY"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. 사이버보안 지출 재가속

- 발견 점수: 226
- 반복 일수: 5
- 평균 후보 점수: 94.9
- 기존 템플릿 포함 종목 수: 4
- 기존 연결 네러티브: AI 소프트웨어/사이버보안 확산, 사이버보안 지출 재가속
- 구성 후보: CRWD*, FTNT*, PANW*, ZS*

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
    "ZS",
    "PANW",
    "CRWD",
    "FTNT"
  ],
  "nextBuyer": "사이버보안 지출 재가속을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "HACK",
    "CIBR",
    "IHAK"
  ],
  "preferredStocks": [
    "ZS",
    "PANW",
    "CRWD",
    "FTNT"
  ],
  "breakCondition": "HACK 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. 소프트웨어 실적/AI 수익화

- 발견 점수: 175.9
- 반복 일수: 6
- 평균 후보 점수: 87
- 기존 템플릿 포함 종목 수: 4
- 기존 연결 네러티브: 소프트웨어 실적/AI 수익화, AI 소프트웨어/사이버보안 확산, 비트코인/디지털 자산 위험선호
- 구성 후보: ADBE*, MSFT*, MSTR*, SHOP*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "IGV",
    "AIQ",
    "QQQ",
    "MAGS"
  ],
  "stocks": [
    "SHOP",
    "ADBE",
    "MSTR",
    "MSFT"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "SHOP",
    "ADBE",
    "MSTR",
    "MSFT"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. Integrated Oil & Gas 자금 유입

- 발견 점수: 85.5
- 반복 일수: 5
- 평균 후보 점수: 73.6
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: Integrated Oil & Gas 자금 유입, 매크로 방어/헤지
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

### 5. Aerospace & Defense 자금 유입

- 발견 점수: 72.6
- 반복 일수: 2
- 평균 후보 점수: 84.3
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: Aerospace & Defense 자금 유입
- 구성 후보: AVAV*, KTOS*

```js
{
  "name": "Aerospace & Defense 자금 유입",
  "etfs": [
    "QQQ",
    "SPY",
    "IWM",
    "XAR",
    "SHLD"
  ],
  "stocks": [
    "KTOS",
    "AVAV"
  ],
  "nextBuyer": "Aerospace & Defense 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "KTOS",
    "AVAV"
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

