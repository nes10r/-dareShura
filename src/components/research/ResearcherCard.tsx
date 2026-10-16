import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { avatarUrl } from "@/lib/format";
import type { User } from "@/lib/types";

export function OpenBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 ${className}`}>
      <span className="size-1.5 rounded-full bg-emerald-500" /> Əməkdaşlığa açıq
    </span>
  );
}

/** Kataloq kartı: şəkil, ad, vəzifə, sahələr (uyğun gələnlər vurğulanır), göstəricilər */
export function ResearcherCard({ user, matched, me }: { user: User; matched: string[]; me: boolean }) {
  const hit = new Set(matched.map((m) => m.toLocaleLowerCase("az")));
  const skills = [...(user.skills ?? [])].sort((a, b) => Number(hit.has(b.toLocaleLowerCase("az"))) - Number(hit.has(a.toLocaleLowerCase("az"))));
  const stats = user.researchStats;

  return (
    <Link
      href={`/tedqiqatcilar/${user.id}`}
      className="group flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-emerald-200 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Avatar name={user.name} src={avatarUrl(user)} size="lg" className="!size-14 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover:text-emerald-700">
            {user.name} {me && <span className="text-xs font-normal text-muted">(siz)</span>}
          </p>
          <p className="truncate text-sm text-muted">{[user.academicTitle, user.position].filter(Boolean).join(", ")}</p>
          <p className="truncate text-xs text-muted">{user.faculty}</p>
          {user.openToCollab && <OpenBadge className="mt-1.5" />}
        </div>
      </div>

      {skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((s) => (
            <span
              key={s}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${hit.has(s.toLocaleLowerCase("az")) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {s}
            </span>
          ))}
          {skills.length > 5 && <span className="px-1 text-xs text-muted">+{skills.length - 5}</span>}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Elmi maraqlar qeyd olunmayıb</p>
      )}

      {stats && (
        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-center" title="OpenAlex üzrə">
          {[
            ["Nəşr", stats.works],
            ["İstinad", stats.citations],
            ["h-indeks", stats.hIndex],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dd className="text-sm font-bold tabular-nums">{v}</dd>
              <dt className="text-[11px] text-muted">{l}</dt>
            </div>
          ))}
        </dl>
      )}
    </Link>
  );
}
