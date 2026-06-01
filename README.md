# Daily Trading Thesis Agent

매일의 트레이딩 판단을 돕는 로컬 리포트 생성 프로젝트다.

핵심 질문은 다음과 같다.

> 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

## 모바일 실행

모바일에서 매일 사용할 한 줄 명령:

```text
모바일 데일리 루틴 실행
```

이 명령을 받으면 `daily-publish` 또는 `daily-check:win + prepare-pages`를 실행하고, 모바일 요약에는 반드시 아래 웹 리포트 링크를 포함한다.

https://yoolcool.github.io/DailyTradingThesisAgent/

## Windows 실행 명령

기본 검증:

```powershell
npm.cmd run daily-check:win
```

GitHub Pages 배포용 파일까지 준비:

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

웹 리포트 링크:

https://yoolcool.github.io/DailyTradingThesisAgent/
