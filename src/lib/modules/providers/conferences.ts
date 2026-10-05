import { hasPermission } from "../../auth";
import { compareCurrent, deadlineState, isCurrent } from "../../conferences/view";
import { listConferences } from "../../db/repo";
import type { ModuleProvider } from "../types";

/** İstifadəçi tərəfi: müraciəti açıq və ya yaxınlaşan konfrans olduqda dashboard kartı */
export const conferencesModule: ModuleProvider = {
  key: "conferences",
  async resolve({ now }) {
    const t = now.getTime();
    const current = (await listConferences()).filter((c) => isCurrent(c, t)).sort(compareCurrent);
    if (!current.length) return { visible: false };
    const open = current.filter((c) => deadlineState(c, t) === "open");
    return {
      visible: true,
      cards: [
        {
          kind: "conferences",
          key: "conferences",
          // Son tarixi 7 gündən az qalan konfrans varsa — daha yuxarıda
          priority: open.some((c) => Date.parse(c.deadline!) - t < 7 * 864e5) ? 60 : 30,
          data: {
            openCount: open.length,
            items: current.slice(0, 3).map(({ id, title, deadline, startsAt, endsAt, format, location }) => ({
              id, title, deadline: deadlineState({ deadline }, t) === "open" ? deadline : null, startsAt, endsAt, format, location,
            })),
          },
        },
      ],
    };
  },
};

/** Konfrans elanlarının idarə edilməsi */
export const conferencesAdminModule: ModuleProvider = {
  key: "conferences-admin",
  async resolve({ user }) {
    if (!hasPermission(user, "news.manage")) return { visible: false };
    return {
      visible: true,
      nav: { label: "Konfranslar", href: "/admin/conferences", icon: "calendar", section: "admin", order: 22 },
    };
  },
};
