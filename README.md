# Index Seasonality Dashboard

Bloomberg-style monthly return heatmap for S&P 500 and NASDAQ Composite, from 2015 to present.

![Dashboard Preview](preview.png)

## Features

- **Live data** from Yahoo Finance adjusted close prices
- **Monthly % returns** with conditional red/green colouring
- **S&P 500, NASDAQ, and Spread (NDX − SPX)** tabs
- **5-year averages** column
- **Compound yearly returns** row
- Auto-refreshes via Vercel edge cache (1 hr TTL)
- Static `data.json` fallback for non-Vercel hosting

## Architecture

```
├── api/
│   └── data.js          # Vercel serverless function (Yahoo Finance → JSON)
├── public/
│   ├── index.html        # Dashboard UI
│   └── data.json         # Static fallback data (regenerate weekly)
├── generate_data.sh      # Script to refresh data.json manually
├── vercel.json           # Vercel routing config
└── package.json
```

## Deployment

### Option 1: Vercel (recommended — auto-updating)

```bash
# 1. Push to GitHub
git init && git add -A && git commit -m "init"
gh repo create seasonality-dashboard --public --push

# 2. Deploy
npx vercel --prod
```

The `/api/data` endpoint fetches live data from Yahoo Finance on each request (cached 1 hr at edge).

### Option 2: Vercel via GitHub integration

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repo
3. Framework Preset: **Other**
4. Deploy — done

### Option 3: Static hosting (Squarespace, GitHub Pages, etc.)

Since Squarespace / GitHub Pages can't run serverless functions, you need to periodically refresh `data.json`:

```bash
# Run weekly via cron or manually
bash generate_data.sh > public/data.json
```

Then deploy `public/` as your site root:
- **Squarespace**: Use Code Injection or embed in a page via `<iframe>`
- **GitHub Pages**: Push `public/` to `gh-pages` branch

### Squarespace Embedding

Add a **Code Block** to your page:

```html
<iframe
  src="https://your-vercel-app.vercel.app"
  style="width:100%;height:90vh;border:none;"
  loading="lazy">
</iframe>
```

## Local Development

```bash
npm i -g vercel    # one-time
vercel dev         # starts local server with API at http://localhost:3000
```

## Refreshing Static Data

```bash
bash generate_data.sh > public/data.json
```

Requires `curl` and `python3`. The script fetches monthly closes from Yahoo Finance and computes calendar-month returns.

## Data Notes

- Returns are calculated from **adjusted monthly close** prices
- Yahoo Finance interval `1mo` returns one data point per calendar month
- Monthly return = `(close_this_month / close_prev_month − 1) × 100`
- Yearly return = compound product of monthly returns, not simple sum
