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
  avatarUpdatedAt?: string | null;
  skills?: string[];
  bio?: string;
  orcid?: string | null;
  scholarUrl?: string | null;
  openToCollab?: boolean;
  openalexId?: string | null;
  researchStats?: ResearchStats | null;
  pubsSyncedAt?: string | null;
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
  /** Anonim sorğu: administratorlar cavab verənlərin adını görmür */
  anonymous: boolean;
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

// ---------- Konfranslar ----------

export type ConferenceFormat = "Əyani" | "Onlayn" | "Hibrid";
export type ConferenceFee = "free" | "paid";

/** Adminin əl ilə təyin etdiyi sahələr — avtomatik çıxarılan dəyərləri üstələyir */
export interface ConferenceOverrides {
  startsAt?: string | null;
  endsAt?: string | null;
  deadline?: string | null;
  format?: ConferenceFormat | null;
  location?: string | null;
  fee?: ConferenceFee | null;
  feeNote?: string | null;
}

export interface Conference {
  id: string;
  sourceUrl: string;
  title: string;
  summary: string;
  bodyHtml: string;
  image: string | null;
  publishedAt: string;
  /** Effektiv dəyərlər (avtomatik + adminin düzəlişləri) */
  startsAt: string | null;
  endsAt: string | null;
  deadline: string | null;
  deadlines: { date: string; label: string }[];
  format: ConferenceFormat | null;
  location: string | null;
  fee: ConferenceFee | null;
  feeNote: string | null;
  overrides: ConferenceOverrides;
  /** Mənbədən avtomatik çıxarılan dəyərlər (admin redaktorunda müqayisə üçün) */
  auto: Required<ConferenceOverrides>;
  hidden: boolean;
  fetchedAt: string;
}

// ---------- Qrantlar ----------

export type GrantSource = "aef" | "unec" | "manual";
export interface GrantDocument {
  title: string;
  url: string;
}
export interface GrantOverrides {
  deadline?: string | null;
  amount?: string | null;
  fields?: string[];
}

export interface Grant {
  id: string;
  source: GrantSource;
  sourceUrl: string | null;
  title: string;
  summary: string;
  bodyHtml: string;
  image: string | null;
  documents: GrantDocument[];
  publishedAt: string;
  /** Effektiv dəyərlər (avtomatik + admin düzəlişləri) */
  deadline: string | null;
  amount: string | null;
  fields: string[];
  overrides: GrantOverrides;
  hidden: boolean;
}

export type GrantGroupMode = "matched" | "open";
export type GrantGroupStatus = "open" | "closed";
export type GrantInviteKind = "invite" | "offer" | "request";
export type GrantInviteStatus = "pending" | "accepted" | "declined";

export interface GrantGroup {
  id: string;
  grantId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  targetSize: number | null;
  respondBy: string | null;
  mode: GrantGroupMode;
  status: GrantGroupStatus;
  createdBy: string;
  createdAt: string;
}

export interface GrantInvitation {
  id: string;
  groupId: string;
  userId: string;
  kind: GrantInviteKind;
  status: GrantInviteStatus;
  matchedSkills: string[];
  createdAt: string;
  respondedAt: string | null;
}

// ---------- Elmi profil ----------

export interface ResearchStats {
  works: number;
  citations: number;
  hIndex: number;
  i10Index: number;
}

export interface Publication {
  id: string;
  workId: string;
  title: string;
  year: number | null;
  venue: string | null;
  /** Jurnalın OpenAlex ID-si (S…); yalnız ORCID-də olan işlərdə null */
  sourceId: string | null;
  doi: string | null;
  url: string | null;
  type: string | null;
  citedBy: number;
  openAccess: boolean;
}

export interface CollabRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  topic: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt: string | null;
  requesterSeenAt: string | null;
}

// ---------- Kitab layihələri ----------

export type BookKind = "edited" | "monograph" | "textbook" | "other";

export const BOOK_KINDS: Record<BookKind, { label: string; hint: string }> = {
  edited: { label: "Kollektiv kitab (fəsillər)", hint: "Hər fəsli ayrı müəllif(lər) yazır, siz redaktorsunuz" },
  monograph: { label: "Kollektiv monoqrafiya", hint: "Bir tədqiqat mövzusu üzrə həmmüəlliflər" },
  textbook: { label: "Dərslik / dərs vəsaiti", hint: "Fənn üzrə tədris materialı" },
  other: { label: "Digər", hint: "Konfrans materialları toplusu, lüğət və s." },
};

export interface BookProject {
  id: string;
  title: string;
  kind: BookKind;
  description: string;
  topics: string[];
  language: string;
  publisher: string;
  deadline: string | null;
  status: "open" | "closed";
  editorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookChapter {
  id: string;
  bookId: string;
  position: number;
  title: string;
  description: string;
  authorIds: string[];
}

export interface BookRequest {
  id: string;
  bookId: string;
  chapterId: string | null;
  proposedTitle: string;
  userId: string;
  kind: "invite" | "request";
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt: string | null;
  initiatorSeenAt: string | null;
}

// ---------- Jurnallar ----------

export interface ScopusInfo {
  indexed: boolean;
  /** Scopus-dan çıxarılıbsa — son əhatə ili */
  discontinuedAfter?: number | null;
  citeScore?: number | null;
  citeScoreYear?: number | null;
  sjr?: number | null;
  /** CiteScore faizinə görə ən yaxşı kvartil (Q1–Q4) */
  quartile?: 1 | 2 | 3 | 4 | null;
  subjects?: string[];
  sourceUrl?: string | null;
  checkedAt: string;
}

export interface PublishSpeed {
  /** Hesablamada istifadə olunan məqalələr */
  sample: number;
  /** Göndərilmədən qəbula qədər (gün, median) */
  acceptDays: number | null;
  /** Qəbuldan onlayn nəşrə qədər (gün, median) */
  publishDays: number | null;
  checkedAt: string;
}

export interface Journal {
  id: string;
  title: string;
  issnL: string | null;
  issn: string[];
  publisher: string | null;
  homepage: string | null;
  isOa: boolean;
  inDoaj: boolean;
  apcUsd: number | null;
  hIndex: number | null;
  meanCitedness: number | null;
  worksCount: number | null;
  worksByYear: Record<string, number> | null;
  listedIn: string[];
  callsUrl: string | null;
  scopus: ScopusInfo | null;
  speed: PublishSpeed | null;
  updatedAt: string;
}

export interface JournalCall {
  id: string;
  journalId: string | null;
  journalTitle: string;
  title: string;
  url: string;
  note: string;
  opensAt: string | null;
  deadline: string | null;
  topics: string[];
  createdBy: string | null;
  createdAt: string;
}
