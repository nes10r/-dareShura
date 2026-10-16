"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  deleteCollabRequest,
  findUserById,
  getCollabRequest,
  insertCollabRequest,
  listCollabRequests,
  markCollabSeen,
  respondCollabRequest,
  updateResearchProfile,
} from "@/lib/db/repo";
import { MAX_BIO, normalizeOrcid, normalizeScholarUrl } from "@/lib/research";
import { syncUserPublications } from "@/lib/research-sync";

export type ResearchState = { ok?: boolean; error?: string; info?: string };

/** Profil səhifəsindən: bio, ORCID, Google Scholar, "Əməkdaşlığa açığam" */
export async function saveResearchProfile(_prev: ResearchState, formData: FormData): Promise<ResearchState> {
  const user = await requireUser();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const orcidRaw = get("orcid");
  const orcid = orcidRaw ? normalizeOrcid(orcidRaw) : null;
  if (orcidRaw && !orcid) return { error: "ORCID yanlışdır. Format: 0000-0000-0000-0000 (orcid.org profilinizdən köçürün)." };

  const scholarRaw = get("scholarUrl");
  const scholarUrl = scholarRaw ? normalizeScholarUrl(scholarRaw) : null;
  if (scholarRaw && !scholarUrl) return { error: "Google Scholar linki yanlışdır. Profil linkini köçürün: scholar.google.com/citations?user=…" };

  await updateResearchProfile(user.id, {
    bio: get("bio").slice(0, MAX_BIO),
    orcid,
    scholarUrl,
    openToCollab: formData.get("openToCollab") === "on",
  });

  let info: string | undefined;
  // ORCID dəyişibsə — nəşrləri dərhal çək
  if (orcid !== (user.orcid ?? null)) {
    const res = await syncUserPublications({ id: user.id, orcid });
    if (!res.ok) info = `Profil saxlanıldı, amma nəşrləri yükləmək alınmadı: ${res.error}`;
    else if (orcid && !res.found) info = "Profil saxlanıldı. ORCID profilinizdə açıq nəşr tapılmadı — orcid.org-da işlərinizin görünürlüyünü «Everyone» edin.";
    else if (orcid) info = `Profil saxlanıldı. ${res.count} nəşr yükləndi.`;
  }
  revalidatePath("/", "layout");
  return { ok: true, info };
}

export async function refreshMyPublications(): Promise<ResearchState> {
  const user = await requireUser();
  if (!user.orcid) return { error: "Əvvəlcə ORCID daxil edin." };
  const res = await syncUserPublications(user);
  revalidatePath("/", "layout");
  if (!res.ok) return { error: res.error };
  return { ok: true, info: res.found ? `${res.count} nəşr yeniləndi.` : "ORCID profilinizdə açıq nəşr tapılmadı." };
}

/** Bir istifadəçinin eyni anda ən çox cavabsız (göndərilmiş) təklifi */
const MAX_PENDING_OUTGOING = 5;

export async function sendCollabRequest(toUserId: string, topic: string, message: string): Promise<ResearchState> {
  const user = await requireUser();
  if (toUserId === user.id) return { error: "Özünüzə təklif göndərə bilməzsiniz." };
  const target = await findUserById(toUserId);
  if (!target) return { error: "Tədqiqatçı tapılmadı." };

  const t = String(topic ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (t.length < 2) return { error: "Mövzunu qeyd edin." };
  const m = String(message ?? "").trim().slice(0, 600);

  const mine = await listCollabRequests(user.id);
  if (mine.some((r) => r.fromUserId === user.id && r.toUserId === toUserId && r.status === "pending")) {
    return { error: "Bu tədqiqatçıya göndərdiyiniz təklif hələ cavab gözləyir." };
  }
  if (mine.filter((r) => r.fromUserId === user.id && r.status === "pending").length >= MAX_PENDING_OUTGOING) {
    return { error: `Eyni anda ən çox ${MAX_PENDING_OUTGOING} cavabsız təklif ola bilər.` };
  }

  await insertCollabRequest({ fromUserId: user.id, toUserId, topic: t, message: m });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Alıcının cavabı (form action) */
export async function respondCollabAction(id: string, accept: boolean) {
  const user = await requireUser();
  await respondCollabRequest(id, user.id, accept ? "accepted" : "declined");
  revalidatePath("/", "layout");
}

/** Göndərən cavabı gördü — dashboard kartı gizlənir */
export async function dismissCollabAction(id: string) {
  const user = await requireUser();
  const r = await getCollabRequest(id);
  if (r?.fromUserId === user.id) await markCollabSeen(id, user.id);
  revalidatePath("/", "layout");
}

export async function cancelCollabAction(id: string) {
  const user = await requireUser();
  await deleteCollabRequest(id, user.id);
  revalidatePath("/", "layout");
}
