import { PrismaClient } from "@prisma/client";

// Incremented to force evicting stale in-memory PrismaClient instances across schema updates
const PRISMA_SCHEMA_VERSION = "2026-10-10-v3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: string | undefined;
};

if (globalForPrisma.prisma && globalForPrisma.prismaVersion !== PRISMA_SCHEMA_VERSION) {
  try {
    globalForPrisma.prisma.$disconnect().catch(() => {});
  } catch (_) {}
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaVersion = PRISMA_SCHEMA_VERSION;
}
