# Surf Forecasting Algorithm - Day 1 MVP

## Overview

The forecasting system produces two outputs:

1. **Breaking Wave Height**: Predicted rideable wave face (e.g., '3-4ft')
2. **Quality Rating**: Condition assessment (Flat/Don't Bother/Worth a Look/Actually Fun/Clear the Calendar/All-Time)

## ForecastPoint Data Contract

Each hourly forecast point contains:

- `timestamp`: ISO 8601 local time string (from `forecastTimestamp`)
- `spot_id`: string ('lido' | 'long-beach' | 'rockaway')
- `swell_height_ft`: number (offshore swell height, decimal feet)
  - **Note:** Currently stored as `waveHeightFt` integer*10 in schema, divide by 10 to get decimal feet
- `swell_period_s`: number (seconds, from `wavePeriodSec`)
- `swell_direction_deg`: number | null (degrees, 0-360, from `waveDirectionDeg`)
- `tide_ft`: number (decimal feet) - **fetched separately from tide service**
- `wind_speed_kt`: number | null (knots, from `windSpeedKts`)
- `wind_direction_deg`: number | null (degrees, 0-360, from `windDirectionDeg`)

### Schema Mapping

The existing `ForecastPoint` type from `drizzle/schema.ts` maps as follows:

| Algorithm Field | Schema Field | Conversion |
|----------------|--------------|------------|
| `swell_height_ft` | `waveHeightFt` | Divide by 10 (integer*10 → decimal) |
| `swell_period_s` | `wavePeriodSec` | Direct (seconds) |
| `swell_direction_deg` | `waveDirectionDeg` | Direct (degrees) |
| `wind_speed_kt` | `windSpeedKts` | Direct (knots) |
| `wind_direction_deg` | `windDirectionDeg` | Direct (degrees) |
| `tide_ft` | (separate service) | Fetched from tide API |

## Spot Profiles

### Lido Beach

- `swell_target_deg`: 120 (ESE - ideal swell direction)
- `swell_tolerance_deg`: 30 (acceptable deviation)
- `tide_best_min_ft`: 2.0
- `tide_best_max_ft`: 5.0
- `min_period_s`: 6
- `amplification_factor`: 1.4 (offshore bathymetry advantage)

**Notes:** Hudson Canyon depth creates 1-2ft larger waves than surrounding areas. All Long Island south shore beaches face ~180° (South).

### Long Beach

- `swell_target_deg`: 130 (SE)
- `swell_tolerance_deg`: 40
- `tide_best_min_ft`: 2.0
- `tide_best_max_ft`: 5.0
- `min_period_s`: 5
- `amplification_factor`: 1.2 (jetty sandbars)

**Notes:** Jetty-driven sandbars, flips quickly with wind/tide. All Long Island south shore beaches face ~180° (South).

### Rockaway Beach

- `swell_target_deg`: 110 (ESE)
- `swell_tolerance_deg`: 35
- `tide_best_min_ft`: 1.0
- `tide_best_max_ft`: 4.0
- `min_period_s`: 5
- `amplification_factor`: 1.15 (consistent but moderate)

**Notes:** Sensitive to crowds and wind shifts. All Long Island south shore beaches face ~180° (South).

---

## Part 1: Breaking Wave Height Prediction

### Base Formula

```
breaking_wave_ft = swell_height_ft * amplification_factor * period_multiplier
```

### Period Multiplier (energy factor)

**CRITICAL RULE: Period determines surfability, not just size.**

A 3ft @ 4s reading is NOT 3ft surf - it's choppy, disorganized wind slop that cannot be surfed on beach breaks. The period threshold is the most important filter in surf forecasting.

**Period Thresholds:**
- `period < 5s`: **0.0 (EXCLUDED)** - Pure wind chop, not surfable
- `5-6s`: 0.3 (marginal wind swell, heavily discounted)
- `7-9s`: 1.0 (actual swell, optimal for Long Island)
- `10-12s`: 1.1 (long period, extra push)
- `13s+`: 1.15 (powerful groundswell)

### Direction Factor (East Swell Adjustment)

If `swell_direction_deg` is null: no adjustment

**East Swell Reduction (90-110°):**

East swells consistently underperform at Western Long Island due to:
1. **Swell shadow:** Long Island blocks direct east energy
2. **Refraction:** Waves bend around the island, losing energy  
3. **Bathymetry mismatch:** Lido's Hudson Canyon advantage works for SE swells, not E

**Gradual Reduction:**
- **90-100° (Due East):** 50% reduction in amplification factor
- **100-110° (ESE):** 35% reduction (transitioning toward SE which works better)
- **110-120° (SE):** Full amplification (no reduction)

**Examples:**
- 6ft @ 12s ESE 105° at Lido: 6 × (1.4 × 0.65) × 1.1 = 6.0ft → "6ft" ✅
- 6ft @ 12s E 95° at Lido: 6 × (1.4 × 0.5) × 1.1 = 4.6ft → "4-5ft" ✅
- 6ft @ 12s SE 115° at Lido: 6 × 1.4 × 1.1 = 9.2ft → "9ft" ✅

### Tide Factor (optional for V0)

Tide affects breaking, but for simplicity in V0, we'll include it only in quality rating

### Output Format

Return as range string: "3-4ft" (round to nearest foot, show ±0.5ft range)

**Examples:**

- 2.0ft swell @ 8s at Lido → 2.0 * 1.4 * 1.0 = 2.8ft → display "3ft" or "2-3ft"
- 2.5ft swell @ 5s at Rockaway → 2.5 * 1.15 * 0.8 = 2.3ft → display "2-3ft"

---

## Part 2: Quality Rating (0-100 internal score)

### Component A: Swell Quality (0-40 points)

Based on energy: `energy = swell_height_ft * Math.pow(swell_period_s, 1.5)`

**Energy buckets:**

- `energy < 10`: 5 points (tiny/weak)
- `10 <= energy < 20`: 15 points (small but rideable)
- `20 <= energy < 35`: 25 points (decent size)
- `35 <= energy < 60`: 32 points (good size)
- `energy >= 60`: 40 points (pumping)

### Component B: Direction Fit (0-20 points)

If `swell_direction_deg` is null: 10 points (neutral)

If available:

- Within target tolerance: 20 points
- 1.5x tolerance: 14 points
- 2x tolerance: 8 points
- 2.5x tolerance: 4 points
- Beyond 2.5x tolerance: 2 points

**East Swell Penalty (90-110°):**
- Modest -4 point penalty applied to base direction score
- Reflects uncertainty and tendency to underperform
- Quality can still be good if period/wind are favorable
- Just adds realistic caution about east swells

### Component C: Tide (0-20 points)

- In optimal range: 20 points
- Slightly outside (±0.5ft): 12 points
- Poor tide: 4 points

### Component D: Wind (−40 to +20 points)

If wind data is null: 0 points (neutral)

If available (Long Island south shore faces ~180°):

- Offshore (winds from N, NW, NE - 315-45°): +10 to +20 points
  - Perfect offshore (≤12kt): +20 points
  - Good offshore (12-18kt): +15 points
  - Strong offshore (>18kt): +10 points
- Cross-shore/Sideshore (winds from E or W - 60-120°, 240-300°): -5 to -15 points
  - Light cross (≤10kt): -5 points
  - Moderate cross (10-18kt): -12 points
  - Strong cross (>18kt): -20 points
- Onshore (winds from S, SE, SW - 120-240°): -20 to -40 points
  - Light onshore (≤8kt): -10 points
  - Moderate onshore (8-15kt): -25 points
  - Strong onshore (>15kt): -40 points

### Mandatory Clamps

Apply AFTER calculating total:

- If `swell_period_s < 5`: cap score at 20 (junk period)
- If `swell_height_ft < 2 AND swell_period_s < 6`: cap score at 15 (too small and weak)

### Score to Rating Conversion

- `0-20`: "Flat" (flat or unsurfable)
- `21-40`: "Don't Bother" (barely rideable)
- `41-60`: "Worth a Look" (surfable but not great)
- `61-75`: "Actually Fun" (worth paddling out)
- `76-90`: "Clear the Calendar" (excellent conditions)
- `91-100`: "All-Time" (rare, memorable session)

---

## Implementation Notes

1. All calculations work with decimal feet values
2. When reading from ForecastPoint schema, divide `waveHeightFt` by 10 to get decimal feet (until schema migration)
3. Tide data must be fetched separately from the tide service
4. The breaking wave height and quality rating are calculated independently but complement each other
5. It's possible to have 'big but poor' (large breaking waves but poor conditions) or 'small but good' (small waves but clean conditions)


