import {
  addInvitations,
  getGrantGroup,
  insertGrantGroup,
  insertJoinRequest,
  listGrantGroups,
  listInvitationsByGroups,
  listUsers,
  newId,
  respondInvitation,
} from "../db/repo";
import { matchSkills } from "../skills";
import type { GrantGroup, GrantInvitation, User } from "../types";

export interface GroupInput {
  title: string;
  description: string;
  requiredSkills: string[];
  targetSize: number | null;
  respondBy: string | null;
  /** Uyğun bacarığı olanlara dəvətlə yanaşı, qalanlara da açıq təklif göndər */
  offerToOthers: boolean;
}

export interface Audience {
  matched: { user: User; skills: string[] }[];
  others: User[];
}

/** Kimə dəvət, kimə təklif gedəcək (qrupu yaradan özü daxil deyil) */
export function computeAudience(users: User[], requiredSkills: string[], excludeId?: string): Audience {
  const matched: Audience["matched"] = [];
  const others: User[] = [];
  for (const u of users) {
    if (u.id === excludeId) continue;
    const skills = matchSkills(u.skills ?? [], requiredSkills);
    if (skills.length) matched.push({ user: u, skills });
    else others.push(u);
  }
  return { matched, others };
}

/**
 * İşçi qrup yaradır və bildirişləri göndərir:
 *  - bacarığı uyğun olanlara — dəvət ("invite")
 *  - uyğun bacarıqlı heç kim yoxdursa (və ya admin istəyirsə) — qalan hamıya təklif ("offer")
 */
export async function createGrantGroup(grantId: string, input: GroupInput, creator: User) {
  const { matched, others } = computeAudience(await listUsers(), input.requiredSkills, creator.id);
  const mode: GrantGroup["mode"] = matched.length ? "matched" : "open";
  const offerTo = mode === "open" || input.offerToOthers ? others : [];

  const group: GrantGroup = {
    id: newId("gg"),
    grantId,
    title: input.title,
    description: input.description,
    requiredSkills: input.requiredSkills,
    targetSize: input.targetSize,
    respondBy: input.respondBy,
    mode,
    status: "open",
    createdBy: creator.id,
    createdAt: new Date().toISOString(),
  };
  await insertGrantGroup(group, [
    ...matched.map((m) => ({ userId: m.user.id, kind: "invite" as const, matchedSkills: m.skills })),
    ...offerTo.map((u) => ({ userId: u.id, kind: "offer" as const, matchedSkills: [] })),
  ]);
  return { group, invited: matched.length, offered: offerTo.length };
}

/** Sonradan hamıya açıq təklif: hələ bildiriş almamış bütün üzvlər */
export async function offerGroupToEveryone(groupId: string) {
  const group = await getGrantGroup(groupId);
  if (!group || group.status !== "open") return 0;
  const [users, invitations] = await Promise.all([listUsers(), listInvitationsByGroups([groupId])]);
  const has = new Set(invitations.map((i) => i.userId));
  return addInvitations(
    groupId,
    users.filter((u) => u.id !== group.createdBy && !has.has(u.id)).map((u) => ({ userId: u.id, kind: "offer" as const, matchedSkills: [] })),
  );
}

export type RespondResult = { ok: true } | { ok: false; error: string };

export async function respondToGroup(groupId: string, user: User, accept: boolean): Promise<RespondResult> {
  const group = await getGrantGroup(groupId);
  if (!group) return { ok: false, error: "İşçi qrup tapılmadı." };
  if (group.status !== "open" && accept) return { ok: false, error: "Bu işçi qrupun formalaşması başa çatıb." };
  const changed = await respondInvitation(groupId, user.id, accept ? "accepted" : "declined");
  return changed ? { ok: true } : { ok: false, error: "Bu qrup üçün dəvətiniz yoxdur." };
}

/** Dəvəti olmayan üzv açıq qrupa özü qoşulur */
export async function joinGroup(groupId: string, user: User): Promise<RespondResult> {
  const group = await getGrantGroup(groupId);
  if (!group || group.status !== "open") return { ok: false, error: "Bu işçi qrupa qoşulmaq mümkün deyil." };
  const joined = await insertJoinRequest(groupId, user.id, matchSkills(user.skills ?? [], group.requiredSkills));
  // Artıq dəvəti varsa — dəvəti qəbul et
  if (!joined) return respondToGroup(groupId, user, true);
  return { ok: true };
}

export interface GroupView {
  group: GrantGroup;
  invitations: GrantInvitation[];
  members: GrantInvitation[];
  pending: number;
  declined: number;
}

export async function getGroupsWithInvitations(grantId?: string): Promise<GroupView[]> {
  const groups = await listGrantGroups(grantId);
  const invitations = await listInvitationsByGroups(groups.map((g) => g.id));
  return groups.map((group) => {
    const own = invitations.filter((i) => i.groupId === group.id);
    return {
      group,
      invitations: own,
      members: own.filter((i) => i.status === "accepted"),
      pending: own.filter((i) => i.status === "pending").length,
      declined: own.filter((i) => i.status === "declined").length,
    };
  });
}
