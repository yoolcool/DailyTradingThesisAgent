# 네러티브 재점검 제안서

- 생성 시각: 2026년 11월 2일 월요일 오전 10:41
- 분석 리포트 수: 10개 (2026-10-12, 2026-10-13, 2026-10-14, 2026-10-21, 2026-10-22, 2026-10-23, 2026-10-26, 2026-10-27, 2026-10-29, 2026-10-30)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 3.3 | 0 | 2 | 8 | 소멸 (9) |
| 반도체 설계/공급망 재가속 | 수정 | 4.3 | 0 | 2 | 6 | 소멸 (8) |
| 반도체 장비 사이클 재평가 | 삭제 관찰 | 0.1 | 0 | 0 | 0 | 소멸 (0) |
| AI 소프트웨어/사이버보안 확산 | 유지 | 30.7 | 3 | 3 | 6 | 약화 (8) |
| 사이버보안 지출 재가속 | 유지 | 33.5 | 3 | 2 | 7 | 약화 (18) |
| 소프트웨어 실적/AI 수익화 | 유지 | 26.1 | 3 | 4 | 7 | 약화 (14) |
| 위험선호 성장주 재진입 | 수정 | 8.4 | 0 | 2 | 0 | 소멸 (7) |
| 방산/안보 프리미엄 | 수정 | 16.5 | 1 | 7 | 4 | 관찰 (58) |
| 전력망/원전/인프라 병목 | 수정 | 5.1 | 0 | 3 | 0 | 소멸 (16) |
| 비트코인/디지털 자산 위험선호 | 삭제 관찰 | 0 | 0 | 0 | 0 | 소멸 (0) |
| 매크로 방어/헤지 | 유지 | 38.8 | 5 | 3 | 2 | 약화 (28) |
| Data Storage 자금 유입 | 삭제 관찰 | 5.5 | 0 | 0 | 0 | 소멸 (10) |
| 전력 유틸리티 수요 재평가 | 수정 | 10.4 | 0 | 2 | 0 | 소멸 (27) |
| 필수소비재 음료 방어 성장 | 삭제 관찰 | 19.7 | 2 | 1 | 2 | 약화 (14) |
| Aerospace & Defense 자금 유입 | 수정 | 12.3 | 2 | 2 | 2 | 약화 (48) |
| 바이오/헬스케어 촉매 | 수정 | 18.1 | 1 | 2 | 0 | 소멸 (32) |
| Internet Content 자금 유입 | 수정 | 8.7 | 0 | 2 | 1 | 소멸 (3) |
| Specialty Business Services 자금 유입 | 수정 | 26.8 | 2 | 3 | 2 | 약화 (20) |
| Integrated Oil & Gas 자금 유입 | 유지 | 47.1 | 7 | 3 | 4 | 약화 (32) |
| 소비 회복/방어주 선별 | 수정 | 13.3 | 1 | 2 | 1 | 약화 (3) |
| Travel Services 자금 유입 | 삭제 관찰 | 6 | 0 | 0 | 0 | 약화 (0) |
| Bitcoin Mining 자금 유입 | 삭제 관찰 | 0 | 0 | 0 | 0 | 소멸 (0) |
| Medical Devices 자금 유입 | 삭제 관찰 | 17.5 | 0 | 1 | 0 | 약화 (4) |
| Discount Stores 자금 유입 | 삭제 관찰 | 10.2 | 0 | 0 | 0 | 약화 (8) |
| Staffing & Employment 자금 유입 | 삭제 관찰 | 3.8 | 0 | 0 | 0 | 약화 (14) |

## 신규/분리 후보 TOP 5

### 1. Aerospace & Defense 자금 유입

- 발견 점수: 205
- 반복 일수: 5
- 평균 후보 점수: 88.4
- 기존 템플릿 포함 종목 수: 5
- 기존 연결 네러티브: 방산/안보 프리미엄, Aerospace & Defense 자금 유입
- 구성 후보: AVAV*, KTOS*, LMT*, NOC*, RTX*

```js
{
  "name": "Aerospace & Defense 자금 유입",
  "etfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "stocks": [
    "NOC",
    "LMT",
    "RTX",
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
    "NOC",
    "LMT",
    "RTX",
    "KTOS"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. 소프트웨어 실적/AI 수익화

- 발견 점수: 203.4
- 반복 일수: 7
- 평균 후보 점수: 91.1
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: AI 소프트웨어/사이버보안 확산, 소프트웨어 실적/AI 수익화
- 구성 후보: CDNS, DDOG*, ROP*, TEAM*

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
    "TEAM",
    "ROP",
    "CDNS"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "DDOG",
    "TEAM",
    "ROP",
    "CDNS"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. 사이버보안 지출 재가속

- 발견 점수: 130.1
- 반복 일수: 4
- 평균 후보 점수: 91
- 기존 템플릿 포함 종목 수: 4
- 기존 연결 네러티브: 사이버보안 지출 재가속
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
    "FTNT",
    "PANW",
    "CRWD"
  ],
  "nextBuyer": "사이버보안 지출 재가속을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "HACK",
    "CIBR",
    "IHAK"
  ],
  "preferredStocks": [
    "ZS",
    "FTNT",
    "PANW",
    "CRWD"
  ],
  "breakCondition": "HACK 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. 소프트웨어 실적/AI 수익화

- 발견 점수: 92.2
- 반복 일수: 4
- 평균 후보 점수: 79.3
- 기존 템플릿 포함 종목 수: 1
- 기존 연결 네러티브: 소프트웨어 실적/AI 수익화, AI 소프트웨어/사이버보안 확산
- 구성 후보: SHOP, MSFT*

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
    "MSFT"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 5. Specialty Business Services 자금 유입

- 발견 점수: 91.2
- 반복 일수: 2
- 평균 후보 점수: 88.4
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

