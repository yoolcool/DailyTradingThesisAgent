import json
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_PATH = DATA_DIR / "market_data_real.json"
NASDAQ100_FALLBACK_PATH = ROOT / "config" / "nasdaq100Fallback.json"
NARRATIVE_STOCKS_PATH = ROOT / "config" / "narrativeStocks.json"
BATCH_SIZE = 25
MAX_RETRIES = 3
RETRY_BASE_SECONDS = 2
MIN_FRESH_OK_RATIO_TO_OVERWRITE = 0.2
MAX_STALE_FALLBACK_DAYS = 3

TICKER_ALIASES = {
    "DRAM": "DRAM",
}

STOOQ_ALIASES = {
    "BRK.B": "brk-b.us",
    "BRK-B": "brk-b.us",
}


def load_json(name):
    with (DATA_DIR / name).open("r", encoding="utf-8") as file:
        return json.load(file)


def normalize_ticker(ticker):
    return TICKER_ALIASES.get(ticker, ticker)


def stooq_symbol(ticker):
    return STOOQ_ALIASES.get(ticker, f"{ticker.lower().replace('.', '-').replace('/', '-')}.us")


def pct_change(current, previous):
    if previous is None or previous == 0 or pd.isna(previous):
        return None
    return round(((current - previous) / previous) * 100, 2)


def safe_float(value):
    if value is None or pd.isna(value):
        return None
    return round(float(value), 4)


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_previous_market_data():
    if not OUTPUT_PATH.exists():
        return {}
    try:
        with OUTPUT_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def age_days(value):
    if not value:
        return None
    try:
        date_value = datetime.fromisoformat(value[:10]).date()
    except ValueError:
        return None
    return (datetime.now(timezone.utc).date() - date_value).days


def stale_fallback_item(ticker, asset_type, previous_item, fresh_error):
    if not previous_item or previous_item.get("dataStatus") != "ok":
        return None
    stale_days = age_days(previous_item.get("dataDate"))
    if stale_days is None or stale_days > MAX_STALE_FALLBACK_DAYS:
        return None
    item = dict(previous_item)
    item["ticker"] = ticker
    item["assetType"] = asset_type
    item["dataStatus"] = "ok"
    item["dataFreshness"] = "STALE"
    item["staleFallback"] = True
    item["staleDays"] = stale_days
    item["freshFetchStatus"] = "missing"
    item["fallbackReason"] = fresh_error or "fresh price fetch failed"
    item["dataSource"] = f"{previous_item.get('dataSource', 'previous')} stale fallback"
    return item


def summarize_history(ticker, asset_type, history):
      if history is None or history.empty:
          return {
              "ticker": ticker,
              "assetType": asset_type,
              "dataStatus": "missing",
              "error": "empty history from yfinance",
          }
      if isinstance(history.columns, pd.MultiIndex):
          history.columns = history.columns.get_level_values(-1)

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
      chart_history = []
      for idx, row in history.tail(132).iterrows():
          close_value = row.get("Close")
          if close_value is None or pd.isna(close_value):
              continue
          chart_history.append({
              "date": idx.date().isoformat(),
              "open": safe_float(row.get("Open")),
              "high": safe_float(row.get("High")),
              "low": safe_float(row.get("Low")),
              "close": safe_float(close_value),
              "volume": int(row.get("Volume")) if row.get("Volume") is not None and not pd.isna(row.get("Volume")) else None,
          })

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
          "dataFreshness": "FRESH",
          "staleFallback": False,
          "dataStatus": "ok",
          "history": chart_history,
      }


