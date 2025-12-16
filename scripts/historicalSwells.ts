/**
 * Historical Swell Data for Algorithm Validation
 * 
 * Real swell events from 2020-2025 used to test and tune the forecasting algorithm.
 * These represent actual conditions and their observed quality ratings.
 */

export interface HistoricalSwell {
  date: string; // YYYY-MM-DD
  name: string; // e.g., 'Hurricane Lee'
  actual_rating: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent' | 'Epic';
  swell_height_ft: number; // decimal feet
  swell_period_s: number; // seconds
  swell_direction_deg: number; // degrees (0-360)
  tide_ft: number; // decimal feet (estimate if unknown)
  wind_speed_kt: number | null; // knots
  wind_direction_deg: number | null; // degrees (0-360)
  notes: string; // original context from spreadsheet
  spot_id: 'lido' | 'long-beach' | 'rockaway';
}

export const HISTORICAL_SWELLS: HistoricalSwell[] = [
  {
    date: '2023-09-15',
    name: 'Hurricane Lee',
    actual_rating: 'Epic',
    swell_height_ft: 6.8,
    swell_period_s: 16,
    swell_direction_deg: 146,
    tide_ft: 3.5,
    wind_speed_kt: 8,
    wind_direction_deg: 315, // NW offshore
    notes: 'Peaked at 6.8ft 16s SE 146. Phenomenal conditions.',
    spot_id: 'lido',
  },
  {
    date: '2024-03-24',
    name: 'March 2024 SSE Swell',
    actual_rating: 'Excellent',
    swell_height_ft: 5.6,
    swell_period_s: 11,
    swell_direction_deg: 150,
    tide_ft: 3.0,
    wind_speed_kt: 12,
    wind_direction_deg: 350, // N offshore
    notes: '5.6ft 11s SSE 150d NNW/N winds (10-20 mph)',
    spot_id: 'lido',
  },
  {
    date: '2024-07-18',
    name: 'Summer Day',
    actual_rating: 'Fair',
    swell_height_ft: 3.7,
    swell_period_s: 7,
    swell_direction_deg: 166,
    tide_ft: 4.0,
    wind_speed_kt: 5,
    wind_direction_deg: 315, // Light NW
    notes: 'Example of solid summer day (3.7ft 7s 166d / Calm NW winds)',
    spot_id: 'lido',
  },
  {
    date: '2020-12-17',
    name: 'December 2020 Noreaster',
    actual_rating: 'Epic',
    swell_height_ft: 7.3,
    swell_period_s: 10,
    swell_direction_deg: 124,
    tide_ft: 2.5,
    wind_speed_kt: 15,
    wind_direction_deg: 0, // N offshore
    notes: 'Massive Noreaster. Peaked at 12.3ft but best at 7.3ft 10s SE 124, strong N winds',
    spot_id: 'lido',
  },
  {
    date: '2024-08-10',
    name: 'August Hurricane (Onshore)',
    actual_rating: 'Poor',
    swell_height_ft: 6.0,
    swell_period_s: 9,
    swell_direction_deg: 140,
    tide_ft: 4.5,
    wind_speed_kt: 25,
    wind_direction_deg: 90, // Strong onshore E winds
    notes: 'Hurricane swell 8/9-8/11 - onshore winds, not ideal',
    spot_id: 'lido',
  },
  {
    date: '2023-02-28',
    name: 'Late Feb 2023',
    actual_rating: 'Good',
    swell_height_ft: 5.6,
    swell_period_s: 8,
    swell_direction_deg: 117,
    tide_ft: 3.2,
    wind_speed_kt: 10,
    wind_direction_deg: 290, // W offshore
    notes: 'End of day got good: 5.6ft 8s ESE 117d',
    spot_id: 'lido',
  },
  {
    date: '2022-12-09',
    name: 'December 2022 Long Period',
    actual_rating: 'Very Good',
    swell_height_ft: 3.7,
    swell_period_s: 14,
    swell_direction_deg: 124,
    tide_ft: 3.0,
    wind_speed_kt: 8,
    wind_direction_deg: 320, // NW offshore
    notes: 'Really good swell: 3.7ft 14s SE 124 - perfect offshore',
    spot_id: 'lido',
  },
  {
    date: '2020-09-22',
    name: 'Hurricane Teddy',
    actual_rating: 'Excellent',
    swell_height_ft: 4.9,
    swell_period_s: 13,
    swell_direction_deg: 117,
    tide_ft: 3.5,
    wind_speed_kt: 10,
    wind_direction_deg: 350, // NNW offshore
    notes: 'Teddy peaked 9/21-22 at 5.8ft 16s but best on 9/22: 4.9ft 13s ESE 117 NNW winds',
    spot_id: 'lido',
  },
  {
    date: '2021-09-10',
    name: 'Hurricane Larry',
    actual_rating: 'Excellent',
    swell_height_ft: 4.6,
    swell_period_s: 16,
    swell_direction_deg: 139,
    tide_ft: 3.0,
    wind_speed_kt: 8,
    wind_direction_deg: 315, // NW offshore
    notes: 'Hurricane Larry 9/9-11: Massive SE swell and offshore conditions. Peak: 4.6ft 16s SE 139',
    spot_id: 'lido',
  },
  {
    date: '2024-03-26',
    name: 'March 2024 E Swell (Underperformer)',
    actual_rating: 'Poor',
    swell_height_ft: 6.0,
    swell_period_s: 12,
    swell_direction_deg: 105,
    tide_ft: 5.0,
    wind_speed_kt: 12,
    wind_direction_deg: 300,
    notes: 'Fake good day: showed 6ft at 12s ESE 105 but didnt break that big - lost faith in E swells',
    spot_id: 'lido',
  },
  {
    date: '2022-05-15',
    name: 'May 2022 E Swell',
    actual_rating: 'Fair',
    swell_height_ft: 8.3,
    swell_period_s: 10,
    swell_direction_deg: 98,
    tide_ft: 4.0,
    wind_speed_kt: 15,
    wind_direction_deg: 270, // W offshore
    notes: 'Big east swell brought 5 days. Peaked at 8.3ft 10s E 98d. Only 3 days surfable.',
    spot_id: 'lido',
  },
  {
    date: '2023-11-22',
    name: 'Late Nov 2023',
    actual_rating: 'Good',
    swell_height_ft: 6.0,
    swell_period_s: 9,
    swell_direction_deg: 150,
    tide_ft: 3.0,
    wind_speed_kt: 10,
    wind_direction_deg: 310,
    notes: '11/22 got good at end of the day: 6ft 9s SSE 150',
    spot_id: 'lido',
  },
  {
    date: '2020-03-07',
    name: 'March 2020 ESE',
    actual_rating: 'Excellent',
    swell_height_ft: 4.5,
    swell_period_s: 10.5,
    swell_direction_deg: 110,
    tide_ft: 3.5,
    wind_speed_kt: 12,
    wind_direction_deg: 330,
    notes: '6-8ft faces: 4.5ft 10-11s ESE 110',
    spot_id: 'lido',
  },
  {
    date: '2022-09-13',
    name: 'Sept 2022 Hurricane (Disappointment)',
    actual_rating: 'Fair',
    swell_height_ft: 5.0,
    swell_period_s: 8,
    swell_direction_deg: 135,
    tide_ft: 4.5,
    wind_speed_kt: 18,
    wind_direction_deg: 45, // NE cross-onshore
    notes: 'Was not nearly as good as anticipated. Came and went very quickly; unbelievably crowded',
    spot_id: 'lido',
  },
  {
    date: '2024-10-08',
    name: 'Oct 2024 Hurricane',
    actual_rating: 'Good',
    swell_height_ft: 5.5,
    swell_period_s: 10,
    swell_direction_deg: 145,
    tide_ft: 3.2,
    wind_speed_kt: 10,
    wind_direction_deg: 300,
    notes: 'Good hurricane swell 10/7-8',
    spot_id: 'lido',
  },
];

