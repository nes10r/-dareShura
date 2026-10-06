/**
 * Elmi maraq və bacarıq teqləri: normallaşdırma, təkliflər siyahısı və uyğunluq.
 * Siyahı sabit deyil — istifadəçilərin yazdıqlarından formalaşır (fakültələr kimi).
 */

export const MAX_SKILLS = 12;

const key = (s: string) => s.toLocaleLowerCase("az").replace(/\s+/g, " ").trim();

/** "  süni   intellekt " → "Süni intellekt" */
export function cleanSkill(s: string) {
  const t = s.replace(/\s+/g, " ").trim().slice(0, 60);
  return t ? t.charAt(0).toLocaleUpperCase("az") + t.slice(1) : "";
}

/** Təkrarsız, təmiz teqlər; mövcud yazılış varsa ona uyğunlaşdırılır */
export function normalizeSkills(input: string[], existing: string[] = []) {
  const out = new Map<string, string>();
  for (const raw of input) {
    const c = cleanSkill(raw);
    if (!c) continue;
    const canonical = existing.find((e) => key(e) === key(c)) ?? c;
    if (!out.has(key(canonical))) out.set(key(canonical), canonical);
  }
  return [...out.values()].slice(0, MAX_SKILLS);
}

export function skillList(all: string[][]) {
  return normalizeSkills(all.flat(), []).sort((a, b) => a.localeCompare(b, "az"));
}

/**
 * İstifadəçinin hansı bacarıqları tələb olunanlara uyğundur.
 * Uyğunluq: eyni teq və ya biri digərini əhatə edir ("Maliyyə" ↔ "Maliyyə texnologiyaları").
 */
export function matchSkills(userSkills: string[], required: string[]) {
  const req = required.map(key).filter(Boolean);
  return userSkills.filter((s) => {
    const k = key(s);
    return k.length >= 3 && req.some((r) => r === k || (r.length >= 4 && k.includes(r)) || (k.length >= 4 && r.includes(k)));
  });
}
