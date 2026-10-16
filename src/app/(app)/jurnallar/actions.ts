"use server";

import { revalidatePath } from "next/cache";
import { hasPermission, requireUser } from "@/lib/auth";
import { deleteCall, getCall, insertCall, listActiveCalls } from "@/lib/db/repo";
import { normalizeSkills } from "@/lib/skills";

export interface CallInput {
  journalTitle: string;
  journalId?: string | null;
  title: string;
  url: string;
  /** YYYY-MM-DD */
  deadline: string;
  note: string;
  topics: string[];
}

const MAX_ACTIVE_PER_USER = 20;
const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Üzv xüsusi buraxılış çağırışı paylaşır; son tarix keçəndə lentdən avtomatik gizlənir */
export async function shareCallAction(input: CallInput): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();
  const journalTitle = clean(input.journalTitle, 200);
  const title = clean(input.title, 300);
  if (journalTitle.length < 2) return { error: "Jurnalın adını yazın." };
  if (title.length < 5) return { error: "Xüsusi buraxılışın mövzusunu yazın." };

  let url: string;
  try {
    const u = new URL(String(input.url ?? "").trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    url = u.toString();
  } catch {
    return { error: "Çağırışın linkini düzgün yazın (https://…)." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline ?? "")) return { error: "Məqalə təqdimatının son tarixini seçin." };
  const deadline = new Date(`${input.deadline}T23:59:00+04:00`);
  if (deadline.getTime() < Date.now()) return { error: "Son tarix artıq keçib." };

  const mine = (await listActiveCalls()).filter((c) => c.createdBy === user.id);
  if (mine.length >= MAX_ACTIVE_PER_USER) return { error: `Eyni anda ən çox ${MAX_ACTIVE_PER_USER} aktiv paylaşımınız ola bilər.` };
  if ((await listActiveCalls()).some((c) => c.url === url)) return { error: "Bu çağırış artıq paylaşılıb." };

  await insertCall({
    journalId: input.journalId ?? null,
    journalTitle,
    title,
    url,
    note: String(input.note ?? "").trim().slice(0, 400),
    opensAt: null,
    deadline: deadline.toISOString(),
    topics: normalizeSkills(Array.isArray(input.topics) ? input.topics.map(String) : []).slice(0, 6),
    createdBy: user.id,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Paylaşan və ya moderator (admin) silə bilər */
export async function deleteCallAction(id: string) {
  const user = await requireUser();
  const call = await getCall(id);
  if (!call || (call.createdBy !== user.id && !hasPermission(user, "news.manage"))) return;
  await deleteCall(id);
  revalidatePath("/", "layout");
}
