"use server";

import { revalidatePath } from "next/cache";
import { requireUser, verifyPassword } from "@/lib/auth";
import { listFaculties, updateUserPassword, updateUserProfile } from "@/lib/db/repo";
import { canonicalFaculty, facultyProblem } from "@/lib/faculties";
import { hashPassword } from "@/lib/password";
import { ACADEMIC_TITLES, passwordProblem } from "@/lib/validation";

export type FormState = { ok?: boolean; error?: string };

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const name = get("name");
  const faculty = canonicalFaculty(get("faculty"), await listFaculties());
  const position = get("position");
  const academicTitle = get("academicTitle");

  if (name.length < 3 || name.length > 100) return { error: "Ad və soyadı daxil edin." };
  const fp = facultyProblem(faculty);
  if (fp) return { error: fp };
  if (!position || position.length > 120) return { error: "Vəzifəni daxil edin." };

  await updateUserProfile(user.id, {
    name,
    faculty,
    position,
    academicTitle: (ACADEMIC_TITLES as readonly string[]).includes(academicTitle) ? academicTitle : null,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!verifyPassword(current, user.passwordHash)) return { error: "Hazırkı şifrə yanlışdır." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "Yeni şifrələr üst-üstə düşmür." };

  await updateUserPassword(user.id, hashPassword(next));
  return { ok: true };
}
