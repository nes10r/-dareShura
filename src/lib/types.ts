export type Role = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  faculty: string;
  position: string;
  academicTitle: string | null;
  inviteId?: string | null;
  createdAt: string;
}

export interface Invite {
  id: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

/** Client-ə ötürülə bilən təhlükəsiz istifadəçi görünüşü (parol hash-i olmadan). */
export type PublicUser = Omit<User, "passwordHash">;

export type QuestionType = "single" | "multiple" | "scale" | "text";

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  /** single / multiple üçün variantlar */
  options?: string[];
  /** scale üçün */
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

/**
 * Sorğunun auditoriya qaydaları. `all` true olduqda digər qaydalara baxılmır.
 * Əks halda istifadəçi qaydalardan HƏR HANSI BİRİNƏ uyğun gəlirsə auditoriyaya daxildir.
 */
export interface Audience {
  all: boolean;
  roles: Role[];
  faculties: string[];
  userIds: string[];
}

/** Bazada saxlanılan status. Effektiv status tarixlərə görə hesablanır. */
export type SurveyStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type EffectiveStatus = "draft" | "scheduled" | "active" | "closed";
export type ResultsVisibility = "NONE" | "RESPONDENTS";

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  audience: Audience;
  resultsVisibility: ResultsVisibility;
  resultsVisibleUntil: string | null;
  questions: Question[];
  isTemplate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AnswerValue = string | string[] | number;

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  answers: Record<string, AnswerValue>;
  submittedAt: string;
}

export interface SeedData {
  users: User[];
  surveys: Survey[];
  responses: SurveyResponse[];
  news: NewsItem[];
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Superadmin",
  ADMIN: "Administrator",
  MEMBER: "Şura üzvü",
};


export const NEWS_CATEGORIES = ["Xəbər", "Elan", "İclas", "Tədbir"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type EventFormat = "Əyani" | "Onlayn" | "Hibrid";

/** Kateqoriyaya xas sahələr (hamısı istəyə bağlı). Tarixlər ISO formatında. */
export interface NewsMeta {
  startsAt?: string;
  endsAt?: string;
  location?: string;
  format?: EventFormat;
  onlineUrl?: string;
  registrationUrl?: string;
  deadline?: string;
  contact?: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  coverImage: string | null;
  meta: NewsMeta;
  isPublished: boolean;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Xəbər üçün hazır üz qabığı şəkilləri (public/images) */
export const NEWS_COVER_PRESETS = [
  { src: "/images/campus-aerial.jpg", label: "Kampus" },
  { src: "/images/campus-cube.jpg", label: "UNEC kub" },
  { src: "/images/campus-courtyard.jpg", label: "Həyət" },
  { src: "/images/unec-logo.jpg", label: "Loqo" },
] as const;
