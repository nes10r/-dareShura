import type { User } from "../types";

/**
 * Dynamic Module Architecture
 *
 * Hər modul (sorğu, iclas, tapşırıq, səsvermə, qərar...) bir `ModuleProvider`-dir.
 * Provider istifadəçinin hazırkı vəziyyətinə görə qərar verir:
 *   - modul ümumiyyətlə görünsünmü (`visible`)
 *   - naviqasiyada hansı bənd və badge göstərilsin
 *   - dashboard-a hansı kartlar çıxsın
 *
 * Naviqasiya və dashboard statik deyil — hər sorğuda bu provider-lərdən generasiya olunur.
 * Yeni modul əlavə etmək = yeni provider yazıb `registry.ts`-də qeydiyyatdan keçirmək.
 */

export interface ModuleContext {
  user: User;
  now: Date;
}

export type IconName =
  | "home" | "survey" | "user" | "settings" | "chart" | "plus" | "file"
  | "calendar" | "bell" | "check" | "clock" | "logout" | "arrow-right" | "x"
  | "chevron-left" | "chevron-right" | "template" | "megaphone" | "lock" | "users";

export interface NavLink {
  label: string;
  href: string;
  icon?: IconName;
  badge?: number;
}

export interface NavEntry extends NavLink {
  key: string;
  section: "main" | "admin";
  order: number;
  /** Desktop sidebar-da alt bəndlər (məs. admin bölmələri) */
  children?: NavLink[];
}

/** Dashboard kartı — `kind` uyğun React komponentini seçir. */
export type DashboardCard =
  | { kind: "survey"; key: string; priority: number; data: SurveyCardData };

export interface SurveyCardData {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  minutes: number;
  endsAt: string | null;
  daysLeft: number | null;
  isNew: boolean;
  deadlineNear: boolean;
  state: "pending" | "answered" | "results";
  /** İştirak könüllüdür (məs. sorğunu idarə edən admin): popup və prominent kart göstərilmir */
  optional: boolean;
}

export interface ModuleResolution {
  visible: boolean;
  badge?: number;
  nav?: Omit<NavEntry, "key" | "badge">;
  cards?: DashboardCard[];
}

export interface ModuleProvider {
  key: string;
  resolve(ctx: ModuleContext): Promise<ModuleResolution>;
}

/** GET /api/user/modules cavabındakı element */
export interface ModuleSummary {
  key: string;
  visible: true;
  badge: number;
  label?: string;
  href?: string;
  section?: "main" | "admin";
}
