# 네러티브 재점검 제안서

- 생성 시각: 2026년 9월 23일 수요일 오전 9:49
- 분석 리포트 수: 10개 (2026-09-08, 2026-09-09, 2026-09-10, 2026-09-11, 2026-09-14, 2026-09-15, 2026-09-17, 2026-09-18, 2026-09-21, 2026-09-22)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 21.3 | 0 | 7 | 8 | 약화 (31) |
| 반도체 설계/공급망 재가속 | 유지 | 28.9 | 5 | 7 | 10 | 약화 (39) |
| 반도체 장비 사이클 재평가 | 삭제 관찰 | 11.5 | 0 | 1 | 1 | 약화 (14) |
| AI 소프트웨어/사이버보안 확산 | 수정 | 15.2 | 0 | 1 | 3 | 약화 (43) |
| 사이버보안 지출 재가속 | 수정 | 24 | 2 | 2 | 6 | 관찰 (60) |
| 소프트웨어 실적/AI 수익화 | 수정 | 16.3 | 0 | 1 | 4 | 약화 (37) |
| 위험선호 성장주 재진입 | 수정 | 25.9 | 0 | 5 | 2 | 관찰 (54) |
| 방산/안보 프리미엄 | 삭제 관찰 | 1.3 | 0 | 0 | 0 | 소멸 (4) |
| 전력망/원전/인프라 병목 | 수정 | 8.1 | 0 | 3 | 1 | 소멸 (6) |
| 비트코인/디지털 자산 위험선호 | 유지 | 39.8 | 6 | 4 | 6 | 부상 (85) |
| 매크로 방어/헤지 | 유지 | 27.9 | 5 | 2 | 0 | 약화 (21) |
| Data Storage 자금 유입 | 수정 | 23.3 | 1 | 2 | 0 | 약화 (45) |
| 전력 유틸리티 수요 재평가 | 수정 | 17.2 | 0 | 1 | 0 | 약화 (30) |
| 필수소비재 음료 방어 성장 | 수정 | 13.3 | 0 | 0 | 0 | 소멸 (46) |
| Aerospace & Defense 자금 유입 | 삭제 관찰 | 7.1 | 0 | 0 | 0 | 소멸 (18) |
| 바이오/헬스케어 촉매 | 유지 | 24.9 | 4 | 3 | 4 | 부상 (67) |
| Internet Content 자금 유입 | 수정 | 29.2 | 2 | 4 | 2 | 관찰 (57) |
| Specialty Business Services 자금 유입 | 수정 | 13.4 | 0 | 0 | 0 | 소멸 (25) |
| Integrated Oil & Gas 자금 유입 | 유지 | 32.3 | 3 | 2 | 1 | 약화 (43) |
| 소비 회복/방어주 선별 | 수정 | 10 | 0 | 0 | 0 | 소멸 (38) |
| Travel Services 자금 유입 | 수정 | 10.3 | 0 | 0 | 0 | 소멸 (37) |
| Bitcoin Mining 자금 유입 | 수정 | 15.3 | 2 | 2 | 0 | 부상 (77) |

## 신규/분리 후보 TOP 5

### 1. 반도체 설계/공급망 재가속

- 발견 점수: 356
- 반복 일수: 9
- 평균 후보 점수: 82.9
- 기존 템플릿 포함 종목 수: 6
- 기존 연결 네러티브: AI 인프라 재가속, 반도체 설계/공급망 재가속, 위험선호 성장주 재진입
- 구성 후보: ADI, AMD*, ARM*, INTC*, NVDA*, QCOM*, TSM*

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
    "NVDA",
    "TSM",
    "AMD",
    "QCOM",
    "INTC",
    "ARM",
    "ADI"
  ],
  "nextBuyer": "반도체 설계/공급망 재가속을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "SMH",
    "SOXX",
    "SOXQ"
  ],
  "preferredStocks": [
    "NVDA",
    "TSM",
    "AMD",
    "QCOM"
  ],
  "breakCondition": "SMH 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. Bitcoin Mining 자금 유입

- 발견 점수: 159.2
- 반복 일수: 6
- 평균 후보 점수: 89.2
- 기존 템플릿 포함 종목 수: 4
- 기존 연결 네러티브: 비트코인/디지털 자산 위험선호
- 구성 후보: CIFR*, IREN*, MARA*, RIOT*

```js
{
  "name": "Bitcoin Mining 자금 유입",
  "etfs": [
    "IBIT",
    "BLOK"
  ],
  "stocks": [
    "IREN",
    "MARA",
    "RIOT",
    "CIFR"
  ],
  "nextBuyer": "Bitcoin Mining 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IBIT",
    "BLOK"
  ],
  "preferredStocks": [
    "IREN",
    "MARA",
    "RIOT",
    "CIFR"
  ],
  "breakCondition": "IBIT 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 3. 사이버보안 지출 재가속

- 발견 점수: 115.2
- 반복 일수: 4
- 평균 후보 점수: 82.5
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
    "CRWD",
    "FTNT",
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
    "FTNT",
    "ZS",
    "PANW"
  ],
  "breakCondition": "HACK 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 4. Medical Devices 자금 유입

- 발견 점수: 88.4
- 반복 일수: 2
- 평균 후보 점수: 81
- 기존 템플릿 포함 종목 수: 0
- 기존 연결 네러티브: 바이오/헬스케어 촉매
- 구성 후보: DXCM, ISRG

```js
{
  "name": "Medical Devices 자금 유입",
  "etfs": [
    "QQQ"
  ],
  "stocks": [
    "ISRG",
    "DXCM"
  ],
  "nextBuyer": "Medical Devices 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ"
  ],
  "preferredStocks": [
    "ISRG",
    "DXCM"
  ],
  "breakCondition": "QQQ 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 5. Internet Content 자금 유입

- 발견 점수: 73.3
- 반복 일수: 3
- 평균 후보 점수: 69.9
- 기존 템플릿 포함 종목 수: 3
- 기존 연결 네러티브: Internet Content 자금 유입
- 구성 후보: GOOG*, GOOGL*, META*

```js
{
  "name": "Internet Content 자금 유입",
  "etfs": [
    "QQQ"
  ],
  "stocks": [
    "META",
    "GOOGL",
    "GOOG"
  ],
  "nextBuyer": "Internet Content 자금 유입을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "QQQ"
  ],
  "preferredStocks": [
    "META",
    "GOOGL",
    "GOOG"
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

