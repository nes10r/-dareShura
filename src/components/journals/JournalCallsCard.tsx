import Link from "next/link";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/format";
import type { JournalCallsCardData } from "@/lib/modules/types";

/** Dashboard: sahəmə uyğun, yeni paylaşılmış xüsusi buraxılış çağırışları */
export function JournalCallsCard({ data }: { data: JournalCallsCardData }) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-200 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-700 text-white">
            <Icon name="megaphone" className="size-5" />
          </span>
          <h2 className="font-semibold">Sahənizə uyğun xüsusi buraxılışlar</h2>
        </div>
        <Link href="/jurnallar/cagirislar?uygun=1" className="text-sm font-semibold text-sky-800 hover:underline">
          Hamısı
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {data.items.map((c) => (
          <li key={c.id}>
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-line transition hover:ring-sky-300">
              <span className="min-w-0 flex-1">
                <span lang="en" className="block text-xs font-semibold uppercase tracking-wider text-sky-800">{c.journal}</span>
                <span className="block font-medium leading-snug">{c.title}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Son tarix: {formatDate(c.deadline)} · <span className="text-sky-800">{c.matched.join(", ")}</span>
                </span>
              </span>
              <Icon name="arrow-right" className="size-4 shrink-0 text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
