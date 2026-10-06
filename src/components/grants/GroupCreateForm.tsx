"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createGroupAction } from "@/app/(app)/admin/grants/actions";
import { Icon } from "@/components/Icon";
import { TagInput } from "@/components/ui/TagInput";
import { fromLocalInput } from "@/lib/datetime";
import { matchSkills } from "@/lib/skills";

const inputCls =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

/**
 * Admin: qrant üçün işçi qrup yaratmaq. Tələb olunan bacarıqlar seçildikcə
 * kimə dəvət (uyğun bacarıq), kimə təklif (qalanlar) gedəcəyi canlı göstərilir.
 */
export function GroupCreateForm({
  grantId,
  defaultTitle,
  suggestions,
  initialSkills,
  people,
}: {
  grantId: string;
  defaultTitle: string;
  suggestions: string[];
  initialSkills: string[];
  people: { id: string; name: string; skills: string[] }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [targetSize, setTargetSize] = useState("");
  const [respondBy, setRespondBy] = useState("");
  const [offerToOthers, setOfferToOthers] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const matched = useMemo(() => people.map((p) => ({ ...p, hit: matchSkills(p.skills, skills) })).filter((p) => p.hit.length), [people, skills]);
  const othersCount = people.length - matched.length;
  const willOffer = matched.length === 0 || offerToOthers;

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await createGroupAction(grantId, {
        title,
        description,
        requiredSkills: skills,
        targetSize: targetSize ? Number(targetSize) : null,
        respondBy: respondBy ? fromLocalInput(`${respondBy}T23:59`) : null,
        offerToOthers,
      });
      if ("error" in res) return setMsg({ ok: false, text: res.error });
      setMsg({
        ok: true,
        text: res.invited
          ? `İşçi qrup yaradıldı: ${res.invited} nəfərə dəvət${res.offered ? `, ${res.offered} nəfərə təklif` : ""} göndərildi.`
          : `Uyğun bacarıqlı üzv tapılmadı — təklif hamıya (${res.offered} nəfər) göndərildi.`,
      });
      setOpen(false);
      setDescription("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 font-semibold text-emerald-800 transition hover:bg-emerald-50"
        >
          <Icon name="plus" className="size-5" /> Bu qrant üçün işçi qrup yarat
        </button>
        {msg && <p className={`mt-2 rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 ring-2 ring-emerald-200 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Yeni işçi qrup</h3>
        <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-100" aria-label="Bağla">
          <Icon name="x" className="size-5" />
        </button>
      </div>

      <label className="block text-sm font-medium">
        Qrupun adı
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      </label>
      <label className="block text-sm font-medium">
        Layihə haqqında qısa məlumat
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Layihənin mövzusu, qrupdan nə gözlənilir"
          className={`${inputCls} h-auto resize-none py-3`}
        />
      </label>

      <div>
        <span className="text-sm font-medium">Tələb olunan sahələr / bacarıqlar</span>
        <div className="mt-1.5">
          <TagInput value={skills} onChange={setSkills} suggestions={suggestions} placeholder="Məs.: Maliyyə, Statistika" />
        </div>
      </div>

      {/* Canlı önizləmə: kimə dəvət, kimə təklif gedəcək */}
      {skills.length > 0 && (
        <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${matched.length ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}>
          {matched.length ? (
            <>
              <p className="font-semibold">{matched.length} nəfərə bacarığına görə dəvət gedəcək:</p>
              <p className="mt-1">{matched.map((m) => `${m.name} (${m.hit.join(", ")})`).join(" · ")}</p>
            </>
          ) : (
            <p>
              Bu sahələrdə bacarıq qeyd edən üzv yoxdur — təklif <b>hamıya ({people.length} nəfər)</b> göndəriləcək.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Qrupun ölçüsü (istəyə bağlı)
          <input type="number" min={1} max={99} inputMode="numeric" value={targetSize} onChange={(e) => setTargetSize(e.target.value)} placeholder="məs. 5" className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          Cavab üçün son tarix (istəyə bağlı)
          <input type="date" value={respondBy} onChange={(e) => setRespondBy(e.target.value)} className={inputCls} />
        </label>
      </div>

      {matched.length > 0 && othersCount > 0 && (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={offerToOthers} onChange={(e) => setOfferToOthers(e.target.checked)} className="mt-0.5 size-5 accent-emerald-700" />
          <span>
            Qalan {othersCount} üzvə də açıq təklif göndər
            <span className="block text-xs text-muted">Sonra da "Hamıya təklif göndər" ilə etmək olar.</span>
          </span>
        </label>
      )}

      {msg && !msg.ok && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{msg.text}</p>}

      <button type="button" onClick={submit} disabled={pending || !skills.length} className="h-12 w-full rounded-xl bg-emerald-700 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">
        {pending ? "Göndərilir…" : willOffer && !matched.length ? "Yarat və hamıya təklif göndər" : "Yarat və dəvətləri göndər"}
      </button>
    </div>
  );
}

/** Qrup üzvlərinin e-poçtlarını kopyalamaq (admin) */
export function CopyEmails({ emails }: { emails: string[] }) {
  const [done, setDone] = useState(false);
  if (!emails.length) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(emails.join(", "));
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("E-poçtlar:", emails.join(", "));
        }
      }}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold ring-1 ring-line hover:bg-slate-50"
    >
      <Icon name={done ? "check" : "file"} className="size-4" /> {done ? "Kopyalandı" : `E-poçtları kopyala (${emails.length})`}
    </button>
  );
}
