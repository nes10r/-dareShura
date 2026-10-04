import type { EventFormat, NewsCategory, NewsMeta } from "./types";

/** Hər kateqoriya üçün əlavə sahələr (redaktorda və xəbər səhifəsində göstərilir) */
export const CATEGORY_FIELDS: Record<NewsCategory, (keyof NewsMeta)[]> = {
  Xəbər: [],
  Elan: ["deadline", "contact"],
  İclas: ["startsAt", "location", "format", "onlineUrl"],
  Tədbir: ["startsAt", "endsAt", "location", "format", "registrationUrl", "onlineUrl"],
};

export const META_LABELS: Record<keyof NewsMeta, string> = {
  startsAt: "Başlama vaxtı",
  endsAt: "Bitmə vaxtı",
  location: "Məkan",
  format: "Format",
  onlineUrl: "Onlayn qoşulma linki",
  registrationUrl: "Qeydiyyat linki",
  deadline: "Son tarix",
  contact: "Əlaqə",
};

export const EVENT_FORMATS: EventFormat[] = ["Əyani", "Onlayn", "Hibrid"];

/** Kateqoriyaya uyğun başlanğıc məzmun strukturu */
export const CATEGORY_TEMPLATES: Record<NewsCategory, string | null> = {
  Xəbər: null,
  Elan: "<p>Elanın qısa izahı.</p><h2>Tələblər</h2><ul><li><p></p></li></ul><h2>Müraciət qaydası</h2><ol><li><p></p></li></ol><h2>Sənədlər</h2><ul><li><p></p></li></ul>",
  İclas: "<h2>Gündəlik</h2><ol><li><p></p></li><li><p></p></li><li><p></p></li></ol><h2>Materiallar</h2><ul><li><p></p></li></ul><h2>Qeydlər</h2><p></p>",
  Tədbir: "<h2>Tədbir haqqında</h2><p></p><h2>Proqram</h2><ul><li><p><strong>10:00</strong> — </p></li><li><p><strong>11:00</strong> — </p></li></ul><h2>Məruzəçilər</h2><ul><li><p></p></li></ul>",
};

export function isHtml(body: string) {
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|hr|div)[\s>]/i.test(body);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Köhnə (sadə mətn) xəbərləri HTML-ə çevirir: boş sətirlə ayrılmış abzaslar */
export function plainTextToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function bodyToHtml(body: string) {
  return isHtml(body) ? body : plainTextToHtml(body);
}

/** HTML-dən sadə mətn (boşluq yoxlaması və axtarış üçün) */
export function htmlToText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
