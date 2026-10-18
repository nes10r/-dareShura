import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { BookKind, PublishSpeed, ResearchStats, ScopusInfo } from "../types";
import type { AnswerValue, Audience, ConferenceFee, ConferenceFormat, ConferenceOverrides, GrantDocument, GrantGroupMode, GrantGroupStatus, GrantInviteKind, GrantInviteStatus, GrantOverrides, GrantSource, NewsCategory, NewsMeta, Question, ResultsVisibility, Role, SurveyStatus } from "../types";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<Role>().notNull().default("MEMBER"),
  faculty: text("faculty").notNull(),
  position: text("position").notNull(),
  academicTitle: text("academic_title"),
  /** Hansı dəvət linki ilə qeydiyyatdan keçib (audit üçün) */
  inviteId: text("invite_id"),
  /** Profil şəklinin son yenilənmə vaxtı (null — şəkil yoxdur); URL-də keş versiyası kimi istifadə olunur */
  avatarUpdatedAt: ts("avatar_updated_at"),
  /** Elmi maraq və bacarıqlar (teqlər) — qrant işçi qruplarına uyğun dəvət üçün */
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  // ---- Elmi profil ----
  bio: text("bio").notNull().default(""),
  orcid: text("orcid"),
  scholarUrl: text("scholar_url"),
  openToCollab: boolean("open_to_collab").notNull().default(false),
  /** OpenAlex müəllif id-si və göstəriciləri (ORCID ilə avtomatik) */
  openalexId: text("openalex_id"),
  researchStats: jsonb("research_stats").$type<ResearchStats>(),
  pubsSyncedAt: ts("pubs_synced_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Profil şəkilləri ayrıca cədvəldə — istifadəçi siyahıları şəkil məlumatını yükləməsin */
export const userAvatars = pgTable("user_avatars", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  /** base64 (brauzerdə 320×320-ə kiçildilmiş, ~20–40 KB) */
  data: text("data").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const surveys = pgTable(
  "surveys",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").$type<SurveyStatus>().notNull().default("DRAFT"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    publishedAt: ts("published_at"),
    closedAt: ts("closed_at"),
    audience: jsonb("audience").$type<Audience>().notNull(),
    resultsVisibility: text("results_visibility").$type<ResultsVisibility>().notNull().default("NONE"),
    resultsVisibleUntil: ts("results_visible_until"),
    questions: jsonb("questions").$type<Question[]>().notNull(),
    isTemplate: boolean("is_template").notNull().default(false),
    anonymous: boolean("anonymous").notNull().default(false),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("surveys_status_idx").on(t.status, t.isTemplate)],
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: text("id").primaryKey(),
    surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Record<string, AnswerValue>>().notNull(),
    submittedAt: ts("submitted_at").notNull().defaultNow(),
  },
  // Bir istifadəçi bir sorğuya yalnız bir dəfə cavab verə bilər — DB səviyyəsində zəmanət
  (t) => [uniqueIndex("survey_responses_survey_user_uq").on(t.surveyId, t.userId), index("survey_responses_user_idx").on(t.userId)],
);

export const news = pgTable(
  "news",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull().default(""),
    category: text("category").$type<NewsCategory>().notNull().default("Xəbər"),
    coverImage: text("cover_image"),
    /** Kateqoriyaya xas sahələr: tarix, məkan, qeydiyyat linki, son tarix və s. */
    meta: jsonb("meta").$type<NewsMeta>().notNull().default({}),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: ts("published_at"),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("news_published_idx").on(t.isPublished, t.publishedAt)],
);

/** Qeydiyyat dəvət linkləri: admin yaradır, 24 saat etibarlıdır, eyni anda yalnız biri aktivdir. */
export const invites = pgTable(
  "invites",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
  },
  (t) => [index("invites_expires_idx").on(t.expiresAt)],
);

/**
 * news.unec.edu.az/elan/86-konfrans bölməsindən çəkilən konfrans elanları.
 * Avtomatik çıxarılan sahələr ayrıca, adminin əl ilə düzəlişləri `overrides`-da saxlanılır
 * (yenidən sinxronizasiya düzəlişləri silmir).
 */
export const conferences = pgTable(
  "conferences",
  {
    id: text("id").primaryKey(),
    sourceUrl: text("source_url").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    image: text("image"),
    publishedAt: ts("published_at").notNull(),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    deadline: ts("deadline"),
    deadlines: jsonb("deadlines").$type<{ date: string; label: string }[]>().notNull().default([]),
    format: text("format").$type<ConferenceFormat>(),
    location: text("location"),
    fee: text("fee").$type<ConferenceFee>(),
    feeNote: text("fee_note"),
    overrides: jsonb("overrides").$type<ConferenceOverrides>().notNull().default({}),
    hidden: boolean("hidden").notNull().default(false),
    fetchedAt: ts("fetched_at").notNull().defaultNow(),
  },
  (t) => [index("conferences_starts_idx").on(t.startsAt), index("conferences_published_idx").on(t.publishedAt)],
);

