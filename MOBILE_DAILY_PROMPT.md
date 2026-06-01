# Mobile Daily Prompt

## 매일 사용할 한 줄 명령

```text
모바일 데일리 루틴 실행
```

이 명령은 앞으로 기본 mock 실행이 아니라 `REAL_TEST` 실행을 의미합니다. 실제 가격/거래량 데이터를 수집한 뒤 GitHub Pages 웹 리포트까지 갱신하고, 모바일 요약에는 클릭 가능한 웹 리포트 링크를 포함합니다.

## 실행 절차

1. 프로젝트 폴더로 이동합니다.

   ```text
   C:\Users\yool\Documents\Daily Trading Thesis Agent
   ```

2. `package.json`이 있는 프로젝트 루트인지 확인합니다. 없으면 실행하지 말고 `package.json` 위치를 찾아 이동합니다.

3. `git status`를 확인합니다.

4. Python 의존성이 설치되어 있는지 확인합니다. `requirements.txt`가 있고 필요하면 아래 명령을 실행합니다.

   ```powershell
   python -m pip install -r requirements.txt
   ```

   현재 PC에서 `python`이 PATH에 없으면 `PYTHON` 환경변수 또는 Codex 번들 Python을 사용할 수 있습니다. 프로젝트의 `fetch-real-data` 스크립트는 Python 실행 파일을 자동 탐색합니다.

5. Windows 기준으로 아래 명령을 실행합니다.

   ```powershell
   npm.cmd run daily-publish:real-test
   ```

6. `daily-publish:real-test` 스크립트가 없다면 아래 순서로 실행합니다.

   ```powershell
   npm.cmd run fetch-real-data
   npm.cmd run daily-report:real-test
   npm.cmd run verify-report
   npm.cmd run screenshot-report
   npm.cmd run prepare-pages
   ```

7. 생성 파일을 확인합니다.

   - `data/market_data_real.json`
   - `reports/latest.md`
   - `reports/latest.html`
   - `reports/latest.png`
   - `docs/index.html`
   - `docs/latest.md`
   - `docs/latest.png`

8. 리포트 상단 데이터 모드가 반드시 `REAL_TEST`인지 확인합니다.

   ```text
   REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스/옵션/일부 판단 로직은 검증 중
   ```

9. GitHub Pages 배포를 위해 변경사항을 확인합니다.

   ```powershell
   git status
   ```

10. 사용자가 이미 push 허용 규칙을 정해두었다면 `git add`, `git commit`, `git push`를 진행합니다. 아직 허용 규칙이 없다면 push 전에 확인을 요청합니다.

11. 모바일 보고에는 반드시 아래 GitHub Pages 웹 리포트 링크를 포함합니다.

https://yoolcool.github.io/DailyTradingThesisAgent/

## mock 실행 명령

기존 mock 리포트가 필요할 때만 아래 별도 명령을 사용합니다.

```text
모바일 데일리 루틴 MOCK 실행
```

이 명령은 기존 mock 모드 리포트를 생성할 때만 사용하며, 기본 모바일 루틴으로 사용하지 않습니다.

## 주의사항

- `모바일 데일리 루틴 실행`은 앞으로 항상 `REAL_TEST` 모드로 실행합니다.
- 기본 루틴에서는 mock 리포트를 생성하지 않습니다.
- 리포트 전문을 모바일에 길게 붙여넣지 않습니다.
- `latest.html` 전체 내용을 출력하지 않습니다.
- 실제 가격/거래량은 사용하되, 뉴스/옵션/일부 판단 로직이 미연결이면 반드시 검증 중이라고 표시합니다.
- 데이터 수집 실패 시 숫자를 지어내지 않고 `데이터 없음`으로 표시합니다.
- Codex 인앱 브라우저 스냅샷 실패는 치명 오류로 보지 않습니다.
- `latest.png` 생성 성공을 시각 검증 성공 기준으로 봅니다.
- GitHub Pages 링크가 아직 갱신되지 않았으면 `배포 대기 중일 수 있음`이라고 적습니다.
- 웹 리포트 링크는 모바일에서 클릭 가능하도록 단독 줄에 표시합니다.
- GitHub Pages 링크는 항상 아래 주소를 사용합니다.

https://yoolcool.github.io/DailyTradingThesisAgent/

## 모바일 보고 형식

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

웹 리포트:
https://yoolcool.github.io/DailyTradingThesisAgent/

로컬 파일:
- reports/latest.md
- reports/latest.html
- reports/latest.png

남은 문제:
- 없으면 “없음”이라고 적는다.
```
