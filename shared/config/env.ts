export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
  JWT_EXPIRES_IN_SECONDS: Number(
    process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 14,
  ),
};
