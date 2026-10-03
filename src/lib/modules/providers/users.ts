import { hasPermission } from "../../auth";
import type { ModuleProvider } from "../types";

/** Qeydiyyat dəvət linki — admin və superadmin. */
export const inviteAdminModule: ModuleProvider = {
  key: "invite-admin",
  async resolve({ user }) {
    if (!hasPermission(user, "users.invite")) return { visible: false };
    return {
      visible: true,
      nav: { label: "Qeydiyyat linki", href: "/admin/invite", icon: "lock", section: "admin", order: 25 },
    };
  },
};

/** İstifadəçilər və rolların idarə edilməsi — yalnız superadmin. */
export const usersAdminModule: ModuleProvider = {
  key: "users-admin",
  async resolve({ user }) {
    if (!hasPermission(user, "users.manage")) return { visible: false };
    return {
      visible: true,
      nav: { label: "İstifadəçilər", href: "/admin/users", icon: "users", section: "admin", order: 30 },
    };
  },
};
