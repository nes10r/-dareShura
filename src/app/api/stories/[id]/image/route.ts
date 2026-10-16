import { getSessionUser } from "@/lib/auth";
import { getStory } from "@/lib/db/repo";

/** Status şəkli — yalnız daxil olmuş istifadəçilərə; status 24 saatdan sonra silindiyi üçün qısa keş */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return new Response(null, { status: 401 });
  const story = await getStory((await params).id);
  if (!story?.imageData || !story.imageMime) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(Buffer.from(story.imageData, "base64")), {
    headers: { "Content-Type": story.imageMime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
