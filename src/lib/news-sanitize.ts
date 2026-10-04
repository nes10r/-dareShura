import sanitizeHtml from "sanitize-html";
import { CATEGORY_FIELDS, EVENT_FORMATS } from "./news-content";
import type { NewsCategory, NewsMeta } from "./types";

/** Redaktordan gələn HTML yalnız icazəli teq və atributlarla saxlanılır (XSS-ə qarşı). */
export function sanitizeNewsHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "hr", "code", "pre"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { href: attribs.href ?? "#", target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
      h1: "h2",
      h4: "h3",
    },
  }).trim();
}

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : undefined);
const url = (v: unknown) => {
  const s = str(v, 1000);
  return s && /^https:\/\/\S+$/i.test(s) ? s : undefined;
};

/** Yalnız kateqoriyaya aid sahələri saxlayır və yoxlayır. */
export function sanitizeNewsMeta(category: NewsCategory, raw: Partial<NewsMeta> | undefined) {
  const allowed = new Set(CATEGORY_FIELDS[category]);
  const r = raw ?? {};
  const meta: NewsMeta = {};
  const errors: string[] = [];

  if (allowed.has("startsAt")) meta.startsAt = date(r.startsAt);
  if (allowed.has("endsAt")) meta.endsAt = date(r.endsAt);
  if (allowed.has("location")) meta.location = str(r.location);
  if (allowed.has("format") && EVENT_FORMATS.includes(r.format as never)) meta.format = r.format;
  if (allowed.has("contact")) meta.contact = str(r.contact);
  if (allowed.has("deadline")) meta.deadline = date(r.deadline);
  for (const k of ["onlineUrl", "registrationUrl"] as const) {
    if (!allowed.has(k)) continue;
    meta[k] = url(r[k]);
    if (str(r[k]) && !meta[k]) errors.push("Linklər https:// ilə başlamalıdır.");
  }
  if (meta.startsAt && meta.endsAt && meta.endsAt <= meta.startsAt) errors.push("Bitmə vaxtı başlama vaxtından sonra olmalıdır.");

  // undefined sahələri at
  return { meta: JSON.parse(JSON.stringify(meta)) as NewsMeta, errors: [...new Set(errors)] };
}
