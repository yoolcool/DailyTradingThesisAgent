# Mobile Daily Prompt

## 매일 사용할 한 줄 명령

```text
모바일 데일리 루틴 실행
```

이 한 줄 명령을 받으면 반드시 아래 절차를 따른다.

## 실행 절차

1. 프로젝트 폴더로 이동한다.

   ```text
   C:\Users\yool\Documents\Daily Trading Thesis Agent
   ```

2. `package.json`이 있는 프로젝트 루트인지 확인한다.
   없으면 실행하지 말고 `package.json` 위치를 찾아 이동한다.

3. `git status`를 확인한다.

4. Windows 기준으로 아래 명령을 실행한다.

   ```powershell
   npm.cmd run daily-publish
   ```

5. `daily-publish`가 없다면 아래 순서로 실행한다.

   ```powershell
   npm.cmd run daily-check:win
   npm.cmd run prepare-pages
   ```

6. 생성 파일을 확인한다.

   - `reports/latest.md`
   - `reports/latest.html`
   - `reports/latest.png`
   - `docs/index.html`
   - `docs/latest.md`
   - `docs/latest.png`

7. GitHub Pages 배포를 위해 변경사항을 확인한다.

   ```powershell
   git status
   ```

8. 사용자가 이미 push 허용 규칙을 정해두었다면 `git add`, `git commit`, `git push`를 진행한다.
   아직 허용 규칙이 없다면 push 전에 확인을 요청한다.

9. 모바일 보고에는 반드시 아래 GitHub Pages 웹 리포트 링크를 포함한다.

   ```text
   https://yoolcool.github.io/DailyTradingThesisAgent/
   ```

## 주의사항

- 리포트 전문을 모바일에 길게 붙여넣지 않는다.
- `latest.html` 전체 내용을 출력하지 않는다.
- mock 데이터면 반드시 실전 판단 금지라고 표시한다.
- GitHub Pages 링크가 아직 활성화되지 않았다면 “배포 대기 중일 수 있음”이라고 적는다.
- 웹 리포트 링크는 모바일에서 클릭 가능하도록 단독 줄에 표시한다.
- GitHub Pages 링크는 항상 아래 주소를 사용한다.

```text
https://yoolcool.github.io/DailyTradingThesisAgent/
```

## 모바일 보고 형식

```text
[오늘의 데일리 트레이딩 요약]

✅ 생성 성공 / 데이터 모드: MOCK 또는 REAL

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

웹 리포트:
https://yoolcool.github.io/DailyTradingThesisAgent/

로컬 파일:
- reports/latest.md
- reports/latest.html
- reports/latest.png

남은 문제:
- 없으면 “없음”이라고 적는다.
```
