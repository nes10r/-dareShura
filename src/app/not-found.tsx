import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-bold text-brand-200">404</p>
      <h1 className="mt-3 text-xl font-bold">Səhifə tapılmadı</h1>
      <p className="mt-1 text-muted">Axtardığınız səhifə mövcud deyil və ya artıq aktual deyil.</p>
      <Link href="/dashboard" className="mt-6 inline-flex h-12 items-center rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800">
        Ana səhifəyə qayıt
      </Link>
    </div>
  );
}
