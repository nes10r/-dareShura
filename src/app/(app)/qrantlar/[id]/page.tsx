import Link from "next/link";
import { notFound } from "next/navigation";
import { offerToEveryoneAction, setGroupStatusAction } from "@/app/(app)/admin/grants/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { GrantDeadline, SourceChip } from "@/components/grants/GrantCard";
import { CopyEmails, GroupCreateForm } from "@/components/grants/GroupCreateForm";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { hasPermission, requireUser } from "@/lib/auth";
import { getGrant, listAllSkills, listUsers } from "@/lib/db/repo";
import { avatarUrl, formatDate } from "@/lib/format";
import { getGroupsWithInvitations, type GroupView } from "@/lib/grants/groups";
import { sanitizeNewsHtml } from "@/lib/news-sanitize";
import type { GrantInvitation, User } from "@/lib/types";
import { joinGroupAction, respondGroupAction } from "../actions";

const KIND_LABEL: Record<GrantInvitation["kind"], string> = { invite: "Dəvət", offer: "Təklif", request: "Özü qoşulub" };
const STATUS_STYLE: Record<GrantInvitation["status"], string> = {
  accepted: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  declined: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<GrantInvitation["status"], string> = { accepted: "Qəbul edib", pending: "Cavab gözlənilir", declined: "İmtina edib" };

export default async function GrantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const grant = await getGrant(id);
  if (!grant || grant.hidden) notFound();

  const admin = hasPermission(user, "news.manage");
  const [views, users, allSkills] = await Promise.all([getGroupsWithInvitations(id), listUsers(), admin ? listAllSkills() : Promise.resolve([])]);
  const people = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/qrantlar" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Qrantlar
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SourceChip source={grant.source} />
        <span className="text-xs text-muted">Elan: {formatDate(grant.publishedAt)}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight">{grant.title}</h1>

      <div className="mt-4">
        <GrantDeadline deadline={grant.deadline} />
      </div>

      {(grant.amount || grant.fields.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {grant.amount && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">{grant.amount}</span>}
          {grant.fields.map((f) => (
            <span key={f} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {f}
            </span>
          ))}
        </div>
      )}

      {grant.summary && <p className="mt-4 leading-relaxed text-slate-700">{grant.summary}</p>}

      {grant.documents.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Sənədlər</h2>
          <ul className="space-y-2">
            {grant.documents.map((d) => (
              <li key={d.url}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-white p-3.5 ring-1 ring-line transition hover:ring-emerald-200"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-xs font-bold text-red-600">
                    {/\.pdf/i.test(d.url) ? "PDF" : <Icon name="link" className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">{d.title}</span>
                  <Icon name="arrow-right" className="size-4 text-muted" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grant.bodyHtml && (
        <div className="rich-text mt-6 text-[16px] leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(grant.bodyHtml) }} />
      )}

      {grant.sourceUrl && (
        <a href={grant.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex h-11 items-center gap-2 text-sm font-semibold text-emerald-700">
          <Icon name="link" className="size-4" /> Mənbədə aç
        </a>
      )}

      {/* İşçi qruplar */}
      <section className="mt-8 border-t border-line pt-6" aria-labelledby="groups">
        <h2 id="groups" className="text-lg font-bold">
          İşçi qruplar
        </h2>
        <p className="mt-1 text-sm text-muted">Bu qrant üçün layihə hazırlayan qruplar. Qəbul edənlər qrupun üzvü olur.</p>

        <div className="mt-4 space-y-4">
          {views.map((v) => (
            <GroupCard key={v.group.id} v={v} user={user} people={people} admin={admin} grantId={grant.id} />
          ))}
          {!views.length && !admin && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted ring-1 ring-line">Bu qrant üçün hələ işçi qrup yaradılmayıb.</p>
          )}
          {admin && (
            <GroupCreateForm
              grantId={grant.id}
              defaultTitle={grant.title}
              suggestions={[...new Set([...grant.fields, ...allSkills])]}
              initialSkills={grant.fields}
              people={users.filter((u) => u.id !== user.id).map((u) => ({ id: u.id, name: u.name, skills: u.skills ?? [] }))}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function GroupCard({ v, user, people, admin, grantId }: { v: GroupView; user: User; people: Map<string, User>; admin: boolean; grantId: string }) {
  const mine = v.invitations.find((i) => i.userId === user.id);
  const open = v.group.status === "open";
  const memberUsers = v.members.map((m) => people.get(m.userId)).filter((u): u is User => !!u);

  return (
    <article id={`qrup-${v.group.id}`} className="scroll-mt-20 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{v.group.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {open ? "Formalaşır" : "Formalaşıb"}
        </span>
      </div>
      {v.group.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.group.description}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {v.group.requiredSkills.map((s) => (
          <span key={s} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            {s}
          </span>
        ))}
      </div>

      {/* Üzvlər */}
      <div className="mt-4 flex items-center gap-3">
        <span className="flex">
          {memberUsers.slice(0, 6).map((u, i) => (
            <Avatar key={u.id} name={u.name} src={avatarUrl(u)} size="sm" className={`ring-2 ring-white ${i ? "-ml-2" : ""}`} />
          ))}
        </span>
        <span className="text-sm text-muted">
          {memberUsers.length ? `${memberUsers.length}${v.group.targetSize ? ` / ${v.group.targetSize}` : ""} üzv` : "Hələ üzv yoxdur"}
          {v.group.respondBy && open && ` · Cavab: ${formatDate(v.group.respondBy)}-dək`}
        </span>
      </div>
      {memberUsers.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl bg-surface">
          {memberUsers.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-3 py-2">
              <Avatar name={u.name} src={avatarUrl(u)} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.name}</span>
                <span className="block truncate text-xs text-muted">{(u.skills ?? []).join(", ") || u.position}</span>
              </span>
              <a href={`mailto:${u.email}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink" aria-label={`${u.name} — e-poçt`}>
                <Icon name="link" className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* İstifadəçinin vəziyyəti */}
      <div className="mt-4">
        {mine?.status === "accepted" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            <span className="flex items-center gap-2 font-medium">
              <Icon name="check" className="size-4" /> Siz bu qrupun üzvüsünüz
            </span>
            {open && (
              <form action={respondGroupAction.bind(null, v.group.id, false)}>
                <ConfirmSubmit message="Qrupdan çıxmaq istəyirsiniz?" className="text-sm font-semibold text-emerald-900 underline underline-offset-2">
                  Qrupdan çıx
                </ConfirmSubmit>
              </form>
            )}
          </div>
        ) : mine?.status === "pending" && open ? (
          <div className="rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900">
            <p>
              {mine.kind === "invite" ? (
                <>
                  <b>{mine.matchedSkills.join(", ")}</b> sahəsi üzrə peşəkarlığınıza görə dəvət almısınız.
                </>
              ) : (
                "Bu işçi qrupa qoşulmaq üçün təklif almısınız."
              )}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
              <form action={respondGroupAction.bind(null, v.group.id, true)} className="grid">
                <button type="submit" className="h-11 rounded-xl bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800">
                  Qəbul edirəm
                </button>
              </form>
              <form action={respondGroupAction.bind(null, v.group.id, false)} className="grid">
                <button type="submit" className="h-11 rounded-xl bg-white px-5 font-semibold ring-1 ring-amber-200 hover:bg-amber-100/50">
                  İmtina
                </button>
              </form>
            </div>
          </div>
        ) : open ? (
          <form action={joinGroupAction.bind(null, v.group.id)}>
            <button type="submit" className="h-11 w-full rounded-xl bg-white px-5 font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50 sm:w-auto">
              {mine?.status === "declined" ? "Fikrimi dəyişdim — qoşuluram" : "Qoşulmaq istəyirəm"}
            </button>
          </form>
        ) : null}
      </div>

      {/* Admin: dəvətlərin vəziyyəti və idarəetmə */}
      {admin && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-xs text-muted">
            {v.group.mode === "matched" ? "Bacarığa görə dəvət" : "Uyğun bacarıq tapılmadı — hamıya təklif"} · Qəbul {v.members.length} · Gözləyir {v.pending} · İmtina{" "}
            {v.declined}
          </p>
          <details className="group mt-2">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-emerald-700 [&::-webkit-details-marker]:hidden">
              <Icon name="chevron-right" className="size-4 transition group-open:rotate-90" /> Bildiriş göndərilənlər ({v.invitations.length})
            </summary>
            <ul className="mt-2 divide-y divide-line rounded-xl bg-surface">
              {v.invitations.map((inv) => {
                const u = people.get(inv.userId);
                return (
                  <li key={inv.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u?.name ?? "Silinmiş istifadəçi"}</span>
                      <span className="block truncate text-xs text-muted">
                        {KIND_LABEL[inv.kind]}
                        {inv.matchedSkills.length ? ` · ${inv.matchedSkills.join(", ")}` : ""}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                  </li>
                );
              })}
            </ul>
          </details>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyEmails emails={memberUsers.map((u) => u.email)} />
            {open && (
              <form action={offerToEveryoneAction.bind(null, grantId, v.group.id)}>
                <ConfirmSubmit
                  message="Hələ bildiriş almamış bütün üzvlərə açıq təklif göndərilsin?"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold ring-1 ring-line hover:bg-slate-50"
                >
                  <Icon name="megaphone" className="size-4" /> Hamıya təklif göndər
                </ConfirmSubmit>
              </form>
            )}
            <form action={setGroupStatusAction.bind(null, grantId, v.group.id, open ? "closed" : "open")}>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
                <Icon name={open ? "lock" : "users"} className="size-4" /> {open ? "Qrupu bağla" : "Yenidən aç"}
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
