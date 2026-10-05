"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runConferenceSync, saveConferenceOverrides } from "@/app/(app)/admin/conferences/actions";
import { Icon } from "@/components/Icon";
import type { Conference, ConferenceOverrides } from "@/lib/types";

type Field = keyof ConferenceOverrides;
type Values = Record<Field, string>;

// Tarixlər Bakı vaxtı ilə gün kimi redaktə olunur
const toDay = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 4 * 3600_000).toISOString().slice(0, 10) : "");
const fromDay = (v: string, endOfDay: boolean) => (v ? new Date(`${v}T${endOfDay ? "23:59" : "00:00"}:00+04:00`).toISOString() : "");

function toValues(src: Required<ConferenceOverrides> | Conference): Values {
  return {
    startsAt: toDay(src.startsAt),
    endsAt: toDay(src.endsAt),
    deadline: toDay(src.deadline),
    format: src.format ?? "",
    location: src.location ?? "",
    fee: src.fee ?? "",
    feeNote: src.feeNote ?? "",
  };
}

const LABELS: Record<Field, string> = {
  startsAt: "Başlama",
  endsAt: "Bitmə",
  deadline: "Son müraciət (deadline)",
  format: "Format",
  location: "Məkan",
  fee: "Ödəniş",
  feeNote: "Məbləğ",
};

const inputCls =
  "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

/** Avtomatik çıxarılan sahələrin əl ilə düzəldilməsi. Avtomatikdən fərqlənən sahələr "düzəliş" kimi saxlanılır. */
export function ConferenceEditor({ c }: { c: Conference }) {
  const router = useRouter();
  const auto = toValues(c.auto);
  const [v, setV] = useState<Values>(toValues(c));
  const [hidden, setHidden] = useState(c.hidden);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const changed = (f: Field) => v[f] !== auto[f];
  const set = (f: Field, value: string) => {
    setV((p) => ({ ...p, [f]: value }));
    setMsg(null);
  };

  function save() {
    const out: Partial<Record<Field, string | null>> = {};
    (Object.keys(v) as Field[]).forEach((f) => {
      if (!changed(f)) return;
      out[f] = f === "startsAt" ? fromDay(v[f], false) || null : f === "endsAt" || f === "deadline" ? fromDay(v[f], true) || null : v[f] || null;
    });
    startTransition(async () => {
      const res = await saveConferenceOverrides(c.id, out, hidden);
      if ("error" in res) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: "Yadda saxlanıldı." });
        router.refresh();
      }
    });
  }

  const hint = (f: Field) =>
    changed(f) ? (
      <span className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
        Əl ilə dəyişdirilib · avtomatik: {auto[f] || "—"}
        <button type="button" onClick={() => set(f, auto[f])} className="font-semibold underline">
          qaytar
        </button>
      </span>
    ) : null;

  const box = (f: Field) => `${inputCls} ${changed(f) ? "border-amber-300" : "border-line"}`;

  return (
    <div className="space-y-4 border-t border-line p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {(["startsAt", "endsAt", "deadline"] as const).map((f) => (
          <label key={f} className="block text-sm font-medium">
            {LABELS[f]}
            <input type="date" value={v[f]} onChange={(e) => set(f, e.target.value)} className={box(f)} />
            {hint(f)}
          </label>
        ))}
      </div>

      <label className="block text-sm font-medium">
        {LABELS.location}
        <input value={v.location} onChange={(e) => set("location", e.target.value)} className={box("location")} placeholder="Universitet, şəhər" />
        {hint("location")}
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          {LABELS.format}
          <select value={v.format} onChange={(e) => set("format", e.target.value)} className={box("format")}>
            <option value="">Göstərilməyib</option>
            <option value="Əyani">Əyani</option>
            <option value="Onlayn">Onlayn</option>
            <option value="Hibrid">Hibrid</option>
          </select>
          {hint("format")}
        </label>
        <label className="block text-sm font-medium">
          {LABELS.fee}
          <select value={v.fee} onChange={(e) => set("fee", e.target.value)} className={box("fee")}>
            <option value="">Göstərilməyib</option>
            <option value="free">Ödənişsiz</option>
            <option value="paid">Ödənişli</option>
          </select>
          {hint("fee")}
        </label>
        <label className="block text-sm font-medium">
          {LABELS.feeNote}
          <input value={v.feeNote} onChange={(e) => set("feeNote", e.target.value)} className={box("feeNote")} placeholder="məs. 50 AZN" disabled={v.fee !== "paid"} />
          {hint("feeNote")}
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-5 accent-brand-700" />
        Saytda göstərmə (gənc tədqiqatçılar üçün aktual deyil)
      </label>

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}
      <button type="button" onClick={save} disabled={pending} className="h-11 w-full rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60 sm:w-auto sm:px-6">
        {pending ? "Saxlanılır…" : "Yadda saxla"}
      </button>
    </div>
  );
}

/** Mənbədən indi yenilə */
export function SyncButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(force: boolean) {
    setMsg(null);
    startTransition(async () => {
      const res = await runConferenceSync(force);
      if ("error" in res) setMsg(res.error);
      else {
        const parts = [`${res.added} yeni`, force ? `${res.updated} yeniləndi` : null, res.remaining ? `${res.remaining} növbəti dəfəyə qaldı` : null];
        setMsg(`Hazırdır: ${parts.filter(Boolean).join(", ")}.${res.errors.length ? ` Xəta: ${res.errors.length}` : ""}`);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run(false)}
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          <span className={pending ? "animate-spin" : ""}>
            <Icon name="clock" className="size-4" />
          </span>
          {pending ? "Yenilənir…" : "Yeni elanları yoxla"}
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50 disabled:opacity-60"
          title="Mövcud elanların mətnini də yenidən oxu (düzəlişlərinizə toxunulmur)"
        >
          Hamısını yenidən oxu
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}
