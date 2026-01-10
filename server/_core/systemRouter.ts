import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { getDb } from "../db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrationsManually() {
  // Prioritize internal Railway URL first for better reliability
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error("DATABASE_URL not configured");
  }

  const connection = await mysql.createConnection(dbUrl);
  const results = { executed: 0, skipped: 0, errors: [] as string[] };

  try {
    const migrationsDir = join(__dirname, "..", "..", "drizzle");
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, "utf-8");
      
      const statements = sql.split("--> statement-breakpoint").filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed && !trimmed.startsWith("--")) {
          try {
            await connection.execute(trimmed);
            results.executed++;
          } catch (error: any) {
            if (error.code === "ER_TABLE_EXISTS_ERROR" || error.message?.includes("already exists")) {
              results.skipped++;
            } else {
              results.errors.push(`${file}: ${error.message}`);
            }
          }
        }
      }
    }
  } finally {
    await connection.end();
  }

  return results;
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  runMigrations: adminProcedure
    .mutation(async () => {
      try {
        const results = await runMigrationsManually();
        return {
          success: true,
          executed: results.executed,
          skipped: results.skipped,
          errors: results.errors,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),
});
