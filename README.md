# Daily Trading Thesis Agent

매일의 트레이딩 판단을 돕는 로컬 리포트 생성 프로젝트다.

핵심 질문은 다음과 같다.

> 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

## 모바일 실행

모바일에서는 아래 한 줄만 입력하면 된다.

```text
MOBILE_DAILY_PROMPT.md 절차대로 오늘 리포트 생성하고 모바일 요약으로 보고해줘.
```

## Windows 실행 명령

```powershell
npm.cmd run daily-check:win
```

GitHub Pages 배포용 파일까지 준비하려면 아래 명령을 사용한다.

```powershell
npm.cmd run daily-publish
```

생성 파일:

- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`
- `docs/index.html`
- `docs/latest.md`
- `docs/latest.png`

현재 데이터는 mock이며 실전 투자 판단에 사용하면 안 된다.

## GitHub Pages 설정

1. GitHub 저장소에서 `Settings`로 이동한다.
2. `Pages` 메뉴를 연다.
3. `Build and deployment`에서 `Deploy from branch`를 선택한다.
4. branch는 `main`을 선택한다.
5. folder는 `/docs`를 선택한다.
6. 저장한다.
7. 배포 URL을 확인한다.

예상 웹 리포트 링크:

```text
https://yoolcool.github.io/DailyTradingThesisAgent/
```
