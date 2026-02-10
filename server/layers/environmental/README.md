# Environmental Engine Layer

Raw data ingestion from weather/ocean APIs.

## Clients

- `openmeteo.ts` - Open-Meteo marine forecast (primary)
- `stormglass.ts` - ECMWF verification data
- `ndbc.ts` - NOAA buoy readings
- `buoy44065.ts` - Specialized buoy 44065 processing
- `tides.ts` - NOAA tide predictions

## Jobs

- `importOpenMeteoMarine.ts` - Fetches marine forecasts every 6 hours
- `fetchStormglassVerification.ts` - Fetches ECMWF data twice daily

## Database Operations

See `server/db/` for environmental data operations:

- `getAllSpots()`, `getSpotById()`, `createSpot()`
- `insertForecastPoints()`, `getForecastTimeline()`
- `getLatestBuoyReading()`, `insertBuoyReading()`
