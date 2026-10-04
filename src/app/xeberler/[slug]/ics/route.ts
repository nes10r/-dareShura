import { getPublishedNewsBySlug } from "@/lib/db/repo";
import { htmlToText } from "@/lib/news-content";

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** İclas / tədbir üçün təqvim faylı (.ics) — telefonun təqviminə bir toxunuşla əlavə olunur. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const item = await getPublishedNewsBySlug((await params).slug);
  const start = item?.meta.startsAt;
  if (!item || !start) return new Response("Tapılmadı", { status: 404 });

  // Bitmə vaxtı yoxdursa — 2 saat
  const end = item.meta.endsAt ?? new Date(new Date(start).getTime() + 2 * 3600_000).toISOString();
  const url = new URL(`/xeberler/${item.slug}`, request.url).toString();
  const description = [item.summary || htmlToText(item.body).slice(0, 500), item.meta.onlineUrl ? `Onlayn: ${item.meta.onlineUrl}` : "", url]
    .filter(Boolean)
    .join("\n\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UNEC Genc Alimler Surasi//AZ",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${item.id}@unec-genc-alimler-surasi`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(item.title)}`,
    `DESCRIPTION:${esc(description)}`,
    item.meta.location ? `LOCATION:${esc(item.meta.location)}` : "",
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${item.slug}.ics"`,
    },
  });
}
