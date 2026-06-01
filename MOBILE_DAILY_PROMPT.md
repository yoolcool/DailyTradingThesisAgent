# Mobile Daily Prompt

## 고정 명령

```text
모바일 데일리 루틴 실행
```

이 명령은 항상 `REAL_TEST` 리포트 생성을 의미한다. 실행 후 GitHub Pages 반영을 위해 `git add`, `git commit`, `git push`까지 자동 수행한다. 이 프로젝트에서는 사용자가 이미 push를 허용한 것으로 간주하므로 매번 push 전에 추가 확인을 요청하지 않는다.

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
7. GitHub Pages 반영을 위해 반드시 아래 명령을 수행한다.

   ```powershell
   git add data/market_data_real.json reports docs
   git commit -m "Update daily trading report"
   git push
   ```

8. commit할 변경사항이 없으면 에러로 보지 말고 `변경사항 없음, push 생략`으로 보고한다.
9. push 실패 시에는 인증 실패, 원격 저장소 설정 없음, 네트워크 실패, 충돌 발생, 권한 없음 중 가장 가까운 원인을 짧게 보고한다.

## 리포트 원칙

- 목적은 “최근 오른 자산 나열”이 아니라 돈이 몰리는 근거와 다음 매수 주체가 확인되는 트레이딩 후보를 찾는 것이다.
- 실제 가격/거래량은 사용하되 뉴스, 옵션, ETF 구성종목 확산도, 스프레드 등 미연결 데이터는 명확히 표시한다.
- 숫자를 지어내지 않는다. 데이터가 없으면 `데이터 없음`으로 표시한다.
- 뉴스/이벤트 데이터가 미연결이면 `reasonConfidence`를 `HIGH`로 표시하지 않는다.
- 진입 후보에는 `진입 후보` 또는 `진입 가능` 상태만 넣는다. `관찰` 상태는 진입 후보나 청산/주의 후보에 넣지 않는다.
- 모바일 보고는 짧고 결론 중심이어야 한다.
- 웹 리포트 링크는 반드시 단독 줄로 표시한다.

https://yoolcool.github.io/DailyTradingThesisAgent/

## 모바일 최종 보고 형식

최종 보고는 반드시 아래 형식으로만 한다. 첫 줄은 반드시 `[오늘의 데일리 트레이딩 요약]`으로 시작한다.

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

남은 문제:
- 없으면 “없음”
```

## Mock 실행

기존 mock 리포트가 필요할 때만 아래 별도 명령을 사용한다.

```text
모바일 데일리 루틴 MOCK 실행
```
