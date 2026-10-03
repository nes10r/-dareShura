import { and, asc, count, desc, eq } from "drizzle-orm";
import type { AnswerValue, Survey, SurveyResponse, User } from "../types";
import { db } from "./client";
import { surveyResponses, surveys, users } from "./schema";

/**
 * Verilənlər bazası ilə bütün iş bu qatdan keçir.
 * DB sətirləri domen tiplərinə (ISO tarix sətirləri) çevrilir.
 */

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const date = (s: string | null | undefined) => (s ? new Date(s) : null);

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

// ---------- Users ----------

type UserRow = typeof users.$inferSelect;
const toUser = (r: UserRow): User => ({ ...r, createdAt: r.createdAt.toISOString() });

export async function findUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toUser(row) : null;
}

export async function findUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return row ? toUser(row) : null;
}

export async function listUsers() {
  return (await db.select().from(users).orderBy(asc(users.name))).map(toUser);
}

// ---------- Surveys ----------

type SurveyRow = typeof surveys.$inferSelect;
const toSurvey = (r: SurveyRow): Survey => ({
  ...r,
  startsAt: iso(r.startsAt),
  endsAt: iso(r.endsAt),
  publishedAt: iso(r.publishedAt),
  closedAt: iso(r.closedAt),
  resultsVisibleUntil: iso(r.resultsVisibleUntil),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const fromSurvey = (s: Survey): typeof surveys.$inferInsert => ({
  ...s,
  startsAt: date(s.startsAt),
  endsAt: date(s.endsAt),
  publishedAt: date(s.publishedAt),
  closedAt: date(s.closedAt),
  resultsVisibleUntil: date(s.resultsVisibleUntil),
  createdAt: new Date(s.createdAt),
  updatedAt: new Date(s.updatedAt),
});

export async function listSurveys() {
  return (await db.select().from(surveys).orderBy(desc(surveys.updatedAt))).map(toSurvey);
}

/** İstifadəçiyə göstərilə bilən sorğular: şablon və draft olmayanlar. */
export async function listPublishedSurveys() {
  const rows = await db.select().from(surveys).where(eq(surveys.isTemplate, false));
  return rows.map(toSurvey).filter((s) => s.status !== "DRAFT");
}

export async function getSurvey(id: string) {
  const [row] = await db.select().from(surveys).where(eq(surveys.id, id)).limit(1);
  return row ? toSurvey(row) : null;
}

export async function insertSurvey(survey: Survey) {
  await db.insert(surveys).values(fromSurvey(survey));
}

export async function updateSurvey(survey: Survey) {
  const { id, ...rest } = fromSurvey(survey);
  await db.update(surveys).set(rest).where(eq(surveys.id, id!));
}

export async function deleteSurvey(id: string) {
  await db.delete(surveys).where(eq(surveys.id, id));
}

// ---------- Responses ----------

type ResponseRow = typeof surveyResponses.$inferSelect;
const toResponse = (r: ResponseRow): SurveyResponse => ({ ...r, submittedAt: r.submittedAt.toISOString() });

export async function listResponsesByUser(userId: string) {
  return (await db.select().from(surveyResponses).where(eq(surveyResponses.userId, userId))).map(toResponse);
}

export async function listResponsesBySurvey(surveyId: string) {
  return (await db.select().from(surveyResponses).where(eq(surveyResponses.surveyId, surveyId))).map(toResponse);
}

export async function getResponse(surveyId: string, userId: string) {
  const [row] = await db
    .select()
    .from(surveyResponses)
    .where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.userId, userId)))
    .limit(1);
  return row ? toResponse(row) : null;
}

/** Təkrar cavab unique index ilə bloklanır; false qayıdırsa, istifadəçi artıq cavab verib. */
export async function insertResponse(surveyId: string, userId: string, answers: Record<string, AnswerValue>) {
  const inserted = await db
    .insert(surveyResponses)
    .values({ id: newId("r"), surveyId, userId, answers })
    .onConflictDoNothing({ target: [surveyResponses.surveyId, surveyResponses.userId] })
    .returning({ id: surveyResponses.id });
  return inserted.length > 0;
}

export async function countResponsesBySurvey() {
  const rows = await db
    .select({ surveyId: surveyResponses.surveyId, n: count() })
    .from(surveyResponses)
    .groupBy(surveyResponses.surveyId);
  return new Map(rows.map((r) => [r.surveyId, Number(r.n)]));
}
