import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { GrantInviteCard, SkillsNudgeCard } from "@/components/dashboard/GrantInviteCard";
import { GrantCard } from "@/components/grants/GrantCard";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { listGrants, listInvitationsByUser } from "@/lib/db/repo";
import { getGroupsWithInvitations } from "@/lib/grants/groups";
import { isCurrentGrant, syncGrantsIfStale } from "@/lib/grants/source";

export const metadata: Metadata = { title: "Qrantlar" };
export const maxDuration = 60;

export default async function GrantsPage() {
  const user = await requireUser();
  after(() => syncGrantsIfStale().catch((e) => console.error("[qrantlar] sinxronizasiya:", e)));

  const [grants, myInvites, views] = await Promise.all([listGrants(), listInvitationsByUser(user.id), getGroupsWithInvitations()]);
  const byGrant = new Map(grants.map((g) => [g.id, g]));
  const mine = new Map(myInvites.map((i) => [i.groupId, i]));

  const pending = views.filter((v) => v.group.status === "open" && mine.get(v.group.id)?.status === "pending");
  const memberOf = views.filter((v) => mine.get(v.group.id)?.status === "accepted");

  const groupState = (grantId: string) => {
    const gv = views.filter((v) => v.group.grantId === grantId);
    if (gv.some((v) => mine.get(v.group.id)?.status === "accepted")) return "member" as const;
    if (gv.some((v) => v.group.status === "open")) return "open" as const;
    return null;
  };

  const current = grants.filter((g) => isCurrentGrant(g)).sort((a, b) => {
    // Son tarixi yaxın olanlar əvvəl, tarixi bilinməyənlər sonra
    const ad = a.deadline ? Date.parse(a.deadline) : Infinity;
    const bd = b.deadline ? Date.parse(b.deadline) : Infinity;
    return ad - bd || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
  const past = grants.filter((g) => !isCurrentGrant(g));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
      <h1 className="text-2xl font-bold tracking-tight">Qrantlar</h1>
      <p className="mt-1 text-muted">Qrant müsabiqələri və onlar üçün formalaşan işçi qruplar</p>

      {pending.length > 0 && (
        <section className="mt-6 space-y-3" aria-labelledby="invites">
          <h2 id="invites" className="text-sm font-semibold uppercase tracking-wider text-muted">
            Cavab gözləyir · {pending.length}
          </h2>
          {pending.map((v) => {
            const g = byGrant.get(v.group.grantId);
            const inv = mine.get(v.group.id)!;
            return g ? (
              <GrantInviteCard
                key={v.group.id}
                data={{
                  groupId: v.group.id,
                  grantId: g.id,
                  grantTitle: g.title,
                  groupTitle: v.group.title,
                  description: v.group.description,
                  kind: inv.kind,
                  matchedSkills: inv.matchedSkills,
                  requiredSkills: v.group.requiredSkills,
                  memberCount: v.members.length,
                  targetSize: v.group.targetSize,
                  respondBy: v.group.respondBy,
                  deadline: g.deadline,
                }}
              />
            ) : null;
          })}
        </section>
      )}

      {!(user.skills ?? []).length && current.length > 0 && (
        <div className="mt-6">
          <SkillsNudgeCard grantCount={current.length} />
        </div>
      )}

      {memberOf.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">İşçi qruplarım</h2>
          <ul className="space-y-2">
            {memberOf.map((v) => (
              <li key={v.group.id}>
                <Link
                  href={`/qrantlar/${v.group.grantId}#qrup-${v.group.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-emerald-200"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon name="users" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{v.group.title}</span>
                    <span className="block text-xs text-muted">
                      {v.members.length} üzv · {v.group.status === "open" ? "formalaşır" : "formalaşıb"}
                    </span>
                  </span>
                  <Icon name="chevron-right" className="size-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Aktual müsabiqələr · {current.length}</h2>
        {current.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {current.map((g) => <GrantCard key={g.id} g={g} groupState={groupState(g.id)} />)}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-8 text-center text-muted ring-1 ring-line">Hazırda aktual qrant müsabiqəsi yoxdur.</p>
        )}
      </section>

      {past.length > 0 && (
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" className="size-4 transition group-open:rotate-90" /> Bitmiş müsabiqələr · {past.length}
          </summary>
          <div className="mt-3 grid gap-4 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((g) => <GrantCard key={g.id} g={g} groupState={groupState(g.id)} />)}
          </div>
        </details>
      )}
    </div>
  );
}
