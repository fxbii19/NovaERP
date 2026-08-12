import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaClient as DemoPrismaClient } from "./generated/prisma-demo/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL für PostgreSQL fehlt.");
}

const istDemoDatenbank = connectionString.startsWith("file:");
const adapter = istDemoDatenbank
  ? new PrismaBetterSqlite3({ url: connectionString })
  : new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  (istDemoDatenbank
    ? (new DemoPrismaClient({ adapter }) as unknown as PrismaClient)
    : new PrismaClient({ adapter }));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
