# Daily Trading Thesis Agent

매일의 트레이딩 판단을 돕는 로컬 리포트 생성기입니다.

핵심 질문:

> 현재 가격에서 누가, 왜, 더 비싼 가격에 사줄 수 있는가?

## 모바일 실행

모바일에서 매일 사용할 한 줄 명령:

```text
모바일 데일리 루틴 실행
```

이 명령은 `REAL_TEST` 모드 실행을 의미합니다. 즉, 실제 가격/거래량 데이터를 수집한 뒤 `daily-publish:real-test`를 실행하고, GitHub Pages 웹 리포트를 갱신하며, 모바일 요약에는 반드시 아래 웹 리포트 링크를 포함합니다.

https://yoolcool.github.io/DailyTradingThesisAgent/

기존 mock 실행이 필요할 경우에는 별도 명령으로 분리합니다.

mock 실행 명령:

```text
모바일 데일리 루틴 MOCK 실행
```

mock 실행은 기존 mock 모드 리포트를 생성할 때만 사용합니다.

## 설치

Node 의존성:

```powershell
npm install
```

REAL_TEST용 Python 의존성:

```powershell
python -m pip install -r requirements.txt
```

현재 PC에서 `python`이 PATH에 없다면 Codex 번들 Python 또는 설치된 Python 경로를 `PYTHON` 환경변수로 지정한 뒤 실행할 수 있습니다. `fetch-real-data` 스크립트는 `PYTHON`, `python`, `py`, Codex 번들 Python 순서로 자동 탐색합니다.

## Windows 실행 명령

모바일 기본 루틴과 같은 REAL_TEST 리포트:

```powershell
npm.cmd run daily-publish:real-test
```

기존 mock 리포트:

```powershell
npm.cmd run daily-publish
```

생성 파일:

- `data/market_data_real.json`
- `reports/latest.md`
- `reports/latest.html`
- `reports/latest.png`
- `docs/index.html`
- `docs/latest.md`
- `docs/latest.png`

## 데이터 모드

- `REAL_TEST`: 가격/거래량은 yfinance 실제 데이터를 사용합니다. 뉴스, 옵션, ETF 구성종목, 스프레드, 일부 판단 로직은 아직 검증 중이며 실전 매매용이 아닙니다.
- `MOCK`: 모든 숫자는 mock이며 실전 투자 판단에 사용하면 안 됩니다. mock은 별도 명령으로만 실행합니다.

데이터 수집 실패 시 숫자를 만들지 않고 `데이터 없음`으로 표시합니다.

REAL_TEST 배너:

```text
REAL DATA TEST - 가격/거래량은 실제 데이터, 뉴스/옵션/일부 판단 로직은 검증 중
```

## GitHub Pages 설정

1. GitHub 저장소에서 `Settings`로 이동합니다.
2. `Pages` 메뉴를 엽니다.
3. `Build and deployment`에서 `Deploy from branch`를 선택합니다.
4. branch는 `main`을 선택합니다.
5. folder는 `/docs`를 선택합니다.
6. 저장합니다.
7. 배포 URL을 확인합니다.

웹 리포트 링크:

https://yoolcool.github.io/DailyTradingThesisAgent/
