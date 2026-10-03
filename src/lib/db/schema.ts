import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AnswerValue, Audience, NewsCategory, Question, ResultsVisibility, Role, SurveyStatus } from "../types";

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
  createdAt: ts("created_at").notNull().defaultNow(),
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
