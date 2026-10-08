import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("----------------------------------------");
  console.log("🔍 Checking Database Connection...");
  console.log("----------------------------------------");

  // Step 1: Raw connection test
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Step 1: Successfully connected to PostgreSQL server!");
  } catch (err: any) {
    console.error("❌ Step 1 FAILED: Cannot connect to PostgreSQL server.");
    console.error("Error details:", err.message || err);
    console.log("\n💡 Common fixes for Step 1:");
    console.log("- Check if password is correct. If your password has special characters like @, #, $, %, URL-encode them.");
    console.log("- Ensure '?sslmode=require' is at the end of your connection string.");
    console.log("- Verify that your Supabase project is active (not paused).");
    process.exit(1);
  }

  // Step 2: Check User table
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Step 2: 'User' table exists! Found ${userCount} users.`);
    if (userCount === 0) {
      console.log("⚠️ Warning: No users found. Run 'npx tsx prisma/seed.ts' to create admin accounts.");
    }
  } catch (err: any) {
    console.error("❌ Step 2 FAILED: 'User' table does NOT exist in database.");
    console.error("Error details:", err.message || err);
    console.log("\n💡 Fix: Run 'npx prisma db push' to create the tables in your database.");
    process.exit(1);
  }

  // Step 3: Check Item table
  try {
    const itemCount = await prisma.item.count();
    console.log(`✅ Step 3: 'Item' table exists! Found ${itemCount} items.`);
  } catch (err: any) {
    console.error("❌ Step 3 FAILED: 'Item' table does not exist.");
    console.log("\n💡 Fix: Run 'npx prisma db push'.");
    process.exit(1);
  }

  // Step 4: Check StockBalance table
  try {
    const balanceCount = await prisma.stockBalance.count();
    console.log(`✅ Step 4: 'StockBalance' table exists! Found ${balanceCount} records.`);
  } catch (err: any) {
    console.error("❌ Step 4 FAILED: 'StockBalance' table does not exist.");
    process.exit(1);
  }

  console.log("----------------------------------------");
  console.log("🎉 ALL DATABASE CHECKS PASSED!");
  console.log("Your database is fully connected, migrated, and ready for Vercel.");
  console.log("----------------------------------------");
}

checkDatabase()
  .catch((e) => {
    console.error("Diagnostic failure:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
