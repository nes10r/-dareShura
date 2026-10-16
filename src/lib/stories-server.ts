import { deleteExpiredStories, listActiveStories, listUsers } from "./db/repo";
import { avatarUrl } from "./format";
import { STORY_BACKGROUNDS, type StoryBg, type StoryGroup } from "./stories";
import type { User } from "./types";

/**
 * Aktiv statuslar istifadəçilərə görə qruplaşdırılır:
 * öz statuslarım əvvəl, sonra baxılmamışlar (ən yenisi birinci), sonra baxılmışlar.
 * Hər çağırışda vaxtı keçmiş statuslar bazadan silinir — ayrıca cron lazım deyil.
 */
export async function getStoryGroups(viewer: User): Promise<StoryGroup[]> {
  await deleteExpiredStories();
  const [items, users] = await Promise.all([listActiveStories(viewer.id), listUsers()]);
  const byUser = new Map(users.map((u) => [u.id, u]));
  const groups = new Map<string, StoryGroup>();

  for (const s of items) {
    const u = byUser.get(s.userId);
    if (!u) continue;
    const g = groups.get(u.id) ?? { user: { id: u.id, name: u.name, avatar: avatarUrl(u) }, stories: [], allSeen: true, latest: s.createdAt };
    const own = u.id === viewer.id;
    g.stories.push({
      id: s.id,
      kind: s.kind,
      text: s.text,
      bg: (s.bg in STORY_BACKGROUNDS ? s.bg : "brand") as StoryBg,
      imageUrl: s.kind === "image" ? `/api/stories/${s.id}/image` : null,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      seen: own || s.seen,
    });
    if (!own && !s.seen) g.allSeen = false;
    if (s.createdAt > g.latest) g.latest = s.createdAt;
    groups.set(u.id, g);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.user.id === viewer.id) return -1;
    if (b.user.id === viewer.id) return 1;
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    return b.latest.localeCompare(a.latest);
  });
}
