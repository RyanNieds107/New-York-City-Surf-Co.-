/**
 * Show the actual database schema for swell_alerts table
 * Run with: node scripts/show-swell-alerts-schema.mjs
 * Or: pnpm exec node scripts/show-swell-alerts-schema.mjs
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.MYSQL_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL or MYSQL_URL is not set");
  process.exit(1);
}

async function showSchema() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log("\n=== DESCRIBE swell_alerts ===");
    const [describeRows] = await connection.execute("DESCRIBE swell_alerts");
    console.table(describeRows);
    
    console.log("\n=== SHOW CREATE TABLE swell_alerts ===");
    const [createRows] = await connection.execute("SHOW CREATE TABLE swell_alerts");
    console.log("\n" + createRows[0]['Create Table']);
    
  } catch (error) {
    console.error("Error querying database:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

showSchema().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
