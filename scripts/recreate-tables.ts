import mysql from "mysql2/promise";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function recreateTables() {
  // Prioritize internal Railway URL first for better reliability
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error("❌ DATABASE_URL or MYSQL_URL environment variable not set");
    process.exit(1);
  }

  console.log("📦 Connecting to database...");
  const connection = await mysql.createConnection(dbUrl);

  try {
    const migrationsDir = join(__dirname, "..", "drizzle");
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort(); // Sort to run in order

    console.log(`🔄 Found ${files.length} migration files`);

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, "utf-8");
      
      console.log(`\n📄 Running migration: ${file}`);
      
      // Split by statement breakpoint and execute each statement
      const statements = sql.split("--> statement-breakpoint").filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed && !trimmed.startsWith("--")) {
          try {
            await connection.execute(trimmed);
            console.log(`  ✓ Executed statement`);
          } catch (error: any) {
            // Ignore "table already exists" errors
            if (error.code === "ER_TABLE_EXISTS_ERROR" || error.message?.includes("already exists")) {
              console.log(`  ℹ️  Table already exists, skipping`);
            } else {
              console.error(`  ✗ Error: ${error.message}`);
              throw error;
            }
          }
        }
      }
    }

    console.log("\n✅ All migrations completed successfully!");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

recreateTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});





