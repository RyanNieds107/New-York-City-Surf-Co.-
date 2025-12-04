# Long Island Surf Forecast MVP - Technical Architecture

**Author:** Manus AI
**Date:** December 4, 2025

---

## 1. Project Goal

The goal of this project is to create a Minimum Viable Product (MVP) for a surf forecasting web application specifically for Long Island, NY. The application aims to outperform existing services like Surfline for East Coast conditions by providing a probabilistic "score probability" (0–100%) of a successful surf session, along with a simple wave height forecast, a confidence band, and a crowd-adjusted usability score.

---

## 2. Constraints and Assumptions

The following constraints and assumptions guide the design of this MVP.

| Constraint | Description |
| :--- | :--- |
| **Scope** | Long Island, NY only. Initial spots include Ditch Plains, Long Beach, and Rockaway Beach. |
| **Priority** | Accuracy over UI polish for v1. The focus is on a robust data pipeline and a functional model. |
| **Technology** | The backend uses **tRPC** (TypeScript) for the API layer. Data ingestion and modeling logic will be implemented in TypeScript within the server. The frontend is built with **React**, **Vite**, and **TailwindCSS**. |
| **Data Source** | Public datasets and scraping only. No enterprise APIs are available initially. Primary sources are NOAA and NDBC. [1] [2] |

---

## 3. High-Level Architecture Diagram

The system follows a classic three-tier architecture with a dedicated, asynchronous data pipeline. The diagram below illustrates the data flow from public sources to the user's browser.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DATA INGESTION LAYER                                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │  NDBC Buoys     │   │  NOAA Tides &   │   │  NOAA Wave      │   │  Static         │  │
│  │  (44025, 44017) │   │  Currents API   │   │  Models (WW3)   │   │  Bathymetry     │  │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘  │
│           │                     │                     │                     │           │
│           └──────────────────┬──┴─────────────────────┴──┬──────────────────┘           │
│                              ▼                           ▼                              │
│                      ┌───────────────────────────────────────────┐                      │
│                      │        Harvester Scripts (TypeScript)     │                      │
│                      │        (Scheduled via Cron / On-Demand)   │                      │
│                      └───────────────────────┬───────────────────┘                      │
└──────────────────────────────────────────────┼──────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             DATA PROCESSING & MODELING LAYER                            │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              TiDB/MySQL Database                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │  │
│  │  │  surf_spots     │  │  buoy_readings  │  │  forecasts      │  │ crowd_reports│  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                               │                                         │
│                                               ▼                                         │
│                      ┌───────────────────────────────────────────┐                      │
│                      │        Forecasting Model (TypeScript)     │                      │
│                      │        (Heuristic-based for MVP)          │                      │
│                      └───────────────────────┬───────────────────┘                      │
│                                               │                                         │
└───────────────────────────────────────────────┼─────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PRESENTATION LAYER                                    │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              tRPC API (Express.js)                                │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │  │
│  │  │  spots.list     │  │  forecasts.get  │  │  crowd.submit   │  │  auth.me     │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                               │                                         │
│                                               ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        React Frontend (Vite + TailwindCSS)                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │  │
│  │  │  Home Page      │  │  Spot Detail    │  │  Crowd Report   │  │  User Auth   │  │  │
│  │  │  (Dashboard)    │  │  View           │  │  Form           │  │  (OAuth)     │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component List and Technology Stack

The MVP is built using a full-stack architecture (`web-db-user` scaffold) to ensure a robust data pipeline and secure API layer.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React (via Vite) + TailwindCSS | User interface for displaying forecasts and collecting user crowd input. |
| **Backend API** | tRPC + Express.js | Type-safe API to serve forecast data and receive user input. |
| **Database** | TiDB/MySQL (via Drizzle ORM) | Persistent storage for spots, buoy data, forecasts, and crowd reports. |
| **Data Ingestion** | TypeScript (Axios) | Scripts for fetching data from public NOAA/NDBC sources. |

---

## 5. Data Sources

The MVP relies on the following public data sources. No enterprise APIs are required.

| Source | Data Type | Access Method | Key Data Points |
| :--- | :--- | :--- | :--- |
| **NDBC** [1] | Buoy Data | HTTP (Text files) | Swell height, period, direction, wind speed, wind direction. |
| **NOAA Tides & Currents** [2] | Tide Data | HTTP (JSON API) | High/Low tide times and heights for local stations. |
| **Static Bathymetry** | Water Depth | Pre-loaded | A simplified depth factor for each spot (one-time setup). |

