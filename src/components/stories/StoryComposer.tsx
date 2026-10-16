"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createStory } from "@/app/(app)/status/actions";
import { Icon } from "@/components/Icon";
import { MAX_CAPTION, MAX_STORY_TEXT, STORY_BACKGROUNDS, type StoryBg } from "@/lib/stories";

const MAX_SIDE = 1080;
const TARGET_BYTES = 600 * 1024;

/** Şəkli uzun tərəfi 1080px olmaqla kiçildir və ~600 KB-dan az olana qədər sıxır */
async function prepareImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Şəkil faylı seçin.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Bu format dəstəklənmir. JPG və ya PNG şəkil seçin.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const webp = canvas.toDataURL("image/webp", 0.8).startsWith("data:image/webp");
  const type = webp ? "image/webp" : "image/jpeg";
  for (const q of [0.82, 0.72, 0.6, 0.5]) {
    const url = canvas.toDataURL(type, q);
    // base64 → bayt təxmini: uzunluq × 3/4
    if (url.length * 0.75 < TARGET_BYTES) return url;
  }
  return canvas.toDataURL(type, 0.4);
}

/** Yeni status: mətn (rəngli fon) və ya şəkil (alt yazı ilə). Tam ekran — mobil üçün. */
export function StoryComposer({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [bg, setBg] = useState<StoryBg>("brand");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function pick(file?: File) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      setImage(await prepareImage(file));
      setMode("image");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şəkli emal etmək mümkün olmadı.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function publish() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createStory({ kind: mode, text, bg, image: mode === "image" ? (image ?? undefined) : undefined });
        if (!res.ok) return setError(res.error);
        onPublished();
      } catch {
        setError("Göndərmək mümkün olmadı. İnternet bağlantısını yoxlayın.");
      }
    });
  }

  const canPublish = mode === "text" ? text.trim().length > 0 : !!image;
  const fontSize = text.length > 180 ? "text-xl" : text.length > 80 ? "text-2xl" : "text-3xl";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Yeni status">
      {/* Başlıq */}
      <div className="flex items-center justify-between gap-3 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Bağla">
          <Icon name="x" className="size-6" />
        </button>
        <div className="flex rounded-full bg-white/10 p-1 text-sm font-semibold">
          {(["text", "image"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => (m === "image" && !image ? fileRef.current?.click() : setMode(m))}
              className={`h-9 rounded-full px-4 transition ${mode === m ? "bg-white text-black" : "text-white/80"}`}
            >
              {m === "text" ? "Mətn" : "Şəkil"}
            </button>
          ))}
        </div>
        <span className="w-11" />
      </div>

      {/* Önizləmə */}
      <div className="relative mx-auto my-3 flex w-full max-w-md flex-1 overflow-hidden rounded-3xl">
        {mode === "text" ? (
          <div className={`flex flex-1 items-center justify-center bg-gradient-to-br p-8 ${STORY_BACKGROUNDS[bg]}`}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_STORY_TEXT))}
              placeholder="Nə paylaşmaq istəyirsiniz?"
              rows={6}
              className={`w-full resize-none bg-transparent text-center font-semibold leading-snug text-white placeholder:text-white/60 focus:outline-none ${fontSize}`}
            />
            <span className="absolute bottom-3 right-4 text-xs text-white/70">
              {text.length}/{MAX_STORY_TEXT}
            </span>
          </div>
        ) : image ? (
          <div className="relative flex flex-1 items-center justify-center bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Seçilmiş şəkil" className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute right-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/50 px-3 text-sm font-medium backdrop-blur"
            >
              <Icon name="plus" className="size-4" /> Dəyiş
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-1 flex-col items-center justify-center gap-3 bg-neutral-900 text-white/80">
            <Icon name="plus" className="size-10" /> Şəkil seçin
          </button>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm">Şəkil hazırlanır…</div>}
      </div>

      {/* Aşağı panel */}
      <div className="mx-auto w-full max-w-md space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {mode === "text" ? (
          <div className="flex justify-center gap-3" role="radiogroup" aria-label="Fon rəngi">
            {(Object.keys(STORY_BACKGROUNDS) as StoryBg[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={bg === k}
                aria-label={k}
                onClick={() => setBg(k)}
                className={`size-9 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-black transition ${STORY_BACKGROUNDS[k]} ${bg === k ? "ring-2 ring-white" : ""}`}
              />
            ))}
          </div>
        ) : (
          image && (
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="Alt yazı əlavə edin (istəyə bağlı)"
              className="h-12 w-full rounded-xl bg-white/10 px-4 text-base text-white placeholder:text-white/50 outline-none focus:bg-white/15"
            />
          )
        )}
        {error && <p role="alert" className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-100">{error}</p>}
        <button
          type="button"
          onClick={publish}
          disabled={!canPublish || pending || busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-40"
        >
          {pending ? "Paylaşılır…" : "Paylaş · 24 saat"}
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
