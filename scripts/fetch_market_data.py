import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_PATH = DATA_DIR / "market_data_real.json"

TICKER_ALIASES = {
    "DRAM": "DRAM",
}


def load_json(name):
    with (DATA_DIR / name).open("r", encoding="utf-8") as file:
        return json.load(file)


def normalize_ticker(ticker):
    return TICKER_ALIASES.get(ticker, ticker)


def pct_change(current, previous):
    if previous is None or previous == 0 or pd.isna(previous):
        return None
    return round(((current - previous) / previous) * 100, 2)


def safe_float(value):
    if value is None or pd.isna(value):
        return None
    return round(float(value), 4)


def fetch_one(ticker, asset_type):
    yf_ticker = normalize_ticker(ticker)
    try:
      history = yf.download(
          yf_ticker,
          period="1y",
          interval="1d",
          progress=False,
          auto_adjust=False,
          threads=False,
      )
      if history is None or history.empty:
          return {
              "ticker": ticker,
              "assetType": asset_type,
              "dataStatus": "missing",
              "error": "empty history from yfinance",
          }

      if isinstance(history.columns, pd.MultiIndex):
          history.columns = history.columns.get_level_values(0)

      history = history.dropna(subset=["Close"])
      if len(history) < 2:
          return {
              "ticker": ticker,
              "assetType": asset_type,
              "dataStatus": "missing",
              "error": "not enough price history",
          }

      close = history["Close"]
      volume = history["Volume"] if "Volume" in history else pd.Series(dtype=float)
      last_close = float(close.iloc[-1])
      prev_close = float(close.iloc[-2])
      close_5d = float(close.iloc[-6]) if len(close) >= 6 else None
      close_20d = float(close.iloc[-21]) if len(close) >= 21 else None
      latest_volume = float(volume.iloc[-1]) if len(volume) else None
      avg_volume_20d = float(volume.tail(20).mean()) if len(volume) >= 1 else None
      high_52w = float(history["High"].max()) if "High" in history else None
      data_date = history.index[-1].date().isoformat()

      relative_volume = None
      if latest_volume is not None and avg_volume_20d and avg_volume_20d > 0:
          relative_volume = round(latest_volume / avg_volume_20d, 2)

      drawdown = None
      if high_52w and high_52w > 0:
          drawdown = round(((last_close - high_52w) / high_52w) * 100, 2)

      return {
          "ticker": ticker,
          "assetType": asset_type,
          "lastClose": safe_float(last_close),
          "dailyChangePct": pct_change(last_close, prev_close),
          "return5dPct": pct_change(last_close, close_5d),
          "return20dPct": pct_change(last_close, close_20d),
          "volume": int(latest_volume) if latest_volume is not None and not pd.isna(latest_volume) else None,
          "avgVolume20d": int(avg_volume_20d) if avg_volume_20d is not None and not pd.isna(avg_volume_20d) else None,
          "relativeVolume": relative_volume,
          "high52w": safe_float(high_52w),
          "drawdownFrom52wHighPct": drawdown,
          "dataDate": data_date,
          "dataSource": "yfinance",
          "dataStatus": "ok",
      }
    except Exception as exc:
      return {
          "ticker": ticker,
          "assetType": asset_type,
          "dataStatus": "missing",
          "error": str(exc),
      }


def main():
    watchlist = load_json("watchlist.json")
    holdings = load_json("holdings.json")
    etfs = load_json("watchlist_etfs.json")

    targets = []
    seen = set()
    for row in watchlist + holdings:
        ticker = row["ticker"]
        if ticker not in seen:
            targets.append((ticker, "STOCK"))
            seen.add(ticker)
    for row in etfs:
        ticker = row["ticker"]
        if ticker not in seen:
            targets.append((ticker, "ETF"))
            seen.add(ticker)

    results = {}
    for ticker, asset_type in targets:
        results[ticker] = fetch_one(ticker, asset_type)

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "dataSource": "yfinance",
        "items": results,
    }
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)

    ok = sum(1 for item in results.values() if item.get("dataStatus") == "ok")
    missing = len(results) - ok
    print(f"Wrote {OUTPUT_PATH}")
    print(f"ok={ok} missing={missing}")


if __name__ == "__main__":
    main()
