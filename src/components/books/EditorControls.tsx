"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addChapterAction } from "@/app/(app)/kitablar/actions";
import { Icon } from "@/components/Icon";

/** Redaktor: kitab səhifəsində yeni fəsil əlavə etmək */
export function AddChapterForm({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 text-sm font-semibold text-violet-700 hover:bg-violet-50"
      >
        <Icon name="plus" className="size-4" /> Fəsil əlavə et
      </button>
    );
  }
  return (
    <form
      className="mt-3 space-y-2 rounded-xl bg-violet-50/60 p-3 ring-1 ring-violet-200"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addChapterAction(bookId, title, description);
          if (res.error) return setError(res.error);
          setTitle("");
          setDescription("");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 160))} placeholder="Fəslin adı" autoFocus className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none focus:border-violet-500" />
      <input value={description} onChange={(e) => setDescription(e.target.value.slice(0, 400))} placeholder="Qısa izah (istəyə bağlı)" className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-violet-500" />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || title.trim().length < 2} className="h-10 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Əlavə olunur…" : "Əlavə et"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg px-4 text-sm font-medium text-muted hover:bg-white">
          Ləğv et
        </button>
      </div>
    </form>
  );
}

/** Geri dönməz əməliyyatlar üçün təsdiq soruşan submit düyməsi (server action formunda) */
export function ConfirmButton({ message, className, children, label }: { message: string; className: string; children: React.ReactNode; label?: string }) {
  return (
    <button type="submit" aria-label={label} title={label} className={className} onClick={(e) => !window.confirm(message) && e.preventDefault()}>
      {children}
    </button>
  );
}
