import argparse
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "config" / "markets" / "kr" / "kospi200Fallback.json"
DEFAULT_SOURCE_URL = "https://en.wikipedia.org/wiki/KOSPI_200"


def parse_args():
    parser = argparse.ArgumentParser(description="Update the KOSPI200 fallback universe")
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL)
    parser.add_argument("--output", default=str(OUTPUT_PATH))
    return parser.parse_args()


def read_components(source_url):
    response = requests.get(source_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
    response.raise_for_status()
    tables = pd.read_html(io.StringIO(response.text))
    for table in tables:
        columns = [str(column).strip() for column in table.columns]
        if {"Company", "Symbol", "GICS Sector"}.issubset(set(columns)) and len(table) >= 190:
            return table
    raise RuntimeError("Could not find a KOSPI200 components table")


def normalize_row(row, source_url, as_of_date):
    symbol = str(row["Symbol"]).strip()
    return {
        "ticker": f"{symbol}.KS",
        "displayTicker": symbol,
        "name": str(row["Company"]).strip(),
        "market": "KOSPI",
        "sector": str(row["GICS Sector"]).strip(),
        "industry": "Unknown",
        "isActive": True,
        "source": source_url,
        "asOfDate": as_of_date,
    }


def main():
    args = parse_args()
    as_of_date = datetime.now(timezone.utc).date().isoformat()
    table = read_components(args.source_url)
    members = [normalize_row(row, args.source_url, as_of_date) for _, row in table.iterrows()]
    output = {
        "universeName": "KOSPI200",
        "asOfDate": as_of_date,
        "source": args.source_url,
        "memberCount": len(members),
        "members": members,
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(f"Wrote {output_path} with {len(members)} members")


if __name__ == "__main__":
    main()