---

## 6. Data Model (Database Schema)

The database will contain the following key tables, managed by Drizzle ORM.

### 6.1. `surf_spots`
Stores the list of surf spots being tracked.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Auto-incrementing primary key. |
| `name` | VARCHAR(128) | Name of the surf spot (e.g., "Ditch Plains"). |
| `latitude` | VARCHAR(32) | Latitude of the spot. |
| `longitude` | VARCHAR(32) | Longitude of the spot. |
| `buoyId` | VARCHAR(16) | The NDBC buoy ID closest to this spot. |
| `tideStationId` | VARCHAR(16) | The NOAA tide station ID for this spot. |
| `bathymetryFactor` | INT | A 1-10 score representing how well the local bathymetry focuses swell. |

### 6.2. `buoy_readings`
Stores time-series data from NDBC buoys.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Auto-incrementing primary key. |
| `buoyId` | VARCHAR(16) | The NDBC buoy ID. |
| `timestamp` | TIMESTAMP | The UTC time of the reading. |
| `waveHeightM` | INT | Significant wave height in centimeters. |
| `dominantPeriodS` | INT | Dominant wave period in tenths of seconds. |
| `swellDirectionDeg` | INT | Mean wave direction in degrees. |
| `windSpeedMps` | INT | Wind speed in tenths of m/s. |
| `windDirectionDeg` | INT | Wind direction in degrees. |

### 6.3. `forecasts`
Stores the final, modeled forecast for each spot and time window.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Auto-incrementing primary key. |
| `spotId` | INT (FK) | Foreign key to `surf_spots`. |
| `forecastTime` | TIMESTAMP | The UTC time this forecast is for. |
| `probabilityScore` | INT | The 0-100% probability of scoring. |
| `waveHeightFt` | INT | Predicted wave height in tenths of feet. |
| `confidenceBand` | VARCHAR(16) | "Low", "Medium", or "High". |
| `usabilityIntermediate` | INT | 0-100 usability score for intermediate surfers. |
| `usabilityAdvanced` | INT | 0-100 usability score for advanced surfers. |
| `createdAt` | TIMESTAMP | When this forecast was generated. |

### 6.4. `crowd_reports`
Stores user-submitted crowd data.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Auto-incrementing primary key. |
| `spotId` | INT (FK) | Foreign key to `surf_spots`. |
| `userId` | INT (FK) | Foreign key to `users`. |
| `reportTime` | TIMESTAMP | The UTC time of the report. |
| `crowdLevel` | INT | 1-5 scale (1=empty, 5=packed). |
| `createdAt` | TIMESTAMP | When the report was submitted. |

---

## 7. Core Logic: The Forecasting Model

For the MVP, the forecasting model will be a **heuristic-based scoring algorithm** implemented in TypeScript. This approach is faster to develop and easier to tune than a full machine learning model, while still providing a reasonable baseline.

### 7.1. Model Inputs (Features)

The model will consume the following features for a given spot and time window:

1.  **Swell Height:** From the closest NDBC buoy.
2.  **Swell Period:** From the closest NDBC buoy. Longer periods generally mean more powerful waves.
3.  **Swell Direction:** From the closest NDBC buoy. Compared against the spot's ideal swell window.
4.  **Wind Speed & Direction:** Offshore winds are favorable; onshore winds are unfavorable.
5.  **Tide Height:** Some spots work better at certain tides.
6.  **Bathymetry Factor:** A static multiplier for each spot.

### 7.2. Model Output

The heuristic model will produce the four core outputs:

1.  **Probability Score (0-100%):** A weighted sum of the input factors, normalized to a 0-100 scale.
2.  **Wave Height Forecast (ft):** Derived directly from the buoy's significant wave height, adjusted by the bathymetry factor.
3.  **Confidence Band:** Based on the age of the buoy data. If data is < 1 hour old, confidence is "High". If 1-3 hours, "Medium". Otherwise, "Low".
4.  **Usability Score:** The probability score, adjusted down for intermediate surfers if wave height is above a certain threshold (e.g., > 6ft).

---

## 8. References

[1]: NOAA National Data Buoy Center (NDBC). https://www.ndbc.noaa.gov/
[2]: NOAA Tides & Currents. https://tidesandcurrents.noaa.gov/
