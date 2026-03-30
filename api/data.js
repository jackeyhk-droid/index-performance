// Vercel Serverless Function — fetches Yahoo Finance monthly data
// and computes calendar-month % returns for 4 major US indexes

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  const startYear = parseInt(req.query.start || "2015", 10);
  const symbols = {
    "S&P 500": "^GSPC",
    "NASDAQ 100": "^NDX",
    "Dow Jones": "^DJI",
    "Russell 2000": "^RUT",
  };

  // We need data from Dec of (startYear-1) to compute Jan return
  const period1 = Math.floor(new Date(startYear - 1, 11, 1).getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);

  try {
    const results = {};

    for (const [label, ticker] of Object.entries(symbols)) {
      const url =
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
        `?period1=${period1}&period2=${period2}&interval=1mo&includePrePost=false`;

      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SeasonalityDash/1.0)",
        },
      });

      if (!resp.ok) {
        throw new Error(`Yahoo Finance returned ${resp.status} for ${ticker}`);
      }

      const json = await resp.json();
      const chart = json.chart.result[0];
      const timestamps = chart.timestamp;
      const closes = chart.indicators.adjclose?.[0]?.adjclose ||
                     chart.indicators.quote[0].close;

      // Build month-end map: { "2015-01": closePrice, ... }
      const monthClose = {};
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] == null) continue;
        const d = new Date(timestamps[i] * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthClose[key] = closes[i]; // last value per month wins
      }

      // Compute monthly returns
      const years = {};
      const sortedKeys = Object.keys(monthClose).sort();

      for (let i = 1; i < sortedKeys.length; i++) {
        const prev = monthClose[sortedKeys[i - 1]];
        const cur = monthClose[sortedKeys[i]];
        const d = sortedKeys[i].split("-");
        const year = parseInt(d[0], 10);
        const month = parseInt(d[1], 10);

        if (year < startYear) continue;

        if (!years[year]) years[year] = {};
        years[year][month] = parseFloat((((cur - prev) / prev) * 100).toFixed(2));
      }

      results[label] = years;
    }

    // Also compute current year & month so frontend knows how far we are
    const now = new Date();
    res.status(200).json({
      ok: true,
      startYear,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      data: results,
      updatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
