# 네러티브 재점검 제안서

- 생성 시각: 2026년 8월 24일 월요일 오전 7:47
- 분석 리포트 수: 10개 (2026-08-10, 2026-08-11, 2026-08-12, 2026-08-13, 2026-08-14, 2026-08-17, 2026-08-18, 2026-08-19, 2026-08-20, 2026-08-21)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 12.8 | 1 | 1 | 10 | 약화 (0) |
| 반도체 설계/공급망 재가속 | 수정 | 7.2 | 0 | 2 | 4 | 약화 (0) |
| 반도체 장비 사이클 재평가 | 수정 | 11.3 | 0 | 1 | 5 | 소멸 (0) |
| AI 소프트웨어/사이버보안 확산 | 유지 | 41.8 | 3 | 7 | 9 | 약화 (19) |
| 사이버보안 지출 재가속 | 수정 | 30.2 | 2 | 2 | 4 | 약화 (0) |
| 소프트웨어 실적/AI 수익화 | 수정 | 34.1 | 1 | 5 | 3 | 약화 (26) |
| 위험선호 성장주 재진입 | 수정 | 14.9 | 0 | 1 | 0 | 약화 (20) |
| 방산/안보 프리미엄 | 수정 | 35.7 | 2 | 2 | 3 | 약화 (5) |
| 전력망/원전/인프라 병목 | 수정 | 18 | 1 | 1 | 3 | 약화 (7) |
| 비트코인/디지털 자산 위험선호 | 수정 | 10.6 | 1 | 4 | 1 | 약화 (54) |
| 매크로 방어/헤지 | 유지 | 37.6 | 3 | 2 | 3 | 관찰 (50) |
| Data Storage 자금 유입 | 삭제 관찰 | 23.8 | 2 | 1 | 2 | 약화 (2) |
| 전력 유틸리티 수요 재평가 | 삭제 관찰 | 17.5 | 0 | 0 | 0 | 약화 (1) |
| 필수소비재 음료 방어 성장 | 삭제 관찰 | 8 | 0 | 0 | 1 | 소멸 (0) |
| Aerospace & Defense 자금 유입 | 유지 | 38.8 | 4 | 3 | 4 | 약화 (8) |
| 바이오/헬스케어 촉매 | 유지 | 41 | 5 | 1 | 3 | 약화 (27) |
| Internet Content 자금 유입 | 수정 | 20 | 0 | 1 | 0 | 약화 (22) |
| Specialty Business Services 자금 유입 | 수정 | 25.8 | 0 | 0 | 3 | 약화 (23) |
| Integrated Oil & Gas 자금 유입 | 유지 | 35.5 | 3 | 2 | 3 | 약화 (39) |
| 소비 회복/방어주 선별 | 삭제 관찰 | 13.1 | 0 | 0 | 0 | 약화 (6) |
| Travel Services 자금 유입 | 수정 | 31.4 | 2 | 2 | 3 | 약화 (31) |

## 신규/분리 후보 TOP 5

### 1. 소프트웨어 실적/AI 수익화

- 발견 점수: 259.3
- 반복 일수: 6
- 평균 후보 점수: 89.4
- 기존 템플릿 포함 종목 수: 1
- 기존 연결 네러티브: AI 소프트웨어/사이버보안 확산, 소프트웨어 실적/AI 수익화
- 구성 후보: ADSK, INTU, ROP, WDAY, TEAM*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "stocks": [
    "TEAM",
    "INTU",
    "ADSK",
    "WDAY",
    "ROP"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "TEAM",
    "INTU",
    "ADSK",
    "WDAY"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. Aerospace & Defense 자금 유입

- 발견 점수: 167
- 반복 일수: 6
- 평균 후보 점수: 85.3
- 기존 템플릿 포함 종목 수: 4
- 기존 연결 네러티브: 방산/안보 프리미엄, Aerospace & Defense 자금 유입
- 구성 후보: AVAV*, AXON*, KTOS*, NOC*

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
    "AVAV",
    "AXON",
    "NOC"
  ],
  "nextBuyer": "Aerospace & Defense 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "SPY",
    "IWM"
  ],
  "preferredStocks": [
    "KTOS",
    "AVAV",
    "AXON",
    "NOC"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. 소프트웨어 실적/AI 수익화

- 발견 점수: 141.3
- 반복 일수: 4
- 평균 후보 점수: 87.2
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: AI 소프트웨어/사이버보안 확산, 소프트웨어 실적/AI 수익화, 비트코인/디지털 자산 위험선호
- 구성 후보: ADBE, MSTR*, SHOP*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "stocks": [
    "SHOP",
    "ADBE",
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
    "ADBE",
    "MSTR"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. Travel Services 자금 유입

- 발견 점수: 129.7
- 반복 일수: 5
- 평균 후보 점수: 88
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: AI 소프트웨어/사이버보안 확산, Travel Services 자금 유입
- 구성 후보: ABNB*, BKNG*

```js
{
  "name": "Travel Services 자금 유입",
  "etfs": [
    "QQQ"
  ],
  "stocks": [
    "BKNG",
    "ABNB"
  ],
  "nextBuyer": "Travel Services 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ"
  ],
  "preferredStocks": [
    "BKNG",
    "ABNB"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 5. 사이버보안 지출 재가속

- 발견 점수: 96.7
- 반복 일수: 5
- 평균 후보 점수: 88.5
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: 사이버보안 지출 재가속, AI 소프트웨어/사이버보안 확산
- 구성 후보: CRWD*, PANW*, ZS*

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
    "ZS",
    "PANW"
  ],
  "nextBuyer": "사이버보안 지출 재가속을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "HACK",
    "CIBR",
    "IHAK"
  ],
  "preferredStocks": [
    "CRWD",
    "ZS",
    "PANW"
  ],
  "breakCondition": "HACK 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

*표시는 기존 네러티브 템플릿에 이미 포함된 종목/ETF입니다.

## 적용 가이드

1. `KEEP`은 유지합니다.
2. `REWORK`는 구성 종목/ETF 또는 설명 문구를 조정합니다.
3. `삭제 관찰`은 바로 삭제하지 말고 1~2회 더 재점검합니다.
4. 신규 후보는 `reports/narrative-review.json`의 `proposedDefinition`을 검토한 뒤 승인 시 `src/main.js`의 `NARRATIVE_DEFINITIONS`에 반영합니다.

