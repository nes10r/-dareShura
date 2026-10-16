"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { refreshMyPublications, saveResearchProfile, type ResearchState } from "@/app/(app)/tedqiqatcilar/actions";
import { Icon } from "@/components/Icon";
import { MAX_BIO } from "@/lib/research";

const inputCls =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Status({ s }: { s: ResearchState }) {
  if (s.error) return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p>;
  if (s.info || s.ok) return <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{s.info ?? "Yadda saxlanıldı."}</p>;
  return null;
}

export function ResearchProfileForm({
  userId,
  initial,
  pubCount,
  syncedAt,
}: {
  userId: string;
  initial: { bio: string; orcid: string; scholarUrl: string; openToCollab: boolean };
  pubCount: number;
  syncedAt: string | null;
}) {
  const [state, action, pending] = useActionState<ResearchState, FormData>(saveResearchProfile, {});
  const [bio, setBio] = useState(initial.bio);
  const [open, setOpen] = useState(initial.openToCollab);
  const [refresh, setRefresh] = useState<ResearchState>({});
  const [refreshing, startRefresh] = useTransition();

  return (
    <form action={action} className="space-y-4">
      {/* Əməkdaşlığa açığam */}
      <label className={`flex cursor-pointer items-center gap-3 rounded-xl p-3.5 ring-1 transition ${open ? "bg-emerald-50 ring-emerald-200" : "bg-surface ring-line"}`}>
        <span className="relative inline-flex shrink-0">
          <input type="checkbox" name="openToCollab" checked={open} onChange={(e) => setOpen(e.target.checked)} className="peer sr-only" />
          <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-100" />
          <span className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Əməkdaşlığa açığam</span>
          <span className="block text-xs text-muted">Kataloqda yaşıl nişanla və yuxarıda göstəriləcəksiniz</span>
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Qısa bio</span>
        <textarea
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
          rows={4}
          placeholder="Tədqiqat istiqamətiniz, hazırda üzərində işlədiyiniz mövzular, axtardığınız əməkdaşlıq…"
          className={`${inputCls} h-auto resize-none py-3`}
        />
        <span className="mt-1 block text-right text-xs text-muted">
          {bio.length}/{MAX_BIO}
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">ORCID</span>
          <input name="orcid" defaultValue={initial.orcid} placeholder="0000-0000-0000-0000" inputMode="text" autoCapitalize="characters" className={inputCls} />
          <span className="mt-1 block text-xs text-muted">
            Nəşrləriniz OpenAlex-dən avtomatik gələcək.{" "}
            <a href="https://orcid.org/register" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
              ORCID yoxdur?
            </a>
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Google Scholar profili</span>
          <input name="scholarUrl" defaultValue={initial.scholarUrl} placeholder="https://scholar.google.com/citations?user=…" inputMode="url" className={inputCls} />
        </label>
      </div>

      {initial.orcid && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
          <span className="text-muted">
            {pubCount} nəşr{syncedAt ? ` · son yenilənmə ${new Date(syncedAt).toLocaleDateString("az")}` : ""}
          </span>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => startRefresh(async () => setRefresh(await refreshMyPublications()))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            <Icon name="clock" className="size-4" /> {refreshing ? "Yenilənir…" : "Nəşrləri yenilə"}
          </button>
        </div>
      )}

      <Status s={state} />
      <Status s={refresh} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={pending} className="h-12 rounded-xl bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {pending ? "Saxlanılır…" : "Yadda saxla"}
        </button>
        <Link href={`/tedqiqatcilar/${userId}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold text-slate-700 hover:bg-slate-50">
          Profilimə bax <Icon name="chevron-right" className="size-4" />
        </Link>
      </div>
    </form>
  );
}
