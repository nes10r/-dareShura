import Link from "next/link";
import { Icon } from "@/components/Icon";
import { daysLeftLabel, formatDate } from "@/lib/format";
import type { SurveyCardData } from "@/lib/modules/types";

export function SurveyMeta({ data, light = false }: { data: SurveyCardData; light?: boolean }) {
  const tone = light ? "text-brand-100" : "text-muted";
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm ${tone}`}>
      <li className="flex items-center gap-1.5"><Icon name="survey" className="size-4" />{data.questionCount} sual</li>
      <li className="flex items-center gap-1.5"><Icon name="clock" className="size-4" />Təxminən {data.minutes} dəqiqə</li>
      {data.endsAt && (
        <li className="flex items-center gap-1.5"><Icon name="calendar" className="size-4" />Son tarix: {formatDate(data.endsAt)}</li>
      )}
    </ul>
  );
}

export function SurveyBadges({ data }: { data: SurveyCardData }) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.isNew && (
        <span className="rounded-full bg-emerald-400 px-2.5 py-0.5 text-xs font-bold text-emerald-950">Yeni</span>
      )}
      {data.deadlineNear && (
        <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-950">{daysLeftLabel(data.daysLeft)}</span>
      )}
      {!data.isNew && !data.deadlineNear && (
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">Cavab gözləyir</span>
      )}
    </div>
  );
}

/** Dashboard-dakı sorğu kartı. Cavablandırılmamış sorğu üçün prominent, nəticələr üçün sakit görünüş. */
export function SurveyCard({ data }: { data: SurveyCardData }) {
  if (data.state === "results") {
    return (
      <Link
        href={`/surveys/${data.id}/results`}
        className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon name="chart" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-emerald-700">Sorğu nəticələri açıqdır</span>
          <span className="mt-0.5 block truncate font-semibold">{data.title}</span>
        </span>
        <Icon name="chevron-right" className="size-5 text-muted transition group-hover:translate-x-0.5" />
      </Link>
    );
  }

  if (data.optional) {
    return (
      <Link
        href={`/surveys/${data.id}`}
        className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon name="survey" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-muted">İstəyə bağlı iştirak · {data.questionCount} sual</span>
          <span className="mt-0.5 block truncate font-semibold">{data.title}</span>
        </span>
        <Icon name="chevron-right" className="size-5 text-muted transition group-hover:translate-x-0.5" />
      </Link>
    );
  }

  return (
    <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-900/20 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-100">
            <Icon name="survey" className="size-4" /> Yeni sorğu
          </p>
          <SurveyBadges data={data} />
        </div>
        <h3 className="mt-3 text-lg font-bold leading-snug sm:text-xl">{data.title}</h3>
        {data.description && <p className="mt-2 line-clamp-2 text-sm text-brand-100">{data.description}</p>}
        <div className="mt-4">
          <SurveyMeta data={data} light />
        </div>
        <Link
          href={`/surveys/${data.id}`}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-base font-semibold text-brand-800 transition hover:bg-brand-50 active:scale-[0.99] sm:w-auto sm:px-6 sm:inline-flex"
        >
          Sorğuda iştirak et <Icon name="arrow-right" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
