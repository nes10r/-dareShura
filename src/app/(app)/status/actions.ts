"use server";

import { revalidatePath } from "next/cache";
import { hasPermission, requireUser } from "@/lib/auth";
import { countActiveStories, deleteStory, getStory, insertStory, listStoryViewers, markStoryViewed, newId } from "@/lib/db/repo";
import { avatarUrl } from "@/lib/format";
import { parseImageDataUrl } from "@/lib/images";
import { MAX_ACTIVE_STORIES, MAX_CAPTION, MAX_STORY_IMAGE_BYTES, MAX_STORY_TEXT, STORY_BACKGROUNDS, STORY_TTL_MS } from "@/lib/stories";

export type StoryResult = { ok: true } | { ok: false; error: string };

export async function createStory(input: { kind: "text" | "image"; text: string; bg: string; image?: string }): Promise<StoryResult> {
  const user = await requireUser();
  if ((await countActiveStories(user.id)) >= MAX_ACTIVE_STORIES) {
    return { ok: false, error: `Eyni anda ən çox ${MAX_ACTIVE_STORIES} aktiv status ola bilər.` };
  }

  const text = String(input.text ?? "").replace(/\r\n/g, "\n").trim();
  const now = Date.now();
  const base = {
    id: newId("st"),
    userId: user.id,
    bg: input.bg in STORY_BACKGROUNDS ? input.bg : "brand",
    createdAt: new Date(now),
    expiresAt: new Date(now + STORY_TTL_MS),
  };

  if (input.kind === "image") {
    const img = parseImageDataUrl(input.image ?? "", MAX_STORY_IMAGE_BYTES);
    if ("error" in img) return { ok: false, error: img.error ?? "Şəkil qəbul olunmadı." };
    await insertStory({ ...base, kind: "image", text: text.slice(0, MAX_CAPTION), imageMime: img.mime, imageData: img.base64 });
  } else {
    if (!text) return { ok: false, error: "Status mətnini yazın." };
    await insertStory({ ...base, kind: "text", text: text.slice(0, MAX_STORY_TEXT) });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Müəllif öz statusunu, admin istənilən statusu silə bilər */
export async function deleteStoryAction(id: string): Promise<StoryResult> {
  const user = await requireUser();
  const story = await getStory(id);
  if (!story) return { ok: true };
  if (story.userId !== user.id && !hasPermission(user, "news.manage")) return { ok: false, error: "Bu statusu silə bilməzsiniz." };
  await deleteStory(id);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markStoryViewedAction(id: string) {
  const user = await requireUser();
  const story = await getStory(id);
  // Öz statusuna baxış sayılmır
  if (story && story.userId !== user.id) await markStoryViewed(id, user.id);
}

/** Statusa kimlər baxıb — yalnız müəllif görür */
export async function getStoryViewersAction(id: string) {
  const user = await requireUser();
  const story = await getStory(id);
  if (!story || story.userId !== user.id) return [];
  return (await listStoryViewers(id)).map((v) => ({
    id: v.id,
    name: v.name,
    avatar: avatarUrl({ id: v.id, avatarUpdatedAt: v.avatarUpdatedAt?.toISOString() ?? null }),
    viewedAt: v.viewedAt.toISOString(),
  }));
}
