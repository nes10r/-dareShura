/** Statuslar: sabitlər və fon rəngləri (server və client üçün ortaq) */

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
/** Bir istifadəçinin eyni anda ən çox aktiv statusu */
export const MAX_ACTIVE_STORIES = 10;
export const MAX_STORY_TEXT = 300;
export const MAX_CAPTION = 200;
/** Server-də qəbul olunan şəklin maksimum ölçüsü (brauzerdə 1080px-ə kiçildilir, adətən 100–300 KB) */
export const MAX_STORY_IMAGE_BYTES = 700 * 1024;

export const STORY_BACKGROUNDS = {
  brand: "from-brand-600 to-brand-900",
  emerald: "from-emerald-500 to-teal-800",
  sunset: "from-orange-400 to-rose-600",
  violet: "from-violet-500 to-fuchsia-700",
  slate: "from-slate-600 to-slate-900",
} as const;
export type StoryBg = keyof typeof STORY_BACKGROUNDS;

export interface StoryItem {
  id: string;
  kind: "text" | "image";
  text: string;
  bg: StoryBg;
  imageUrl: string | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
}

export interface StoryGroup {
  user: { id: string; name: string; avatar: string | null };
  stories: StoryItem[];
  allSeen: boolean;
  latest: string;
}

/** "2 saat əvvəl", "15 dəq əvvəl", "indicə" */
export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.floor((now - Date.parse(iso)) / 60000);
  if (m < 1) return "indicə";
  if (m < 60) return `${m} dəq əvvəl`;
  return `${Math.floor(m / 60)} saat əvvəl`;
}
