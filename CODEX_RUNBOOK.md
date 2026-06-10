# Daily Trading Thesis Agent Runbook

이 프로젝트는 장기투자 리포트가 아니라 매일 트레이딩 판단을 돕는 로컬 리포트 생성기다.

핵심 질문:

> 현재 가격에서 살까, 누가 왜 더 비싸게 사줄 수 있는가?

## 초심

- 최근 오른 자산을 나열하는 스캐너가 아니다.
- 돈이 몰리는 근거와 다음 매수 주체가 확인되는 트레이딩 후보를 찾는다.
- 진입 조건과 무효화 조건을 분명히 적는다.
- 모바일과 웹에서 짧고 직관적으로 볼 수 있어야 한다.

## 고정 명령

```text
모바일 데일리 루틴 실행
```

이 명령은 항상 `REAL_TEST`를 의미한다. 리포트 생성, 차트 생성, `docs` 갱신, `git add`, `git commit`, `git push`까지 자동 수행한다. 사용자가 이미 push를 허용한 것으로 간주하므로 매번 push 전에 추가 확인을 요청하지 않는다.

## 일반 작업 완료 원칙

사용자가 별도로 금지하지 않는 한 코드, 리포트, 데이터 파이프라인, UI를 수정한 뒤에는 작업을 완료 상태로 만들기 위해 아래를 기본 수행한다.

1. 관련 빌드 또는 생성 명령을 실행한다.
2. 관련 테스트와 검증 명령을 실행한다.
3. 문제가 없으면 변경 범위를 확인한다.
4. 변경사항을 커밋한다.
5. 현재 브랜치를 원격에 푸시한다.

이 프로젝트의 기본 검증 명령은 다음과 같다.

```powershell
npm.cmd run daily-publish:real-test
```

검증이 실패하면 커밋/푸시하지 않고 실패 원인과 남은 문제를 보고한다.

## 실행 순서

1. 프로젝트 폴더로 이동한다.

   ```text
   C:\Users\yool\Documents\Daily Trading Thesis Agent
   ```

2. `package.json`이 있는 프로젝트 루트인지 확인한다.
3. `git status`를 확인한다.
4. `REAL_TEST` 리포트를 생성한다.

   ```powershell
   npm.cmd run daily-publish:real-test
   ```

5. 생성 파일을 확인한다.

   - `data/market_data_real.json`
   - `reports/latest.md`
   - `reports/latest.html`
   - `reports/latest.png`
   - `reports/charts/`
   - `docs/index.html`
   - `docs/latest.md`
   - `docs/latest.png`
   - `docs/charts/`

6. 리포트 상단 데이터 모드가 `REAL_TEST`인지 확인한다.
7. GitHub Pages 반영을 위해 아래 명령을 수행한다.

   ```powershell
   git add data/market_data_real.json reports docs
   git commit -m "Update daily trading report"
   git push
   ```

8. commit할 변경사항이 없으면 `변경사항 없음, push 생략`으로 보고한다.

## 검증 기준

- 진입 후보 섹션에 `관찰` 상태가 섞이지 않아야 한다.
- NVDA에 HACK/CIBR 같은 직접 관련 없는 ETF가 붙지 않아야 한다.
- 오늘 실제 행동 후보는 3개 이하여야 한다.
- 각 행동 후보에는 `reasonConfidence`가 있어야 한다.
- 뉴스 미연결 상태에서 `HIGH` confidence가 나오면 안 된다.
- `moneyFlowScore`, `whyMoneyIsFlowing`, `likelyNextBuyer`, `whyThisCouldTradeHigher`가 표시되어야 한다.
- 차트 이미지가 생성되고 HTML 카드 안에 연결되어야 한다.
- `docs/index.html`이 갱신되어야 한다.

## 모바일 최종 보고 형식

최종 보고는 반드시 `[오늘의 데일리 트레이딩 요약]`으로 시작한다.

```text
[오늘의 데일리 트레이딩 요약]

✅ 생성 성공 / 데이터 모드: REAL_TEST

시장:
- 위험선호 / 위험회피 / 중립

오늘 결론:
- 핵심 판단 3줄 이내

오늘 실제 행동 후보:
1. 티커(ETF/종목) - 한 줄 이유 - 진입 조건 짧게
2. ...
3. ...

ETF 후보 TOP 5:
1. 티커 - 한 줄 이유
2. ...
3. ...
4. ...
5. ...

개별 종목:
- 진입 후보:
- 보유 유지:
- 청산/주의:

오늘 체크:
1. ...
2. ...
3. ...

배포 상태:
- Git commit:
- Git push:
- GitHub Pages 반영:

웹 리포트:
https://yoolcool.github.io/DailyTradingThesisAgent/

## 네러티브 재점검

사용자가 아래처럼 요청하면 데일리 리포트를 생성/배포하지 않고, 시장 서사 템플릿 자체를 점검한다.

```text
네러티브 재점검
```

실행 명령:

```powershell
npm.cmd run narrative-review
```

이 명령은 `src/main.js`의 `NARRATIVE_DEFINITIONS`를 직접 수정하지 않는다. 최근 `data/dailyReports/*.json` 스냅샷을 바탕으로 기존 네러티브의 유지/수정/삭제 관찰 판정과 신규/분리 후보를 제안서로 생성한다.

생성 파일:

- `reports/narrative-review.md`
- `reports/narrative-review.json`

최종 보고에는 기존 템플릿 자동 변경이 없었음을 명시하고, 신규 후보 TOP 5와 기존 네러티브 판정을 요약한다. 사용자가 별도로 "적용해줘"라고 요청할 때만 `NARRATIVE_DEFINITIONS` 변경을 진행한다.

남은 문제:
- 없으면 “없음”
```
