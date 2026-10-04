"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createInvite, extendInvite, getActiveInvite, revokeInvite } from "@/lib/db/repo";

export async function generateInvite() {
  const user = await requirePermission("users.invite");
  await createInvite(user.id);
  revalidatePath("/admin/invite");
}

const DAY = 24 * 60 * 60 * 1000;
/** Linkin açıq qala biləcəyi maksimum müddət (indidən) — uzunmüddətli açıq link kənar müdaxilə riskini artırır */
const MAX_DAYS = 30;

export type ExtendState = { ok?: boolean; error?: string };

/**
 * Aktiv qeydiyyat linkinin müddətini uzadır — yalnız superadmin.
 * `days` verilərsə hazırkı bitmə vaxtına əlavə olunur, `until` verilərsə həmin tarix təyin olunur.
 */
export async function extendActiveInvite(id: string, change: { days?: number; until?: string }): Promise<ExtendState> {
  await requirePermission("users.manage");
  const active = await getActiveInvite();
  if (!active || active.id !== id) return { error: "Aktiv link tapılmadı — müddəti bitib və ya deaktiv edilib." };

  const current = new Date(active.expiresAt).getTime();
  let next: number;
  if (change.days !== undefined) {
    if (![1, 3, 7].includes(change.days)) return { error: "Yanlış müddət." };
    next = current + change.days * DAY;
  } else {
    next = Date.parse(String(change.until ?? ""));
    if (Number.isNaN(next)) return { error: "Tarixi seçin." };
  }

  if (next <= current) return { error: "Yeni bitmə vaxtı hazırkından sonra olmalıdır." };
  if (next > Date.now() + MAX_DAYS * DAY) return { error: `Link ən çox ${MAX_DAYS} gün açıq qala bilər.` };

  if (!(await extendInvite(id, new Date(next)))) return { error: "Linkin müddətini uzatmaq mümkün olmadı." };
  revalidatePath("/admin/invite");
  revalidatePath("/register");
  return { ok: true };
}

export async function deactivateInvite(id: string) {
  await requirePermission("users.invite");
  await revokeInvite(id);
  revalidatePath("/admin/invite");
}
