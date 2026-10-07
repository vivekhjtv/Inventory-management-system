import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATALOG_ITEMS: Array<{ name: string; category: string; unit: string; minThreshold: number }> = [
  // PANELS (Unit: NOS)
  { name: "545 ADANI", category: "PANELS", unit: "NOS", minThreshold: 20 },
  { name: "550 ADANI", category: "PANELS", unit: "NOS", minThreshold: 25 },
  { name: "555 ADANI", category: "PANELS", unit: "NOS", minThreshold: 20 },
  { name: "610 ADANI", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "615 ADANI", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "620 ADANI", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "625 ADANI", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "630 ADANI", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "580 WAAREE", category: "PANELS", unit: "NOS", minThreshold: 20 },
  { name: "585 WAAREE", category: "PANELS", unit: "NOS", minThreshold: 20 },
  { name: "610 WAAREE DCR", category: "PANELS", unit: "NOS", minThreshold: 20 },
  { name: "615 WAAREE DCR", category: "PANELS", unit: "NOS", minThreshold: 20 },
  { name: "620 WAAREE DCR", category: "PANELS", unit: "NOS", minThreshold: 20 },
  { name: "WAAREE 590 N", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "WAAREE 615 N", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "WAAREE 620 N", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "ADANI 620 NDCR", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "ADANI 625 NDCR", category: "PANELS", unit: "NOS", minThreshold: 15 },
  { name: "OTHER PANELS", category: "PANELS", unit: "NOS", minThreshold: 10 },

  // INVERTER (Unit: NOS)
  { name: "3.6 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 5 },
  { name: "3.6 POLYCAB", category: "INVERTER", unit: "NOS", minThreshold: 5 },
  { name: "4.2 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 5 },
  { name: "5.2 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 8 },
  { name: "6 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 5 },
  { name: "2.2 MICRO DEYE", category: "INVERTER", unit: "NOS", minThreshold: 4 },
  { name: "8 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 4 },
  { name: "10 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 4 },
  { name: "12 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 3 },
  { name: "15 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 2 },
  { name: "18 DEYE", category: "INVERTER", unit: "NOS", minThreshold: 2 },
  { name: "OTHER SIZE", category: "INVERTER", unit: "NOS", minThreshold: 2 },

  // CABLES (Unit: METERS)
  { name: "DC 4", category: "CABLES", unit: "METERS", minThreshold: 500 },
  { name: "AC 2.5 RED", category: "CABLES", unit: "METERS", minThreshold: 300 },
  { name: "AC 2.5 BLACK", category: "CABLES", unit: "METERS", minThreshold: 300 },
  { name: "AC 4 RED", category: "CABLES", unit: "METERS", minThreshold: 300 },
  { name: "AC 4 BLACK", category: "CABLES", unit: "METERS", minThreshold: 300 },
  { name: "AC 4 YELLOW", category: "CABLES", unit: "METERS", minThreshold: 200 },
  { name: "AC 4 BLUE", category: "CABLES", unit: "METERS", minThreshold: 200 },
  { name: "EA 4", category: "CABLES", unit: "METERS", minThreshold: 200 },
  { name: "LA 25 AL", category: "CABLES", unit: "METERS", minThreshold: 100 },
  { name: "25 CU EA", category: "CABLES", unit: "METERS", minThreshold: 100 },
  { name: "CU 6 GREEN", category: "CABLES", unit: "METERS", minThreshold: 200 },
  { name: "CU 10", category: "CABLES", unit: "METERS", minThreshold: 100 },
  { name: "CU 16", category: "CABLES", unit: "METERS", minThreshold: 100 },
  { name: "AL 3.5 X 35", category: "CABLES", unit: "METERS", minThreshold: 100 },
  { name: "AL 3.5 X 70", category: "CABLES", unit: "METERS", minThreshold: 100 },
  { name: "AL 3.5 X 95", category: "CABLES", unit: "METERS", minThreshold: 100 },
  { name: "AL 3.5 X 120", category: "CABLES", unit: "METERS", minThreshold: 50 },
  { name: "AL 3.5 X 185", category: "CABLES", unit: "METERS", minThreshold: 50 },
  { name: "OTHER CABLES", category: "CABLES", unit: "METERS", minThreshold: 100 },

  // PVC & BOS ITEMS (Unit: NOS / SETS)
  { name: "PVC", category: "PVC_ITEMS", unit: "NOS", minThreshold: 100 },
  { name: "SADDLE", category: "PVC_ITEMS", unit: "NOS", minThreshold: 200 },
  { name: "BEND", category: "PVC_ITEMS", unit: "NOS", minThreshold: 100 },
  { name: "ELBOW", category: "PVC_ITEMS", unit: "NOS", minThreshold: 100 },
  { name: "T", category: "PVC_ITEMS", unit: "NOS", minThreshold: 100 },
  { name: "BOS", category: "PVC_ITEMS", unit: "SETS", minThreshold: 20 },
  { name: "ACDB 1-6", category: "PVC_ITEMS", unit: "NOS", minThreshold: 10 },
  { name: "DCDB 1-6", category: "PVC_ITEMS", unit: "NOS", minThreshold: 10 },
  { name: "COMBO 6-10", category: "PVC_ITEMS", unit: "NOS", minThreshold: 8 },
  { name: "EA KIT", category: "PVC_ITEMS", unit: "SETS", minThreshold: 15 },
  { name: "foundation KIT", category: "PVC_ITEMS", unit: "SETS", minThreshold: 15 },
  { name: "foundation FARMA", category: "PVC_ITEMS", unit: "SETS", minThreshold: 15 },
  { name: "EA SING ROD", category: "PVC_ITEMS", unit: "NOS", minThreshold: 20 },
  { name: "J HOOK", category: "PVC_ITEMS", unit: "NOS", minThreshold: 50 },
  { name: "CU. 1M LA", category: "PVC_ITEMS", unit: "NOS", minThreshold: 10 },
  { name: "OTHER ITEMS", category: "PVC_ITEMS", unit: "NOS", minThreshold: 20 },

  // STRUCTURE (Unit: NOS / FT)
  { name: "60X40 (FT)", category: "STRUCTURE", unit: "FT", minThreshold: 500 },
  { name: "32X32 (FT)", category: "STRUCTURE", unit: "FT", minThreshold: 400 },
  { name: "40X40 (FT)", category: "STRUCTURE", unit: "FT", minThreshold: 400 },
  { name: "75X25(ft)", category: "STRUCTURE", unit: "FT", minThreshold: 300 },
  { name: "FRP YELLOW", category: "STRUCTURE", unit: "NOS", minThreshold: 50 },
  { name: "C RAIL (300x100)", category: "STRUCTURE", unit: "NOS", minThreshold: 40 },
  { name: "MID MOTA", category: "STRUCTURE", unit: "NOS", minThreshold: 100 },
  { name: "END CLAMP", category: "STRUCTURE", unit: "NOS", minThreshold: 100 },
  { name: "Adi panel C rail", category: "STRUCTURE", unit: "NOS", minThreshold: 50 },
  { name: "OTHER STRU ITEMS", category: "STRUCTURE", unit: "NOS", minThreshold: 50 },
];

async function main() {
  console.log("Seeding database...");

  // 1. Seed Demo Users
  const passwordHash = await bcrypt.hash("zaffine123", 10);
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  const users = [
    {
      fullName: "Super Admin",
      email: "admin@zaffine.com",
      phoneNumber: "9876543210",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    {
      fullName: "Operations Manager",
      email: "ops@zaffine.com",
      phoneNumber: "9876543211",
      passwordHash,
      role: "OPERATIONS_MANAGER",
      status: "ACTIVE",
    },
    {
      fullName: "Godown Manager",
      email: "godown@zaffine.com",
      phoneNumber: "9876543212",
      passwordHash,
      role: "GODOWN_MANAGER",
      status: "ACTIVE",
    },
    {
      fullName: "Office Manager",
      email: "office@zaffine.com",
      phoneNumber: "9876543213",
      passwordHash,
      role: "OFFICE_MANAGER",
      status: "ACTIVE",
    },
    {
      fullName: "Raju Solar Technician",
      email: "worker@zaffine.com",
      phoneNumber: "9876543214",
      passwordHash,
      role: "WORKER",
      status: "ACTIVE",
    },
    {
      fullName: "Suresh New Joinee",
      email: "pending@zaffine.com",
      phoneNumber: "9876543215",
      passwordHash,
      role: "WORKER",
      status: "PENDING",
    },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        status: u.status,
      },
      create: u,
    });
    createdUsers[u.email] = user.id;
  }
  console.log(`✓ Seeded ${users.length} users with roles.`);

  // 2. Seed Items and Stock Balances
  let seededItemsCount = 0;
  for (const itemData of CATALOG_ITEMS) {
    const item = await prisma.item.upsert({
      where: { name: itemData.name },
      update: {
        category: itemData.category,
        unit: itemData.unit,
        minThreshold: itemData.minThreshold,
      },
      create: {
        name: itemData.name,
        category: itemData.category,
        unit: itemData.unit,
        minThreshold: itemData.minThreshold,
      },
    });

    // Ensure StockBalance records exist for both GODOWN and OFFICE
    await prisma.stockBalance.upsert({
      where: {
        itemId_location: {
          itemId: item.id,
          location: "GODOWN",
        },
      },
      update: {},
      create: {
        itemId: item.id,
        location: "GODOWN",
        quantity: 0,
      },
    });

    await prisma.stockBalance.upsert({
      where: {
        itemId_location: {
          itemId: item.id,
          location: "OFFICE",
        },
      },
      update: {},
      create: {
        itemId: item.id,
        location: "OFFICE",
        quantity: 0,
      },
    });

    seededItemsCount++;
  }
  console.log(`✓ Seeded ${seededItemsCount} catalog items with 0 balances for Godown & Office.`);

  // 3. Seed Realistic Initial Stock for demo vibrancy
  const sampleStock = [
    { name: "550 ADANI", godown: 180, office: 45 },
    { name: "545 ADANI", godown: 90, office: 20 },
    { name: "580 WAAREE", godown: 120, office: 30 },
    { name: "615 WAAREE DCR", godown: 60, office: 15 },
    { name: "5.2 DEYE", godown: 14, office: 6 },
    { name: "3.6 DEYE", godown: 10, office: 4 },
    { name: "8 DEYE", godown: 8, office: 2 },
    { name: "DC 4", godown: 2400, office: 600 },
    { name: "AC 4 RED", godown: 1500, office: 350 },
    { name: "AC 4 BLACK", godown: 1500, office: 350 },
    { name: "ACDB 1-6", godown: 35, office: 12 },
    { name: "DCDB 1-6", godown: 35, office: 12 },
    { name: "EA KIT", godown: 40, office: 18 },
    { name: "60X40 (FT)", godown: 850, office: 220 },
    { name: "MID MOTA", godown: 450, office: 120 },
    { name: "END CLAMP", godown: 450, office: 120 },
  ];

  const adminUserId = createdUsers["admin@zaffine.com"];
  const workerUserId = createdUsers["worker@zaffine.com"];

  for (const s of sampleStock) {
    const item = await prisma.item.findUnique({ where: { name: s.name } });
    if (item) {
      // Set godown balance
      await prisma.stockBalance.update({
        where: { itemId_location: { itemId: item.id, location: "GODOWN" } },
        data: { quantity: s.godown },
      });
      // Set office balance
      await prisma.stockBalance.update({
        where: { itemId_location: { itemId: item.id, location: "OFFICE" } },
        data: { quantity: s.office },
      });

      // Log initial inward transaction
      await prisma.inventoryTransaction.create({
        data: {
          transactionType: "INWARD_TO_GODOWN",
          itemId: item.id,
          quantity: s.godown + s.office,
          fromLocation: "VENDOR",
          toLocation: "GODOWN",
          createdByUserId: adminUserId,
          referenceDocNo: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          remarks: "Initial verified shipment from authorized distributor",
        },
      });

      // Log transfer to office
      if (s.office > 0) {
        await prisma.inventoryTransaction.create({
          data: {
            transactionType: "TRANSFER_TO_OFFICE",
            itemId: item.id,
            quantity: s.office,
            fromLocation: "GODOWN",
            toLocation: "OFFICE",
            createdByUserId: adminUserId,
            referenceDocNo: `TRF-${Math.floor(100 + Math.random() * 900)}`,
            remarks: "Standard weekly staging to office floor",
          },
        });
      }
    }
  }

  // Create a sample dispatch transaction to site
  const adani550 = await prisma.item.findUnique({ where: { name: "550 ADANI" } });
  if (adani550 && workerUserId) {
    await prisma.inventoryTransaction.create({
      data: {
        transactionType: "DISPATCH_TO_SITE",
        itemId: adani550.id,
        quantity: 10,
        fromLocation: "OFFICE",
        toLocation: "SITE",
        createdByUserId: adminUserId,
        workerId: workerUserId,
        siteOrCustomer: "Ramesh Patel - 5kW Kalvibid, Bhavnagar",
        referenceDocNo: "JOB-7821",
        remarks: "Dispatched with technician Raju for roof mounting",
      },
    });
  }

  console.log("✓ Added sample verified inventory transactions.");
  console.log("Seeding completed successfully! 🌟");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
