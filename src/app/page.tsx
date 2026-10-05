import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ConferenceCard } from "@/components/conferences/ConferenceCard";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { FeaturedNewsCard, NewsCard } from "@/components/news/NewsCard";
import { getSessionUser } from "@/lib/auth";
import { compareCurrent, isCurrent } from "@/lib/conferences/view";
import { listConferences, listPublishedNews } from "@/lib/db/repo";

export default async function LandingPage() {
  const [user, news, confs] = await Promise.all([getSessionUser(), listPublishedNews(4), listConferences()]);
  const upcoming = confs.filter((c) => isCurrent(c)).sort(compareCurrent).slice(0, 3);
  const cta = user ? { href: "/dashboard", label: "Kabinet" } : { href: "/login", label: "Daxil ol" };
  const [featured, ...rest] = news;

  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader cta={cta} overlay />

      <main>
        {/* Hero — kampus videosu */}
        <section className="relative flex min-h-[640px] items-end overflow-hidden text-white h-[92svh]">
          <HeroVideo poster="/images/campus-aerial.jpg" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/45 to-brand-900/20" />
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-14 sm:pb-20">
            <p className="animate-pop inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
              Azərbaycan Dövlət İqtisad Universiteti · 1930
            </p>
            <h1 className="animate-pop mt-5 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
              Gənc Alimlər Şurası
            </h1>
            <p className="animate-pop mt-4 max-w-xl text-base text-white/80 sm:text-lg">
              Şuranın fəaliyyəti, tədbirləri və elanları — bir platformada.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#xeberler"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-brand-800 shadow-lg transition hover:bg-brand-50 active:scale-[0.98]"
              >
                Son xəbərlər <Icon name="arrow-right" className="size-4" />
              </a>
              <Link
                href={cta.href}
                className="inline-flex h-12 items-center justify-center rounded-xl px-6 font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/10"
              >
                {user ? "Kabinetə keç" : "Üzv kabinetinə daxil ol"}
              </Link>
            </div>
          </div>
          <a href="#xeberler" aria-label="Aşağı keç" className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 text-white/60 hover:text-white sm:block">
            <span className="block h-10 w-6 rounded-full border-2 border-current">
              <span className="mx-auto mt-2 block h-2 w-1 animate-bounce rounded-full bg-current" />
            </span>
          </a>
        </section>

        {/* Xəbərlər */}
        <section id="xeberler" className="scroll-mt-16 bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Fəaliyyətimiz</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Xəbərlər və elanlar</h2>
              </div>
              <Link href="/xeberler" className="hidden h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:ring-brand-200 sm:inline-flex">
                Bütün xəbərlər <Icon name="arrow-right" className="size-4" />
              </Link>
            </div>

            {featured ? (
              <>
                <div className="mt-8">
                  <FeaturedNewsCard item={featured} />
                </div>
                {rest.length > 0 && (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((n) => <NewsCard key={n.id} item={n} />)}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-8 rounded-2xl bg-white p-10 text-center text-muted ring-1 ring-line">Tezliklə ilk xəbərlər burada dərc olunacaq.</p>
            )}

            <Link href="/xeberler" className="mt-6 flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white font-semibold ring-1 ring-line sm:hidden">
              Bütün xəbərlər <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        </section>

        {/* Konfranslar */}
        {upcoming.length > 0 && (
          <section id="konfranslar" className="scroll-mt-16">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Elmi imkanlar</p>
                  <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Yaxınlaşan konfranslar</h2>
                  <p className="mt-2 max-w-xl text-muted">Müraciət son tarixləri, format və iştirak şərtləri — vaxtında müraciət etmək üçün.</p>
                </div>
                <Link href="/konfranslar" className="hidden h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:ring-brand-200 sm:inline-flex">
                  Bütün konfranslar <Icon name="arrow-right" className="size-4" />
                </Link>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((c) => <ConferenceCard key={c.id} c={c} />)}
              </div>
              <Link href="/konfranslar" className="mt-6 flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white font-semibold ring-1 ring-line sm:hidden">
                Bütün konfranslar <Icon name="arrow-right" className="size-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Haqqımızda */}
        <section id="haqqimizda" className="scroll-mt-16 bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
            <div className="relative order-2 lg:order-1">
              <div className="relative aspect-[589/521] overflow-hidden rounded-3xl shadow-2xl shadow-brand-900/15">
                <Image src="/images/campus-cube.jpg" alt="UNEC kampusu — UNEC kubu" fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
              </div>
              <div className="absolute -bottom-6 -right-2 w-[46%] overflow-hidden rounded-2xl shadow-xl ring-4 ring-white sm:-right-6">
                <div className="relative aspect-[500/338]">
                  <Image src="/images/campus-courtyard.jpg" alt="UNEC kampusunun həyəti" fill sizes="25vw" className="object-cover" />
                </div>
              </div>
              <div className="absolute -left-2 -top-5 rounded-2xl bg-brand-700 px-5 py-4 text-white shadow-xl sm:-left-6">
                <p className="text-3xl font-bold leading-none">1930</p>
                <p className="mt-1 text-xs text-white/75">təsis ili</p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Haqqımızda</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Gənc tədqiqatçıların birliyi</h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                Gənc Alimlər Şurası UNEC-də elmi fəaliyyətlə məşğul olan gənc tədqiqatçıları bir araya gətirir, onların elmi
                təşəbbüslərini və əməkdaşlığını dəstəkləyir.
              </p>
              <p className="mt-4 leading-relaxed text-slate-600">
                Bu platforma Şuranın fəaliyyətini açıq və əlçatan etmək, üzvlər arasında elmi əməkdaşlığı rəqəmsal mühitə daşımaq üçün yaradılıb.
              </p>
              <Link href={cta.href} className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800">
                {user ? "Kabinetə keç" : "Üzv kabinetinə daxil ol"} <Icon name="arrow-right" className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
