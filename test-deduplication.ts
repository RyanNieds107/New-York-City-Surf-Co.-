import { getPendingReportPrompts } from "./server/db";

/**
 * Test script to verify email deduplication logic works correctly.
 * This simulates what would happen 24 hours after viewing spots multiple times.
 */
async function testDeduplication() {
  console.log("Testing email deduplication logic...\n");

  const pendingPrompts = await getPendingReportPrompts();

  console.log(`Total pending prompts: ${pendingPrompts.length}`);

  // Group by user/spot/day to verify deduplication
  const grouped = new Map<string, number>();

  for (const view of pendingPrompts) {
    const date = new Date(view.viewedAt).toISOString().split('T')[0];
    const key = `User ${view.userId} - Spot ${view.spotId} - ${date}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }

  console.log("\nUnique user/spot/day combinations:");
  for (const [key, count] of grouped.entries()) {
    console.log(`  ${key}: ${count} email(s) will be sent`);
    if (count > 1) {
      console.log(`    ⚠️  WARNING: Multiple emails would be sent for same user/spot/day!`);
    }
  }

  // Check if deduplication worked
  const hasDuplicates = Array.from(grouped.values()).some(count => count > 1);

  if (hasDuplicates) {
    console.log("\n❌ FAILED: Deduplication is NOT working correctly");
    process.exit(1);
  } else {
    console.log("\n✅ SUCCESS: Each user will receive only ONE email per spot per day");
    process.exit(0);
  }
}

testDeduplication().catch(error => {
  console.error("Error running test:", error);
  process.exit(1);
});
