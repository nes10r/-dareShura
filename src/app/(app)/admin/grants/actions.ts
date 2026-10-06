"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { getGrant, listAllSkills, newId, setGrantGroupStatus, setGrantOverrides, upsertGrant } from "@/lib/db/repo";
import { createGrantGroup, offerGroupToEveryone } from "@/lib/grants/groups";
import { syncGrants, type GrantSyncResult } from "@/lib/grants/source";
import { normalizeSkills } from "@/lib/skills";
import type { GrantOverrides } from "@/lib/types";

const isoOrNull = (v: unknown) => (typeof v === "string" && v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

function refresh(grantId?: string) {
  revalidatePath("/", "layout");
  if (grantId) revalidatePath(`/qrantlar/${grantId}`);
}

export async function runGrantSync(force: boolean): Promise<GrantSyncResult | { error: string }> {
  await requirePermission("news.manage");
  try {
    const res = await syncGrants({ force });
    refresh();
    return res;
  } catch (e) {
    return { error: String(e) };
  }
}

/** Avtomatik sahələrin düzəldilməsi: son tarix, məbləğ, mövzu sahələri, gizlətmə */
export async function saveGrantOverrides(
  id: string,
  raw: { deadline?: string | null; amount?: string | null; fields?: string[] },
  hidden: boolean,
): Promise<{ ok: true } | { error: string }> {
  await requirePermission("news.manage");
  if (!(await getGrant(id))) return { error: "Qrant tapılmadı." };
  const o: GrantOverrides = {};
  if ("deadline" in raw) o.deadline = isoOrNull(raw.deadline);
  if ("amount" in raw) o.amount = raw.amount?.trim().slice(0, 80) || null;
  if ("fields" in raw) o.fields = normalizeSkills(raw.fields ?? [], await listAllSkills());
  await setGrantOverrides(id, o, hidden);
  refresh(id);
  return { ok: true };
}

/** Mənbədə olmayan qrantı əl ilə əlavə etmək (məs. beynəlxalq fondlar) */
export async function createManualGrant(raw: {
  title: string;
  url: string;
  summary: string;
  deadline: string | null;
  amount: string;
  fields: string[];
}): Promise<{ ok: true; id: string } | { error: string }> {
  await requirePermission("news.manage");
  const title = raw.title?.trim().slice(0, 300);
  if (!title) return { error: "Qrantın adını daxil edin." };
  const url = raw.url?.trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) return { error: "Link http(s):// ilə başlamalıdır." };
  const id = newId("grant");
  await upsertGrant({
    id,
    source: "manual",
    sourceUrl: url || null,
    title,
    summary: raw.summary?.trim().slice(0, 1000) ?? "",
    bodyHtml: "",
    image: null,
    documents: url ? [{ title: "Rəsmi səhifə", url }] : [],
    publishedAt: new Date(),
    deadline: isoOrNull(raw.deadline) ? new Date(isoOrNull(raw.deadline)!) : null,
    amount: raw.amount?.trim().slice(0, 80) || null,
    fields: normalizeSkills(raw.fields ?? [], await listAllSkills()),
    fetchedAt: new Date(),
  });
  refresh();
  return { ok: true, id };
}

export interface CreateGroupInput {
  title: string;
  description: string;
  requiredSkills: string[];
  targetSize: number | null;
  respondBy: string | null;
  offerToOthers: boolean;
}

export async function createGroupAction(grantId: string, raw: CreateGroupInput): Promise<{ ok: true; invited: number; offered: number } | { error: string }> {
  const user = await requirePermission("news.manage");
  const grant = await getGrant(grantId);
  if (!grant) return { error: "Qrant tapılmadı." };
  const title = raw.title?.trim().slice(0, 200) || grant.title;
  const requiredSkills = normalizeSkills(raw.requiredSkills ?? [], await listAllSkills());
  if (!requiredSkills.length) return { error: "Ən azı bir tələb olunan sahə / bacarıq əlavə edin." };
  const size = Number(raw.targetSize);

  const res = await createGrantGroup(
    grantId,
    {
      title,
      description: raw.description?.trim().slice(0, 2000) ?? "",
      requiredSkills,
      targetSize: Number.isInteger(size) && size > 0 && size < 100 ? size : null,
      respondBy: isoOrNull(raw.respondBy),
      offerToOthers: !!raw.offerToOthers,
    },
    user,
  );
  refresh(grantId);
  return { ok: true, invited: res.invited, offered: res.offered };
}

export async function offerToEveryoneAction(grantId: string, groupId: string) {
  await requirePermission("news.manage");
  await offerGroupToEveryone(groupId);
  refresh(grantId);
}

export async function setGroupStatusAction(grantId: string, groupId: string, status: "open" | "closed") {
  await requirePermission("news.manage");
  await setGrantGroupStatus(groupId, status);
  refresh(grantId);
}
