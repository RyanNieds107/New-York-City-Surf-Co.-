/**
 * Seed script for Long Island surf spots.
 * Run with: node scripts/seed-spots.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const LONG_ISLAND_SPOTS = [
  {
    name: "Long Beach",
    latitude: "40.5884",
    longitude: "-73.6579",
    buoyId: "44025", // Ambrose Light buoy
    tideStationId: "8516945", // Kings Point, NY
    bathymetryFactor: 6,
    idealSwellDirMin: 120,
    idealSwellDirMax: 200,
  },
  {
    name: "Rockaway Beach",
    latitude: "40.5834",
    longitude: "-73.8168",
    buoyId: "44025", // Ambrose Light buoy
    tideStationId: "8516945", // Kings Point, NY
    bathymetryFactor: 5,
    idealSwellDirMin: 130,
    idealSwellDirMax: 210,
  },
  {
    name: "Gilgo Beach",
    latitude: "40.6226",
    longitude: "-73.3926",
    buoyId: "44025", // Ambrose Light buoy
    tideStationId: "8516945", // Kings Point, NY
    bathymetryFactor: 5,
    idealSwellDirMin: 140,
    idealSwellDirMax: 200,
  },
  {
    name: "Ditch Plains",
    latitude: "41.0276",
    longitude: "-71.9276",
    buoyId: "44017", // Montauk Point buoy
    tideStationId: "8510560", // Montauk, NY
    bathymetryFactor: 8,
    idealSwellDirMin: 90,
    idealSwellDirMax: 180,
  },
  {
    name: "Lido Beach",
    latitude: "40.5892",
    longitude: "-73.6256",
    buoyId: "44025", // Ambrose Light buoy
    tideStationId: "8516945", // Kings Point, NY
    bathymetryFactor: 5,
    idealSwellDirMin: 130,
    idealSwellDirMax: 200,
  },
];

async function seed() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("Seeding surf spots...");

  for (const spot of LONG_ISLAND_SPOTS) {
    try {
      await connection.execute(
        `INSERT INTO surf_spots (name, latitude, longitude, buoyId, tideStationId, bathymetryFactor, idealSwellDirMin, idealSwellDirMax, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = name`,
        [
          spot.name,
          spot.latitude,
          spot.longitude,
          spot.buoyId,
          spot.tideStationId,
          spot.bathymetryFactor,
          spot.idealSwellDirMin,
          spot.idealSwellDirMax,
        ]
      );
      console.log(`  ✓ ${spot.name}`);
    } catch (error) {
      console.error(`  ✗ ${spot.name}:`, error.message);
    }
  }

  await connection.end();
  console.log("Done!");
}

seed().catch(console.error);
