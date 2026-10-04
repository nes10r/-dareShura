import { getSessionUser } from "@/lib/auth";
import { getAvatar } from "@/lib/db/repo";

/** Profil şəkli — yalnız daxil olmuş istifadəçilərə. URL versiyalı olduğu üçün brauzerdə uzunmüddətli keşlənir. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return new Response(null, { status: 401 });
  const avatar = await getAvatar((await params).id);
  if (!avatar) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(Buffer.from(avatar.data, "base64")), {
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
