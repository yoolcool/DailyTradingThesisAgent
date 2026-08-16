# 네러티브 재점검 제안서

- 생성 시각: 2026년 8월 17일 월요일 오전 7:46
- 분석 리포트 수: 10개 (2026-08-03, 2026-08-04, 2026-08-05, 2026-08-06, 2026-08-07, 2026-08-10, 2026-08-11, 2026-08-12, 2026-08-13, 2026-08-14)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 15.7 | 0 | 3 | 9 | 약화 (23) |
| 반도체 설계/공급망 재가속 | 수정 | 8.6 | 0 | 1 | 3 | 약화 (16) |
| 반도체 장비 사이클 재평가 | 수정 | 10.1 | 0 | 0 | 6 | 약화 (24) |
| AI 소프트웨어/사이버보안 확산 | 유지 | 55.7 | 7 | 9 | 9 | 부상 (69) |
| 사이버보안 지출 재가속 | 유지 | 47.5 | 5 | 1 | 6 | 부상 (73) |
| 소프트웨어 실적/AI 수익화 | 유지 | 48.7 | 3 | 7 | 3 | 부상 (82) |
| 위험선호 성장주 재진입 | 수정 | 14.8 | 0 | 0 | 1 | 약화 (20) |
| 방산/안보 프리미엄 | 수정 | 39.7 | 2 | 3 | 4 | 약화 (33) |
| 전력망/원전/인프라 병목 | 수정 | 22.5 | 0 | 1 | 3 | 약화 (19) |
| 비트코인/디지털 자산 위험선호 | 수정 | 4.9 | 0 | 3 | 0 | 약화 (5) |
| 매크로 방어/헤지 | 수정 | 27.7 | 0 | 1 | 1 | 약화 (25) |
| Data Storage 자금 유입 | 수정 | 25.6 | 0 | 1 | 1 | 약화 (43) |
| 전력 유틸리티 수요 재평가 | 수정 | 28.8 | 0 | 1 | 1 | 약화 (25) |
| 필수소비재 음료 방어 성장 | 삭제 관찰 | 19.3 | 0 | 0 | 1 | 소멸 (0) |
| Aerospace & Defense 자금 유입 | 유지 | 43.2 | 3 | 3 | 4 | 약화 (41) |
| 바이오/헬스케어 촉매 | 유지 | 50.4 | 6 | 3 | 4 | 약화 (29) |
| Internet Content 자금 유입 | 수정 | 27.9 | 1 | 2 | 2 | 약화 (16) |
| Specialty Business Services 자금 유입 | 수정 | 27 | 0 | 0 | 0 | 약화 (23) |
| Integrated Oil & Gas 자금 유입 | 수정 | 31.1 | 0 | 1 | 2 | 약화 (31) |
| 소비 회복/방어주 선별 | 수정 | 28 | 1 | 2 | 1 | 약화 (12) |
| Travel Services 자금 유입 | 수정 | 16.8 | 2 | 2 | 3 | 약화 (48) |

## 신규/분리 후보 TOP 5

### 1. 소프트웨어 실적/AI 수익화

- 발견 점수: 255.5
- 반복 일수: 6
- 평균 후보 점수: 93.2
- 기존 템플릿 포함 종목 수: 5
- 기존 연결 네러티브: AI 소프트웨어/사이버보안 확산, 소프트웨어 실적/AI 수익화
- 구성 후보: ADSK*, DDOG*, INTU*, TEAM*, WDAY*

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
    "INTU",
    "ADSK"
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
    "INTU"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. 소프트웨어 실적/AI 수익화

- 발견 점수: 223.5
- 반복 일수: 7
- 평균 후보 점수: 89.9
- 기존 템플릿 포함 종목 수: 1
- 기존 연결 네러티브: 소프트웨어 실적/AI 수익화, AI 소프트웨어/사이버보안 확산
- 구성 후보: ADBE, SHOP, MSFT*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "QQQ",
    "MAGS",
    "IGV",
    "AIQ"
  ],
  "stocks": [
    "MSFT",
    "SHOP",
    "ADBE"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ",
    "MAGS",
    "IGV"
  ],
  "preferredStocks": [
    "MSFT",
    "SHOP",
    "ADBE"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. Aerospace & Defense 자금 유입

- 발견 점수: 178.3
- 반복 일수: 7
- 평균 후보 점수: 83.2
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: 방산/안보 프리미엄, Aerospace & Defense 자금 유입
- 구성 후보: AVAV*, AXON*, KTOS*

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
    "AXON",
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
    "AXON",
    "AVAV"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. Travel Services 자금 유입

- 발견 점수: 176.4
- 반복 일수: 6
- 평균 후보 점수: 88.8
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: 바이오/헬스케어 촉매, AI 소프트웨어/사이버보안 확산, Travel Services 자금 유입
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

- 발견 점수: 123.4
- 반복 일수: 6
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
    "FTNT",
    "PANW",
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
    "FTNT",
    "PANW",
    "ZS"
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

