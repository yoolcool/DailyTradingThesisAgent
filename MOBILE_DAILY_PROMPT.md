# Mobile Daily Prompt

## 고정 명령

```text
모바일 데일리 루틴 실행
```

앞으로 위 명령을 받으면 `REAL_TEST` 리포트 생성뿐 아니라 GitHub Pages 반영을 위한 `git add`, `git commit`, `git push`까지 자동으로 수행한다.

이 프로젝트에서는 사용자가 이미 push를 허용한 것으로 간주한다. 따라서 매번 push 전에 추가 확인을 요청하지 않는다.

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
   - `docs/index.html`
   - `docs/latest.md`
   - `docs/latest.png`

6. 리포트 상단 데이터 모드가 `REAL_TEST`인지 확인한다.

7. GitHub Pages 반영을 위해 반드시 아래 명령을 수행한다.

   ```powershell
   git add data/market_data_real.json reports docs
   git commit -m "Update daily trading report"
   git push
   ```

8. 만약 commit할 변경사항이 없으면 에러로 보지 말고, `변경사항 없음, push 생략`으로 보고한다.

9. push 실패 시에는 실패 원인을 짧게 보고한다.

   - 인증 실패
   - 원격 저장소 설정 없음
   - 네트워크 실패
   - 충돌 발생
   - 권한 없음

## 주의사항

- `모바일 데일리 루틴 실행`은 항상 `REAL_TEST` 모드로 실행한다.
- 기본 루틴에서 mock 리포트를 생성하지 않는다.
- 리포트 전문을 모바일에 길게 붙여넣지 않는다.
- `latest.html` 전체 내용을 출력하지 않는다.
- 웹 리포트 링크는 반드시 단독 줄로 표시한다.
- GitHub Pages 링크는 항상 아래 주소를 사용한다.

https://yoolcool.github.io/DailyTradingThesisAgent/

## 모바일 최종 보고 형식

최종 보고는 반드시 아래 형식으로만 한다. 다른 설명을 길게 붙이지 않는다. 반드시 첫 줄은 `[오늘의 데일리 트레이딩 요약]`으로 시작한다.

```text
[오늘의 데일리 트레이딩 요약]

✅ 생성 성공 / 데이터 모드: REAL_TEST

시장:
- 위험선호 / 위험회피 / 중립 중 하나

오늘 결론:
- 핵심 판단 3줄 이내

ETF 후보 TOP 5:
1. 티커 - 한 줄 이유
2. 티커 - 한 줄 이유
3. 티커 - 한 줄 이유
4. 티커 - 한 줄 이유
5. 티커 - 한 줄 이유

개별 종목:
- 진입 후보:
- 보유 유지:
- 청산/주의:

오늘 체크:
1. 가장 중요한 확인 조건
2. 두 번째 확인 조건
3. 세 번째 확인 조건

데이터 상태:
- 실제 가격/거래량 수집 성공:
- 데이터 누락:
- 아직 미연결 데이터: 뉴스, 옵션, ETF 구성종목, 스프레드 등

배포 상태:
- Git commit:
- Git push:
- GitHub Pages 반영: 배포 완료 또는 배포 대기 중

웹 리포트:
https://yoolcool.github.io/DailyTradingThesisAgent/

로컬 파일:
- reports/latest.md
- reports/latest.html
- reports/latest.png

남은 문제:
- 없으면 “없음”이라고 적는다.
```

## Mock 실행

기존 mock 리포트가 필요할 때만 아래 별도 명령을 사용한다.

```text
모바일 데일리 루틴 MOCK 실행
```

mock 실행은 기본 모바일 데일리 루틴으로 사용하지 않는다.
