import { listActiveCalls } from "../../db/repo";
import { matchSkills } from "../../skills";
import type { DashboardCard, ModuleProvider } from "../types";

/** Yeni paylaşılmış çağırış sahəsi uyğun üzvlərə bu müddət ərzində dashboard-da göstərilir */
const FRESH_DAYS = 14;

/**
 * Jurnallar: menyuda həmişə görünür. Dashboard-da — sahəmə uyğun, yeni paylaşılmış
 * xüsusi buraxılış çağırışları (başqasının paylaşdığı, son tarixi keçməmiş).
 */
export const journalsModule: ModuleProvider = {
  key: "journals",
  async resolve({ user, now }) {
    const skills = user.skills ?? [];
    const cards: DashboardCard[] = [];
    if (skills.length) {
      const items = (await listActiveCalls(now))
        .filter((c) => c.createdBy !== user.id && c.deadline && now.getTime() - Date.parse(c.createdAt) < FRESH_DAYS * 86_400_000)
        .map((c) => ({ c, matched: matchSkills(skills, c.topics) }))
        .filter((x) => x.matched.length)
        .slice(0, 3)
        .map(({ c, matched }) => ({ id: c.id, title: c.title, journal: c.journalTitle, url: c.url, deadline: c.deadline!, matched }));
      if (items.length) cards.push({ kind: "journalCalls", key: "journal-calls", priority: 44, data: { items } });
    }
    return {
      visible: true,
      nav: { label: "Jurnallar", href: "/jurnallar", icon: "search", section: "main", order: 47 },
      cards,
    };
  },
};
