"use server";

import { revalidatePath } from "next/cache";
import { requireUser, verifyPassword } from "@/lib/auth";
import { listAllSkills, listFaculties, removeAvatar, setAvatar, updateUserPassword, updateUserProfile, updateUserSkills } from "@/lib/db/repo";
import { canonicalFaculty, facultyProblem } from "@/lib/faculties";
import { normalizePersonName } from "@/lib/names";
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

/** Faylın həqiqi növü başlıq baytlarından yoxlanılır (yalnız MIME-a etibar edilmir). */
function detectImage(buf: Buffer) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Brauzerdə kvadrat formaya salınıb kiçildilmiş şəkli (data URL) qəbul edir. */
export async function uploadAvatar(dataUrl: string): Promise<FormState> {
  const user = await requireUser();
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ""));
  if (!match) return { error: "Şəkil formatı dəstəklənmir." };

  const buf = Buffer.from(match[2], "base64");
  if (buf.length > MAX_AVATAR_BYTES) return { error: "Şəkil çox böyükdür." };
  const mime = detectImage(buf);
  if (!mime || mime !== match[1]) return { error: "Fayl şəkil deyil və ya zədələnib." };

  await setAvatar(user.id, mime, match[2]);
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
