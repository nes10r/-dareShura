"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { joinGroup, respondToGroup } from "@/lib/grants/groups";

function refresh() {
  revalidatePath("/", "layout");
}

/** Dəvətə / təklifə cavab (form action) */
export async function respondGroupAction(groupId: string, accept: boolean) {
  const user = await requireUser();
  await respondToGroup(groupId, user, accept);
  refresh();
}

/** Dəvəti olmayan üzv açıq işçi qrupa qoşulur */
export async function joinGroupAction(groupId: string) {
  const user = await requireUser();
  await joinGroup(groupId, user);
  refresh();
}
