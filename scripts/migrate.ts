import "./env";

async function main() {
  const { db } = await import("../src/lib/db/client");
  const folder = { migrationsFolder: "./drizzle" };
  if (process.env.DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    await migrate(db as never, folder);
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, folder);
  }
  console.log(`Migrasiyalar tətbiq olundu (${process.env.DATABASE_URL ? "Neon" : "PGlite"}).`);
}

main()
  // PGlite açıq bağlantı saxlayır — iş bitəndə prosesi açıq-aydın bitir
  .then(() => process.exit(0))
  .catch((e) => {
  console.error(e);
  process.exit(1);
});
