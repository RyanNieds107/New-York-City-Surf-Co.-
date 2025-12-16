import "dotenv/config"; // Load environment variables
import { getDb } from "../server/db";
import { surfSpots } from "../drizzle/schema";

async function checkSpots() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection. Make sure DATABASE_URL is set.");
    process.exit(1);
  }

  try {
    const spots = await db.select().from(surfSpots);
    
    if (spots.length === 0) {
      console.log("✗ No surf spots found in the database.");
      process.exit(1);
    }

    console.log(`✓ Found ${spots.length} surf spot(s):\n`);
    spots.forEach((spot, index) => {
      console.log(`${index + 1}. ${spot.name}`);
      console.log(`   ID: ${spot.id}`);
      console.log(`   Latitude: ${spot.latitude}`);
      console.log(`   Longitude: ${spot.longitude}`);
      console.log(`   Buoy ID: ${spot.buoyId}`);
      console.log(`   Tide Station ID: ${spot.tideStationId}`);
      console.log(`   Created: ${spot.createdAt}`);
      console.log("");
    });
  } catch (error) {
    console.error("✗ Error checking spots:", error);
    process.exit(1);
  }
}

checkSpots().catch((err) => {
  console.error("✗ Script failed:", err);
  process.exit(1);
});



