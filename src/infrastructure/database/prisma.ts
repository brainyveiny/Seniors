import { statSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { buildPgPoolConfig } from "@/infrastructure/database/pg-pool-config";

const PRISMA_CLIENT_EPOCH = "seniors-personal-timetable-any-time-v3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
  prismaClientMtime: number | undefined;
  prismaClientEpoch: string | undefined;
};

function getGeneratedPrismaClientMtime(): number {
  const candidates = [
    join(process.cwd(), "node_modules/.prisma/client/schema.prisma"),
    join(process.cwd(), "node_modules/.prisma/client/index.js"),
    join(process.cwd(), "prisma/schema.prisma"),
  ];
  let latest = 0;
  for (const file of candidates) {
    try {
      latest = Math.max(latest, statSync(file).mtimeMs);
    } catch {
      // ignore missing paths
    }
  }
  return latest;
}

function resetPrismaClient(): void {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }
  if (globalForPrisma.prismaPool) {
    void globalForPrisma.prismaPool.end();
    globalForPrisma.prismaPool = undefined;
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool(buildPgPoolConfig(connectionString));
  globalForPrisma.prismaPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function ensurePrismaClient(): PrismaClient {
  const generatedMtime = getGeneratedPrismaClientMtime();
  const staleInDev =
    process.env.NODE_ENV === "development" &&
    (globalForPrisma.prismaClientMtime !== generatedMtime ||
      globalForPrisma.prismaClientEpoch !== PRISMA_CLIENT_EPOCH);

  if (staleInDev || globalForPrisma.prismaClientEpoch !== PRISMA_CLIENT_EPOCH) {
    resetPrismaClient();
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaClientMtime = generatedMtime;
    globalForPrisma.prismaClientEpoch = PRISMA_CLIENT_EPOCH;
  }

  return globalForPrisma.prisma;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrismaClient(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  return ensurePrismaClient();
}
