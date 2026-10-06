import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
