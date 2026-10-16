import type { User } from "./types";

const norm = (s: string) => s.toLocaleLowerCase("az").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export interface ResearcherHit {
  user: User;
  /** Axtarışa / seçilmiş sahəyə uyğun gələn bacarıqlar (kartda vurğulanır) */
  matched: string[];
  score: number;
}

/**
 * Kataloq axtarışı: ad, sahə (bacarıq), fakültə, vəzifə və bio üzrə.
 * Sıralama: uyğunluq → əməkdaşlığa açıq olanlar → nəşr sayı → ad.
 */
export function searchResearchers(users: User[], { q = "", skill = "", openOnly = false }: { q?: string; skill?: string; openOnly?: boolean }) {
  const terms = norm(q).split(" ").filter((t) => t.length >= 2);
  const skillKey = norm(skill);
  const hits: ResearcherHit[] = [];

  for (const user of users) {
    if (openOnly && !user.openToCollab) continue;
    const skills = user.skills ?? [];
    if (skillKey && !skills.some((s) => norm(s) === skillKey || norm(s).includes(skillKey) || skillKey.includes(norm(s)))) continue;

    let score = 0;
    const matched = new Set<string>();
    if (skillKey) skills.filter((s) => norm(s).includes(skillKey) || skillKey.includes(norm(s))).forEach((s) => matched.add(s));

    if (terms.length) {
      const name = norm(user.name);
      const other = norm([user.faculty, user.position, user.bio ?? ""].join(" "));
      let all = true;
      for (const t of terms) {
        const inSkill = skills.filter((s) => norm(s).includes(t));
        if (inSkill.length) {
          score += 5;
          inSkill.forEach((s) => matched.add(s));
        } else if (name.includes(t)) score += 4;
        else if (other.includes(t)) score += 2;
        else all = false;
      }
      if (!all) continue;
    }
    hits.push({ user, matched: [...matched], score });
  }

  return hits.sort(
    (a, b) =>
      b.score - a.score ||
      Number(!!b.user.openToCollab) - Number(!!a.user.openToCollab) ||
      (b.user.researchStats?.works ?? 0) - (a.user.researchStats?.works ?? 0) ||
      a.user.name.localeCompare(b.user.name, "az"),
  );
}

/** Ən çox qeyd olunan sahələr (filtr düymələri üçün) */
export function topSkills(users: User[], limit = 12) {
  const counts = new Map<string, { label: string; n: number }>();
  for (const u of users)
    for (const s of u.skills ?? []) {
      const k = norm(s);
      const c = counts.get(k) ?? { label: s, n: 0 };
      c.n++;
      counts.set(k, c);
    }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "az")).slice(0, limit);
}
