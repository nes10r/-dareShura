"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { deleteSurvey, getSurvey, insertSurvey, listResponsesBySurvey, listUsers, newId, updateSurvey } from "@/lib/db/repo";
import { resolveAudience } from "@/lib/surveys/service";
import { cleanFaculty } from "@/lib/faculties";
import { type Audience, type Question, type ResultsVisibility, type Role, type Survey } from "@/lib/types";

export interface SurveyInput {
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  audience: Audience;
  resultsVisibility: ResultsVisibility;
  resultsVisibleUntil: string | null;
  questions: Question[];
  anonymous: boolean;
}

export type SaveResult = { ok: true; id: string; audienceSize?: number } | { ok: false; errors: string[] };

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MEMBER"];

function sanitize(input: SurveyInput): SurveyInput {
  const isoOrNull = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
  return {
    title: String(input.title ?? "").trim().slice(0, 300),
    description: String(input.description ?? "").trim().slice(0, 2000),
    startsAt: isoOrNull(input.startsAt),
    endsAt: isoOrNull(input.endsAt),
    audience: {
      all: !!input.audience?.all,
      roles: (input.audience?.roles ?? []).filter((r) => ROLES.includes(r)),
      faculties: [...new Set((input.audience?.faculties ?? []).map((f) => cleanFaculty(String(f))).filter(Boolean))].slice(0, 100),
      userIds: (input.audience?.userIds ?? []).filter((u) => typeof u === "string"),
    },
    resultsVisibility: input.resultsVisibility === "RESPONDENTS" ? "RESPONDENTS" : "NONE",
    resultsVisibleUntil: isoOrNull(input.resultsVisibleUntil),
    anonymous: !!input.anonymous,
    questions: (input.questions ?? []).slice(0, 100).map((q) => ({
      id: String(q.id || newId("q")),
      type: (["single", "multiple", "scale", "text"] as const).includes(q.type) ? q.type : "single",
      title: String(q.title ?? "").trim().slice(0, 500),
      description: q.description?.trim().slice(0, 1000) || undefined,
      required: !!q.required,
      ...(q.type === "single" || q.type === "multiple"
        ? { options: [...new Set((q.options ?? []).map((o) => String(o).trim()).filter(Boolean))].slice(0, 30) }
        : {}),
      ...(q.type === "scale"
        ? {
            scaleMax: Math.min(10, Math.max(3, Number(q.scaleMax) || 5)),
            scaleMinLabel: q.scaleMinLabel?.trim() || undefined,
            scaleMaxLabel: q.scaleMaxLabel?.trim() || undefined,
          }
        : {}),
    })),
  };
}

/** Dərc üçün tam yoxlama. Draft üçün yalnız başlıq tələb olunur. */
function validateForPublish(s: SurveyInput, { requireFutureEnd = true } = {}) {
  const errors: string[] = [];
  if (!s.title) errors.push("Sorğunun adını daxil edin.");
  if (!s.questions.length) errors.push("Ən azı bir sual əlavə edin.");
  s.questions.forEach((q, i) => {
    if (!q.title) errors.push(`${i + 1}-ci sualın mətni boşdur.`);
    if ((q.type === "single" || q.type === "multiple") && (q.options?.length ?? 0) < 2) {
      errors.push(`${i + 1}-ci sual üçün ən azı 2 variant lazımdır.`);
    }
  });
  if (!s.endsAt) errors.push("Son tarixi seçin.");
  else if (requireFutureEnd && new Date(s.endsAt) <= new Date()) errors.push("Son tarix gələcəkdə olmalıdır.");
  if (s.startsAt && s.endsAt && new Date(s.startsAt) >= new Date(s.endsAt)) errors.push("Başlama tarixi son tarixdən əvvəl olmalıdır.");
  const a = s.audience;
  if (!a.all && !a.roles.length && !a.faculties.length && !a.userIds.length) errors.push("Auditoriyanı seçin.");
  return errors;
}

