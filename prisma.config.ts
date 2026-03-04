import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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

const databaseUrlRaw =
  process.env.STORAGE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  env("STORAGE_DATABASE_URL");
const databaseUrl = normalizePostgresUrl(databaseUrlRaw);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
