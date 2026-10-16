import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { CollabRequestButton } from "@/components/research/CollabRequestButton";
import { OpenBadge } from "@/components/research/ResearcherCard";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { requireUser } from "@/lib/auth";
import { findUserById, listCollabRequests, listPublications } from "@/lib/db/repo";
import { avatarUrl, formatDate } from "@/lib/format";
import { PUBLICATION_TYPES } from "@/lib/research";
import { refreshPublicationsIfStale } from "@/lib/research-sync";
import type { Publication } from "@/lib/types";

export const maxDuration = 30;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const u = await findUserById((await params).id);
  return u ? { title: u.name } : {};
}

const key = (s: string) => s.toLocaleLowerCase("az");
const SHOW = 8;

function PublicationItem({ p }: { p: Publication }) {
  return (
    <li className="py-3">
      {p.url ? (
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium leading-snug hover:text-emerald-700 hover:underline">
          {p.title}
        </a>
      ) : (
        <p className="font-medium leading-snug">{p.title}</p>
      )}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {p.venue && <span className="italic">{p.venue}</span>}
        {p.year && <span>· {p.year}</span>}
        {p.type && PUBLICATION_TYPES[p.type] && <span>· {PUBLICATION_TYPES[p.type]}</span>}
        {p.citedBy > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{p.citedBy} istinad</span>}
        {p.openAccess && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">Açıq giriş</span>}
      </p>
    </li>
  );
}

export default async function ResearcherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const user = await findUserById(id);
  if (!user) notFound();

  // Nəşrlər bir həftədən köhnədirsə — cavabı gözlətmədən fonda yenilə
  after(() => refreshPublicationsIfStale(user.id).catch(() => {}));

  const [pubs, requests] = await Promise.all([listPublications(user.id), listCollabRequests(me.id)]);
  const self = me.id === user.id;
  const stats = user.researchStats;
  const shared = (user.skills ?? []).filter((s) => (me.skills ?? []).some((m) => key(m) === key(s)));
  const between = requests.filter((r) => (r.fromUserId === me.id && r.toUserId === user.id) || (r.fromUserId === user.id && r.toUserId === me.id));
  const accepted = between.find((r) => r.status === "accepted");
  const pendingOut = between.find((r) => r.fromUserId === me.id && r.status === "pending");
  const pendingIn = between.find((r) => r.fromUserId === user.id && r.status === "pending");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/tedqiqatcilar" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Tədqiqatçılar
      </Link>

      {/* Başlıq */}
      <section className="mt-2 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar name={user.name} src={avatarUrl(user)} size="xl" className="!size-24 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
            <p className="mt-0.5 text-slate-600">{[user.academicTitle, user.position].filter(Boolean).join(", ")}</p>
            <p className="text-sm text-muted">{user.faculty}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {user.openToCollab && <OpenBadge />}
              {user.orcid && (
                <a href={`https://orcid.org/${user.orcid}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-lime-50 px-2.5 py-0.5 text-xs font-semibold text-lime-800 ring-1 ring-lime-200 hover:bg-lime-100">
                  ORCID {user.orcid}
                </a>
              )}
              {user.scholarUrl && (
                <a href={user.scholarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100">
                  Google Scholar
                </a>
              )}
            </div>
          </div>
        </div>

        {stats && (
          <dl className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-surface p-3 text-center">
            {[
              ["Nəşr", stats.works],
              ["İstinad", stats.citations],
              ["h-indeks", stats.hIndex],
              ["i10-indeks", stats.i10Index],
            ].map(([l, v]) => (
              <div key={l as string}>
                <dd className="text-xl font-bold tabular-nums">{v}</dd>
                <dt className="text-[11px] text-muted">{l}</dt>
              </div>
            ))}
          </dl>
        )}
        {stats && (
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 text-[11px] text-muted sm:justify-start">
            <span title="İstinadlar DOI üzrə OpenAlex açıq bazasından hesablanır; Google Scholar-dakı rəqəmlərdən fərqlənə bilər">
              İstinad və indekslər OpenAlex üzrə
            </span>
            {user.scholarUrl && (
              <>
                ·
                <a href={user.scholarUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 underline underline-offset-2">
                  Google Scholar göstəriciləri
                </a>
              </>
            )}
          </p>
        )}

        {/* Əməkdaşlıq */}
        <div className="mt-5">
          {self ? (
            <Link href="/profile#elmi-profil" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold ring-1 ring-line hover:bg-slate-50">
              <Icon name="settings" className="size-5" /> Elmi profili redaktə et
            </Link>
          ) : accepted ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <p className="font-semibold">Əməkdaşlıq razılaşdırılıb · {accepted.topic}</p>
              <a href={`mailto:${user.email}`} className="mt-0.5 inline-block font-medium text-brand-700 underline underline-offset-2">
                {user.email}
              </a>
            </div>
          ) : pendingIn ? (
            <Link href="/tedqiqatcilar" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-50 font-semibold text-amber-900 ring-1 ring-amber-200">
              Sizə təklif göndərib — cavab verin <Icon name="chevron-right" className="size-4" />
            </Link>
          ) : pendingOut ? (
            <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
              «{pendingOut.topic}» mövzusunda təklifiniz cavab gözləyir · {formatDate(pendingOut.createdAt)}
            </p>
          ) : (
            <CollabRequestButton toUserId={user.id} toName={user.name} topics={user.skills ?? []} shared={shared} full />
          )}
        </div>
      </section>

      {user.bio && (
        <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Haqqında</h2>
          <p className="whitespace-pre-line leading-relaxed text-slate-700">{user.bio}</p>
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Elmi maraqlar</h2>
        {(user.skills ?? []).length ? (
          <div className="flex flex-wrap gap-1.5">
            {(user.skills ?? []).map((s) => (
              <Link
                key={s}
                href={`/tedqiqatcilar?sahe=${encodeURIComponent(s)}`}
                className={`rounded-full px-3 py-1 text-sm font-medium transition hover:ring-2 hover:ring-emerald-200 ${
                  shared.includes(s) && !self ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
                title={`"${s}" sahəsində çalışan digər tədqiqatçılar`}
              >
                {s}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Qeyd olunmayıb.</p>
        )}
        {shared.length > 0 && !self && <p className="mt-2 text-xs text-emerald-700">Yaşıl sahələr sizin profilinizdə də var.</p>}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Nəşrlər{pubs.length ? ` · ${pubs.length}` : ""}</h2>
          {user.pubsSyncedAt && <span className="text-[11px] text-muted">ORCID · OpenAlex · {formatDate(user.pubsSyncedAt)}</span>}
        </div>
        {pubs.length ? (
          <>
            <ul className="divide-y divide-line">{pubs.slice(0, SHOW).map((p) => <PublicationItem key={p.id} p={p} />)}</ul>
            {pubs.length > SHOW && (
              <details className="group">
                <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-1 rounded-xl text-sm font-semibold text-emerald-700 hover:bg-emerald-50 [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Hamısını göstər (+{pubs.length - SHOW})</span>
                  <span className="hidden group-open:inline">Gizlət</span>
                </summary>
                <ul className="divide-y divide-line">{pubs.slice(SHOW).map((p) => <PublicationItem key={p.id} p={p} />)}</ul>
              </details>
            )}
          </>
        ) : (
          <p className="py-2 text-sm text-muted">
            {user.orcid
              ? "ORCID profilində açıq nəşr tapılmadı."
              : self
                ? "ORCID-inizi əlavə edin — nəşrləriniz avtomatik gələcək."
                : "Nəşrlər hələ əlavə olunmayıb."}
          </p>
        )}
      </section>
    </div>
  );
}
