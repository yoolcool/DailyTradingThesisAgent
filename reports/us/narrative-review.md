# 네러티브 재점검 제안서

- 생성 시각: 2026년 9월 28일 월요일 오전 10:00
- 분석 리포트 수: 10개 (2026-09-10, 2026-09-11, 2026-09-14, 2026-09-15, 2026-09-17, 2026-09-18, 2026-09-21, 2026-09-22, 2026-09-23, 2026-09-25)
- 적용 방식: 자동 수정 없음. 이 문서는 템플릿 변경 후보만 제안합니다.

## 기존 네러티브 점검

| 네러티브 | 판정 | 평균 점수 | TOP3 일수 | 직접 뉴스 일수 | 후보 등장 일수 | 최신 상태 |
|---|---:|---:|---:|---:|---:|---|
| AI 인프라 재가속 | 수정 | 23.4 | 0 | 6 | 8 | 약화 (29) |
| 반도체 설계/공급망 재가속 | 유지 | 37.3 | 5 | 7 | 10 | 관찰 (54) |
| 반도체 장비 사이클 재평가 | 수정 | 18 | 0 | 1 | 1 | 약화 (37) |
| AI 소프트웨어/사이버보안 확산 | 수정 | 21.3 | 0 | 2 | 5 | 약화 (44) |
| 사이버보안 지출 재가속 | 유지 | 35.3 | 3 | 3 | 5 | 부상 (71) |
| 소프트웨어 실적/AI 수익화 | 수정 | 18.1 | 0 | 1 | 4 | 약화 (29) |
| 위험선호 성장주 재진입 | 수정 | 32.2 | 0 | 5 | 3 | 약화 (48) |
| 방산/안보 프리미엄 | 삭제 관찰 | 2 | 0 | 1 | 0 | 소멸 (7) |
| 전력망/원전/인프라 병목 | 수정 | 7.3 | 0 | 2 | 1 | 소멸 (5) |
| 비트코인/디지털 자산 위험선호 | 유지 | 45.6 | 5 | 5 | 8 | 약화 (42) |
| 매크로 방어/헤지 | 유지 | 23.8 | 5 | 2 | 0 | 약화 (1) |
| Data Storage 자금 유입 | 수정 | 28.8 | 1 | 2 | 1 | 약화 (43) |
| 전력 유틸리티 수요 재평가 | 수정 | 20.4 | 0 | 2 | 0 | 약화 (27) |
| 필수소비재 음료 방어 성장 | 수정 | 16 | 0 | 0 | 0 | 소멸 (26) |
| Aerospace & Defense 자금 유입 | 삭제 관찰 | 10.3 | 0 | 0 | 0 | 소멸 (15) |
| 바이오/헬스케어 촉매 | 유지 | 27.3 | 3 | 1 | 3 | 관찰 (57) |
| Internet Content 자금 유입 | 수정 | 34.7 | 2 | 4 | 3 | 관찰 (55) |
| Specialty Business Services 자금 유입 | 삭제 관찰 | 13.7 | 0 | 0 | 0 | 소멸 (16) |
| Integrated Oil & Gas 자금 유입 | 유지 | 31.4 | 3 | 2 | 1 | 약화 (19) |
| 소비 회복/방어주 선별 | 수정 | 14.9 | 0 | 0 | 0 | 소멸 (30) |
| Travel Services 자금 유입 | 수정 | 12.8 | 0 | 0 | 0 | 소멸 (23) |
| Bitcoin Mining 자금 유입 | 유지 | 28.9 | 3 | 3 | 0 | 약화 (40) |
| Medical Devices 자금 유입 | 수정 | 10.5 | 0 | 1 | 1 | 약화 (36) |

## 신규/분리 후보 TOP 5

### 1. 반도체 설계/공급망 재가속

- 발견 점수: 390.3
- 반복 일수: 9
- 평균 후보 점수: 81.8
- 기존 템플릿 포함 종목 수: 6
- 기존 연결 네러티브: 반도체 설계/공급망 재가속, 위험선호 성장주 재진입
- 구성 후보: MPWR, MRVL, NXPI, ADI*, AMD*, ARM*, INTC*, QCOM*, TSM*

```js
{
  "name": "반도체 설계/공급망 재가속",
  "etfs": [
    "SMH",
    "SOXX",
    "SOXQ",
    "AIQ"
  ],
  "stocks": [
    "AMD",
    "TSM",
    "QCOM",
    "INTC",
    "ARM",
    "ADI",
    "NXPI",
    "MPWR"
  ],
  "nextBuyer": "반도체 설계/공급망 재가속을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "SMH",
    "SOXX",
    "SOXQ"
  ],
  "preferredStocks": [
    "AMD",
    "TSM",
    "QCOM",
    "INTC"
  ],
  "breakCondition": "SMH 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 2. Bitcoin Mining 자금 유입

- 발견 점수: 232
- 반복 일수: 8
- 평균 후보 점수: 86.9
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

- 발견 점수: 131.2
- 반복 일수: 5
- 평균 후보 점수: 83.5
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

### 4. 소프트웨어 실적/AI 수익화

- 발견 점수: 94
- 반복 일수: 4
- 평균 후보 점수: 82.8
- 기존 템플릿 포함 종목 수: 1
- 기존 연결 네러티브: 비트코인/디지털 자산 위험선호
- 구성 후보: SHOP, MSTR*

```js
{
  "name": "소프트웨어 실적/AI 수익화",
  "etfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "stocks": [
    "MSTR",
    "SHOP"
  ],
  "nextBuyer": "소프트웨어 실적/AI 수익화을 확인한 섹터 ETF 자금과 상대강도 추종 스윙 자금",
  "preferredEtfs": [
    "IGV",
    "AIQ",
    "QQQ"
  ],
  "preferredStocks": [
    "MSTR",
    "SHOP"
  ],
  "breakCondition": "IGV 20일선 이탈 또는 관련 종목 절반 이상 5일선 이탈",
  "todayAction": "기존 네러티브와 중복을 확인한 뒤 ETF/대표 종목 동조성이 살아날 때만 관찰 편입"
}
```

### 5. Medical Devices 자금 유입

- 발견 점수: 89.8
- 반복 일수: 3
- 평균 후보 점수: 80.3
- 기존 템플릿 포함 종목 수: 2
- 기존 연결 네러티브: 바이오/헬스케어 촉매, Medical Devices 자금 유입
- 구성 후보: DXCM*, ISRG*

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

*표시는 기존 네러티브 템플릿에 이미 포함된 종목/ETF입니다.

## 적용 가이드

1. `KEEP`은 유지합니다.
2. `REWORK`는 구성 종목/ETF 또는 설명 문구를 조정합니다.
3. `삭제 관찰`은 바로 삭제하지 말고 1~2회 더 재점검합니다.
4. 신규 후보는 `reports/narrative-review.json`의 `proposedDefinition`을 검토한 뒤 승인 시 `src/main.js`의 `NARRATIVE_DEFINITIONS`에 반영합니다.

