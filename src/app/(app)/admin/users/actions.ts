"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { findUserById, updateUserRole } from "@/lib/db/repo";

/** Superadmin istifadəçini admin təyin edir və ya adminlikdən çıxarır. */
export async function setUserRole(userId: string, role: "ADMIN" | "MEMBER") {
  const actor = await requirePermission("users.manage");
  if (role !== "ADMIN" && role !== "MEMBER") return;
  const target = await findUserById(userId);
  // Öz rolunu və digər superadminlərin rolunu dəyişmək olmaz
  if (!target || target.id === actor.id || target.role === "SUPER_ADMIN") return;
  await updateUserRole(target.id, role);
  revalidatePath("/", "layout");
}
