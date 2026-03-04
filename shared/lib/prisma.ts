import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function normalizePostgresUrl(connectionString: string) {
  if (
    !connectionString.startsWith("postgres://") &&
    !connectionString.startsWith("postgresql://")
  ) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    const hasLibpqCompat = url.searchParams.has("uselibpqcompat");

    if (
      !hasLibpqCompat &&
      (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca")
    ) {
      url.searchParams.set("uselibpqcompat", "true");
      return url.toString();
    }
  } catch {
    return connectionString;
  }

  return connectionString;
}

function resolveDatabaseUrl() {
  const raw =
    process.env.STORAGE_DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    "";

  const value = raw.trim();
  if (!value) {
    throw new Error(
      "Missing database URL. Set STORAGE_DATABASE_URL, POSTGRES_PRISMA_URL, DATABASE_URL, or POSTGRES_URL.",
    );
  }

  return normalizePostgresUrl(value);
}

const DATABASE_URL = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
