#!/bin/bash
# Fetch S&P 500 and NASDAQ monthly data from Yahoo Finance and produce data.json
PERIOD1=1417392000  # Dec 2014
PERIOD2=$(date +%s)
UA="Mozilla/5.0"

fetch_index() {
  local SYM="$1"
  curl -s "https://query2.finance.yahoo.com/v8/finance/chart/${SYM}?period1=${PERIOD1}&period2=${PERIOD2}&interval=1mo&includePrePost=false" \
    -H "User-Agent: ${UA}"
}

echo "Fetching S&P 500..." >&2
SPX=$(fetch_index "%5EGSPC")
echo "Fetching NASDAQ..." >&2
NDX=$(fetch_index "%5EIXIC")

python3 << PYEOF
import json, sys
from datetime import datetime

spx_raw = json.loads('''$SPX''')
ndx_raw = json.loads('''$NDX''')

def process(raw, label):
    chart = raw["chart"]["result"][0]
    ts = chart["timestamp"]
    closes = chart["indicators"].get("adjclose", [{}])[0].get("adjclose") or chart["indicators"]["quote"][0]["close"]
    
    month_close = {}
    for i, t in enumerate(ts):
        if closes[i] is None:
            continue
        d = datetime.utcfromtimestamp(t)
        key = f"{d.year}-{d.month:02d}"
        month_close[key] = closes[i]
    
    sorted_keys = sorted(month_close.keys())
    years = {}
    for i in range(1, len(sorted_keys)):
        prev = month_close[sorted_keys[i-1]]
        cur = month_close[sorted_keys[i]]
        parts = sorted_keys[i].split("-")
        year = int(parts[0])
        month = int(parts[1])
        if year < 2015:
            continue
        if year not in years:
            years[year] = {}
        years[year][month] = round((cur - prev) / prev * 100, 2)
    
    return years

spx_data = process(spx_raw, "S&P 500")
ndx_data = process(ndx_raw, "NASDAQ")

now = datetime.utcnow()
result = {
    "ok": True,
    "startYear": 2015,
    "currentYear": now.year,
    "currentMonth": now.month,
    "data": {
        "S&P 500": {str(k): {str(m): v for m, v in months.items()} for k, months in spx_data.items()},
        "NASDAQ": {str(k): {str(m): v for m, v in months.items()} for k, months in ndx_data.items()}
    },
    "updatedAt": now.isoformat() + "Z"
}

print(json.dumps(result, indent=2))
PYEOF
