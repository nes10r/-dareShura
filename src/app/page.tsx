import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/ui/Logo";
import { getSessionUser } from "@/lib/auth";
import type { IconName } from "@/lib/modules/types";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "calendar", title: "İclaslar", text: "Gündəlik, materiallar və iclas protokolları bir yerdə." },
  { icon: "check", title: "Səsvermə", text: "Şura qərarları üzrə təhlükəsiz onlayn səsvermə." },
  { icon: "file", title: "Qərarlar arxivi", text: "Qəbul edilmiş qərarlara istənilən an çıxış." },
  { icon: "survey", title: "Sorğular", text: "Sizə ünvanlanan sorğular yalnız aktual olduqda görünür." },
];

const STEPS = [
  { title: "Daxil olun", text: "Universitet e-poçtunuzla hesabınıza daxil olun." },
  { title: "Aktual işləri görün", text: "Dashboard yalnız sizin üçün vacib olanları göstərir." },
  { title: "Bir toxunuşla iştirak edin", text: "Sorğu, səsvermə və tapşırıqları telefondan tamamlayın." },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const cta = user
    ? { href: "/dashboard", label: "Kabinetə keç" }
    : { href: "/login", label: "Daxil ol" };

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <Link
            href={cta.href}
            className="inline-flex h-10 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-800 active:scale-[0.98]"
          >
            {cta.label}
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-900 via-brand-800 to-brand-700 text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pb-24 sm:pt-20">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-100 ring-1 ring-white/15">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Azərbaycan Dövlət İqtisad Universiteti
            </p>
            <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Alimlər Şurasının rəqəmsal iş məkanı
            </h1>
            <p className="mt-4 max-w-xl text-base text-brand-100 sm:text-lg">
              İclaslar, qərarlar, səsvermə və sorğular — hamısı bir platformada, telefonunuzdan rahat istifadə üçün.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={cta.href}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-brand-800 shadow-lg shadow-brand-900/30 transition hover:bg-brand-50 active:scale-[0.98]"
              >
                {cta.label} <Icon name="arrow-right" className="size-4" />
              </Link>
              <a
                href="#imkanlar"
                className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-white ring-1 ring-white/25 transition hover:bg-white/10"
              >
                İmkanlarla tanış ol
              </a>
            </div>
          </div>
        </section>

        <section id="imkanlar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Platformada nə var?</h2>
          <p className="mt-2 max-w-xl text-muted">Hər üzv yalnız özünə aid olan məlumatları və tapşırıqları görür.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-white p-5 transition hover:shadow-md">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon name={f.icon} />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Necə işləyir?</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-line sm:flex-col">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-700 font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} UNEC Alimlər Şurası</span>
          <span>Bakı, İstiqlaliyyət küç. 6</span>
        </div>
      </footer>
    </div>
  );
}
