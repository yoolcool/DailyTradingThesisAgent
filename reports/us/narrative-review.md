# 네러티브 재점검 제안서

- 생성 시각: 2026년 10월 26일 월요일 오전 9:32
- 분석 리포트 수: 10개 (2026-10-06, 2026-10-07, 2026-10-08, 2026-10-09, 2026-10-12, 2026-10-13, 2026-10-14, 2026-10-21, 2026-10-22, 2026-10-23)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 12.6 | 0 | 4 | 7 | 소멸 (0) |
| 반도체 설계/공급망 재가속 | 수정 | 13.2 | 0 | 4 | 7 | 소멸 (7) |
| 반도체 장비 사이클 재평가 | 삭제 관찰 | 10.8 | 1 | 0 | 1 | 소멸 (0) |
| AI 소프트웨어/사이버보안 확산 | 유지 | 37.3 | 6 | 6 | 7 | 약화 (36) |
| 사이버보안 지출 재가속 | 유지 | 36.2 | 5 | 2 | 7 | 약화 (13) |
| 소프트웨어 실적/AI 수익화 | 유지 | 34.7 | 6 | 3 | 8 | 약화 (36) |
| 위험선호 성장주 재진입 | 수정 | 14.4 | 0 | 3 | 0 | 소멸 (19) |
| 방산/안보 프리미엄 | 수정 | 5.5 | 0 | 6 | 2 | 소멸 (19) |
| 전력망/원전/인프라 병목 | 수정 | 9.5 | 0 | 4 | 1 | 소멸 (0) |
| 비트코인/디지털 자산 위험선호 | 삭제 관찰 | 0 | 0 | 0 | 0 | 소멸 (0) |
| 매크로 방어/헤지 | 유지 | 26 | 3 | 3 | 2 | 약화 (40) |
| Data Storage 자금 유입 | 삭제 관찰 | 7.6 | 0 | 0 | 0 | 소멸 (10) |
| 전력 유틸리티 수요 재평가 | 삭제 관찰 | 12.9 | 0 | 1 | 0 | 소멸 (11) |
| 필수소비재 음료 방어 성장 | 수정 | 24.2 | 2 | 1 | 2 | 약화 (28) |
| Aerospace & Defense 자금 유입 | 삭제 관찰 | 5 | 0 | 0 | 0 | 소멸 (11) |
| 바이오/헬스케어 촉매 | 삭제 관찰 | 15 | 0 | 1 | 0 | 소멸 (14) |
| Internet Content 자금 유입 | 수정 | 18.1 | 0 | 2 | 1 | 약화 (6) |
| Specialty Business Services 자금 유입 | 수정 | 20.3 | 1 | 3 | 2 | 약화 (49) |
| Integrated Oil & Gas 자금 유입 | 유지 | 31.9 | 4 | 3 | 2 | 약화 (45) |
| 소비 회복/방어주 선별 | 수정 | 22.5 | 1 | 2 | 1 | 약화 (14) |
| Travel Services 자금 유입 | 삭제 관찰 | 10.5 | 0 | 0 | 0 | 약화 (18) |
| Bitcoin Mining 자금 유입 | 삭제 관찰 | 0 | 0 | 0 | 0 | 소멸 (0) |
| Medical Devices 자금 유입 | 수정 | 23.4 | 1 | 1 | 0 | 약화 (22) |
| Discount Stores 자금 유입 | 삭제 관찰 | 6.2 | 0 | 0 | 0 | 약화 (17) |

## 신규/분리 후보 TOP 5

### 1. 소프트웨어 실적/AI 수익화

- 발견 점수: 170.4
- 반복 일수: 7
- 평균 후보 점수: 83.1
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: 소프트웨어 실적/AI 수익화, AI 소프트웨어/사이버보안 확산
- 구성 후보: ADSK, INTU, ROP, SNPS, DDOG*, TEAM*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "stocks": [
    "SNPS",
    "ADSK",
    "DDOG",
    "TEAM",
    "ROP",
    "INTU"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "SNPS",
    "ADSK",
    "DDOG",
    "TEAM"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. 반도체 설계/공급망 재가속

- 발견 점수: 166
- 반복 일수: 4
- 평균 후보 점수: 83.3
- 기존 템플릿 포함 종목 수: 7
- 기존 연결 네러티브: 반도체 설계/공급망 재가속, AI 인프라 재가속
- 구성 후보: MCHP, NXPI, ADI*, AMD*, AVGO*, MRVL*, NVDA*, TSM*, TXN*

```js
{
  "name": "반도체 설계/공급망 재가속",
  "etfs": [
    "SMH",
    "SOXX",
    "SOXQ",
    "AIQ",
    "QQQ"
  ],
  "stocks": [
    "TSM",
    "NVDA",
    "AMD",
    "MRVL",
    "AVGO",
    "NXPI",
    "MCHP",
    "TXN"
  ],
  "nextBuyer": "반도체 설계/공급망 재가속을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "SMH",
    "SOXX",
    "SOXQ"
  ],
  "preferredStocks": [
    "TSM",
    "NVDA",
    "AMD",
    "MRVL"
  ],
  "breakCondition": "SMH 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. 사이버보안 지출 재가속

- 발견 점수: 135.5
- 반복 일수: 5
- 평균 후보 점수: 85.7
- 기존 템플릿 포함 종목 수: 4
- 기존 연결 네러티브: 사이버보안 지출 재가속, AI 소프트웨어/사이버보안 확산
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
    "CRWD",
    "PANW",
    "FTNT",
    "ZS"
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
    "FTNT",
    "ZS"
  ],
  "breakCondition": "HACK 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. 소프트웨어 실적/AI 수익화

- 발견 점수: 100
- 반복 일수: 6
- 평균 후보 점수: 78.2
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: 소프트웨어 실적/AI 수익화, AI 소프트웨어/사이버보안 확산
- 구성 후보: MSFT*, MSTR*, SHOP*

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
    "MSFT",
    "MSTR"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "SHOP",
    "MSFT",
    "MSTR"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 5. Specialty Business Services 자금 유입

- 발견 점수: 91.2
- 반복 일수: 2
- 평균 후보 점수: 88.3
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: Specialty Business Services 자금 유입
- 구성 후보: CTAS*, TRI*

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
    "CTAS"
  ],
  "nextBuyer": "Specialty Business Services 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "TRI",
    "CTAS"
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

