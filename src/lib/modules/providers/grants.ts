import { hasPermission } from "../../auth";
import { getGrant, listGrants, listInvitationsByUser } from "../../db/repo";
import { getGroupsWithInvitations } from "../../grants/groups";
import { isCurrentGrant } from "../../grants/source";
import type { DashboardCard, ModuleProvider } from "../types";

/**
 * Qrantlar modulu (istifadəçi): aktual qrant və ya dəvət olduqda görünür.
 * Cavab gözləyən dəvətlər — menyuda nişan və dashboard-da prominent kart.
 */
export const grantsModule: ModuleProvider = {
  key: "grants",
  async resolve({ user, now }) {
    const t = now.getTime();
    const [grants, myInvites] = await Promise.all([listGrants(), listInvitationsByUser(user.id)]);
    const current = grants.filter((g) => isCurrentGrant(g, t));
    if (!current.length && !myInvites.length) return { visible: false };

    // Yalnız açıq qruplardakı gözləyən dəvətlər
    const pendingIds = new Set(myInvites.filter((i) => i.status === "pending").map((i) => i.groupId));
    const views = pendingIds.size ? (await getGroupsWithInvitations()).filter((v) => pendingIds.has(v.group.id) && v.group.status === "open") : [];

    const cards: DashboardCard[] = [];
    for (const v of views) {
      const inv = myInvites.find((i) => i.groupId === v.group.id)!;
      const grant = grants.find((g) => g.id === v.group.grantId) ?? (await getGrant(v.group.grantId));
      if (!grant) continue;
      cards.push({
        kind: "grantInvite",
        key: `grant-invite:${v.group.id}`,
        // Bacarığa görə dəvət sorğudan da önəmlidir; açıq təklif bir az aşağıda
        priority: inv.kind === "invite" ? 105 : 90,
        data: {
          groupId: v.group.id,
          grantId: grant.id,
          grantTitle: grant.title,
          groupTitle: v.group.title,
          description: v.group.description,
          kind: inv.kind,
          matchedSkills: inv.matchedSkills,
          requiredSkills: v.group.requiredSkills,
          memberCount: v.members.length,
          targetSize: v.group.targetSize,
          respondBy: v.group.respondBy,
          deadline: grant.deadline,
        },
      });
    }

    // Bacarıq qeyd etməyən üzvə xatırlatma — dəvət ala bilməsi üçün
    if (!(user.skills ?? []).length && current.length) {
      cards.push({ kind: "skillsNudge", key: "skills-nudge", priority: 35, data: { grantCount: current.length } });
    }

    return {
      visible: true,
      badge: views.length,
      nav: { label: "Qrantlar", href: "/qrantlar", icon: "briefcase", section: "main", order: 30 },
      cards,
    };
  },
};

export const grantsAdminModule: ModuleProvider = {
  key: "grants-admin",
  async resolve({ user }) {
    if (!hasPermission(user, "news.manage")) return { visible: false };
    return { visible: true, nav: { label: "Qrantlar", href: "/admin/grants", icon: "briefcase", section: "admin", order: 23 } };
  },
};
