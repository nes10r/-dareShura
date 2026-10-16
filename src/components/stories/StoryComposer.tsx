"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createStory } from "@/app/(app)/status/actions";
import { Icon } from "@/components/Icon";
import { MAX_CAPTION, MAX_STORY_TEXT, STORY_BACKGROUNDS, type StoryBg } from "@/lib/stories";

const MAX_SIDE = 1080;
const TARGET_BYTES = 600 * 1024;

const BG_LABELS: Record<StoryBg, string> = { brand: "Göy", emerald: "Yaşıl", sunset: "Qürub", violet: "Bənövşəyi", slate: "Tünd" };

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

/**
 * Yeni status: mətn (rəngli fon) və ya şəkil (alt yazı ilə).
 * Mobil — tam ekran; kompüter — solda önizləmə, sağda idarəetmə paneli,
 * şəkli sürüşdürüb atmaq (drag & drop) və Ctrl+V ilə yapışdırmaq, Ctrl+Enter ilə paylaşmaq.
 */
export function StoryComposer({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [bg, setBg] = useState<StoryBg>("brand");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const canPublish = (mode === "text" ? text.trim().length > 0 : !!image) && !pending && !busy;

  const pick = useCallback(async (file?: File | null) => {
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
  }, []);

  const publish = useCallback(() => {
    if (!canPublish) return;
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
  }, [canPublish, mode, text, bg, image, onPublished]);

  // Scroll kilidi, Esc, Ctrl+Enter, Ctrl+V ilə şəkil yapışdırma
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) publish();
    };
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        pick(file);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [onClose, publish, pick]);

  const fontSize = text.length > 180 ? "text-xl" : text.length > 80 ? "text-2xl" : "text-3xl";

  const modeToggle = (
    <div className="flex rounded-full bg-white/10 p-1 text-sm font-semibold" role="tablist" aria-label="Status növü">
      {(["text", "image"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => (m === "image" && !image ? fileRef.current?.click() : setMode(m))}
          className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-4 transition ${mode === m ? "bg-white text-black" : "text-white/80 hover:text-white"}`}
        >
          <Icon name={m === "text" ? "type" : "image"} className="size-4" />
          {m === "text" ? "Mətn" : "Şəkil"}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="animate-fade fixed inset-0 z-[60] flex flex-col bg-black text-white lg:items-center lg:justify-center lg:bg-neutral-950/85 lg:p-6 lg:backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Yeni status"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files?.[0]);
      }}
      onClick={(e) => {
        // Kompüterdə boş arxa fona klik — bağla
        if (e.target === e.currentTarget && window.matchMedia("(min-width: 1024px)").matches) onClose();
      }}
    >
      <div className="flex flex-1 flex-col lg:flex-none lg:flex-row lg:gap-6 lg:rounded-3xl lg:bg-neutral-900 lg:p-6 lg:shadow-2xl lg:ring-1 lg:ring-white/10">
        {/* Mobil başlıq */}
        <div className="flex items-center justify-between gap-3 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] lg:hidden">
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Bağla">
            <Icon name="x" className="size-6" />
          </button>
          {modeToggle}
          <span className="w-11" />
        </div>

        {/* Önizləmə */}
        <div className="relative mx-auto my-3 flex w-full max-w-md flex-1 overflow-hidden rounded-3xl lg:my-0 lg:aspect-[9/16] lg:h-[min(80dvh,720px)] lg:w-auto lg:max-w-none lg:flex-none">
          {mode === "text" ? (
            <div className={`flex flex-1 items-center justify-center bg-gradient-to-br p-8 ${STORY_BACKGROUNDS[bg]}`}>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_STORY_TEXT))}
                placeholder="Nə paylaşmaq istəyirsiniz?"
                rows={6}
                aria-label="Status mətni"
                className={`w-full resize-none bg-transparent text-center font-semibold leading-snug text-white placeholder:text-white/60 focus:outline-none ${fontSize}`}
              />
              <span className="absolute bottom-3 right-4 text-xs text-white/70 lg:hidden">
                {text.length}/{MAX_STORY_TEXT}
              </span>
            </div>
          ) : image ? (
            <div className="relative flex flex-1 items-center justify-center bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Seçilmiş şəkil" className="max-h-full max-w-full object-contain" />
              {text && <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10 text-center text-[15px]">{text}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-1 flex-col items-center justify-center gap-3 bg-neutral-900 text-white/80">
              <Icon name="image" className="size-10" /> Şəkil seçin
            </button>
          )}
          {busy && <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm">Şəkil hazırlanır…</div>}
          {dragging && (
            <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-2xl border-2 border-dashed border-white/70 bg-black/60 text-center text-sm font-medium">
              Şəkli buraxın
            </div>
          )}
        </div>

        {/* İdarəetmə: mobil — aşağıda, kompüter — sağ panel */}
        <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:flex lg:w-80 lg:flex-col lg:px-0 lg:pb-0">
          <div className="hidden items-start justify-between gap-3 lg:flex">
            <div>
              <h2 className="text-lg font-semibold">Yeni status</h2>
              <p className="text-xs text-white/60">24 saatdan sonra avtomatik silinir</p>
            </div>
            <button type="button" onClick={onClose} className="-mr-2 -mt-1 grid size-10 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Bağla">
              <Icon name="x" className="size-5" />
            </button>
          </div>
          <div className="hidden lg:block">{modeToggle}</div>

          {mode === "text" ? (
            <div>
              <p className="mb-2 hidden text-xs font-medium uppercase tracking-wide text-white/50 lg:block">Fon rəngi</p>
              <div className="flex justify-center gap-3 lg:justify-start" role="radiogroup" aria-label="Fon rəngi">
                {(Object.keys(STORY_BACKGROUNDS) as StoryBg[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={bg === k}
                    aria-label={BG_LABELS[k]}
                    title={BG_LABELS[k]}
                    onClick={() => setBg(k)}
                    className={`size-9 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-black transition hover:scale-110 lg:ring-offset-neutral-900 ${STORY_BACKGROUNDS[k]} ${bg === k ? "ring-2 ring-white" : ""}`}
                  />
                ))}
              </div>
              <p className="mt-3 hidden text-xs text-white/50 lg:block">
                {text.length}/{MAX_STORY_TEXT} simvol · mətni önizləmənin üzərində yazın
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="hidden w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-white/20 px-4 py-5 text-center text-sm text-white/70 transition hover:border-white/40 hover:text-white lg:flex"
              >
                <Icon name="image" className="size-6" />
                {image ? "Başqa şəkil seç" : "Şəkil seçin"}
                <span className="text-xs text-white/40">və ya bura sürüşdürün · Ctrl+V ilə yapışdırın</span>
              </button>
              {image && (
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CAPTION))}
                  placeholder="Alt yazı əlavə edin (istəyə bağlı)"
                  aria-label="Alt yazı"
                  className="h-12 w-full rounded-xl bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/50 focus:bg-white/15"
                />
              )}
              {image && (
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 text-sm text-white/70 hover:text-white lg:hidden">
                  <Icon name="image" className="size-4" /> Başqa şəkil seç
                </button>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-100">
              {error}
            </p>
          )}

          <div className="lg:mt-auto">
            <button
              type="button"
              onClick={publish}
              disabled={!canPublish}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-40"
            >
              {pending ? "Paylaşılır…" : "Paylaş · 24 saat"}
            </button>
            <p className="mt-2 hidden text-center text-xs text-white/40 lg:block">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Enter</kbd> paylaş ·{" "}
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Esc</kbd> bağla
            </p>
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