def fetch_one(ticker, asset_type):
    yf_ticker = normalize_ticker(ticker)
    errors = []
    for attempt in range(1, MAX_RETRIES + 1):
        for period in ["1y", "6mo", "3mo"]:
            try:
                history = yf.download(
                    yf_ticker,
                    period=period,
                    interval="1d",
                    progress=False,
                    auto_adjust=False,
                    threads=False,
                )
                result = summarize_history(ticker, asset_type, history)
                if result.get("dataStatus") == "ok":
                    result["fetchAttempt"] = attempt
                    result["fetchPeriod"] = period
                    return result
                errors.append(result.get("error", "empty history"))
            except Exception as exc:
                errors.append(str(exc))
        if attempt < MAX_RETRIES:
            time.sleep(RETRY_BASE_SECONDS * attempt)
    stooq_result = fetch_stooq_one(ticker, asset_type)
    if stooq_result.get("dataStatus") == "ok":
        stooq_result["fetchProvider"] = "stooq"
        return stooq_result
    errors.append(stooq_result.get("error", "stooq fallback failed"))
    return {
        "ticker": ticker,
        "assetType": asset_type,
        "dataStatus": "missing",
        "error": "; ".join(errors[-3:]) or "fetch failed",
    }


def fetch_stooq_one(ticker, asset_type):
    symbol = stooq_symbol(ticker)
    url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
    try:
        history = pd.read_csv(url)
        if history is None or history.empty or "Date" not in history:
            return {
                "ticker": ticker,
                "assetType": asset_type,
                "dataStatus": "missing",
                "error": "empty history from stooq",
            }
        history["Date"] = pd.to_datetime(history["Date"], errors="coerce")
        history = history.dropna(subset=["Date"]).set_index("Date")
        result = summarize_history(ticker, asset_type, history.tail(260))
        if result.get("dataStatus") == "ok":
            result["dataSource"] = "stooq"
            result["fetchPeriod"] = "daily_csv"
        return result
    except Exception as exc:
        return {
            "ticker": ticker,
            "assetType": asset_type,
            "dataStatus": "missing",
            "error": f"stooq fallback failed: {exc}",
        }


def ticker_history_from_batch(batch_history, yf_ticker):
    if batch_history is None or batch_history.empty:
        return None
    if not isinstance(batch_history.columns, pd.MultiIndex):
        return batch_history
    level0 = list(batch_history.columns.get_level_values(0).unique())
    level1 = list(batch_history.columns.get_level_values(1).unique())
    if yf_ticker in level0:
        return batch_history[yf_ticker]
    if yf_ticker in level1:
        return batch_history.xs(yf_ticker, axis=1, level=1)
    return None


def chunked(values, size):
    for index in range(0, len(values), size):
        yield values[index:index + size]


def fetch_many_batch(targets):
    if not targets:
        return {}
    yf_symbols = [normalize_ticker(ticker) for ticker, _asset_type in targets]
    ticker_to_asset = {normalize_ticker(ticker): (ticker, asset_type) for ticker, asset_type in targets}
    results = {}
    try:
        batch_history = yf.download(
            yf_symbols,
            period="1y",
            interval="1d",
            progress=False,
            auto_adjust=False,
            threads=True,
            group_by="ticker",
        )
        for yf_ticker in yf_symbols:
            original_ticker, asset_type = ticker_to_asset[yf_ticker]
            ticker_history = ticker_history_from_batch(batch_history, yf_ticker)
            if ticker_history is None or ticker_history.empty:
                results[original_ticker] = fetch_one(original_ticker, asset_type)
            else:
                results[original_ticker] = summarize_history(original_ticker, asset_type, ticker_history.copy())
    except Exception:
        for ticker, asset_type in targets:
            results[ticker] = fetch_one(ticker, asset_type)
    return results


def fetch_many(targets):
    results = {}
    for batch in chunked(targets, BATCH_SIZE):
        results.update(fetch_many_batch(batch))
    failed = [(ticker, asset_type) for ticker, asset_type in targets if results.get(ticker, {}).get("dataStatus") != "ok"]
    for ticker, asset_type in failed:
        results[ticker] = fetch_one(ticker, asset_type)
    return results


