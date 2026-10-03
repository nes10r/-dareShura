import type { QuestionStats } from "@/lib/surveys/service";

const TYPE_LABEL = { single: "Tək seçim", multiple: "Çox seçim", scale: "Şkala", text: "Açıq sual" } as const;

/** Sual üzrə nəticələr: üfüqi zolaqlar (mobil ekranda ən oxunaqlı forma). */
export function StatsView({ stats, total, showTexts = false }: { stats: QuestionStats[]; total: number; showTexts?: boolean }) {
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
              <ul className="mt-4 space-y-3">
                {s.counts.map((c) => {
                  const pct = total ? Math.round((c.count / total) * 100) : 0;
                  return (
                    <li key={c.label}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className={c.count === max && c.count > 0 ? "font-semibold" : ""}>{c.label}</span>
                        <span className="shrink-0 tabular-nums text-muted">
                          {c.count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${c.count === max && c.count > 0 ? "bg-brand-600" : "bg-brand-200"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {s.texts && (
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {s.texts.length === 0 && <li className="text-sm text-muted">Cavab yoxdur</li>}
                {s.texts.map((t, j) => (
                  <li key={j} className="rounded-xl bg-surface px-3 py-2 text-sm">{t}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
