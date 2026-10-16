import { clearResearchSync, findUserById, saveResearchSync } from "./db/repo";
import { fetchByOrcid, PUBS_REFRESH_MS } from "./research";
import type { User } from "./types";

export type SyncOutcome = { ok: true; found: boolean; count: number } | { ok: false; error: string };

/** İstifadəçinin ORCID-i ilə ORCID və OpenAlex-dən nəşrləri və göstəriciləri yeniləyir */
export async function syncUserPublications(user: Pick<User, "id" | "orcid">): Promise<SyncOutcome> {
  if (!user.orcid) {
    await clearResearchSync(user.id);
    return { ok: true, found: false, count: 0 };
  }
  try {
    const r = await fetchByOrcid(user.orcid);
    await saveResearchSync(user.id, r.openalexId, r.stats, r.publications);
    return { ok: true, found: !!r.openalexId || r.publications.length > 0, count: r.publications.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nəşrləri yükləmək mümkün olmadı." };
  }
}

/** Profilə baxılanda: nəşrlər bir həftədən köhnədirsə fonda yenilə */
export async function refreshPublicationsIfStale(userId: string) {
  const u = await findUserById(userId);
  if (!u?.orcid) return;
  if (u.pubsSyncedAt && Date.now() - Date.parse(u.pubsSyncedAt) < PUBS_REFRESH_MS) return;
  await syncUserPublications(u);
}
