"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { deleteAvatar, uploadAvatar } from "./actions";

const SIZE = 320;

/** Şəkli mərkəzdən kvadrat kəsir və 320×320-ə kiçildir (telefon şəkli ~5 MB → ~30 KB). */
async function toSquareDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Şəkil faylı seçin.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Fayl 20 MB-dan böyük olmamalıdır.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Bu format dəstəklənmir. JPG və ya PNG şəkil seçin.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  // WebP dəstəklənmirsə (köhnə Safari) JPEG
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarUploader({ name, src }: { name: string; src: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await toSquareDataUrl(file);
      setPreview(dataUrl);
      startTransition(async () => {
        try {
          const res = await uploadAvatar(dataUrl);
          if (res.error) {
            setError(res.error);
            setPreview(null);
          } else router.refresh();
        } catch {
          setError("Şəkli yükləmək mümkün olmadı. İnternet bağlantısını yoxlayın.");
          setPreview(null);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şəkli emal etmək mümkün olmadı.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    if (!window.confirm("Profil şəkli silinsin?")) return;
    setError(null);
    startTransition(async () => {
      await deleteAvatar();
      setPreview(null);
      router.refresh();
    });
  }

  const shown = preview ?? src;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="group relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-label="Profil şəklini dəyiş"
      >
        <Avatar name={name} src={shown} size="xl" className={pending ? "opacity-60" : ""} />
        <span className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-brand-700 text-white shadow ring-2 ring-white transition group-hover:bg-brand-800">
          {pending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Icon name="plus" className="size-4" />
          )}
        </span>
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="h-10 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50 disabled:opacity-60"
          >
            {shown ? "Şəkli dəyiş" : "Şəkil yüklə"}
          </button>
          {shown && (
            <button type="button" onClick={remove} disabled={pending} className="h-10 rounded-xl px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
              Sil
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">Şəkil kvadrat formada kəsilir. JPG, PNG və ya WebP.</p>
        {error && <p role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
