import type {
  AnswerValue,
  EffectiveStatus,
  Question,
  Survey,
  SurveyResponse,
  User,
} from "../types";

const DAY = 24 * 60 * 60 * 1000;
/** Bu müddət ərzində dərc olunmuş sorğu "Yeni" sayılır. */
const NEW_WINDOW_MS = 3 * DAY;
/** Son tarixə bu qədər qalanda "N gün qalıb" xəbərdarlığı göstərilir. */
const DEADLINE_WARNING_DAYS = 3;

// ---------- Status ----------

export function getEffectiveStatus(survey: Survey, now = new Date()): EffectiveStatus {
  if (survey.status === "DRAFT") return "draft";
  if (survey.status === "CLOSED") return "closed";
  const t = now.getTime();
  if (survey.startsAt && new Date(survey.startsAt).getTime() > t) return "scheduled";
  if (survey.endsAt && new Date(survey.endsAt).getTime() <= t) return "closed";
  return "active";
}

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: "Draft",
  scheduled: "Planlaşdırılıb",
  active: "Aktiv",
  closed: "Bağlanıb",
};

// ---------- Auditoriya ----------

export function isInAudience(survey: Survey, user: User) {
  const a = survey.audience;
  if (a.all) return true;
  return a.roles.includes(user.role) || a.faculties.includes(user.faculty) || a.userIds.includes(user.id);
}

export function resolveAudience(survey: Survey, users: User[]) {
  return users.filter((u) => isInAudience(survey, u));
}

export function describeAudience(survey: Survey) {
  const a = survey.audience;
  if (a.all) return "Bütün istifadəçilər";
  const parts: string[] = [];
  if (a.roles.length) parts.push(`${a.roles.length} rol`);
  if (a.faculties.length) parts.push(a.faculties.join(", "));
  if (a.userIds.length) parts.push(`${a.userIds.length} istifadəçi`);
  return parts.join(" · ") || "Auditoriya seçilməyib";
}

// ---------- Metadata ----------

const SECONDS_PER_TYPE: Record<Question["type"], number> = { single: 15, scale: 12, multiple: 25, text: 60 };

export function estimateMinutes(survey: Pick<Survey, "questions">) {
  const sec = survey.questions.reduce((sum, q) => sum + SECONDS_PER_TYPE[q.type], 0);
  return Math.max(1, Math.round(sec / 60));
}

/** Son tarixə qalan tam gün sayı (bu gün bitirsə 0). */
export function daysLeft(survey: Survey, now = new Date()) {
  if (!survey.endsAt) return null;
  const ms = new Date(survey.endsAt).getTime() - now.getTime();
  return ms < 0 ? null : Math.floor(ms / DAY);
}

export function isNewSurvey(survey: Survey, now = new Date()) {
  const from = survey.startsAt ?? survey.publishedAt;
  return !!from && now.getTime() - new Date(from).getTime() < NEW_WINDOW_MS;
}

export function isDeadlineNear(days: number | null) {
  return days !== null && days < DEADLINE_WARNING_DAYS;
}

// ---------- İstifadəçi üçün görünürlük ----------

export type UserSurveyState = "pending" | "answered" | "results";

export interface UserSurveyView {
  survey: Survey;
  status: EffectiveStatus;
  state: UserSurveyState;
  response: SurveyResponse | null;
  canViewResults: boolean;
}

function canViewResults(survey: Survey, responded: boolean, now: Date) {
  if (survey.resultsVisibility !== "RESPONDENTS" || !responded) return false;
  return !survey.resultsVisibleUntil || new Date(survey.resultsVisibleUntil).getTime() > now.getTime();
}

/**
 * İstifadəçinin görməli olduğu bütün sorğular. Boş massiv qayıdırsa,
 * survey modulu həmin istifadəçi üçün tamamilə gizlənir.
 *
 *  - pending  → aktiv, auditoriyadadır, hələ cavab verməyib
 *  - answered → aktiv, artıq cavab verib (cavabına baxa bilər)
 *  - results  → cavab verib və nəticələr ona açıqdır (aktiv və ya bağlanmış)
 */
