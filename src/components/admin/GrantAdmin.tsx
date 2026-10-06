"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createManualGrant, runGrantSync, saveGrantOverrides } from "@/app/(app)/admin/grants/actions";
import { Icon } from "@/components/Icon";
import { TagInput } from "@/components/ui/TagInput";
import type { Grant } from "@/lib/types";

const inputCls =
  "mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const toDay = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 4 * 3600_000).toISOString().slice(0, 10) : "");
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:00+04:00`).toISOString() : null);

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return <p className={`rounded-xl px-4 py-2.5 text-sm ${m.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{m.text}</p>;
}

export function GrantSyncButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (force: boolean) =>
    startTransition(async () => {
      const res = await runGrantSync(force);
      if ("error" in res) setMsg({ ok: false, text: res.error });
      else
        setMsg({
          ok: !res.errors.length,
          text: `${res.added} yeni${force ? `, ${res.updated} yeniləndi` : ""}${res.pruned ? `, ${res.pruned} köhnə silindi` : ""}.${res.errors.length ? ` Xəta: ${res.errors.join("; ")}` : ""}`,
        });
      router.refresh();
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run(false)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          <Icon name="clock" className="size-4" /> {pending ? "Yenilənir…" : "Yeni müsabiqələri yoxla"}
        </button>
        <button type="button" disabled={pending} onClick={() => run(true)} className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50 disabled:opacity-60">
          Hamısını yenidən oxu
        </button>
      </div>
      <Msg m={msg} />
    </div>
  );
}

/** Avtomatik sahələrin düzəldilməsi: son tarix, məbləğ, mövzu sahələri, gizlətmə */
export function GrantEditor({ g, suggestions }: { g: Grant; suggestions: string[] }) {
  const router = useRouter();
  const [deadline, setDeadline] = useState(toDay(g.deadline));
  const [amount, setAmount] = useState(g.amount ?? "");
  const [fields, setFields] = useState(g.fields);
  const [hidden, setHidden] = useState(g.hidden);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveGrantOverrides(g.id, { deadline: endOfDay(deadline), amount, fields }, hidden);
      setMsg("error" in res ? { ok: false, text: res.error } : { ok: true, text: "Yadda saxlanıldı." });
      router.refresh();
    });

  return (
    <div className="space-y-4 border-t border-line p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Son müraciət tarixi
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          Məbləğ / maliyyələşmə
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="məs. 50 000 AZN-dək" className={inputCls} />
        </label>
      </div>
      <div>
        <span className="text-sm font-medium">Mövzu sahələri</span>
        <p className="mb-1.5 text-xs text-muted">İşçi qrup yaradılanda tələb olunan bacarıq kimi avtomatik təklif olunur.</p>
        <TagInput value={fields} onChange={setFields} suggestions={suggestions} placeholder="Məs.: İqtisadiyyat, Rəqəmsal texnologiyalar" />
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-5 accent-emerald-700" />
        Üzvlərə göstərmə
      </label>
      <Msg m={msg} />
      <button type="button" onClick={save} disabled={pending} className="h-11 w-full rounded-xl bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 sm:w-auto sm:px-6">
        {pending ? "Saxlanılır…" : "Yadda saxla"}
      </button>
    </div>
  );
}

/** Mənbədə olmayan qrantı əl ilə əlavə etmək */
export function ManualGrantForm({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ title: "", url: "", summary: "", deadline: "", amount: "" });
  const [fields, setFields] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  const submit = () =>
    startTransition(async () => {
      const res = await createManualGrant({ ...v, deadline: endOfDay(v.deadline), fields });
      if ("error" in res) return setMsg({ ok: false, text: res.error });
      router.push(`/qrantlar/${res.id}`);
    });

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
        <Icon name="plus" className="size-4" /> Əl ilə qrant əlavə et
      </button>
    );

  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
      <h2 className="font-semibold">Yeni qrant</h2>
      <label className="block text-sm font-medium">
        Adı
        <input value={v.title} onChange={set("title")} className={inputCls} placeholder="məs. Horizon Europe — MSCA Postdoctoral Fellowships" />
      </label>
      <label className="block text-sm font-medium">
        Rəsmi səhifə
        <input value={v.url} onChange={set("url")} inputMode="url" className={inputCls} placeholder="https://..." />
      </label>
      <label className="block text-sm font-medium">
        Qısa məlumat
        <textarea value={v.summary} onChange={set("summary")} rows={3} className={`${inputCls} h-auto resize-none py-3`} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Son müraciət tarixi
          <input type="date" value={v.deadline} onChange={set("deadline")} className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          Məbləğ
          <input value={v.amount} onChange={set("amount")} className={inputCls} />
        </label>
      </div>
      <div>
        <span className="text-sm font-medium">Mövzu sahələri</span>
        <div className="mt-1.5">
          <TagInput value={fields} onChange={setFields} suggestions={suggestions} />
        </div>
      </div>
      <Msg m={msg} />
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={pending} className="h-11 flex-1 rounded-xl bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 sm:flex-none sm:px-6">
          {pending ? "Əlavə olunur…" : "Əlavə et"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl px-4 font-semibold text-muted hover:bg-slate-50">
          Ləğv et
        </button>
      </div>
    </div>
  );
}
