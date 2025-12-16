/**
 * Delete forecasts for Gilgo Beach, Ditch Plains (Montauk), and Lincoln Blvd (The Hamptons)
 * Run with: node scripts/delete-forecasts.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { forecasts, surfSpots } from "../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const SPOTS_TO_DELETE = ["Gilgo Beach", "Ditch Plains", "Lincoln Blvd"];

async function deleteForecasts() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("Finding spots and deleting forecasts...");

  for (const spotName of SPOTS_TO_DELETE) {
    try {
      // Find the spot by name
      const [spots] = await connection.execute(
        `SELECT id, name FROM surf_spots WHERE name = ?`,
        [spotName]
      );

      if (spots.length === 0) {
        console.log(`  ⚠ ${spotName}: Spot not found`);
        continue;
      }

      const spot = spots[0];
      const spotId = spot.id;

      // Delete all forecasts for this spot
      const [result] = await connection.execute(
        `DELETE FROM forecasts WHERE spotId = ?`,
        [spotId]
      );

      console.log(`  ✓ ${spotName} (ID: ${spotId}): Deleted ${result.affectedRows} forecast(s)`);
    } catch (error) {
      console.error(`  ✗ ${spotName}:`, error.message);
    }
  }

  await connection.end();
  console.log("Done!");
}

deleteForecasts().catch(console.error);

