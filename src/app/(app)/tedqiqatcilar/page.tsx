import type { Metadata } from "next";
import Link from "next/link";
import { AcceptedCollab, IncomingCollab, OutgoingCollab } from "@/components/research/CollabRequests";
import { ResearcherCard } from "@/components/research/ResearcherCard";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { listCollabRequests, listUsers } from "@/lib/db/repo";
import { searchResearchers, topSkills } from "@/lib/researchers";

export const metadata: Metadata = { title: "Tədqiqatçılar" };

export default async function ResearchersPage({ searchParams }: { searchParams: Promise<{ q?: string; sahe?: string; aciq?: string }> }) {
  const user = await requireUser();
  const { q = "", sahe = "", aciq } = await searchParams;
  const openOnly = aciq === "1";
  const [users, requests] = await Promise.all([listUsers(), listCollabRequests(user.id)]);
  const byId = new Map(users.map((u) => [u.id, u]));

  const hits = searchResearchers(users, { q, skill: sahe, openOnly });
  const skills = topSkills(users);
  const filtering = !!(q || sahe || openOnly);

  const incoming = requests.filter((r) => r.toUserId === user.id && r.status === "pending");
  const accepted = requests.filter((r) => r.status === "accepted");
  const outgoing = requests.filter((r) => r.fromUserId === user.id && r.status !== "accepted");

  const href = (p: { sahe?: string | null; aciq?: boolean }) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    const sk = p.sahe === undefined ? sahe : p.sahe;
    if (sk) s.set("sahe", sk);
    if (p.aciq ?? openOnly) s.set("aciq", "1");
    return `/tedqiqatcilar${s.size ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tədqiqatçılar</h1>
          <p className="mt-1 text-muted">Həmkarlarınızı elmi sahəyə görə tapın və birgə işləməyi təklif edin</p>
        </div>
        <Link href={`/tedqiqatcilar/${user.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
          <Icon name="user" className="size-4" /> Mənim profilim
        </Link>
      </div>

      {/* Əməkdaşlıq təklifləri */}
      {(incoming.length > 0 || accepted.length > 0 || outgoing.length > 0) && (
        <section className="mt-6 space-y-3" aria-labelledby="collab">
          <h2 id="collab" className="text-sm font-semibold uppercase tracking-wider text-muted">
            Əməkdaşlıq təklifləri
          </h2>
          {incoming.map((r) => byId.get(r.fromUserId) && <IncomingCollab key={r.id} r={r} from={byId.get(r.fromUserId)!} />)}
          {accepted.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">Əlaqə məlumatı açıq olanlar</p>
              {accepted.map((r) => {
                const other = byId.get(r.fromUserId === user.id ? r.toUserId : r.fromUserId);
                return other ? <AcceptedCollab key={r.id} r={r} other={other} iAmSender={r.fromUserId === user.id} /> : null;
              })}
            </div>
          )}
          {outgoing.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted [&::-webkit-details-marker]:hidden">
                <Icon name="chevron-right" className="size-4 transition group-open:rotate-90" /> Göndərdiklərim · {outgoing.length}
              </summary>
              <div className="mt-2 space-y-2">{outgoing.map((r) => byId.get(r.toUserId) && <OutgoingCollab key={r.id} r={r} to={byId.get(r.toUserId)!} />)}</div>
            </details>
          )}
        </section>
      )}

      {/* Axtarış */}
      <form className="mt-6" role="search" action="/tedqiqatcilar">
        {sahe && <input type="hidden" name="sahe" value={sahe} />}
        {openOnly && <input type="hidden" name="aciq" value="1" />}
        <div className="relative">
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Sahə, ad və ya fakültə: məs. Ekonometrika"
            className="h-12 w-full rounded-xl border border-line bg-white pl-4 pr-28 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
          <button type="submit" className="absolute inset-y-1.5 right-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
            Axtar
          </button>
        </div>
      </form>

      {/* Filtrlər — sətrə sığır, yana sürüşmür */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Link
          href={href({ aciq: !openOnly })}
          aria-pressed={openOnly}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${
            openOnly ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-line hover:bg-slate-50"
          }`}
        >
          <span className={`size-2 rounded-full ${openOnly ? "bg-white" : "bg-emerald-500"}`} /> Əməkdaşlığa açıq
        </Link>
        {skills.map((s) => {
          const active = sahe.toLocaleLowerCase("az") === s.label.toLocaleLowerCase("az");
          return (
            <Link
              key={s.label}
              href={href({ sahe: active ? null : s.label })}
              aria-pressed={active}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition ${
                active ? "bg-ink font-semibold text-white" : "bg-white text-slate-700 ring-1 ring-line hover:bg-slate-50"
              }`}
            >
              {s.label} <span className={`text-xs ${active ? "text-white/70" : "text-muted"}`}>{s.n}</span>
            </Link>
          );
        })}
        {filtering && (
          <Link href="/tedqiqatcilar" className="inline-flex h-9 items-center gap-1 px-2 text-sm font-medium text-muted hover:text-ink">
            <Icon name="x" className="size-4" /> Təmizlə
          </Link>
        )}
      </div>

      <p className="mt-5 text-sm text-muted">
        {filtering ? `${hits.length} nəticə` : `${hits.length} tədqiqatçı`}
        {sahe && (
          <>
            {" "}
            · sahə: <b className="text-ink">{sahe}</b>
          </>
        )}
      </p>

      {hits.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hits.map((h) => (
            <ResearcherCard key={h.user.id} user={h.user} matched={h.matched} me={h.user.id === user.id} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-white p-8 text-center ring-1 ring-line">
          <p className="font-medium">Heç kim tapılmadı</p>
          <p className="mt-1 text-sm text-muted">Başqa sahə yazın və ya filtrləri təmizləyin.</p>
        </div>
      )}

      {!(user.skills ?? []).length && (
        <Link href="/profile#elmi-profil" className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-sm text-emerald-900 hover:bg-emerald-50">
          <Icon name="user" className="size-5 shrink-0" />
          <span className="flex-1">Sizi də tapa bilsinlər — profilinizdə elmi maraqlarınızı və ORCID-inizi qeyd edin.</span>
          <Icon name="chevron-right" className="size-5" />
        </Link>
      )}
    </div>
  );
}
