import { hasPermission } from "../../auth";
import type { ModuleProvider } from "../types";

/** Xəbərlərin idarə edilməsi: səlahiyyətli istifadəçilər üçün həmişə əlçatandır. */
export const newsAdminModule: ModuleProvider = {
  key: "news-admin",
  async resolve({ user }) {
    if (!hasPermission(user, "news.manage")) return { visible: false };
    return {
      visible: true,
      nav: {
        label: "Xəbərlərin idarə edilməsi",
        href: "/admin/news",
        icon: "newspaper",
        section: "admin",
        order: 20,
        children: [{ label: "Yeni xəbər", href: "/admin/news/new", icon: "plus" }],
      },
    };
  },
};