export function getUserSurveys(
  surveys: Survey[],
  userResponses: SurveyResponse[],
  user: User,
  now = new Date(),
): UserSurveyView[] {
  const views: UserSurveyView[] = [];
  for (const survey of surveys) {
    if (survey.isTemplate || !isInAudience(survey, user)) continue;
    const status = getEffectiveStatus(survey, now);
    if (status === "draft" || status === "scheduled") continue;

    const response = userResponses.find((r) => r.surveyId === survey.id && r.userId === user.id) ?? null;
    const results = canViewResults(survey, !!response, now);

    if (status === "active" && !response) {
      views.push({ survey, status, state: "pending", response, canViewResults: false });
    } else if (results) {
      views.push({ survey, status, state: "results", response, canViewResults: true });
    } else if (status === "active" && response) {
      views.push({ survey, status, state: "answered", response, canViewResults: false });
    }
  }
  return views.sort(compareViews);
}

const STATE_ORDER: Record<UserSurveyState, number> = { pending: 0, results: 1, answered: 2 };

/** Cavablandırılmamışlar əvvəl, onların içində son tarixi ən yaxın olan birinci. */
function compareViews(a: UserSurveyView, b: UserSurveyView) {
  if (a.state !== b.state) return STATE_ORDER[a.state] - STATE_ORDER[b.state];
  const ae = a.survey.endsAt ? new Date(a.survey.endsAt).getTime() : Infinity;
  const be = b.survey.endsAt ? new Date(b.survey.endsAt).getTime() : Infinity;
  return ae - be;
}

// ---------- Cavabların yoxlanması ----------

export function validateAnswers(survey: Survey, raw: Record<string, unknown>) {
  const answers: Record<string, AnswerValue> = {};
  const errors: Record<string, string> = {};

  for (const q of survey.questions) {
    const v = raw[q.id];
    let value: AnswerValue | undefined;

    if (q.type === "single" && typeof v === "string" && q.options?.includes(v)) value = v;
    else if (q.type === "multiple" && Array.isArray(v)) {
      const picked = v.filter((x): x is string => typeof x === "string" && !!q.options?.includes(x));
      if (picked.length) value = [...new Set(picked)];
    } else if (q.type === "scale" && typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= (q.scaleMax ?? 5)) value = v;
    else if (q.type === "text" && typeof v === "string" && v.trim()) value = v.trim().slice(0, 2000);

    if (value === undefined) {
      if (q.required) errors[q.id] = "Bu sual məcburidir";
    } else answers[q.id] = value;
  }
  return { answers, errors, ok: Object.keys(errors).length === 0 };
}

// ---------- Statistika ----------

export interface QuestionStats {
  question: Question;
  answered: number;
  /** single / multiple / scale üçün: variant → say */
  counts?: { label: string; count: number }[];
  average?: number;
  texts?: string[];
}

export function getSurveyStats(survey: Survey, responses: SurveyResponse[]): QuestionStats[] {
  return survey.questions.map((question) => {
    const values = responses.map((r) => r.answers[question.id]).filter((v) => v !== undefined && v !== "");
    const base = { question, answered: values.length };

    if (question.type === "text") return { ...base, texts: values.map(String) };

    if (question.type === "scale") {
      const max = question.scaleMax ?? 5;
      const nums = values.filter((v): v is number => typeof v === "number");
      return {
        ...base,
        counts: Array.from({ length: max }, (_, i) => ({ label: String(i + 1), count: nums.filter((n) => n === i + 1).length })),
        average: nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : undefined,
      };
    }

    const flat = values.flatMap((v) => (Array.isArray(v) ? v : [String(v)]));
    return { ...base, counts: (question.options ?? []).map((label) => ({ label, count: flat.filter((x) => x === label).length })) };
  });
}
