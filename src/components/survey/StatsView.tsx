import { Avatar } from "@/components/ui/Avatar";
import type { QuestionStats } from "@/lib/surveys/service";

const TYPE_LABEL = { single: "Tək seçim", multiple: "Çox seçim", scale: "Şkala", text: "Açıq sual" } as const;

export type Person = { name: string; avatar: string | null };

/** Yığcam üst-üstə şəkillər — "kim səs verib" */
function AvatarStack({ ids, people, max = 5 }: { ids: string[]; people: Record<string, Person>; max?: number }) {
  const shown = ids.slice(0, max);
  return (
    <span className="flex items-center">
      {shown.map((id, i) => {
        const p = people[id] ?? { name: "Silinmiş istifadəçi", avatar: null };
        return <Avatar key={id} name={p.name} src={p.avatar} size="xs" className={`ring-2 ring-white ${i ? "-ml-2" : ""}`} />;
      })}
      {ids.length > max && (
        <span className="-ml-2 grid size-7 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600 ring-2 ring-white">
          +{ids.length - max}
        </span>
      )}
    </span>
  );
}

/** Variantı seçənlər: şəkillərə toxunduqda siyahı açılır (JS-siz, <details>) */
function Voters({ ids, people }: { ids: string[]; people: Record<string, Person> }) {
  if (!ids.length) return null;
  return (
    <details className="group mt-2">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-full py-1 pr-2 text-xs text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <AvatarStack ids={ids} people={people} />
        <span className="group-open:hidden">Kimlər seçib</span>
        <span className="hidden group-open:inline">Bağla</span>
      </summary>
      <ul className="mt-2 divide-y divide-line rounded-xl bg-surface">
        {ids.map((id) => {
          const p = people[id] ?? { name: "Silinmiş istifadəçi", avatar: null };
          return (
            <li key={id} className="flex items-center gap-3 px-3 py-2">
              <Avatar name={p.name} src={p.avatar} size="sm" />
              <span className="text-sm font-medium">{p.name}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/**
 * Sual üzrə nəticələr: üfüqi zolaqlar (mobil ekranda ən oxunaqlı forma).
 * `people` verilərsə (yalnız admin analitikası, anonim olmayan sorğu) cavab verənlərin adı və şəkli göstərilir.
 */
export function StatsView({
  stats,
  total,
  showTexts = false,
  people,
}: {
  stats: QuestionStats[];
  total: number;
  showTexts?: boolean;
  people?: Record<string, Person>;
}) {
  return (
    <ol className="space-y-4">
      {stats.map((s, i) => {
        if (s.texts && !showTexts) return null;
        const max = Math.max(1, ...(s.counts?.map((c) => c.count) ?? [1]));
        return (
          <li key={s.question.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <p className="text-xs font-medium text-muted">
              {i + 1}. {TYPE_LABEL[s.question.type]} · {s.answered} cavab
            </p>
            <h3 className="mt-1 font-semibold leading-snug">{s.question.title}</h3>

            {s.average !== undefined && (
              <p className="mt-2 text-sm">
                Orta: <b className="text-lg text-brand-700">{s.average.toFixed(1)}</b>
                <span className="text-muted"> / {s.question.scaleMax ?? 5}</span>
              </p>
            )}

            {s.counts && (
              <ul className="mt-4 space-y-4">
                {s.counts.map((c) => {
                  const pct = total ? Math.round((c.count / total) * 100) : 0;
                  const top = c.count === max && c.count > 0;
                  return (
                    <li key={c.label}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className={top ? "font-semibold" : ""}>{c.label}</span>
                        <span className="shrink-0 tabular-nums text-muted">
                          {c.count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${top ? "bg-brand-600" : "bg-brand-200"}`} style={{ width: `${pct}%` }} />
                      </div>
                      {people && <Voters ids={c.userIds} people={people} />}
                    </li>
                  );
                })}
              </ul>
            )}

            {s.texts && (
              <ul className="mt-3 space-y-3">
                {s.texts.length === 0 && <li className="text-sm text-muted">Cavab yoxdur</li>}
                {s.texts.map((t, j) => {
                  const p = people?.[t.userId];
                  return (
                    <li key={j} className="rounded-xl bg-surface px-3.5 py-3">
                      {people && (
                        <p className="mb-2 flex items-center gap-2">
                          <Avatar name={p?.name ?? "Silinmiş istifadəçi"} src={p?.avatar} size="xs" />
                          <span className="text-sm font-semibold">{p?.name ?? "Silinmiş istifadəçi"}</span>
                        </p>
                      )}
                      <p className="whitespace-pre-line text-sm leading-relaxed">{t.text}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
