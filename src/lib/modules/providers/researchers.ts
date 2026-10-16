import { findUserById, listCollabRequests } from "../../db/repo";
import type { DashboardCard, ModuleProvider } from "../types";

/**
 * Tədqiqatçılar kataloqu: menyuda həmişə görünür.
 * Gələn əməkdaşlıq təklifləri — nişan və dashboard kartı; qəbul olunmuş təkliflər — göndərənə bildiriş kartı.
 */
export const researchersModule: ModuleProvider = {
  key: "researchers",
  async resolve({ user }) {
    const requests = await listCollabRequests(user.id);
    const incoming = requests.filter((r) => r.toUserId === user.id && r.status === "pending");
    const acceptedNew = requests.filter((r) => r.fromUserId === user.id && r.status === "accepted" && !r.requesterSeenAt);

    const cards: DashboardCard[] = [];
    for (const r of [...incoming, ...acceptedNew]) {
      const other = await findUserById(r.fromUserId === user.id ? r.toUserId : r.fromUserId);
      if (!other) continue;
      cards.push({
        kind: r.toUserId === user.id ? "collabIncoming" : "collabAccepted",
        key: `collab:${r.id}`,
        priority: r.toUserId === user.id ? 100 : 85,
        data: { request: r, other: { id: other.id, name: other.name, email: other.email, position: other.position, avatarUpdatedAt: other.avatarUpdatedAt } },
      });
    }

    return {
      visible: true,
      badge: incoming.length,
      nav: { label: "Tədqiqatçılar", href: "/tedqiqatcilar", icon: "users", section: "main", order: 40 },
      cards,
    };
  },
};