/** Kiçik açar-dəyər anbarı (məs. son sinxronizasiya vaxtı) */
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ---------- Qrantlar ----------

/** Qrant müsabiqələri: Elm Fondu (aef.gov.az), UNEC müsabiqə elanları və ya admin tərəfindən əl ilə */
export const grants = pgTable(
  "grants",
  {
    id: text("id").primaryKey(),
    source: text("source").$type<GrantSource>().notNull(),
    sourceUrl: text("source_url"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    image: text("image"),
    documents: jsonb("documents").$type<GrantDocument[]>().notNull().default([]),
    publishedAt: ts("published_at").notNull(),
    deadline: ts("deadline"),
    amount: text("amount"),
    /** Mövzu sahələri (teqlər) — işçi qrup yaradılarkən bacarıq kimi təklif olunur */
    fields: jsonb("fields").$type<string[]>().notNull().default([]),
    overrides: jsonb("overrides").$type<GrantOverrides>().notNull().default({}),
    hidden: boolean("hidden").notNull().default(false),
    fetchedAt: ts("fetched_at").notNull().defaultNow(),
  },
  (t) => [index("grants_published_idx").on(t.publishedAt)],
);

/** Qrant üçün işçi qrup: tələb olunan bacarıqlar üzrə üzvlərə dəvət göndərilir */
export const grantGroups = pgTable(
  "grant_groups",
  {
    id: text("id").primaryKey(),
    grantId: text("grant_id").notNull().references(() => grants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    requiredSkills: jsonb("required_skills").$type<string[]>().notNull().default([]),
    targetSize: integer("target_size"),
    respondBy: ts("respond_by"),
    /** matched — bacarığı uyğun olanlara dəvət; open — uyğun tapılmadı, hamıya təklif */
    mode: text("mode").$type<GrantGroupMode>().notNull(),
    status: text("status").$type<GrantGroupStatus>().notNull().default("open"),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("grant_groups_grant_idx").on(t.grantId)],
);

export const grantInvitations = pgTable(
  "grant_invitations",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull().references(() => grantGroups.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** invite — bacarığa görə dəvət; offer — hamıya açıq təklif; request — üzv özü qoşulmaq istəyib */
    kind: text("kind").$type<GrantInviteKind>().notNull(),
    status: text("status").$type<GrantInviteStatus>().notNull().default("pending"),
    matchedSkills: jsonb("matched_skills").$type<string[]>().notNull().default([]),
    createdAt: ts("created_at").notNull().defaultNow(),
    respondedAt: ts("responded_at"),
  },
  (t) => [uniqueIndex("grant_invitations_group_user_uq").on(t.groupId, t.userId), index("grant_invitations_user_idx").on(t.userId, t.status)],
);

// ---------- Statuslar (24 saatlıq paylaşımlar) ----------

/** WhatsApp/Facebook statusu kimi: 24 saatdan sonra görünmür və avtomatik silinir */
export const stories = pgTable(
  "stories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"text" | "image">().notNull(),
    /** Mətn statusu — mətn; şəkil statusu — alt yazı */
    text: text("text").notNull().default(""),
    /** Mətn statusunun fon rəngi (açar) */
    bg: text("bg").notNull().default("brand"),
    imageMime: text("image_mime"),
    /** base64 (brauzerdə 1080px-ə kiçildilmiş) */
    imageData: text("image_data"),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("stories_expires_idx").on(t.expiresAt), index("stories_user_idx").on(t.userId)],
);

export const storyViews = pgTable(
  "story_views",
  {
    storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    viewedAt: ts("viewed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("story_views_uq").on(t.storyId, t.userId)],
);

// ---------- Elmi profil: nəşrlər və əməkdaşlıq təklifləri ----------

/** OpenAlex-dən ORCID ilə avtomatik çəkilən nəşrlər (əl ilə daxil edilmir) */
export const userPublications = pgTable(
  "user_publications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    workId: text("work_id").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    venue: text("venue"),
    sourceId: text("source_id"),
    doi: text("doi"),
    url: text("url"),
    type: text("type"),
    citedBy: integer("cited_by").notNull().default(0),
    openAccess: boolean("open_access").notNull().default(false),
  },
  (t) => [index("user_publications_user_idx").on(t.userId, t.year), index("user_publications_source_idx").on(t.sourceId)],
);

export const collabRequests = pgTable(
  "collab_requests",
  {
    id: text("id").primaryKey(),
    fromUserId: text("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").$type<"pending" | "accepted" | "declined">().notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
    respondedAt: ts("responded_at"),
    /** Təklif göndərən cavabı gördü (dashboard kartı gizlənir) */
    requesterSeenAt: ts("requester_seen_at"),
  },
  (t) => [index("collab_requests_to_idx").on(t.toUserId, t.status), index("collab_requests_from_idx").on(t.fromUserId)],
);

// ---------- Kitab layihələri: proposal, fəsillər, müəllif dəvət/müraciətləri ----------

/** Üzvün hazırladığı kitab təklifi (proposal); hazırlayan — redaktor */
export const bookProjects = pgTable(
  "book_projects",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    kind: text("kind").$type<BookKind>().notNull(),
    description: text("description").notNull().default(""),
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    language: text("language").notNull().default(""),
    publisher: text("publisher").notNull().default(""),
    /** Fəsillərin təqdim olunması üçün son tarix */
    deadline: ts("deadline"),
    status: text("status").$type<"open" | "closed">().notNull().default("open"),
    editorId: text("editor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("book_projects_created_idx").on(t.createdAt)],
);

export const bookChapters = pgTable(
  "book_chapters",
  {
    id: text("id").primaryKey(),
    bookId: text("book_id").notNull().references(() => bookProjects.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Fəslin müəllifləri (həmmüəlliflik mümkündür) */
    authorIds: jsonb("author_ids").$type<string[]>().notNull().default([]),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("book_chapters_book_idx").on(t.bookId, t.position)],
);

export const bookRequests = pgTable(
  "book_requests",
  {
    id: text("id").primaryKey(),
    bookId: text("book_id").notNull().references(() => bookProjects.id, { onDelete: "cascade" }),
    /** Mövcud fəsil; boşdursa — `proposedTitle` ilə yeni fəsil təklifi */
    chapterId: text("chapter_id").references(() => bookChapters.id, { onDelete: "cascade" }),
    proposedTitle: text("proposed_title").notNull().default(""),
    /** Müəllif (namizəd) */
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** invite — redaktor dəvət edib; request — üzv özü qoşulmaq istəyib */
    kind: text("kind").$type<"invite" | "request">().notNull(),
    message: text("message").notNull().default(""),
    status: text("status").$type<"pending" | "accepted" | "declined">().notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
    respondedAt: ts("responded_at"),
    /** Təşəbbüskar (dəvətdə redaktor, müraciətdə üzv) cavabı gördü */
    initiatorSeenAt: ts("initiator_seen_at"),
  },
  (t) => [index("book_requests_book_idx").on(t.bookId), index("book_requests_user_idx").on(t.userId, t.status)],
);

// ---------- Jurnal tapmaq köməkçisi ----------

/** OpenAlex jurnal məlumatı + Scopus göstəriciləri + nəşr sürəti (keş) */
export const journals = pgTable("journals", {
  /** OpenAlex mənbə ID-si (S…) */
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  issnL: text("issn_l"),
  issn: jsonb("issn").$type<string[]>().notNull().default([]),
  publisher: text("publisher"),
  homepage: text("homepage"),
  isOa: boolean("is_oa").notNull().default(false),
  inDoaj: boolean("in_doaj").notNull().default(false),
  apcUsd: integer("apc_usd"),
  hIndex: integer("h_index"),
  /** 2 illik orta istinad (Impact Factor-a bənzər) */
  meanCitedness: text("mean_citedness"),
  worksCount: integer("works_count"),
  /** İllər üzrə məqalə sayı (son 6 il) — qəfil artımı aşkar etmək üçün */
  worksByYear: jsonb("works_by_year").$type<Record<string, number> | null>(),
  listedIn: jsonb("listed_in").$type<string[]>().notNull().default([]),
  /** Nəşriyyat saytında jurnalın xüsusi buraxılışlar/çağırışlar səhifəsi (məlum nəşriyyatlar üçün) */
  callsUrl: text("calls_url"),
  scopus: jsonb("scopus").$type<ScopusInfo | null>(),
  speed: jsonb("speed").$type<PublishSpeed | null>(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Mövzu axtarışının nəticəsi (OpenAlex büdcəsinə qənaət üçün keşlənir) */
export const journalSearches = pgTable("journal_searches", {
  key: text("key").primaryKey(),
  results: jsonb("results").$type<{ id: string; count: number }[]>().notNull(),
  total: integer("total").notNull().default(0),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Xüsusi buraxılışlara məqalə çağırışları — üzvlər paylaşır, son tarix keçəndə gizlənir */
export const journalCalls = pgTable(
  "journal_calls",
  {
    id: text("id").primaryKey(),
    journalId: text("journal_id"),
    journalTitle: text("journal_title").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    note: text("note").notNull().default(""),
    opensAt: ts("opens_at"),
    deadline: ts("deadline"),
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("journal_calls_deadline_idx").on(t.deadline)],
);
