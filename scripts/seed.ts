import "./env";

/**
 * Demo məlumatları yükləyir. Baza artıq doludursa heç nə etmir;
 * `npm run db:seed -- --reset` bütün sorğu/istifadəçi məlumatlarını silib yenidən yükləyir.
 */
async function main() {
  const { db, schema } = await import("../src/lib/db/client");
  const { createSeed } = await import("../src/lib/seed");
  const { insertNews, insertSurvey } = await import("../src/lib/db/repo");
  const reset = process.argv.includes("--reset");

  const data = createSeed();

  // Xəbərlər ayrıca: cədvəl boşdursa demo xəbərlər əlavə olunur (mövcud məlumatlara toxunmadan)
  const hasNews = (await db.select({ id: schema.news.id }).from(schema.news).limit(1)).length > 0;
  const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (existing.length && !reset) {
    if (!hasNews) {
      for (const n of data.news) await insertNews(n);
      console.log(`Seed: ${data.news.length} xəbər əlavə olundu.`);
    } else console.log("Baza artıq doludur — seed ötürüldü (yenidən yükləmək üçün --reset).");
    return;
  }
  if (reset) {
    await db.delete(schema.news);
    await db.delete(schema.surveyResponses);
    await db.delete(schema.surveys);
    await db.delete(schema.users);
  }

  await db.insert(schema.users).values(data.users.map((u) => ({ ...u, createdAt: new Date(u.createdAt) })));
  for (const s of data.surveys) await insertSurvey(s);
  await db.insert(schema.surveyResponses).values(
    data.responses.map((r) => ({ ...r, submittedAt: new Date(r.submittedAt) })),
  );
  for (const n of data.news) await insertNews(n);
  console.log(`Seed: ${data.news.length} xəbər, ${data.users.length} istifadəçi, ${data.surveys.length} sorğu, ${data.responses.length} cavab.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
