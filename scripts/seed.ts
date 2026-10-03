import "./env";

/**
 * İlkin məlumatları yükləyir (superadmin, əsas sorğu, şablon, xəbərlər). Baza doludursa heç nə etmir;
 * `--reset` BÜTÜN istifadəçi, sorğu, cavab və xəbərləri silir — real istifadədə işlətməyin.
 */
async function main() {
  const { db, schema } = await import("../src/lib/db/client");
  const { createSeed } = await import("../src/lib/seed");
  const { insertNews, insertSurvey } = await import("../src/lib/db/repo");
  const reset = process.argv.includes("--reset");

  // Superadmin şifrəsi: SUPERADMIN_PASSWORD və ya təsadüfi yaradılır (bir dəfə ekrana çıxarılır)
  const { randomBytes } = await import("node:crypto");
  const password = process.env.SUPERADMIN_PASSWORD || randomBytes(12).toString("base64url");
  const data = createSeed(password);

  // Xəbərlər ayrıca: cədvəl boşdursa başlanğıc xəbərlər əlavə olunur (mövcud məlumatlara toxunmadan)
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
  if (data.responses.length) {
    await db.insert(schema.surveyResponses).values(
      data.responses.map((r) => ({ ...r, submittedAt: new Date(r.submittedAt) })),
    );
  }
  for (const n of data.news) await insertNews(n);
  console.log(`Seed: ${data.news.length} xəbər, ${data.surveys.length} sorğu.`);
  if (!process.env.SUPERADMIN_PASSWORD) console.log(`Superadmin: superadmin@unec.edu.az / ${password}  (daxil olub profildən dəyişin)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
