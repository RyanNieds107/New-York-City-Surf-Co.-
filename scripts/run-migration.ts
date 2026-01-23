import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load environment variables from .env file if it exists
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  // Prioritize internal Railway URL first for better reliability
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error("❌ DATABASE_URL or MYSQL_URL environment variable not set");
    process.exit(1);
  }

  console.log("📦 Connecting to database...");
  const connection = await mysql.createConnection(dbUrl);

  try {
    // Get migration file from command line argument, or use default
    const migrationFileName = process.argv[2] || "0012_add_real_time_updates.sql";
    const migrationFile = join(__dirname, "..", "drizzle", migrationFileName);
    const sql = readFileSync(migrationFile, "utf-8");

    console.log(`🔄 Running migration: ${migrationFileName}`);
    console.log("SQL:", sql.trim());
    
    // Split by semicolon and execute each statement
    // Filter out Drizzle's statement-breakpoint comments and empty statements
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("-->"));
    
    for (const statement of statements) {
      if (statement) {
        await connection.execute(statement);
        console.log("✓ Executed:", statement.substring(0, 50) + "...");
      }
    }

    console.log("✅ Migration completed successfully!");
  } catch (error: any) {
    // Check if error is because column already exists
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("ℹ️  Column already exists - migration may have already been applied");
      console.log("   Error details:", error.message);
    } else if (error.sqlMessage && error.sqlMessage.includes("Duplicate column name")) {
      console.log("ℹ️  Column already exists - migration already applied");
      console.log("   SQL Message:", error.sqlMessage);
    } else if (error.code === "ER_TABLE_EXISTS_ERROR" || (error.sqlMessage && error.sqlMessage.includes("already exists"))) {
      console.log("ℹ️  Table already exists - migration may have already been applied");
      console.log("   Error details:", error.message);
    } else {
      console.error("❌ Migration failed:", error.message);
      if (error.sqlMessage) {
        console.error("   SQL Message:", error.sqlMessage);
      }
      throw error;
    }
  } finally {
    await connection.end();
  }
}

runMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

