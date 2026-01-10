import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
    const statements = sql.split(";").filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        await connection.execute(trimmed);
        console.log("✓ Executed:", trimmed.substring(0, 50) + "...");
      }
    }

    console.log("✅ Migration completed successfully!");
  } catch (error: any) {
    // Check if error is because column already exists
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("ℹ️  Column 'phone' already exists - migration already applied");
    } else {
      console.error("❌ Migration failed:", error.message);
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

