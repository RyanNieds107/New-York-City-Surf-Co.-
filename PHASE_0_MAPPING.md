# Phase 0: Current Structure Mapping

This document maps the current codebase structure for the surf forecast application. No behavior has been changed - this is purely documentation.

## 1. Spot List Page Location

**File:** `client/src/pages/Dashboard.tsx`

**Component:** `Dashboard` (default export)

**Route:** `/` (root path, defined in `client/src/App.tsx`)

**What it does:**
- Displays a list of all surf spots in a grid layout
- Shows stats overview (spots tracked, best conditions, last updated)
- Each spot is rendered as a clickable card that links to the detail page
- Uses tRPC queries to fetch spots and forecasts

---

## 2. Spot Card Component

**Location:** The spot card is **NOT** a separate component - it's rendered inline within `Dashboard.tsx`

**Rendering Logic:** Lines 240-343 in `Dashboard.tsx`

**Structure:**
- Wrapped in a `Link` component (from wouter) that navigates to `/spot/${spot.id}`
- Uses `Card` component from UI library
- Displays:
  - Spot name (title)
  - Score probability circle (color-coded: green ≥70, yellow ≥40, red <40)
  - Confidence badge (High/Medium/Low)
  - Wave height
  - Wind info (type, direction arrow, speed)
  - Tide info (phase icon, height)
  - Usability scores (Intermediate/Advanced percentages)

**Data Source:**
- `spotsQuery.data` - array of spots from `trpc.spots.list.useQuery()`
- `forecastMap` - Map of spotId → forecast from `trpc.forecasts.listAll.useQuery()`

---

## 3. API Calls (Client-Side)

### Spot List API Call

**Location:** `client/src/pages/Dashboard.tsx` (line 11)

**Code:**
```typescript
const spotsQuery = trpc.spots.list.useQuery();
```

**What it calls:** tRPC endpoint `spots.list` (no input parameters)

**Returns:** Array of `SurfSpot` objects

---

### Forecast List API Call

**Location:** `client/src/pages/Dashboard.tsx` (line 12)

**Code:**
```typescript
const forecastsQuery = trpc.forecasts.listAll.useQuery();
```

**What it calls:** tRPC endpoint `forecasts.listAll` (no input parameters)

**Returns:** Array of forecast objects with joined spot data:
```typescript
forecasts.map((f) => ({
  ...f,
  spot: spots.find((s) => s.id === f.spotId),
}))
```

---

### Per-Spot Forecast API Call

**Location:** `client/src/pages/SpotDetail.tsx` (line 33)

**Code:**
```typescript
const forecastQuery = trpc.forecasts.getForSpot.useQuery({ spotId });
```

**What it calls:** tRPC endpoint `forecasts.getForSpot` with input `{ spotId: number }`

**Returns:** Object with `{ forecast, spot }`

---

### Per-Spot Data API Call

**Location:** `client/src/pages/SpotDetail.tsx` (line 32)

**Code:**
```typescript
const spotQuery = trpc.spots.get.useQuery({ id: spotId });
```

**What it calls:** tRPC endpoint `spots.get` with input `{ id: number }`

**Returns:** Single `SurfSpot` object or `undefined`

---

## 4. Server Endpoints

**File:** `server/routers.ts`

All endpoints use tRPC (TypeScript RPC) and are accessed via `/api/trpc` path.

### Spots Endpoints

#### `spots.list`
- **Type:** `publicProcedure.query`
- **Input:** None
- **Returns:** `Promise<SurfSpot[]>` - Array of all surf spots
- **Implementation:** Calls `getAllSpots()` from `server/db.ts`

#### `spots.get`
- **Type:** `publicProcedure.query`
- **Input:** `{ id: number }`
- **Returns:** `Promise<SurfSpot | undefined>` - Single spot or undefined
- **Implementation:** Calls `getSpotById(input.id)` from `server/db.ts`

#### `spots.create`
- **Type:** `protectedProcedure.mutation` (requires authentication)
- **Input:** 
  ```typescript
  {
    name: string (1-128 chars),
    latitude: string,
    longitude: string,
    buoyId: string,
    tideStationId: string,
    bathymetryFactor: number (1-10, default 5),
    idealSwellDirMin: number (0-360, default 90),
    idealSwellDirMax: number (0-360, default 180)
  }
  ```
