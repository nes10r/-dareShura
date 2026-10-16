"use server";

import { revalidatePath } from "next/cache";
import { requireUser, verifyPassword } from "@/lib/auth";
import { listAllSkills, listFaculties, removeAvatar, setAvatar, updateUserPassword, updateUserProfile, updateUserSkills } from "@/lib/db/repo";
import { canonicalFaculty, facultyProblem } from "@/lib/faculties";
import { normalizePersonName } from "@/lib/names";
import { parseImageDataUrl } from "@/lib/images";
import { hashPassword } from "@/lib/password";
import { normalizeSkills } from "@/lib/skills";
import { ACADEMIC_TITLES, passwordProblem } from "@/lib/validation";

export type FormState = { ok?: boolean; error?: string };

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const name = normalizePersonName(get("name"));
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

// ---------- Profil şəkli ----------

const MAX_AVATAR_BYTES = 300 * 1024;

/** Brauzerdə kvadrat formaya salınıb kiçildilmiş şəkli (data URL) qəbul edir. */
export async function uploadAvatar(dataUrl: string): Promise<FormState> {
  const user = await requireUser();
  const img = parseImageDataUrl(dataUrl, MAX_AVATAR_BYTES);
  if ("error" in img) return { error: img.error };

  await setAvatar(user.id, img.mime, img.base64);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAvatar(): Promise<FormState> {
  const user = await requireUser();
  await removeAvatar(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Bacarıqlar ----------

export async function saveSkills(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("skills") ?? "[]"));
  } catch {
    return { error: "Məlumat oxunmadı." };
  }
  const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  await updateUserSkills(user.id, normalizeSkills(list, await listAllSkills()));
  revalidatePath("/", "layout");
  return { ok: true };
}
