import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("----------------------------------------");
  console.log("🔍 Checking Database Connection...");
  console.log("----------------------------------------");

  // Step 1: Connection test
  try {
    await prisma.$connect();
    console.log("✅ Step 1: Successfully connected to database server!");
  } catch (err: any) {
    console.error("❌ Step 1 FAILED: Cannot connect to database server.");
    console.error("Error details:", err.message || err);
    console.log("\n💡 Common fixes for Step 1:");
    console.log("- Check if DATABASE_URL is correct in .env or environment variables.");
    console.log("- For MongoDB Atlas: verify your IP access list allows 0.0.0.0/0 (all IPs) or Vercel.");
    console.log("- Check if username & password are correct. Special characters like @, #, $ must be URL-encoded.");
    process.exit(1);
  }

  // Step 2: Check User collection/table
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Step 2: 'User' collection exists! Found ${userCount} users.`);
    if (userCount === 0) {
      console.log("⚠️ Warning: No users found. Run 'npx tsx prisma/seed.ts' to create admin accounts.");
    }
  } catch (err: any) {
    console.error("❌ Step 2 FAILED: 'User' collection does not exist or cannot be queried.");
    console.error("Error details:", err.message || err);
    console.log("\n💡 Fix: Run 'npx prisma db push' to initialize database collections.");
    process.exit(1);
  }

  // Step 3: Check Item collection/table
  try {
    const itemCount = await prisma.item.count();
    console.log(`✅ Step 3: 'Item' collection exists! Found ${itemCount} items.`);
  } catch (err: any) {
    console.error("❌ Step 3 FAILED: 'Item' collection error:", err.message || err);
    process.exit(1);
  }

  // Step 4: Check StockBalance collection/table
  try {
    const balanceCount = await prisma.stockBalance.count();
    console.log(`✅ Step 4: 'StockBalance' collection exists! Found ${balanceCount} records.`);
  } catch (err: any) {
    console.error("❌ Step 4 FAILED: 'StockBalance' collection error:", err.message || err);
    process.exit(1);
  }

  console.log("----------------------------------------");
  console.log("🎉 ALL DATABASE CHECKS PASSED!");
  console.log("Your database is fully connected, initialized, and ready for Vercel.");
  console.log("----------------------------------------");
}

checkDatabase()
  .catch((e) => {
    console.error("Diagnostic failure:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
