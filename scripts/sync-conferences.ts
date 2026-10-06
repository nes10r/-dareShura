import "./env";

/**
 * Konfrans elanlarını news.unec.edu.az-dan çəkib Neon bazasına yazır.
 *
 * Mənbə sayt Cloudflare ilə xaricdəki serverlərdən (Vercel) gələn sorğuları bloklayır,
 * Azərbaycandakı kompüterdən isə işləyir. Bu skript belə kompüterdə əl ilə və ya
 * Windows "Task Scheduler" ilə müntəzəm işlədilə bilər:
 *
 *   npm run konfrans:sync            — yeni elanlar
 *   npm run konfrans:sync -- --force — mövcud elanları da yenidən oxu
 */
async function main() {
  const { syncConferences } = await import("../src/lib/conferences/source");
  const force = process.argv.includes("--force");
  const res = await syncConferences({ force, limit: 100 });
  console.log(
    `Konfranslar: ${res.added} yeni, ${res.updated} yeniləndi, ${res.pruned ?? 0} köhnə silindi` +
      (res.errors.length ? `\nXəta: ${res.errors.join("; ")}` : ""),
  );
  // Qrantlar (UNEC hissəsi də eyni Cloudflare məhdudiyyətinə düşür)
  const { syncGrants } = await import("../src/lib/grants/source");
  const g = await syncGrants({ force });
  console.log(`Qrantlar: ${g.added} yeni, ${g.updated} yeniləndi, ${g.pruned} köhnə silindi` + (g.errors.length ? `
Xəta: ${g.errors.join("; ")}` : ""));
  if (res.errors.length || g.errors.length) process.exit(1);
}

main()
  // PGlite açıq bağlantı saxlayır — iş bitəndə prosesi açıq-aydın bitir
  .then(() => process.exit(0))
  .catch((e) => {
  console.error(e);
  process.exit(1);
});
