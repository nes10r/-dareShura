import type { Metadata } from "next";
import Link from "next/link";
import { GrantEditor, GrantSyncButton, ManualGrantForm } from "@/components/admin/GrantAdmin";
import { SourceChip } from "@/components/grants/GrantCard";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { listAllSkills, listGrants } from "@/lib/db/repo";
import { formatDate, formatDateTime } from "@/lib/format";
import { getGroupsWithInvitations } from "@/lib/grants/groups";
import { getLastGrantSync, isCurrentGrant } from "@/lib/grants/source";

export const metadata: Metadata = { title: "Qrantların idarə edilməsi" };
export const maxDuration = 60;

export default async function AdminGrantsPage() {
  await requirePermission("news.manage");
  const [grants, last, skills, views] = await Promise.all([listGrants({ includeHidden: true }), getLastGrantSync(), listAllSkills(), getGroupsWithInvitations()]);
  const groupsBy = (id: string) => views.filter((v) => v.group.grantId === id);
  const current = grants.filter((g) => isCurrentGrant(g));
  const past = grants.filter((g) => !isCurrentGrant(g));
  const noDeadline = current.filter((g) => !g.deadline).length;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:pt-10">
      <h1 className="text-2xl font-bold tracking-tight">Qrantlar</h1>
      <p className="mt-1 text-sm text-muted">
        Mənbələr: Azərbaycan Elm Fondu (aef.gov.az), UNEC müsabiqə elanları · Son yoxlama: {last ? formatDateTime(last.at) : "hələ olmayıb"}
      </p>

      <div className="mt-5 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
        <GrantSyncButton />
        <p className="text-xs text-muted">
          Sayt 12 saatdan bir avtomatik yenilənir. Elm Fondunun şərtləri PDF-dədir — son tarixi və məbləği aşağıda əl ilə daxil edin.
          {last?.unecBlocked && " UNEC saytı serverdən gələn sorğuları bloklayır — UNEC qrantları üçün Azərbaycandakı kompüterdən npm run konfrans:sync işlədin."}
        </p>
      </div>

      {noDeadline > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <Icon name="bell" className="mt-0.5 size-4 shrink-0" />
          {noDeadline} aktual müsabiqədə son tarix qeyd olunmayıb. Elan sənədindən (PDF) baxıb daxil etsəniz, üzvlər geri sayımı görəcək.
        </p>
      )}

      <div className="mt-4">
        <ManualGrantForm suggestions={skills} />
      </div>

      {[
        { title: "Aktual", items: current },
        { title: "Bitmiş", items: past },
      ].map((sec) => (
        <section key={sec.title} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            {sec.title} · {sec.items.length}
          </h2>
          <ul className="space-y-2">
            {sec.items.map((g) => {
              const gs = groupsBy(g.id);
              return (
                <li key={g.id}>
                  <details className={`group overflow-hidden rounded-2xl bg-white ring-1 ring-line ${g.hidden ? "opacity-60" : ""}`}>
                    <summary className="flex cursor-pointer list-none gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{g.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <SourceChip source={g.source} />
                          <span className={`rounded-full px-2.5 py-0.5 font-medium ${g.deadline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                            {g.deadline ? `Son tarix: ${formatDate(g.deadline)}` : "Son tarix yoxdur"}
                          </span>
                          {gs.length > 0 && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                              {gs.length} işçi qrup · {gs.reduce((n, v) => n + v.members.length, 0)} üzv
                            </span>
                          )}
                          {g.hidden && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-500">Gizlədilib</span>}
                        </div>
                      </div>
                      <Icon name="chevron-right" className="mt-1 size-5 shrink-0 text-muted transition group-open:rotate-90" />
                    </summary>
                    <div className="flex flex-wrap gap-4 px-4 pb-2 text-sm">
                      <Link href={`/qrantlar/${g.id}`} className="font-semibold text-emerald-700 underline underline-offset-2">
                        Qrant səhifəsi və işçi qruplar
                      </Link>
                      {g.sourceUrl && (
                        <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-muted underline underline-offset-2">
                          Mənbə
                        </a>
                      )}
                    </div>
                    <GrantEditor g={g} suggestions={skills} />
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