- **Returns:** `{ success: true }`
- **Implementation:** Calls `createSpot(input)` from `server/db.ts`

---

### Forecasts Endpoints

#### `forecasts.getForSpot`
- **Type:** `publicProcedure.query`
- **Input:** `{ spotId: number }`
- **Returns:** `Promise<{ forecast: Forecast | undefined, spot: SurfSpot | undefined }>`
- **Implementation:** 
  - Calls `getLatestForecastForSpot(input.spotId)` from `server/db.ts`
  - Calls `getSpotById(input.spotId)` from `server/db.ts`
  - Returns both together

#### `forecasts.listAll`
- **Type:** `publicProcedure.query`
- **Input:** None
- **Returns:** `Promise<Array<Forecast & { spot: SurfSpot | undefined }>>`
- **Implementation:**
  - Calls `getAllLatestForecasts()` and `getAllSpots()` in parallel
  - Joins forecasts with their corresponding spots
  - Returns array of forecasts with spot data attached

#### `forecasts.refresh`
- **Type:** `publicProcedure.mutation`
- **Input:** `{ spotId: number }`
- **Returns:** 
  ```typescript
  {
    success: true,
    forecast: ForecastResult,
    buoyDataFresh: boolean
  }
  ```
- **Implementation:**
  1. Fetches spot by ID
  2. Fetches fresh buoy data from NDBC API
  3. Inserts buoy reading into database
  4. Gets current tide info from NOAA API
  5. Gets average crowd level
  6. Generates forecast using `generateForecast()` service
  7. Saves forecast to database
  8. Returns result

#### `forecasts.refreshAll`
- **Type:** `publicProcedure.mutation`
- **Input:** None
- **Returns:** `Promise<{ results: Array<{ spotId: number, success: boolean }> }>`
- **Implementation:**
  - Gets all spots
  - For each spot, performs the same refresh logic as `forecasts.refresh`
  - Continues even if individual spots fail
  - Returns array of success/failure results

---

### Crowd Reports Endpoints

#### `crowd.getForSpot`
- **Type:** `publicProcedure.query`
- **Input:** `{ spotId: number }`
- **Returns:** `Promise<{ reports: CrowdReport[], averageLevel: number | null }>`
- **Implementation:** 
  - Calls `getRecentCrowdReports(input.spotId)` (default: last 4 hours)
  - Calls `getAverageCrowdLevel(input.spotId)`
  - Returns both

#### `crowd.submit`
- **Type:** `protectedProcedure.mutation` (requires authentication)
- **Input:** `{ spotId: number, crowdLevel: number (1-5) }`
- **Returns:** `{ success: true }`
- **Implementation:** Calls `insertCrowdReport()` with user ID from context

---

## 5. Data Shapes

### SurfSpot Type

**Defined in:** `drizzle/schema.ts` (lines 29-43)

**TypeScript Type:** `SurfSpot` (inferred from schema)

**Structure:**
```typescript
{
  id: number;                    // Auto-increment primary key
  name: string;                  // Spot name (max 128 chars)
  latitude: string;              // Latitude coordinate (max 32 chars)
  longitude: string;             // Longitude coordinate (max 32 chars)
  buoyId: string;                // NDBC buoy ID (max 16 chars)
  tideStationId: string;         // NOAA tide station ID (max 16 chars)
  bathymetryFactor: number;      // 1-10 scale, default 5
  idealSwellDirMin: number;      // Degrees (0-360), default 90
  idealSwellDirMax: number;      // Degrees (0-360), default 180
  createdAt: Date;              // Timestamp
}
```

---

### Forecast Type

**Defined in:** `drizzle/schema.ts` (lines 62-82)

**TypeScript Type:** `Forecast` (inferred from schema)

**Structure:**
```typescript
{
  id: number;                    // Auto-increment primary key
  spotId: number;                // Foreign key to surf_spots.id
  forecastTime: Date;           // UTC time this forecast is for
  probabilityScore: number;      // 0-100 score
  waveHeightTenthsFt: number;    // Wave height in tenths of feet (e.g., 50 = 5.0 ft)
  confidenceBand: string;        // "Low" | "Medium" | "High"
  usabilityIntermediate: number;  // 0-100 score for intermediate surfers
  usabilityAdvanced: number;     // 0-100 score for advanced surfers
  windSpeedMph: number | null;   // Wind speed in mph
  windDirectionDeg: number | null; // Wind direction in degrees
  windType: string | null;       // "offshore" | "onshore" | "cross" | null
  tideHeightFt: number | null;   // Current tide height in tenths of feet
  tidePhase: string | null;       // "rising" | "falling" | "high" | "low" | null
  createdAt: Date;               // When forecast was generated
}
```

