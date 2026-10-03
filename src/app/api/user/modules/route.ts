import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resolveModules } from "@/lib/modules/registry";

/**
 * İstifadəçinin hazırda görə biləcəyi modullar.
 * Görünməyən modullar cavaba ümumiyyətlə daxil edilmir — sorğu yoxdursa `{ "modules": [] }`.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { modules } = await resolveModules(user);
  return NextResponse.json({ modules }, { headers: { "Cache-Control": "private, no-store" } });
}
