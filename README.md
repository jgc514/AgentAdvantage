# Agent Advantage — Real Estate Analytics Platform

A full-stack, professional-grade analytics and visualization platform for real estate brokerages.
Built for 17 users (1 broker + 16 agents), replacing tools like Tableau with a purpose-built,
always-accessible web app.

## Tech Stack

| Layer     | Technology                                         |
|-----------|----------------------------------------------------|
| Frontend  | React 18 + TypeScript + Vite + Tailwind CSS        |
| Charts    | Recharts (scatter plots, histograms, bar charts)   |
| Stats     | Custom regression, CI bands (no external dep)      |
| Maps      | React-Leaflet + OpenStreetMap                      |
| Backend   | Node.js + Express + TypeScript                     |
| Auth      | JWT (12-hour sessions)                             |
| Data      | Sample MLS data included; CSV import endpoint ready|

---

## Dashboards (10 Total)

| # | Dashboard | Key Feature |
|---|-----------|-------------|
| 1 | **Sold Price Analysis** | SqFt vs True Sold Price scatter plot with subject property overlay (dashed line + price band), regression line, 95% CI bands |
| 2 | **Expired / Canceled** | Overlay sold (gray) with expired (red), canceled (orange), withdrawn (yellow) — shows cost of overpricing |
| 3 | **Amenities Impact** | Select any amenity (pool, ADU, shop, pond, etc) and see color-coded $/sqft premium with regression |
| 4 | **Am I an Outlier?** | Side-by-side histograms of sqft distribution and price distribution |
| 5 | **Street Stats** | Avg $/sqft by street in descending order with sortable table |
| 6 | **Stories Comparison** | 1-story vs 2-story vs 3-story $/sqft + new construction vs pre-owned breakdown |
| 7 | **Active Price Analysis** | Active/New/Price Change listings plotted by sqft with regression |
| 8 | **Active Price vs DOM** | Days on market vs list price colored by status |
| 9 | **List:Sold Ratio** | Side-by-side comparison: no price change vs one+ price changes |
| 10 | **Subdivision Stats** | Avg $/sqft by subdivision with sortable table and volume |

**All dashboards include:**
- Stats bar with: Avg Sold Price, Avg $/SqFt, Median Sold, Avg DOM, List:Sold Ratio, Months Inventory, Total Volume
- Global filter panel with all MLS status options, zip codes, school districts, neighborhoods, subdivisions, sqft/price/bedroom/bathroom/lot size ranges, year built, stories, new construction checkbox, date range, and amenity filters
- Hover tooltip on scatter plot dots showing property details
- Click-through to MLS snapshot modal with photos, full listing details, amenities, and description

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 8+

### 1. Clone & Install

```bash
git clone <repo-url> && cd AgentAdvantage
npm install          # installs root + workspaces (server + client)
```

### 2. Configure Environment

```bash
cp .env.example server/.env
# Edit server/.env — set JWT_SECRET to a strong random string
```

### 3. Run Development

```bash
npm run dev
# API: http://localhost:5000
# App: http://localhost:5173
```

### 4. Login Credentials

| Role   | Email                              | Password      |
|--------|------------------------------------|---------------|
| Broker | broker@agentadvantage.com          | broker2024!   |
| Agent  | james@agentadvantage.com           | agent2024!    |
| Agent  | maria@agentadvantage.com           | agent2024!    |
| (+ 14 more agents — see server/src/routes/auth.ts) | | |

---

## Connecting Real MLS Data

The app ships with 425 realistic sample properties auto-generated on first load.
To use real MLS data, you have two options:

### Option A: CSV Import (Recommended)
Export your MLS data to CSV, then POST to:
```
POST /api/properties/import
Content-Type: application/json
Authorization: Bearer <token>
```

Update `server/src/data/sampleData.ts` to parse your CSV format using the `Property` interface.

### Option B: Direct Database Integration
Replace `getSampleData()` in `server/src/data/sampleData.ts` with a database query
(PostgreSQL, MySQL, etc.). The `filterProperties()` utility in `server/src/utils/stats.ts`
handles all filter logic client-side or can be adapted to SQL WHERE clauses.

---

## Property Data Schema

The core `Property` type (see `server/src/types/index.ts`) maps to standard MLS fields:

```
id, mlsNumber, address, street, city, state, zipCode
neighborhood, subdivision, schoolDistrict, status
listPrice, soldPrice, sellerConcessions, trueSoldPrice (soldPrice - concessions)
pricePerSqft, originalListPrice, priceChanges
sqft, lotSize (acres), bedrooms, bathrooms, stories, yearBuilt, newConstruction
daysOnMarket, listDate, soldDate, expirationDate
amenities: { pool, adu, shop, pond, fireplace, hotTub, solarPanels,
             coveredPatio, outdoorKitchen, guestHouse, barnOrStable,
             waterFeature, greenbeltView, waterView }
lat, lng (for geographic radius search)
images[], garageSpaces, description
```

---

## Statistical Methods

All regression and confidence band calculations are implemented in:
- `client/src/utils/statistics.ts` (frontend)
- `server/src/utils/stats.ts` (backend)

Using **ordinary least squares (OLS) linear regression** with:
- Slope, intercept, R² calculation
- 95% confidence interval bands (t-distribution, df = n-2)
- Abramowitz & Stegun approximation for t-distribution inverse CDF

---

## Production Deployment

```bash
# Build client into server/public
npm run build

# Start production server (serves both API + static files)
npm run start --workspace=server
```

Add a reverse proxy (nginx/Caddy) in front for TLS and compression.

---

## Folder Structure

```
AgentAdvantage/
├── server/
│   ├── src/
│   │   ├── data/sampleData.ts       # 425 sample properties
│   │   ├── middleware/auth.ts       # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.ts              # Login + user list
│   │   │   └── properties.ts       # Filter, regression, metadata
│   │   ├── types/index.ts           # Shared TypeScript types
│   │   └── utils/stats.ts           # OLS regression, CI bands, filtering
│   └── package.json
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── Charts/ScatterPlotChart.tsx   # Core chart with regression overlay
    │   │   ├── Common/PropertyCard.tsx       # Hover tooltip card
    │   │   ├── Common/MLSModal.tsx           # Click-through MLS detail modal
    │   │   ├── Filters/FilterPanel.tsx       # Full filter UI
    │   │   └── Layout/                       # Sidebar, Header, StatsBar
    │   ├── context/
    │   │   ├── AuthContext.tsx       # JWT auth state
    │   │   └── FilterContext.tsx     # Global filter state
    │   ├── pages/                    # 10 dashboard pages + Login
    │   ├── services/api.ts           # Axios API client
    │   ├── types/index.ts            # Frontend types
    │   └── utils/statistics.ts      # OLS regression, CI bands, formatters
    └── package.json
```

---

## License

Proprietary — for use by licensed agents within the brokerage only.