export async function saveSurvey(id: string | null, raw: SurveyInput, intent: "draft" | "publish" | "template"): Promise<SaveResult> {
  const user = await requirePermission("survey.manage");
  const input = sanitize(raw);

  const existing = id ? await getSurvey(id) : null;
  if (id && !existing) return { ok: false, errors: ["Sorğu tapılmadı."] };
  if (existing && existing.status !== "DRAFT") return updatePublishedSurvey(existing, input);

  const errors = intent === "publish" ? validateForPublish(input) : input.title ? [] : ["Sorğunun adını daxil edin."];
  if (errors.length) return { ok: false, errors };

  const now = new Date().toISOString();
  const survey: Survey = {
    ...input,
    id: existing?.id ?? newId("s"),
    status: intent === "publish" ? "PUBLISHED" : "DRAFT",
    publishedAt: intent === "publish" ? now : null,
    closedAt: null,
    isTemplate: intent === "template" ? true : (existing?.isTemplate ?? false),
    createdBy: existing?.createdBy ?? user.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (intent === "publish") survey.isTemplate = false;

  if (existing) await updateSurvey(survey);
  else await insertSurvey(survey);

  // Dərc anında auditoriya müəyyən edilir; görünürlük isə hər sorğuda dinamik hesablanır
  // (sonradan əlavə olunan uyğun istifadəçilər də sorğunu görəcək).
  const audienceSize = intent === "publish" ? resolveAudience(survey, await listUsers()).length : undefined;

  revalidatePath("/", "layout");
  return { ok: true, id: survey.id, audienceSize };
}

/**
 * Dərc olunmuş (aktiv, planlaşdırılmış və ya bağlanmış) sorğunun redaktəsi.
 * Status, dərc tarixi saxlanılır; sual id-ləri dəyişmədiyi üçün mövcud cavablar öz suallarına bağlı qalır.
 */
async function updatePublishedSurvey(existing: Survey, input: SurveyInput): Promise<SaveResult> {
  // Bağlanmış sorğuda son tarix keçmiş ola bilər; aktiv sorğuda isə gələcəkdə olmalıdır
  const errors = validateForPublish(input, { requireFutureEnd: existing.status === "PUBLISHED" });
  // Anonimlik vədi verilmiş sorğuda cavablar varsa, adları açmaq olmaz
  if (existing.anonymous && !input.anonymous && (await listResponsesBySurvey(existing.id)).length > 0) {
    errors.push("Bu sorğu anonim kimi keçirilib və artıq cavabları var — anonimliyi söndürmək olmaz.");
  }
  if (errors.length) return { ok: false, errors };

  const survey: Survey = { ...existing, ...input, updatedAt: new Date().toISOString() };
  await updateSurvey(survey);
  revalidatePath("/", "layout");
  return { ok: true, id: survey.id };
}

export async function closeSurvey(id: string) {
  await requirePermission("survey.manage");
  const survey = await getSurvey(id);
  if (!survey || survey.status !== "PUBLISHED") return;
  const now = new Date().toISOString();
  await updateSurvey({ ...survey, status: "CLOSED", closedAt: now, updatedAt: now });
  revalidatePath("/", "layout");
}

export async function removeSurvey(id: string) {
  await requirePermission("survey.manage");
  const survey = await getSurvey(id);
  if (survey && survey.status === "DRAFT") await deleteSurvey(id);
  revalidatePath("/", "layout");
  redirect(`/admin/surveys${survey?.isTemplate ? "?tab=templates" : "?tab=draft"}`);
}

/** Sorğunu kopyalayır: şablondan yeni sorğu, sorğudan şablon və ya sadə dublikat. */
export async function duplicateSurvey(id: string, asTemplate: boolean) {
  const user = await requirePermission("survey.manage");
  const source = await getSurvey(id);
  if (!source) redirect("/admin/surveys");
  const now = new Date().toISOString();
  const copy: Survey = {
    ...source,
    id: newId("s"),
    title: asTemplate || source.isTemplate ? source.title : `${source.title} (kopya)`,
    status: "DRAFT",
    startsAt: null,
    endsAt: null,
    publishedAt: null,
    closedAt: null,
    resultsVisibleUntil: null,
    isTemplate: asTemplate,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  };
  await insertSurvey(copy);
  revalidatePath("/admin/surveys");
  redirect(`/admin/surveys/${copy.id}`);
}
