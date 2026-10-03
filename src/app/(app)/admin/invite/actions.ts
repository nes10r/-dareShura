"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createInvite, revokeInvite } from "@/lib/db/repo";

export async function generateInvite() {
  const user = await requirePermission("users.invite");
  await createInvite(user.id);
  revalidatePath("/admin/invite");
}

export async function deactivateInvite(id: string) {
  await requirePermission("users.invite");
  await revokeInvite(id);
  revalidatePath("/admin/invite");
}
