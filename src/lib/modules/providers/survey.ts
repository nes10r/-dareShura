import { hasPermission } from "../../auth";
import { listPublishedSurveys, listResponsesByUser } from "../../db/repo";
import {
  daysLeft,
  estimateMinutes,
  getUserSurveys,
  isDeadlineNear,
  isNewSurvey,
} from "../../surveys/service";
import type { DashboardCard, ModuleProvider } from "../types";

/** İstifadəçi tərəfi: yalnız ona ünvanlanan real sorğu olduqda görünür. */
export const surveyModule: ModuleProvider = {
  key: "survey",
  async resolve({ user, now }) {
    const [surveys, responses] = await Promise.all([listPublishedSurveys(), listResponsesByUser(user.id)]);
    const views = getUserSurveys(surveys, responses, user, now);
    if (views.length === 0) return { visible: false };

    const pending = views.filter((v) => v.state === "pending").length;
    // Sorğuları idarə edənlər (yaradanlar) iştirak edə bilər, amma onlardan cavab "gözlənilmir":
    // popup, badge və prominent kart yalnız adi istifadəçilər üçündür.
    const optional = hasPermission(user, "survey.manage");

    const cards: DashboardCard[] = views
      // Dashboard-da yalnız real iş tələb edənlər və açıq nəticələr — "cavab verdim" kartları səs-küydür.
      .filter((v) => v.state !== "answered")
      .map((v) => {
        const left = daysLeft(v.survey, now);
        return {
          kind: "survey",
          key: `survey:${v.survey.id}`,
          priority: v.state === "pending" && !optional ? 100 + (isDeadlineNear(left) ? 10 : 0) : 20,
          data: {
            id: v.survey.id,
            title: v.survey.title,
            description: v.survey.description,
            questionCount: v.survey.questions.length,
            minutes: estimateMinutes(v.survey),
            endsAt: v.survey.endsAt,
            daysLeft: left,
            isNew: v.state === "pending" && isNewSurvey(v.survey, now),
            deadlineNear: v.state === "pending" && isDeadlineNear(left),
            state: v.state,
            optional,
          },
        };
      });

    return {
      visible: true,
      badge: optional ? 0 : pending,
      nav: { label: "Sorğular", href: "/surveys", icon: "survey", section: "main", order: 20 },
      cards,
    };
  },
};

/** Admin tərəfi: səlahiyyətli istifadəçilər üçün həmişə əlçatandır. */
export const surveyAdminModule: ModuleProvider = {
  key: "survey-admin",
  async resolve({ user }) {
    if (!hasPermission(user, "survey.manage")) return { visible: false };
    return {
      visible: true,
      nav: {
        label: "Sorğuların idarə edilməsi",
        href: "/admin/surveys",
        icon: "settings",
        section: "admin",
        order: 10,
        children: [
          { label: "Yeni sorğu yarat", href: "/admin/surveys/new", icon: "plus" },
          { label: "Draft sorğular", href: "/admin/surveys?tab=draft" },
          { label: "Planlaşdırılmış", href: "/admin/surveys?tab=scheduled" },
          { label: "Aktiv sorğular", href: "/admin/surveys?tab=active" },
          { label: "Bağlanmış sorğular", href: "/admin/surveys?tab=closed" },
          { label: "Sorğu şablonları", href: "/admin/surveys?tab=templates", icon: "template" },
          { label: "Analitika", href: "/admin/surveys/analytics", icon: "chart" },
        ],
      },
    };
  },
};
