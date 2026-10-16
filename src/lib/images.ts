/** Faylın həqiqi növü başlıq baytlarından yoxlanılır (yalnız MIME-a etibar edilmir). */
export function detectImage(buf: Buffer) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** data URL-i yoxlayır: icazəli növ, ölçü limiti, başlıq baytları MIME ilə uyğun olmalıdır */
export function parseImageDataUrl(dataUrl: string, maxBytes: number) {
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ""));
  if (!m) return { error: "Şəkil formatı dəstəklənmir." } as const;
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > maxBytes) return { error: "Şəkil çox böyükdür." } as const;
  const mime = detectImage(buf);
  if (!mime || mime !== m[1]) return { error: "Fayl şəkil deyil və ya zədələnib." } as const;
  return { mime, base64: m[2] } as const;
}
