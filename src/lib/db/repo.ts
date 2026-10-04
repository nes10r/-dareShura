import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gt, isNull, lte } from "drizzle-orm";
import { facultyList } from "../faculties";
import type { AnswerValue, Invite, NewsItem, Survey, SurveyResponse, User } from "../types";
import { db } from "./client";
import { invites, news, surveyResponses, surveys, userAvatars, users } from "./schema";

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
const toUser = (r: UserRow): User => ({ ...r, avatarUpdatedAt: iso(r.avatarUpdatedAt), createdAt: r.createdAt.toISOString() });

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

// ---------- News ----------

type NewsRow = typeof news.$inferSelect;
const toNews = (r: NewsRow): NewsItem => ({
  ...r,
  publishedAt: iso(r.publishedAt),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const fromNews = (n: NewsItem): typeof news.$inferInsert => ({
  ...n,
  publishedAt: date(n.publishedAt),
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
});

export async function listPublishedNews(limit?: number) {
  const q = db
    .select()
    .from(news)
    .where(and(eq(news.isPublished, true), lte(news.publishedAt, new Date())))
    .orderBy(desc(news.publishedAt));
  return (await (limit ? q.limit(limit) : q)).map(toNews);
}

export async function getPublishedNewsBySlug(slug: string) {
  const [row] = await db.select().from(news).where(and(eq(news.slug, slug), eq(news.isPublished, true))).limit(1);
  return row && row.publishedAt && row.publishedAt <= new Date() ? toNews(row) : null;
}

export async function listAllNews() {
  return (await db.select().from(news).orderBy(desc(news.updatedAt))).map(toNews);
}

export async function getNews(id: string) {
  const [row] = await db.select().from(news).where(eq(news.id, id)).limit(1);
  return row ? toNews(row) : null;
}

export async function insertNews(item: NewsItem) {
  await db.insert(news).values(fromNews(item));
}

export async function updateNews(item: NewsItem) {
  const { id, ...rest } = fromNews(item);
  await db.update(news).set(rest).where(eq(news.id, id!));
}

export async function deleteNews(id: string) {
  await db.delete(news).where(eq(news.id, id));
}

// ---------- User yazma əməliyyatları ----------

/** E-poçt artıq mövcuddursa false qaytarır (unique index). */
export async function insertUser(user: User) {
  const inserted = await db
    .insert(users)
    .values({ ...user, email: user.email.toLowerCase(), avatarUpdatedAt: null, createdAt: new Date(user.createdAt) })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  return inserted.length > 0;
}

export async function updateUserProfile(id: string, p: Pick<User, "name" | "faculty" | "position" | "academicTitle">) {
  await db.update(users).set(p).where(eq(users.id, id));
}

export async function updateUserRole(id: string, role: User["role"]) {
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function updateUserPassword(id: string, passwordHash: string) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

// ---------- Invites ----------

type InviteRow = typeof invites.$inferSelect;
const toInvite = (r: InviteRow): Invite => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  expiresAt: r.expiresAt.toISOString(),
  revokedAt: iso(r.revokedAt),
});

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

/** Yeni dəvət linki yaradır; əvvəlki aktiv linklər deaktiv edilir (eyni anda yalnız biri aktivdir). */
export async function createInvite(createdBy: string) {
  const now = new Date();
  await db.update(invites).set({ revokedAt: now }).where(and(isNull(invites.revokedAt), gt(invites.expiresAt, now)));
  const invite = {
    id: newId("inv"),
    token: randomBytes(24).toString("base64url"),
    createdBy,
    createdAt: now,
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    revokedAt: null,
  };
  await db.insert(invites).values(invite);
  return toInvite(invite);
}

export async function getActiveInvite() {
  const [row] = await db
    .select()
    .from(invites)
    .where(and(isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
    .orderBy(desc(invites.createdAt))
    .limit(1);
  return row ? toInvite(row) : null;
}

export async function findValidInvite(token: string) {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  return row ? toInvite(row) : null;
}

/** Aktiv linkin bitmə vaxtını dəyişir; link artıq deaktiv və ya müddəti bitmişdirsə false. */
export async function extendInvite(id: string, expiresAt: Date) {
  const updated = await db
    .update(invites)
    .set({ expiresAt })
    .where(and(eq(invites.id, id), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
    .returning({ id: invites.id });
  return updated.length > 0;
}

export async function revokeInvite(id: string) {
  await db.update(invites).set({ revokedAt: new Date() }).where(and(eq(invites.id, id), isNull(invites.revokedAt)));
}

/** Son linklər + hər biri ilə qeydiyyatdan keçənlərin sayı */
export async function listRecentInvites(limit = 10) {
  const [rows, counts] = await Promise.all([
    db.select().from(invites).orderBy(desc(invites.createdAt)).limit(limit),
    db.select({ inviteId: users.inviteId, n: count() }).from(users).groupBy(users.inviteId),
  ]);
  const byInvite = new Map(counts.map((c) => [c.inviteId, Number(c.n)]));
  return rows.map((r) => ({ ...toInvite(r), registrations: byInvite.get(r.id) ?? 0 }));
}

/** Qeydiyyatdan keçmiş istifadəçilərin fakültələri (təkrarsız) */
export async function listFaculties() {
  const rows = await db.selectDistinct({ faculty: users.faculty }).from(users);
  return facultyList(rows.map((r) => r.faculty));
}

// ---------- Profil şəkilləri ----------

export async function setAvatar(userId: string, mime: string, base64: string) {
  const now = new Date();
  await db
    .insert(userAvatars)
    .values({ userId, mime, data: base64, updatedAt: now })
    .onConflictDoUpdate({ target: userAvatars.userId, set: { mime, data: base64, updatedAt: now } });
  await db.update(users).set({ avatarUpdatedAt: now }).where(eq(users.id, userId));
}

export async function removeAvatar(userId: string) {
  await db.delete(userAvatars).where(eq(userAvatars.userId, userId));
  await db.update(users).set({ avatarUpdatedAt: null }).where(eq(users.id, userId));
}

export async function getAvatar(userId: string) {
  const [row] = await db.select().from(userAvatars).where(eq(userAvatars.userId, userId)).limit(1);
  return row ?? null;
}
