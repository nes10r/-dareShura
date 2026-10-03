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
  createdAt: string;
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
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Superadmin",
  ADMIN: "Administrator",
  MEMBER: "Şura üzvü",
};

export const FACULTIES = [
  "Rəqəmsal iqtisadiyyat",
  "Biznes və menecment",
  "Maliyyə və mühasibat",
  "İqtisadiyyat və idarəetmə",
  "Beynəlxalq iqtisadiyyat",
] as const;
