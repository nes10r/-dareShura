import type { Metadata } from "next";
import Link from "next/link";
import { SurveyCard } from "@/components/dashboard/SurveyCard";
import { SurveyPrompt } from "@/components/dashboard/SurveyPrompt";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { daysLeftLabel, formatDate } from "@/lib/format";
import { resolveModules } from "@/lib/modules/registry";
import type { DashboardCard, IconName } from "@/lib/modules/types";
import { ROLE_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Ana səhifə" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Baku" }).format(new Date()));
  if (hour < 12) return "Sabahınız xeyir";
  if (hour < 18) return "Günortanız xeyir";
  return "Axşamınız xeyir";
}

/** Kart növü → komponent. Yeni modul kartları burada qeydiyyatdan keçir. */
function renderCard(card: DashboardCard) {
  switch (card.kind) {
    case "survey":
      return <SurveyCard key={card.key} data={card.data} />;
  }
}

const ANNOUNCEMENTS = [
  { date: "2026-10-01", title: "Payız semestri üzrə Şura iclaslarının qrafiki təsdiqləndi" },
  { date: "2026-09-24", title: "Elmi adların verilməsi üzrə sənəd qəbulu başlayır" },
  { date: "2026-09-15", title: "Rəqəmsal platformanın pilot mərhələsi başladı" },
];

const QUICK_LINKS: { icon: IconName; label: string; text: string }[] = [
  { icon: "file", label: "Əsasnamə", text: "Şuranın fəaliyyət qaydaları" },
  { icon: "users", label: "Şura üzvləri", text: "Tərkib və əlaqə" },
  { icon: "calendar", label: "İclas qrafiki", text: "2026/2027 tədris ili" },
  { icon: "megaphone", label: "Elanlar", text: "Bütün elanlar" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const { cards, modules } = await resolveModules(user);

  const surveyModule = modules.find((m) => m.key === "survey");
  const firstPending = cards.find((c) => c.kind === "survey" && c.data.state === "pending" && !c.data.optional);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
      <header>
        <p className="text-sm text-muted">{greeting()},</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{firstName}</h1>
      </header>

      {/* Dinamik modullar: yalnız bu an istifadəçi üçün aktual olanlar */}
      {cards.length > 0 ? (
        <section className="mt-6" aria-labelledby="actual-heading">
          <h2 id="actual-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
            Sizin üçün aktual
            {!!surveyModule?.badge && (
              <span className="rounded-full bg-red-500 px-2 text-xs font-bold leading-5 text-white">{surveyModule.badge}</span>
            )}
          </h2>
          <div className="space-y-3">{cards.map(renderCard)}</div>
        </section>
      ) : (
        <section className="mt-6 flex items-center gap-4 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-100">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" />
          </span>
          <div>
            <p className="font-semibold">Hər şey qaydasındadır</p>
            <p className="text-sm text-emerald-800/80">Hazırda sizdən gözlənilən iş yoxdur.</p>
          </div>
        </section>
      )}

      {/* Standart bölmələr */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line lg:col-span-1">
          <h2 className="font-semibold">Profilim</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Vəzifə</dt>
              <dd className="font-medium">{user.position}</dd>
            </div>
            <div>
              <dt className="text-muted">Fakültə</dt>
              <dd className="font-medium">{user.faculty}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="font-medium">{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>
          <Link href="/profile" className="mt-4 inline-flex h-10 items-center gap-1 text-sm font-semibold text-brand-700">
            Profilə bax <Icon name="chevron-right" className="size-4" />
          </Link>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-line lg:col-span-2">
          <h2 className="font-semibold">Elanlar</h2>
          <ul className="mt-2 divide-y divide-line">
            {ANNOUNCEMENTS.map((a) => (
              <li key={a.title} className="flex gap-3 py-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p className="text-sm font-medium leading-snug">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(a.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Faydalı keçidlər</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_LINKS.map((l) => (
            <div key={l.label} className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name={l.icon} />
              </span>
              <p className="mt-3 text-sm font-semibold">{l.label}</p>
              <p className="text-xs text-muted">{l.text}</p>
            </div>
          ))}
        </div>
      </section>

      {firstPending?.kind === "survey" && (
        <SurveyPrompt
          surveyId={firstPending.data.id}
          title={firstPending.data.title}
          questionCount={firstPending.data.questionCount}
          minutes={firstPending.data.minutes}
          deadline={firstPending.data.endsAt ? formatDate(firstPending.data.endsAt) : null}
          urgency={firstPending.data.deadlineNear ? daysLeftLabel(firstPending.data.daysLeft) : null}
          pendingCount={surveyModule?.badge ?? 1}
        />
      )}
    </div>
  );
}
