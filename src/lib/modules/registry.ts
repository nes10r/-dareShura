import { cache } from "react";
import type { User } from "../types";
import { newsAdminModule } from "./providers/news";
import { surveyAdminModule, surveyModule } from "./providers/survey";
import type { DashboardCard, ModuleProvider, ModuleSummary, NavEntry } from "./types";

/**
 * Qeydiyyatdan keçmiş modullar. Gələcək modullar (iclas, tapşırıq, səsvermə, qərar)
 * eyni interfeysi implement edib bura əlavə olunacaq.
 */
const PROVIDERS: ModuleProvider[] = [surveyModule, surveyAdminModule, newsAdminModule];

export interface ResolvedModules {
  modules: ModuleSummary[];
  nav: NavEntry[];
  cards: DashboardCard[];
}

/** Request ərzində keşlənir: layout (naviqasiya) və səhifə (kartlar) eyni nəticəni istifadə edir. */
export const resolveModules = cache(async (user: User): Promise<ResolvedModules> => {
  const ctx = { user, now: new Date() };
  // Provider-lər müstəqildir — paralel həll olunur, sıra qorunur
  const resolutions = await Promise.all(PROVIDERS.map((p) => p.resolve(ctx)));
  const modules: ModuleSummary[] = [];
  const nav: NavEntry[] = [];
  const cards: DashboardCard[] = [];

  PROVIDERS.forEach((provider, i) => {
    const r = resolutions[i];
    if (!r.visible) return;
    const badge = r.badge ?? 0;
    modules.push({ key: provider.key, visible: true, badge, label: r.nav?.label, href: r.nav?.href, section: r.nav?.section });
    if (r.nav) nav.push({ ...r.nav, key: provider.key, badge: badge || undefined });
    if (r.cards) cards.push(...r.cards);
  });

  nav.sort((a, b) => a.order - b.order);
  cards.sort((a, b) => b.priority - a.priority);
  return { modules, nav, cards };
});