---

### BuoyReading Type

**Defined in:** `drizzle/schema.ts` (lines 46-59)

**Structure:**
```typescript
{
  id: number;                    // Auto-increment primary key
  buoyId: string;               // NDBC buoy ID
  timestamp: Date;              // UTC time of reading
  waveHeightCm: number | null;  // Significant wave height in cm
  dominantPeriodDs: number | null; // Dominant period in deciseconds (tenths of seconds)
  swellDirectionDeg: number | null; // Mean wave direction in degrees
  windSpeedCmps: number | null;  // Wind speed in cm/s
  windDirectionDeg: number | null; // Wind direction in degrees
  createdAt: Date;              // When record was created
}
```

---

### CrowdReport Type

**Defined in:** `drizzle/schema.ts` (lines 85-95)

**Structure:**
```typescript
{
  id: number;                    // Auto-increment primary key
  spotId: number;                // Foreign key to surf_spots.id
  userId: number;                // Foreign key to users.id
  reportTime: Date;              // UTC time of the report
  crowdLevel: number;            // 1-5 scale (1=empty, 5=packed)
  createdAt: Date;               // When record was created
}
```

---

## 6. Data Flow Summary

### Dashboard Page Flow

1. **Page Loads** → `Dashboard` component renders
2. **Fetch Spots** → `trpc.spots.list.useQuery()` called
3. **Fetch Forecasts** → `trpc.forecasts.listAll.useQuery()` called
4. **Create Map** → Forecasts mapped by `spotId` for quick lookup
5. **Render Cards** → For each spot, render card with matching forecast data
6. **User Clicks Card** → Navigate to `/spot/${spot.id}`

### Spot Detail Page Flow

1. **Page Loads** → `SpotDetail` component renders with `spotId` from URL params
2. **Fetch Spot** → `trpc.spots.get.useQuery({ id: spotId })` called
3. **Fetch Forecast** → `trpc.forecasts.getForSpot.useQuery({ spotId })` called
4. **Fetch Crowd Data** → `trpc.crowd.getForSpot.useQuery({ spotId })` called
5. **Render Details** → Display spot info, forecast data, and crowd reports

### Forecast Refresh Flow

1. **User Clicks Refresh** → `trpc.forecasts.refresh.useMutation()` called
2. **Server Fetches Spot** → Gets spot data from database
3. **Fetch Buoy Data** → Calls NDBC API to get latest buoy reading
4. **Save Buoy Data** → Inserts reading into `buoy_readings` table
5. **Fetch Tide Data** → Calls NOAA API to get current tide info
6. **Get Crowd Level** → Calculates average from recent reports
7. **Generate Forecast** → Calls `generateForecast()` service function
8. **Save Forecast** → Inserts forecast into `forecasts` table
9. **Return Result** → Client refetches data and updates UI

---

## 7. Key Files Reference

- **Spot List Page:** `client/src/pages/Dashboard.tsx`
- **Spot Detail Page:** `client/src/pages/SpotDetail.tsx`
- **Routing:** `client/src/App.tsx`
- **tRPC Client Setup:** `client/src/lib/trpc.ts`
- **Server Endpoints:** `server/routers.ts`
- **Database Functions:** `server/db.ts`
- **Data Schema:** `drizzle/schema.ts`
- **Forecast Generation:** `server/services/forecast.ts`
- **NDBC Service:** `server/services/ndbc.ts`
- **Tides Service:** `server/services/tides.ts`

---

## Notes

- **No separate SpotCard component exists** - cards are rendered inline in Dashboard
- **Forecasts are single-point in time** - no multi-day or hourly forecasts currently
- **All forecasts are "current"** - no historical forecast data stored
- **tRPC provides type-safe API calls** - types are shared between client and server
- **Database uses Drizzle ORM** - schema defined in `drizzle/schema.ts`

