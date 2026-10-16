import type { Metadata } from "next";
import Link from "next/link";
import { deleteCallAction } from "@/app/(app)/jurnallar/actions";
import { ConfirmButton } from "@/components/books/EditorControls";
import { JournalTabs } from "@/components/journals/JournalTabs";
import { ShareCallButton } from "@/components/journals/ShareCallButton";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { hasPermission, requireUser } from "@/lib/auth";
import { listActiveCalls, listAllSkills, listUsers } from "@/lib/db/repo";
import { avatarUrl, formatDate } from "@/lib/format";
import { matchSkills } from "@/lib/skills";

export const metadata: Metadata = { title: "Xüsusi buraxılışlar" };

const daysLeft = (iso: string | null) => (iso ? Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000) : null);

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ q?: string; uygun?: string }> }) {
  const user = await requireUser();
  const { q = "", uygun } = await searchParams;
  const [calls, users, suggestions] = await Promise.all([listActiveCalls(), listUsers(), listAllSkills()]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const mySkills = user.skills ?? [];
  const canModerate = hasPermission(user, "news.manage");

  const needle = q.toLocaleLowerCase("az").trim();
  let list = calls.map((c) => ({ c, matched: matchSkills(mySkills, c.topics) }));
  if (uygun === "1") list = list.filter((x) => x.matched.length);
  if (needle) list = list.filter(({ c }) => [c.title, c.journalTitle, c.note, ...c.topics].join(" ").toLocaleLowerCase("az").includes(needle));
  const matchedCount = calls.filter((c) => matchSkills(mySkills, c.topics).length).length;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xüsusi buraxılışlar</h1>
          <p className="mt-1 text-muted">Jurnalların xüsusi buraxılışlarına məqalə çağırışları — son tarix keçəndə avtomatik gizlənir</p>
        </div>
        <ShareCallButton suggestions={suggestions} />
      </div>
      <JournalTabs active="calls" callCount={calls.length} />

      <form className="mt-5 flex flex-wrap items-center gap-2" role="search" action="/jurnallar/cagirislar">
        {uygun === "1" && <input type="hidden" name="uygun" value="1" />}
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Mövzu və ya jurnal üzrə axtar"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
        {mySkills.length > 0 && (
          <Link
            href={`/jurnallar/cagirislar?${new URLSearchParams({ ...(q ? { q } : {}), ...(uygun === "1" ? {} : { uygun: "1" }) })}`}
            aria-pressed={uygun === "1"}
            className={`inline-flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition ${uygun === "1" ? "bg-sky-700 text-white" : "bg-white text-slate-700 ring-1 ring-line hover:bg-slate-50"}`}
          >
            Sahəmə uyğun{matchedCount ? ` · ${matchedCount}` : ""}
          </Link>
        )}
      </form>

      {list.length ? (
        <ul className="mt-4 space-y-3">
          {list.map(({ c, matched }) => {
            const d = daysLeft(c.deadline);
            const author = c.createdBy ? byId.get(c.createdBy) : undefined;
            const urgent = d != null && d <= 14;
            return (
              <li key={c.id} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:gap-4 sm:p-5">
                {/* Son tarix: geri sayım */}
                <div className={`flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center ${urgent ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200" : "bg-sky-50 text-sky-900"}`}>
                  <span className="text-xl font-bold leading-none tabular-nums">{d ?? "—"}</span>
                  <span className="mt-1 text-[10px] font-medium">{d == null ? "tarix yox" : d === 0 ? "bu gün" : "gün qalıb"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p lang="en" className="text-xs font-semibold uppercase tracking-wider text-sky-800">{c.journalTitle}</p>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block font-semibold leading-snug hover:text-sky-800 hover:underline">
                    {c.title}
                  </a>
                  <p className="mt-1 text-xs text-muted">Son tarix: {formatDate(c.deadline)}</p>
                  {c.note && <p className="mt-1.5 text-sm text-slate-700">{c.note}</p>}
                  {c.topics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.topics.map((t) => (
                        <span key={t} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${matched.includes(t) ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {author && (
                      <Link href={`/tedqiqatcilar/${author.id}`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
                        <Avatar name={author.name} src={avatarUrl(author)} size="xs" /> {author.name} paylaşıb
                      </Link>
                    )}
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-800 hover:underline">
                      Çağırışa bax <Icon name="arrow-right" className="size-3.5" />
                    </a>
                    {(c.createdBy === user.id || canModerate) && (
                      <form action={deleteCallAction.bind(null, c.id)} className="ml-auto">
                        <ConfirmButton message="Bu çağırış silinsin?" className="h-8 rounded-lg px-2.5 text-xs font-medium text-muted hover:bg-red-50 hover:text-red-600">
                          Sil
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl bg-white p-8 text-center ring-1 ring-line">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
            <Icon name="megaphone" className="size-6" />
          </span>
          <p className="mt-3 font-medium">{calls.length ? "Bu filtrə uyğun çağırış yoxdur" : "Hələ çağırış paylaşılmayıb"}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Jurnal axtarışında hər jurnalın kartında «Xüsusi buraxılışlar» linki var — maraqlı çağırış tapsanız, həmkarlarınızla paylaşın.
          </p>
        </div>
      )}
    </div>
  );
}
