"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { deleteNews, getNews, insertNews, newId, updateNews } from "@/lib/db/repo";
import { slugify } from "@/lib/format";
import { htmlToText } from "@/lib/news-content";
import { sanitizeNewsHtml, sanitizeNewsMeta } from "@/lib/news-sanitize";
import { NEWS_CATEGORIES, type NewsCategory, type NewsItem, type NewsMeta } from "@/lib/types";

export interface NewsInput {
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  coverImage: string | null;
  meta: NewsMeta;
  publish: boolean;
}

export type NewsSaveResult = { ok: true; id: string } | { ok: false; errors: string[] };

function cleanCover(v: string | null) {
  const s = v?.trim();
  if (!s) return null;
  // Yalnız lokal şəkillər və https URL-lər
  if (s.startsWith("/images/") || /^https:\/\/\S+$/i.test(s)) return s.slice(0, 1000);
  return null;
}

export async function saveNews(id: string | null, raw: NewsInput): Promise<NewsSaveResult> {
  const user = await requirePermission("news.manage");
  const category: NewsCategory = NEWS_CATEGORIES.includes(raw.category) ? raw.category : "Xəbər";
  // Redaktorun HTML-i yalnız icazəli teqlərlə saxlanılır; boş redaktor ("<p></p>") boş mətn sayılır
  const html = sanitizeNewsHtml(String(raw.body ?? "").slice(0, 200_000));
  const { meta, errors: metaErrors } = sanitizeNewsMeta(category, raw.meta);
  const input = {
    title: String(raw.title ?? "").trim().slice(0, 300),
    summary: String(raw.summary ?? "").trim().slice(0, 600),
    body: htmlToText(html) ? html : "",
    category,
    coverImage: cleanCover(raw.coverImage),
    meta,
  };

  const errors: string[] = [...metaErrors];
  if (!input.title) errors.push("Başlığı daxil edin.");
  if (raw.publish && !input.body && !input.summary) errors.push("Dərc etmək üçün mətn və ya qısa məzmun lazımdır.");
  if (raw.coverImage?.trim() && !input.coverImage) errors.push("Şəkil linki https:// ilə başlamalıdır.");
  if (errors.length) return { ok: false, errors };

  const existing = id ? await getNews(id) : null;
  if (id && !existing) return { ok: false, errors: ["Xəbər tapılmadı."] };

  const now = new Date().toISOString();
  const item: NewsItem = {
    ...input,
    id: existing?.id ?? newId("n"),
    // Slug ilk yaradılışda təyin olunur ki, paylaşılmış linklər qırılmasın
    slug: existing?.slug ?? `${slugify(input.title) || "xeber"}-${Date.now().toString(36).slice(-4)}`,
    isPublished: raw.publish,
    publishedAt: raw.publish ? (existing?.publishedAt ?? now) : null,
    createdBy: existing?.createdBy ?? user.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) await updateNews(item);
  else await insertNews(item);

  revalidatePath("/", "layout");
  return { ok: true, id: item.id };
}

export async function removeNews(id: string) {
  await requirePermission("news.manage");
  await deleteNews(id);
  revalidatePath("/", "layout");
  redirect("/admin/news");
}
