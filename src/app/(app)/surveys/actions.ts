"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getSurvey, insertResponse } from "@/lib/db/repo";
import { getEffectiveStatus, isInAudience, validateAnswers } from "@/lib/surveys/service";

export type SubmitResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitSurvey(surveyId: string, rawAnswers: Record<string, unknown>): Promise<SubmitResult> {
  const user = await requireUser();
  const survey = await getSurvey(surveyId);

  // Server tərəfdə də yoxlanılır: auditoriya, aktivlik, cavabların düzgünlüyü, təkrar cavab
  if (!survey || survey.isTemplate || !isInAudience(survey, user)) return { ok: false, error: "Sorğu tapılmadı." };
  if (getEffectiveStatus(survey) !== "active") return { ok: false, error: "Bu sorğu artıq aktiv deyil." };

  const { answers, errors, ok } = validateAnswers(survey, rawAnswers);
  if (!ok) return { ok: false, error: "Bəzi məcburi suallar cavablandırılmayıb.", fieldErrors: errors };

  if (!(await insertResponse(survey.id, user.id, answers))) {
    return { ok: false, error: "Siz bu sorğuya artıq cavab vermisiniz." };
  }

  // Naviqasiya badge-i və dashboard kartları yenilənsin (lazım gələrsə modul gizlənsin)
  revalidatePath("/", "layout");
  return { ok: true };
}
