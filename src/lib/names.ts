/** Azərbaycan əlifbasına xas hərflər — olarsa, istifadəçi Azərbaycan klaviaturası ilə yazır */
const AZ_LETTERS = /[əƏıİöÖüÜşŞçÇğĞ]/;

/**
 * Ad-soyadı vahid formaya salır: "SADIG YUSIFOV" → "Sadig Yusifov", "ƏLİYEVA ŞƏBNƏM" → "Əliyeva Şəbnəm".
 *
 * "I/i" hərfləri kontekstə görə:
 *  - Adda Azərbaycan hərfləri varsa — Azərbaycan qaydası: "I" → "ı", "İ" → "i", baş hərf "i" → "İ"
 *    ("İSMAYILOV" → "İsmayılov")
 *  - Yoxdursa (latın transliterasiyası) — ingilis qaydası: "I" → "i", baş hərf "i" → "I"
 *    ("SADIG YUSIFOV" → "Sadig Yusifov", "gunel imanova" → "Gunel Imanova")
 */
export function normalizePersonName(input: string) {
  const name = input.replace(/\s+/g, " ").trim();
  const locale = AZ_LETTERS.test(name) ? "az" : "en";
  return name
    .toLocaleLowerCase(locale)
    .replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase(locale));
}
