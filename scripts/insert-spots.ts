import "dotenv/config";
import { getDb } from "../server/db";
import { surfSpots } from "../drizzle/schema";

async function insertSpots() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection. Make sure DATABASE_URL is set.");
    process.exit(1);
  }

  try {
    await db.insert(surfSpots).values([
      {
        name: "Lido Beach",
        latitude: "40.5892",
        longitude: "-73.6265",
        buoyId: "44065",
        tideStationId: "8518750",
      },
      {
        name: "Rockaway Beach",
        latitude: "40.5830",
        longitude: "-73.8160",
        buoyId: "44065",
        tideStationId: "8518750",
      },
      {
        name: "Long Beach",
        latitude: "40.5880",
        longitude: "-73.6580",
        buoyId: "44065",
        tideStationId: "8518750",
      },
      {
        name: "Montauk",
        latitude: "41.0359",
        longitude: "-71.9545",
        buoyId: "44017",        // Montauk Point buoy (primary); 44097 Block Island is fallback
        tideStationId: "8510560", // Montauk Harbor, NY
      },
    ]);
    console.log("✓ Successfully inserted 4 surf spots:");
    console.log("  - Lido Beach");
    console.log("  - Rockaway Beach");
    console.log("  - Long Beach");
    console.log("  - Montauk");
  } catch (error) {
    console.error("✗ Error inserting spots:", error);
    process.exit(1);
  }
}

insertSpots();