def merge_with_previous(targets, fresh_results, previous_data):
    previous_items = previous_data.get("items", {}) if isinstance(previous_data.get("items"), dict) else {}
    merged = {}
    stale_count = 0
    expired_count = 0
    for ticker, asset_type in targets:
        fresh = fresh_results.get(ticker) or {
            "ticker": ticker,
            "assetType": asset_type,
            "dataStatus": "missing",
            "error": "fresh result missing",
        }
        if fresh.get("dataStatus") == "ok":
            merged[ticker] = fresh
            continue
        fallback = stale_fallback_item(ticker, asset_type, previous_items.get(ticker), fresh.get("error"))
        if fallback:
            merged[ticker] = fallback
            stale_count += 1
        else:
            merged[ticker] = fresh
            if previous_items.get(ticker, {}).get("dataStatus") == "ok":
                expired_count += 1
    return merged, stale_count, expired_count


def previous_ok_count(previous_data):
    items = previous_data.get("items", {}) if isinstance(previous_data.get("items"), dict) else {}
    return sum(1 for item in items.values() if item.get("dataStatus") == "ok")


def load_nasdaq100_members():
    if not NASDAQ100_FALLBACK_PATH.exists():
        return []
    with NASDAQ100_FALLBACK_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return [row for row in data.get("members", []) if row.get("isActive", True)]


def load_narrative_stocks():
    if not NARRATIVE_STOCKS_PATH.exists():
        return []
    with NARRATIVE_STOCKS_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def main():
    watchlist = load_json("watchlist.json")
    holdings = load_json("holdings.json")
    etfs = load_json("watchlist_etfs.json")
    nasdaq100_members = load_nasdaq100_members()
    narrative_stocks = load_narrative_stocks()

    targets = []
    seen = set()
    for row in nasdaq100_members:
        ticker = row["ticker"]
        if ticker not in seen:
            targets.append((ticker, "STOCK"))
            seen.add(ticker)
    for row in watchlist + holdings:
        ticker = row["ticker"]
        if ticker not in seen:
            targets.append((ticker, "STOCK"))
            seen.add(ticker)
    for row in narrative_stocks:
        ticker = row["ticker"]
        if ticker not in seen:
            targets.append((ticker, "STOCK"))
            seen.add(ticker)
    for row in etfs:
        ticker = row["ticker"]
        if ticker not in seen:
            targets.append((ticker, "ETF"))
            seen.add(ticker)

    previous_data = load_previous_market_data()
    fresh_results = fetch_many(targets)
    results, stale_count, expired_count = merge_with_previous(targets, fresh_results, previous_data)
    fresh_ok = sum(1 for item in fresh_results.values() if item.get("dataStatus") == "ok")
    ok = sum(1 for item in results.values() if item.get("dataStatus") == "ok")
    missing = len(results) - ok
    fresh_ok_ratio = fresh_ok / len(targets) if targets else 1

    if fresh_ok_ratio < MIN_FRESH_OK_RATIO_TO_OVERWRITE and stale_count == 0 and previous_ok_count(previous_data) > 0:
        print(
            "Fresh fetch success ratio too low; preserving existing market_data_real.json "
            f"(fresh_ok={fresh_ok}, total={len(targets)}, previous_ok={previous_ok_count(previous_data)})"
        )
        return

    output = {
        "generatedAt": utc_now_iso(),
        "dataSource": "yfinance",
        "fallbackPolicy": {
            "staleFallbackEnabled": True,
            "maxStaleFallbackDays": MAX_STALE_FALLBACK_DAYS,
            "minFreshOkRatioToOverwrite": MIN_FRESH_OK_RATIO_TO_OVERWRITE,
            "freshOkCount": fresh_ok,
            "staleFallbackCount": stale_count,
            "expiredFallbackCount": expired_count,
            "missingCount": missing,
        },
        "universe": {
            "stockUniverse": "NASDAQ_100",
            "stockUniverseCount": len(nasdaq100_members),
            "stockUniverseSource": str(NASDAQ100_FALLBACK_PATH),
        },
        "items": results,
    }
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)

    print(f"Wrote {OUTPUT_PATH}")
    print(f"fresh_ok={fresh_ok} stale_fallback={stale_count} ok={ok} missing={missing}")


if __name__ == "__main__":
    main()
