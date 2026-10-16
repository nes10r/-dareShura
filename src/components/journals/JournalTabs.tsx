import Link from "next/link";

/** "Jurnal tap" / "Xüsusi buraxılışlar" — iki səhifə arasında keçid */
export function JournalTabs({ active, callCount }: { active: "find" | "calls"; callCount: number }) {
  const tab = (on: boolean) =>
    `inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition sm:flex-none sm:px-4 ${on ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"}`;
  return (
    <nav className="mt-5 flex rounded-xl bg-slate-100 p-1 sm:inline-flex" aria-label="Jurnallar bölməsi">
      <Link href="/jurnallar" prefetch={false} className={tab(active === "find")} aria-current={active === "find" ? "page" : undefined}>
        Jurnal tap
      </Link>
      <Link href="/jurnallar/cagirislar" className={tab(active === "calls")} aria-current={active === "calls" ? "page" : undefined}>
        Xüsusi buraxılışlar
        {callCount > 0 && <span className="rounded-full bg-sky-600 px-1.5 text-[11px] text-white">{callCount}</span>}
      </Link>
    </nav>
  );
}
