"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { syncConferences, type SyncResult } from "@/lib/conferences/source";
import { getConference, setConferenceOverrides } from "@/lib/db/repo";
import type { ConferenceFee, ConferenceFormat, ConferenceOverrides } from "@/lib/types";

export async function runConferenceSync(force: boolean): Promise<SyncResult | { error: string }> {
  await requirePermission("news.manage");
  try {
    const res = await syncConferences({ force });
    revalidatePath("/konfranslar");
    revalidatePath("/admin/conferences");
    revalidatePath("/", "layout");
    return res;
  } catch (e) {
    return { error: `Mənbəyə qoşulmaq mümkün olmadı: ${String(e)}` };
  }
}

const FORMATS: ConferenceFormat[] = ["Əyani", "Onlayn", "Hibrid"];
const FEES: ConferenceFee[] = ["free", "paid"];
const isoOrNull = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/**
 * Adminin düzəlişləri. Yalnız göndərilən açarlar saxlanılır — göndərilməyən sahə
 * avtomatik (mənbədən çıxarılan) dəyərə qayıdır.
 */
export async function saveConferenceOverrides(
  id: string,
  raw: Partial<Record<keyof ConferenceOverrides, string | null>>,
  hidden: boolean,
): Promise<{ ok: true } | { error: string }> {
  await requirePermission("news.manage");
  if (!(await getConference(id))) return { error: "Konfrans tapılmadı." };

  const o: ConferenceOverrides = {};
  if ("startsAt" in raw) o.startsAt = isoOrNull(raw.startsAt);
  if ("endsAt" in raw) o.endsAt = isoOrNull(raw.endsAt);
  if ("deadline" in raw) o.deadline = isoOrNull(raw.deadline);
  if ("format" in raw) o.format = FORMATS.find((f) => f === raw.format) ?? null;
  if ("fee" in raw) o.fee = FEES.find((f) => f === raw.fee) ?? null;
  if ("feeNote" in raw) o.feeNote = raw.feeNote?.trim().slice(0, 60) || null;
  if ("location" in raw) o.location = raw.location?.trim().slice(0, 200) || null;

  if (o.startsAt && o.endsAt && o.endsAt < o.startsAt) return { error: "Bitmə tarixi başlama tarixindən əvvəl ola bilməz." };

  await setConferenceOverrides(id, o, !!hidden);
  revalidatePath("/konfranslar");
  revalidatePath(`/konfranslar/${id}`);
  revalidatePath("/admin/conferences");
  revalidatePath("/", "layout");
  return { ok: true };
}
