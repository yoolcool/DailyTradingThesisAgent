# 네러티브 재점검 제안서

- 생성 시각: 2026년 11월 18일 수요일 오후 12:46
- 분석 리포트 수: 10개 (2026-10-30, 2026-11-02, 2026-11-03, 2026-11-04, 2026-11-06, 2026-11-09, 2026-11-10, 2026-11-11, 2026-11-16, 2026-11-17)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 0.9 | 0 | 2 | 6 | 소멸 (0) |
| 반도체 설계/공급망 재가속 | 수정 | 2.1 | 0 | 1 | 5 | 소멸 (0) |
| 반도체 장비 사이클 재평가 | 삭제 관찰 | 0 | 0 | 0 | 0 | 소멸 (0) |
| AI 소프트웨어/사이버보안 확산 | 삭제 관찰 | 0.8 | 0 | 0 | 0 | 소멸 (0) |
| 사이버보안 지출 재가속 | 수정 | 1.8 | 0 | 0 | 3 | 소멸 (0) |
| 소프트웨어 실적/AI 수익화 | 수정 | 12.3 | 0 | 1 | 9 | 약화 (8) |
| 위험선호 성장주 재진입 | 삭제 관찰 | 1.6 | 0 | 0 | 0 | 소멸 (0) |
| 방산/안보 프리미엄 | 수정 | 12.2 | 1 | 3 | 4 | 소멸 (0) |
| 전력망/원전/인프라 병목 | 수정 | 3.9 | 0 | 2 | 2 | 소멸 (0) |
| 비트코인/디지털 자산 위험선호 | 삭제 관찰 | 0 | 0 | 0 | 0 | 소멸 (0) |
| 매크로 방어/헤지 | 삭제 관찰 | 15 | 1 | 1 | 0 | 소멸 (0) |
| Data Storage 자금 유입 | 삭제 관찰 | 2.5 | 0 | 0 | 0 | 소멸 (0) |
| 전력 유틸리티 수요 재평가 | 삭제 관찰 | 5.6 | 0 | 1 | 0 | 소멸 (0) |
| 필수소비재 음료 방어 성장 | 유지 | 24.9 | 4 | 0 | 2 | 약화 (17) |
| Aerospace & Defense 자금 유입 | 수정 | 12.3 | 1 | 3 | 1 | 소멸 (0) |
| 바이오/헬스케어 촉매 | 유지 | 24 | 4 | 1 | 5 | 약화 (19) |
| Internet Content 자금 유입 | 삭제 관찰 | 0.3 | 0 | 0 | 0 | 소멸 (0) |
| Specialty Business Services 자금 유입 | 삭제 관찰 | 21 | 2 | 1 | 1 | 약화 (6) |
| Integrated Oil & Gas 자금 유입 | 삭제 관찰 | 16.7 | 1 | 1 | 1 | 소멸 (0) |
| 소비 회복/방어주 선별 | 삭제 관찰 | 8.3 | 0 | 1 | 0 | 소멸 (0) |
| Travel Services 자금 유입 | 삭제 관찰 | 14.1 | 2 | 1 | 2 | 약화 (5) |
| Bitcoin Mining 자금 유입 | 삭제 관찰 | 1.5 | 0 | 0 | 0 | 소멸 (0) |
| Medical Devices 자금 유입 | 삭제 관찰 | 4.4 | 0 | 0 | 0 | 소멸 (0) |
| Discount Stores 자금 유입 | 유지 | 30.1 | 6 | 0 | 4 | 약화 (35) |
| Staffing & Employment 자금 유입 | 유지 | 27.8 | 6 | 2 | 3 | 약화 (37) |
| Telecom Services 자금 유입 | 수정 | 5.1 | 2 | 0 | 2 | 약화 (25) |

## 신규/분리 후보 TOP 5

### 1. 바이오/헬스케어 촉매

- 발견 점수: 166.8
- 반복 일수: 8
- 평균 후보 점수: 89.5
- 기존 템플릿 포함 종목 수: 5
- 기존 연결 네러티브: Aerospace & Defense 자금 유입, 필수소비재 음료 방어 성장, 바이오/헬스케어 촉매, Discount Stores 자금 유입
- 구성 후보: AMGN*, GILD*, INSM*, REGN*, VRTX*

```js
{
  "name": "바이오/헬스케어 촉매",
  "etfs": [
    "QQQ"
  ],
  "stocks": [
    "AMGN",
    "VRTX",
    "GILD",
    "REGN",
    "INSM"
  ],
  "nextBuyer": "바이오/헬스케어 촉매을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ"
  ],
  "preferredStocks": [
    "AMGN",
    "VRTX",
    "GILD",
    "REGN"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. Telecom Services 자금 유입

- 발견 점수: 105
- 반복 일수: 5
- 평균 후보 점수: 90
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: Staffing & Employment 자금 유입, Specialty Business Services 자금 유입, Telecom Services 자금 유입
- 구성 후보: CHTR*, CMCSA*

```js
{
  "name": "Telecom Services 자금 유입",
  "etfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "stocks": [
    "CHTR",
    "CMCSA"
  ],
  "nextBuyer": "Telecom Services 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "CHTR",
    "CMCSA"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. Aerospace & Defense 자금 유입

- 발견 점수: 104.4
- 반복 일수: 1
- 평균 후보 점수: 84.6
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: 방산/안보 프리미엄
- 구성 후보: KTOS*, LMT*, RTX*

```js
{
  "name": "Aerospace & Defense 자금 유입",
  "etfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "stocks": [
    "LMT",
    "RTX",
    "KTOS"
  ],
  "nextBuyer": "Aerospace & Defense 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "LMT",
    "RTX",
    "KTOS"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. Discount Stores 자금 유입

- 발견 점수: 78.9
- 반복 일수: 4
- 평균 후보 점수: 82.7
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: Discount Stores 자금 유입
- 구성 후보: COST*, WMT*

```js
{
  "name": "Discount Stores 자금 유입",
  "etfs": [
    "QQQ"
  ],
  "stocks": [
    "WMT",
    "COST"
  ],
  "nextBuyer": "Discount Stores 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ"
  ],
  "preferredStocks": [
    "WMT",
    "COST"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 5. 필수소비재 음료 방어 성장

- 발견 점수: 76.5
- 반복 일수: 4
- 평균 후보 점수: 79
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: 필수소비재 음료 방어 성장, Discount Stores 자금 유입
- 구성 후보: CCEP*, KDP*, PEP*

```js
{
  "name": "필수소비재 음료 방어 성장",
  "etfs": [
    "QQQ"
  ],
  "stocks": [
    "KDP",
    "PEP",
    "CCEP"
  ],
  "nextBuyer": "필수소비재 음료 방어 성장을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ"
  ],
  "preferredStocks": [
    "KDP",
    "PEP",
    "CCEP"
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

