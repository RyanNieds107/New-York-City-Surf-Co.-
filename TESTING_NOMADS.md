# Testing NOMADS JSON Endpoint

This guide walks you through testing the NOMADS JSON endpoint before implementing the GRIB2 parser.

## Step 1: Run Database Migration

First, create the `forecast_points` table in your database:

```bash
pnpm db:push
```

**What this does:**
- Generates migration files from your schema
- Applies the migration to create the `forecast_points` table
- You should see output like: "Migration applied successfully"

**Expected output:**
```
✓ Generated migration files
✓ Applied migration: forecast_points table created
```

## Step 2: Test NOMADS JSON Endpoint

Run the test script to check if NOMADS JSON endpoints work:

```bash
pnpm exec tsx scripts/test-nomads.mjs
```

**What the test does:**
1. Checks if NOMADS OPeNDAP/DODS endpoint is accessible
2. Determines the latest WW3 model run time (00z, 06z, 12z, 18z UTC)
3. Attempts to fetch actual forecast data for Lido Beach coordinates
4. Shows you the response structure if successful

## Step 3: Interpret Results

### ✅ Successful Response

If the JSON endpoint works, you'll see:

```
✅ SUCCESS! Received JSON response

Response structure:
{
  "htsgw": {
    "data": [1.2, 1.5, 1.8, ...],
    ...
  },
  "perpw": {
    "data": [8.5, 9.0, 9.2, ...],
    ...
  },
  "dirpw": {
    "data": [145, 150, 155, ...],
    ...
  }
}

✅ JSON ENDPOINT WORKS! Can parse this data.
```

**What this means:**
- NOMADS provides JSON data via OPeNDAP/DODS
- We can parse it directly without GRIB2
- **No need for Phase 3 (Python GRIB2 parser)**

### ❌ Failed Response

If the JSON endpoint fails, you'll see:

```
❌ FAILED to fetch forecast data
  Error: NOMADS JSON endpoint unavailable - GRIB2 fallback required (Phase 3)

Error details:
  HTTP Status: 404
  Response data: <HTML>...</HTML>
```

**Common failure scenarios:**

1. **404 Not Found**
   - OPeNDAP endpoint doesn't exist for this model
   - Need to use GRIB2 filter service instead

2. **Timeout**
   - Server is slow or unavailable
   - May need retry logic

3. **HTML Response (not JSON)**
   - Endpoint exists but returns HTML catalog
   - Need GRIB2 parser to get actual data

**What this means:**
- JSON endpoint is not available for WW3 data
- **Need to implement Phase 3 (Python GRIB2 parser)**
- GRIB2 is the standard format for NOMADS forecast data

## Step 4: Next Steps

### If JSON Works:
1. Update `fetchWw3ForecastJson()` in `server/services/nomads.ts`
2. Implement proper DAP4 JSON parsing
3. Test with real spot data
4. Skip Phase 3 (GRIB2 parser)

### If JSON Fails:
1. Proceed with Phase 3 implementation
2. Create `scripts/nomads_parser.py` with pygrib
3. Update `fetchWw3ForecastForSpot()` to use Python fallback
4. Test GRIB2 parsing

## Troubleshooting

**Issue: "pnpm: command not found"**
- Install pnpm: `npm install -g pnpm`
- Or use: `npm run db:push` (if npm scripts are configured)

**Issue: "tsx: command not found"**
- Install tsx: `pnpm add -D tsx`
- Or use: `node --loader tsx scripts/test-nomads.mjs`

**Issue: Database connection error**
- Check your `.env` file has `DATABASE_URL` set
- Ensure your database is running
- Verify connection credentials

**Issue: Test script hangs**
- NOMADS servers can be slow
- Increase timeout in test script if needed
- Check your internet connection

