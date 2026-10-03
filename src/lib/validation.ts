export const UNEC_EMAIL_RE = /^[a-z0-9._%+-]+@unec\.edu\.az$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Şifrə tələbi: ən azı 8 simvol, hərf və rəqəm. Problem yoxdursa null. */
export function passwordProblem(password: string) {
  if (password.length < 8) return "Şifrə ən azı 8 simvol olmalıdır.";
  if (!/[a-zA-ZəƏıIöÖüÜşŞçÇğĞ]/.test(password) || !/\d/.test(password)) return "Şifrədə həm hərf, həm rəqəm olmalıdır.";
  return null;
}

export const ACADEMIC_TITLES = ["professor", "dosent", "baş müəllim", "müəllim"] as const;
