import type { Metadata } from "next";
import Link from "next/link";
import { FeeChip, FormatChip } from "@/components/conferences/ConferenceCard";
import { ConferenceEditor, SyncButton } from "@/components/admin/ConferenceEditor";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { getLastSync } from "@/lib/conferences/source";
import { compareCurrent, deadlineState, isCurrent } from "@/lib/conferences/view";
import { listConferences } from "@/lib/db/repo";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Konfransların idarə edilməsi" };
// "Yenidən oxu" bir neçə saniyə çəkə bilər
export const maxDuration = 60;

export default async function AdminConferencesPage() {
  await requirePermission("news.manage");
  const [all, last] = await Promise.all([listConferences({ includeHidden: true }), getLastSync()]);
  const current = all.filter((c) => isCurrent(c)).sort(compareCurrent);
  const past = all.filter((c) => !isCurrent(c));
  const missing = current.filter((c) => !c.deadline || !c.format || !c.fee).length;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konfranslar</h1>
          <p className="mt-1 text-sm text-muted">
            Mənbə: news.unec.edu.az/elan/86-konfrans · Son yoxlama: {last ? formatDateTime(last.at) : "hələ olmayıb"}
          </p>
        </div>
        <Link href="/konfranslar" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
          <Icon name="link" className="size-4" /> Saytda bax
        </Link>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-line">
        <SyncButton />
        <p className="mt-3 text-xs text-muted">
          Sayt 6 saatdan bir avtomatik yenilənir. Tarix, format və ödəniş elan mətnindən avtomatik müəyyən edilir; səhv olarsa, aşağıda düzəldin —
          düzəlişləriniz yenilənmədə silinmir.
        </p>
      </div>

      {missing > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <Icon name="bell" className="mt-0.5 size-4 shrink-0" />
          Aktual {current.length} konfransdan {missing}-ində son tarix, format və ya ödəniş elanda tapılmayıb. Mənbədən yoxlayıb əl ilə əlavə edə bilərsiniz.
        </p>
      )}

      {[
        { title: "Aktual", items: current },
        { title: "Keçmiş", items: past },
      ].map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            {group.title} · {group.items.length}
          </h2>
          <ul className="space-y-2">
            {group.items.map((c) => (
              <li key={c.id}>
                <details className={`group overflow-hidden rounded-2xl bg-white ring-1 ring-line ${c.hidden ? "opacity-60" : ""}`}>
                  <summary className="flex cursor-pointer list-none gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{c.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {c.startsAt ? formatDate(c.startsAt) : "Tarix yoxdur"} · {c.location ?? "Məkan yoxdur"}
                        {c.hidden && " · Gizlədilib"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <FormatChip format={c.format} />
                        <FeeChip c={c} />
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            deadlineState(c) === "open" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.deadline ? `Deadline: ${formatDate(c.deadline)}` : "Deadline yoxdur"}
                        </span>
                        {Object.keys(c.overrides).length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Əl ilə düzəldilib</span>
                        )}
                      </div>
                    </div>
                    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition group-open:rotate-90">
                      <Icon name="chevron-right" className="size-5" />
                    </span>
                  </summary>
                  <div className="px-4 pb-1">
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-700 underline underline-offset-2">
                      Mənbədə aç
                    </a>
                  </div>
                  <ConferenceEditor c={c} />
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
