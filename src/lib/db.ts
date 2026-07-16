import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function bustPrismaClientModuleCache() {
  if (process.env.NODE_ENV === "production") return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cache = require.cache as Record<string, unknown>;
  for (const key of Object.keys(cache)) {
    if (key.includes(`${path.sep}.prisma${path.sep}`) || key.includes("@prisma/client")) {
      delete cache[key];
    }
  }
}

function createPrismaClient(): PrismaClient {
  bustPrismaClientModuleCache();
  // Pas bust, përdor klasën e freskët nga @prisma/client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: FreshClient } = require("@prisma/client") as { PrismaClient: typeof PrismaClient };
  return new FreshClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function hasFieldInspectionDelegate(client: PrismaClient): boolean {
  return typeof (client as PrismaClient & { fieldInspectionAssignment?: { findMany?: unknown } }).fieldInspectionAssignment?.findMany === "function";
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && hasFieldInspectionDelegate(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const fresh = createPrismaClient();
  globalForPrisma.prisma = fresh;
  return fresh;
}

/** Lazy proxy - çdo akses merr klientin aktual (shmang cache të vjetër në dev). */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
