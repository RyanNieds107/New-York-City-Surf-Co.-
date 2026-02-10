# Long Island Surf Forecast - Architecture

## Overview

4-layer architecture for surf forecasting application.

## Layers

### 1. Environmental Engine (`server/layers/environmental/`)

**Purpose:** Ingest raw weather/ocean data

**Tables:** surf_spots, buoy_readings, forecast_points, stormglass_verification

**Data Sources:**

- Open-Meteo (primary marine forecast)
- Stormglass/ECMWF (verification)
- NDBC buoys (real-time conditions)
- NOAA tides

**Key Files:**

- `clients/openmeteo.ts` - Fetches wave/wind/swell data
- `clients/stormglass.ts` - ECMWF verification (10 requests/day)
- `clients/ndbc.ts` - Buoy data fetching
- `clients/tides.ts` - Tide predictions
- `jobs/importOpenMeteoMarine.ts` - Runs every 6 hours
- `jobs/fetchStormglassVerification.ts` - Runs twice daily (7 AM + 7 PM)

### 2. Intelligence Layer (`server/utils/` - not yet moved)

**Purpose:** Transform raw data → quality scores (0-100)

**Tables:** forecasts, conditions_log

**Scoring:** Swell (0-60) + Direction (-20 to 0) + Wind (-60 to +20) + Tide (-20 to +20)

**Key Files:**

- `utils/qualityRating.ts` - Main quality calculation
- `utils/waveHeight.ts` - Breaking wave height calculations
- `utils/spotProfiles.ts` - Spot-specific configurations

### 3. Social Layer (`server/_core/` + `server/db/`)

**Purpose:** User auth & user-generated content

**Tables:** users, surf_reports, crowd_reports, forecast_views, surf_report_validation

**Key Files:**

- `_core/oauth.ts` - OAuth authentication
- `_core/googleOAuth.ts` - Google OAuth
- Database operations via `server/db/`

### 4. Retention Engine (`server/layers/retention/`)

**Purpose:** Alert system - notify users of good surf

**Tables:** swell_alerts, swell_alert_logs

**Delivery:** Email (Resend), SMS (Twilio)

**Key Files:**

- `swellDetection.ts` - Detects upcoming swells
- `notificationFormatter.ts` - Formats alert messages
- `delivery/email.ts` - Email via Resend
- `delivery/sms.ts` - SMS notifications
- `jobs/checkSwellAlerts.ts` - Runs every 6 hours
- `jobs/sendReportPrompts.ts` - Prompts for surf reports

## Database

- **Connection:** `server/db/connection.ts` (singleton pool with retry logic)
- **Operations:** `server/db/index.ts` (barrel export of all 48 functions)
- **Schema:** `drizzle/schema/` (split by layer)

## Import Patterns

```typescript
// Preferred: Use layer-specific imports
import { getCurrentConditionsFromOpenMeteo } from "./layers/environmental/clients/openmeteo";
import { getAllSpots } from "./db"; // Barrel export works too

// Path aliases available (optional):
// import { openmeteo } from "@environmental/clients/openmeteo";
```

## Adding New Features

- New weather API? → layers/environmental/clients/
- New scoring algorithm? → utils/qualityRating.ts or create new scorer
- New alert type? → layers/retention/
- New user feature? → _core/ or routers.ts
