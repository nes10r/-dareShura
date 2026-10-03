import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { countResponsesBySurvey, listSurveys, listUsers } from "@/lib/db/repo";
import { formatDate } from "@/lib/format";
import { StatusChip } from "@/components/admin/StatusChip";
import { describeAudience, getEffectiveStatus, resolveAudience } from "@/lib/surveys/service";

export const metadata: Metadata = { title: "Sorğuların idarə edilməsi" };

const TABS = [
  { key: "all", label: "Hamısı" },
  { key: "active", label: "Aktiv" },
  { key: "scheduled", label: "Planlaşdırılmış" },
  { key: "draft", label: "Draft" },
  { key: "closed", label: "Bağlanmış" },
  { key: "templates", label: "Şablonlar" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function AdminSurveysPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePermission("survey.manage");
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "all";

  const [surveys, users, counts] = await Promise.all([listSurveys(), listUsers(), countResponsesBySurvey()]);
  const rows = surveys.map((s) => ({ s, status: getEffectiveStatus(s) }));

  const countFor = (key: TabKey) =>
    key === "templates" ? rows.filter((r) => r.s.isTemplate).length
    : key === "all" ? rows.filter((r) => !r.s.isTemplate).length
    : rows.filter((r) => !r.s.isTemplate && r.status === key).length;

  const visible = rows.filter((r) => (tab === "templates" ? r.s.isTemplate : !r.s.isTemplate && (tab === "all" || r.status === tab)));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sorğuların idarə edilməsi</h1>
          <p className="mt-1 text-muted">Sorğu yaradın, dərc edin və nəticələri izləyin</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/surveys/analytics" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
            <Icon name="chart" className="size-4" /> Analitika
          </Link>
          <Link
            href={tab === "templates" ? "/admin/surveys/new?template=1" : "/admin/surveys/new"}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Icon name="plus" className="size-4" /> {tab === "templates" ? "Yeni şablon" : "Yeni sorğu"}
          </Link>
        </div>
      </div>

      <nav className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Status filtrləri">
        <ul className="flex w-max gap-2">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "all" ? "/admin/surveys" : `/admin/surveys?tab=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                  tab === t.key ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"
                }`}
              >
                {t.label}
                <span className={`text-xs ${tab === t.key ? "text-white/70" : "text-muted"}`}>{countFor(t.key)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-medium">Bu bölmədə sorğu yoxdur</p>
          <Link href="/admin/surveys/new" className="mt-3 inline-flex h-10 items-center gap-1 text-sm font-semibold text-brand-700">
            <Icon name="plus" className="size-4" /> Yeni sorğu yarat
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map(({ s, status }) => {
            const audience = resolveAudience(s, users).length;
            const responses = counts.get(s.id) ?? 0;
            const rate = audience ? Math.round((responses / audience) * 100) : 0;
            return (
              <li key={s.id}>
                <Link href={`/admin/surveys/${s.id}`} className="block rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-brand-200 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold leading-snug">{s.title}</h2>
                    <StatusChip status={status} template={s.isTemplate} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {s.questions.length} sual · {describeAudience(s)}
                    {s.endsAt && !s.isTemplate && <> · Son tarix: {formatDate(s.endsAt)}</>}
                    {status === "scheduled" && s.startsAt && <> · Başlayır: {formatDate(s.startsAt)}</>}
                  </p>
                  {(status === "active" || status === "closed") && !s.isTemplate && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {responses}/{audience} · {rate}%
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
