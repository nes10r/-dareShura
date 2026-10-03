import { findValidInvite, insertUser, newId } from "./db/repo";
import { hashPassword } from "./password";
import { FACULTIES } from "./types";
import { ACADEMIC_TITLES, normalizeEmail, passwordProblem, UNEC_EMAIL_RE } from "./validation";

export type RegisterField = "name" | "email" | "faculty" | "position" | "password" | "confirm" | "form";

export interface RegisterInput {
  token: string;
  name: string;
  email: string;
  faculty: string;
  position: string;
  academicTitle: string;
  password: string;
  confirm: string;
}

export type RegisterResult = { ok: true; userId: string } | { ok: false; errors: Partial<Record<RegisterField, string>>; inviteInvalid?: boolean };

/**
 * Qeydiyyat qaydaları: etibarlı (24 saatlıq, deaktiv edilməmiş) dəvət linki,
 * @unec.edu.az e-poçtu, təkrarlanmayan ünvan və güclü şifrə.
 */
export async function registerUser(raw: RegisterInput): Promise<RegisterResult> {
  const invite = await findValidInvite(raw.token);
  if (!invite) {
    return { ok: false, inviteInvalid: true, errors: { form: "Qeydiyyat linkinin müddəti bitib və ya deaktiv edilib. Administratordan yeni link istəyin." } };
  }

  const v = {
    name: raw.name.trim(),
    email: normalizeEmail(raw.email),
    faculty: raw.faculty.trim(),
    position: raw.position.trim(),
    academicTitle: raw.academicTitle.trim(),
  };
  const errors: Partial<Record<RegisterField, string>> = {};
  if (v.name.length < 3 || v.name.length > 100) errors.name = "Ad və soyadınızı daxil edin.";
  if (!UNEC_EMAIL_RE.test(v.email)) errors.email = "Yalnız @unec.edu.az ilə bitən korporativ e-poçt qəbul olunur.";
  if (!(FACULTIES as readonly string[]).includes(v.faculty)) errors.faculty = "Fakültəni seçin.";
  if (!v.position || v.position.length > 120) errors.position = "Vəzifənizi daxil edin.";
  const pw = passwordProblem(raw.password);
  if (pw) errors.password = pw;
  else if (raw.password !== raw.confirm) errors.confirm = "Şifrələr üst-üstə düşmür.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const userId = newId("u");
  const created = await insertUser({
    id: userId,
    name: v.name,
    email: v.email,
    passwordHash: hashPassword(raw.password),
    role: "MEMBER",
    faculty: v.faculty,
    position: v.position,
    academicTitle: (ACADEMIC_TITLES as readonly string[]).includes(v.academicTitle) ? v.academicTitle : null,
    inviteId: invite.id,
    createdAt: new Date().toISOString(),
  });
  if (!created) return { ok: false, errors: { email: "Bu e-poçt ilə artıq qeydiyyat mövcuddur. Daxil olun." } };
  return { ok: true, userId };
}
