import { getConference } from "@/lib/db/repo";

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Bakı tarixi (UTC+4) — bütün günlük tədbir üçün */
const bakuDay = (iso: string) => new Date(Date.parse(iso) + 4 * 3600_000);

/** Konfransı təqvimə bütün günlük tədbir kimi əlavə edir; təsvirdə müraciət son tarixi. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await getConference((await params).id);
  if (!c || c.hidden || !c.startsAt) return new Response("Tapılmadı", { status: 404 });

  const start = bakuDay(c.startsAt);
  // DTEND bütün günlük tədbirdə növbəti gündür
  const end = new Date(bakuDay(c.endsAt ?? c.startsAt).getTime() + 864e5);
  const url = new URL(`/konfranslar/${c.id}`, request.url).toString();
  const description = [c.deadline ? `Son müraciət: ${ymd(bakuDay(c.deadline))}` : "", url].filter(Boolean).join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UNEC Genc Alimler Surasi//AZ",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:conf-${c.id}@unec-genc-alimler-surasi`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${ymd(start)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:${esc(c.title)}`,
    `DESCRIPTION:${esc(description)}`,
    c.location ? `LOCATION:${esc(c.location)}` : "",
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="konfrans-${c.id}.ics"`,
    },
  });
}
