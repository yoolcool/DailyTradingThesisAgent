# Daily Trading Thesis Agent Runbook

이 프로젝트는 장기투자 리포트가 아니라 매일 트레이딩 판단을 돕는 로컬 리포트 생성기다.

핵심 질문:

> 현재 가격에서 살까, 더 비싼 가격에 사줄 수 있는가?

## 모바일 데일리 루틴

매일 사용할 고정 명령:

```text
모바일 데일리 루틴 실행
```

위 명령을 받으면 `REAL_TEST` 리포트 생성뿐 아니라 GitHub Pages 반영을 위한 `git add`, `git commit`, `git push`까지 자동으로 수행한다.

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

## Windows 운영 표준 명령

PowerShell의 `npm.ps1` 실행 정책 문제를 피하기 위해 Windows에서는 `npm.cmd`를 표준으로 사용한다.

모바일 기본 루틴과 같은 `REAL_TEST` 실행:

```powershell
npm.cmd run daily-publish:real-test
```

`daily-publish:real-test`가 없다면 아래 순서로 실행한다.

```powershell
npm.cmd run fetch-real-data
npm.cmd run daily-report:real-test
npm.cmd run verify-report
npm.cmd run screenshot-report
npm.cmd run prepare-pages
```

GitHub Pages 반영:

```powershell
git add data/market_data_real.json reports docs
git commit -m "Update daily trading report"
git push
```

## 데이터 모드

- `REAL_TEST`: yfinance 실제 가격/거래량 데이터를 사용한다. 뉴스, 옵션, ETF 구성종목, 스프레드 등 일부 판단 데이터는 아직 미연결 상태로 표시한다.
- `MOCK`: mock 데이터 모드다. 기본 모바일 데일리 루틴에서는 사용하지 않는다.

`REAL_TEST` 실행 전 Python 의존성을 확인한다.

```powershell
python -m pip install -r requirements.txt
```

현재 PC에서 `python`이 PATH에 없으면 `fetch-real-data` 스크립트가 `PYTHON`, `python`, `py`, Codex 번들 Python 순서로 실행 파일을 자동 탐색한다.

데이터 수집 실패 시 숫자를 지어내지 않고 `데이터 없음`으로 표시한다.

## 데이터 위치

- 관심 종목: `data/watchlist.json`
- 보유 종목: `data/holdings.json`
- ETF 후보: `data/watchlist_etfs.json`
- `REAL_TEST` 수집 데이터: `data/market_data_real.json`

## ETF 판단 철학

ETF는 개별 종목보다 특정 테마의 추세를 안정적으로 추종할 수 있다. 테마 베타가 강하고 개별 승자를 고르기 어려운 날에는 ETF를 우선 검토한다. 특정 종목의 실적, 가이던스, 뉴스 촉매가 선명한 날에는 개별 종목을 우선 검토한다.

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

주의:

- 리포트 전문을 모바일에 길게 붙여넣지 않는다.
- `latest.html` 전체 내용을 출력하지 않는다.
- 웹 리포트 링크는 반드시 단독 줄로 표시한다.
- GitHub Pages 링크는 항상 아래 주소를 사용한다.

https://yoolcool.github.io/DailyTradingThesisAgent/
