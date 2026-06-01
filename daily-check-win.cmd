@echo off
setlocal

cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found. Install Node.js LTS and try again.
  pause
  exit /b 1
)

call npm.cmd run daily-check:win
if errorlevel 1 (
  echo.
  echo [ERROR] Daily check failed. See the output above.
  pause
  exit /b 1
)

echo.
echo [OK] Report generated and verified:
echo   reports\latest.md
echo   reports\latest.html
echo   reports\latest.png
echo.
pause
