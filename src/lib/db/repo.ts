import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { facultyList } from "../faculties";
import { skillList } from "../skills";
import type { AnswerValue, BookChapter, BookProject, BookRequest, CollabRequest, Conference, ConferenceOverrides, Grant, GrantGroup, GrantInvitation, GrantOverrides, Invite, NewsItem, Publication, ResearchStats, Survey, SurveyResponse, User } from "../types";
import { db } from "./client";
import { appState, bookChapters, bookProjects, bookRequests, collabRequests, conferences, grantGroups, grantInvitations, grants, invites, news, stories, storyViews, surveyResponses, surveys, userAvatars, userPublications, users } from "./schema";

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
const toUser = (r: UserRow): User => ({
  ...r,
  skills: r.skills ?? [],
  avatarUpdatedAt: iso(r.avatarUpdatedAt),
  pubsSyncedAt: iso(r.pubsSyncedAt),
  createdAt: r.createdAt.toISOString(),
});

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
    .values({ ...user, email: user.email.toLowerCase(), avatarUpdatedAt: null, pubsSyncedAt: null, createdAt: new Date(user.createdAt) })
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

// ---------- Konfranslar ----------

type ConferenceRow = typeof conferences.$inferSelect;

/** Avtomatik çıxarılan dəyərlər + adminin düzəlişləri = effektiv dəyərlər */
const toConference = (r: ConferenceRow): Conference => {
  const o = r.overrides ?? {};
  const auto: Required<ConferenceOverrides> = {
    startsAt: iso(r.startsAt),
    endsAt: iso(r.endsAt),
    deadline: iso(r.deadline),
    format: r.format ?? null,
    location: r.location,
    fee: r.fee ?? null,
    feeNote: r.feeNote,
  };
  const pick = <K extends keyof ConferenceOverrides>(k: K, auto: Conference[K]) => (k in o ? (o[k] as Conference[K]) : auto);
  return {
    id: r.id,
    sourceUrl: r.sourceUrl,
    title: r.title,
    summary: r.summary,
    bodyHtml: r.bodyHtml,
    image: r.image,
    publishedAt: r.publishedAt.toISOString(),
    startsAt: pick("startsAt", iso(r.startsAt)),
    endsAt: pick("endsAt", iso(r.endsAt)),
    deadline: pick("deadline", iso(r.deadline)),
    deadlines: r.deadlines ?? [],
    format: pick("format", r.format ?? null),
    location: pick("location", r.location),
    fee: pick("fee", r.fee ?? null),
    feeNote: pick("feeNote", r.feeNote),
    overrides: o,
    auto,
    hidden: r.hidden,
    fetchedAt: r.fetchedAt.toISOString(),
  };
};

export async function listConferences({ includeHidden = false } = {}) {
  const rows = await db.select().from(conferences).orderBy(desc(conferences.publishedAt));
  return rows.map(toConference).filter((c) => includeHidden || !c.hidden);
}

export async function getConference(id: string) {
  const [row] = await db.select().from(conferences).where(eq(conferences.id, id)).limit(1);
  return row ? toConference(row) : null;
}

export async function listConferenceIds() {
  return new Set((await db.select({ id: conferences.id }).from(conferences)).map((r) => r.id));
}

export type ConferenceUpsert = Omit<typeof conferences.$inferInsert, "overrides" | "hidden">;

/** Mənbədən gələn məlumatı yazır; adminin düzəlişlərinə (overrides, hidden) toxunmur. */
export async function upsertConference(c: ConferenceUpsert) {
  const { id, ...rest } = c;
  await db.insert(conferences).values(c).onConflictDoUpdate({ target: conferences.id, set: rest });
}

export async function setConferenceOverrides(id: string, overrides: ConferenceOverrides, hidden: boolean) {
  await db.update(conferences).set({ overrides, hidden }).where(eq(conferences.id, id));
}

export async function getState<T>(key: string): Promise<T | null> {
  const [row] = await db.select().from(appState).where(eq(appState.key, key)).limit(1);
  return row ? (row.value as T) : null;
}

export async function setState(key: string, value: unknown) {
  const now = new Date();
  await db.insert(appState).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: appState.key, set: { value, updatedAt: now } });
}

export async function deleteConferences(ids: string[]) {
  if (!ids.length) return;
  await db.delete(conferences).where(inArray(conferences.id, ids));
}

// ---------- Bacarıqlar ----------

export async function updateUserSkills(id: string, skills: string[]) {
  await db.update(users).set({ skills }).where(eq(users.id, id));
}

/** Bütün istifadəçilərin qeyd etdiyi bacarıqlar (təklif siyahısı üçün) */
export async function listAllSkills() {
  const rows = await db.select({ skills: users.skills }).from(users);
  return skillList(rows.map((r) => r.skills ?? []));
}

// ---------- Qrantlar ----------

type GrantRow = typeof grants.$inferSelect;
const toGrant = (r: GrantRow): Grant => {
  const o = r.overrides ?? {};
  return {
    id: r.id,
    source: r.source,
    sourceUrl: r.sourceUrl,
    title: r.title,
    summary: r.summary,
    bodyHtml: r.bodyHtml,
    image: r.image,
    documents: r.documents ?? [],
    publishedAt: r.publishedAt.toISOString(),
    deadline: "deadline" in o ? (o.deadline ?? null) : iso(r.deadline),
    amount: "amount" in o ? (o.amount ?? null) : r.amount,
    fields: o.fields ?? r.fields ?? [],
    overrides: o,
    hidden: r.hidden,
  };
};

export async function listGrants({ includeHidden = false } = {}) {
  const rows = await db.select().from(grants).orderBy(desc(grants.publishedAt));
  return rows.map(toGrant).filter((g) => includeHidden || !g.hidden);
}

export async function getGrant(id: string) {
  const [row] = await db.select().from(grants).where(eq(grants.id, id)).limit(1);
  return row ? toGrant(row) : null;
}

export async function listGrantIds() {
  return new Set((await db.select({ id: grants.id }).from(grants)).map((r) => r.id));
}

export type GrantUpsert = Omit<typeof grants.$inferInsert, "overrides" | "hidden">;

/** Mənbədən gələn məlumat; adminin düzəlişlərinə (overrides, hidden) toxunmur */
export async function upsertGrant(g: GrantUpsert) {
  const { id, ...rest } = g;
  await db.insert(grants).values(g).onConflictDoUpdate({ target: grants.id, set: rest });
}

export async function setGrantOverrides(id: string, overrides: GrantOverrides, hidden: boolean) {
  await db.update(grants).set({ overrides, hidden }).where(eq(grants.id, id));
}

export async function deleteGrants(ids: string[]) {
  if (ids.length) await db.delete(grants).where(inArray(grants.id, ids));
}

// ---------- İşçi qruplar və dəvətlər ----------

type GroupRow = typeof grantGroups.$inferSelect;
const toGroup = (r: GroupRow): GrantGroup => ({ ...r, respondBy: iso(r.respondBy), createdAt: r.createdAt.toISOString() });
type InvitationRow = typeof grantInvitations.$inferSelect;
const toInvitation = (r: InvitationRow): GrantInvitation => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  respondedAt: iso(r.respondedAt),
});

export async function insertGrantGroup(group: GrantGroup, invitations: Omit<GrantInvitation, "id" | "groupId" | "createdAt" | "respondedAt" | "status">[]) {
  await db.insert(grantGroups).values({ ...group, respondBy: date(group.respondBy), createdAt: new Date(group.createdAt) });
  if (invitations.length) {
    await db.insert(grantInvitations).values(invitations.map((i) => ({ ...i, id: newId("gi"), groupId: group.id, status: "pending" as const })));
  }
}

export async function listGrantGroups(grantId?: string) {
  const q = db.select().from(grantGroups).orderBy(desc(grantGroups.createdAt));
  return (await (grantId ? q.where(eq(grantGroups.grantId, grantId)) : q)).map(toGroup);
}

export async function getGrantGroup(id: string) {
  const [row] = await db.select().from(grantGroups).where(eq(grantGroups.id, id)).limit(1);
  return row ? toGroup(row) : null;
}

export async function setGrantGroupStatus(id: string, status: GrantGroup["status"]) {
  await db.update(grantGroups).set({ status }).where(eq(grantGroups.id, id));
}

export async function listInvitationsByGroups(groupIds: string[]) {
  if (!groupIds.length) return [];
  return (await db.select().from(grantInvitations).where(inArray(grantInvitations.groupId, groupIds))).map(toInvitation);
}

export async function listInvitationsByUser(userId: string) {
  return (await db.select().from(grantInvitations).where(eq(grantInvitations.userId, userId))).map(toInvitation);
}

/** Dəvətə cavab: yalnız gözləyən dəvət dəyişdirilir */
export async function respondInvitation(groupId: string, userId: string, status: "accepted" | "declined") {
  const updated = await db
    .update(grantInvitations)
    .set({ status, respondedAt: new Date() })
    .where(and(eq(grantInvitations.groupId, groupId), eq(grantInvitations.userId, userId)))
    .returning({ id: grantInvitations.id });
  return updated.length > 0;
}

/** Dəvəti olmayan üzv qrupa özü qoşulur (kind: request) */
export async function insertJoinRequest(groupId: string, userId: string, matchedSkills: string[]) {
  const inserted = await db
    .insert(grantInvitations)
    .values({ id: newId("gi"), groupId, userId, kind: "request", status: "accepted", matchedSkills, respondedAt: new Date() })
    .onConflictDoNothing({ target: [grantInvitations.groupId, grantInvitations.userId] })
    .returning({ id: grantInvitations.id });
  return inserted.length > 0;
}

/** Sonradan əlavə olunan dəvətlər (məs. "hamıya açıq et") — mövcud olanlara toxunmur */
export async function addInvitations(groupId: string, invitations: { userId: string; kind: GrantInvitation["kind"]; matchedSkills: string[] }[]) {
  if (!invitations.length) return 0;
  const inserted = await db
    .insert(grantInvitations)
    .values(invitations.map((i) => ({ ...i, id: newId("gi"), groupId, status: "pending" as const })))
    .onConflictDoNothing({ target: [grantInvitations.groupId, grantInvitations.userId] })
    .returning({ id: grantInvitations.id });
  return inserted.length;
}

// ---------- Statuslar ----------

/** Vaxtı keçmiş statusları fiziki olaraq silir (baxışlar cascade ilə silinir) */
export async function deleteExpiredStories() {
  await db.delete(stories).where(lte(stories.expiresAt, new Date()));
}

export async function countActiveStories(userId: string) {
  const [r] = await db
    .select({ n: count() })
    .from(stories)
    .where(and(eq(stories.userId, userId), gt(stories.expiresAt, new Date())));
  return Number(r?.n ?? 0);
}

export async function insertStory(s: typeof stories.$inferInsert) {
  await db.insert(stories).values(s);
}

/** Aktiv statuslar (şəkil məlumatı olmadan) + izləyicinin baxıb-baxmadığı */
export async function listActiveStories(viewerId: string) {
  const rows = await db
    .select({
      id: stories.id,
      userId: stories.userId,
      kind: stories.kind,
      text: stories.text,
      bg: stories.bg,
      createdAt: stories.createdAt,
      expiresAt: stories.expiresAt,
    })
    .from(stories)
    .where(gt(stories.expiresAt, new Date()))
    .orderBy(asc(stories.createdAt));
  const seen = rows.length
    ? new Set(
        (
          await db
            .select({ id: storyViews.storyId })
            .from(storyViews)
            .where(and(eq(storyViews.userId, viewerId), inArray(storyViews.storyId, rows.map((r) => r.id))))
        ).map((r) => r.id),
      )
    : new Set<string>();
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(), seen: seen.has(r.id) }));
}

export async function getStory(id: string) {
  const [row] = await db.select().from(stories).where(and(eq(stories.id, id), gt(stories.expiresAt, new Date()))).limit(1);
  return row ?? null;
}

export async function deleteStory(id: string) {
  await db.delete(stories).where(eq(stories.id, id));
}

export async function markStoryViewed(storyId: string, userId: string) {
  await db.insert(storyViews).values({ storyId, userId }).onConflictDoNothing({ target: [storyViews.storyId, storyViews.userId] });
}

/** Statusa kimlər baxıb (yalnız müəllif üçün) */
export async function listStoryViewers(storyId: string) {
  return db
    .select({ id: users.id, name: users.name, avatarUpdatedAt: users.avatarUpdatedAt, viewedAt: storyViews.viewedAt })
    .from(storyViews)
    .innerJoin(users, eq(users.id, storyViews.userId))
    .where(eq(storyViews.storyId, storyId))
    .orderBy(desc(storyViews.viewedAt));
}

// ---------- Elmi profil ----------

export async function updateResearchProfile(id: string, p: { bio: string; orcid: string | null; scholarUrl: string | null; openToCollab: boolean }) {
  await db.update(users).set(p).where(eq(users.id, id));
}

/** OpenAlex nəticəsini yazır: göstəricilər istifadəçidə, nəşrlər ayrıca cədvəldə (tamamilə əvəz olunur) */
export async function saveResearchSync(userId: string, openalexId: string | null, stats: ResearchStats | null, pubs: Omit<Publication, "id">[]) {
  await db.update(users).set({ openalexId, researchStats: stats, pubsSyncedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(userPublications).where(eq(userPublications.userId, userId));
  if (pubs.length) {
    await db.insert(userPublications).values(pubs.map((p) => ({ ...p, id: `${userId}:${p.workId}`, userId })));
  }
}

/** ORCID silinəndə nəşrlər və göstəricilər də təmizlənir */
export async function clearResearchSync(userId: string) {
  await db.update(users).set({ openalexId: null, researchStats: null, pubsSyncedAt: null }).where(eq(users.id, userId));
  await db.delete(userPublications).where(eq(userPublications.userId, userId));
}

export async function listPublications(userId: string) {
  return (await db.select().from(userPublications).where(eq(userPublications.userId, userId))).sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || b.citedBy - a.citedBy,
  ) as Publication[];
}

// ---------- Əməkdaşlıq təklifləri ----------

type CollabRow = typeof collabRequests.$inferSelect;
const toCollab = (r: CollabRow): CollabRequest => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  respondedAt: iso(r.respondedAt),
  requesterSeenAt: iso(r.requesterSeenAt),
});

export async function insertCollabRequest(r: { fromUserId: string; toUserId: string; topic: string; message: string }) {
  await db.insert(collabRequests).values({ id: newId("cr"), ...r });
}

/** İstifadəçinin göndərdiyi və aldığı bütün təkliflər */
export async function listCollabRequests(userId: string) {
  const rows = await db
    .select()
    .from(collabRequests)
    .where(or(eq(collabRequests.fromUserId, userId), eq(collabRequests.toUserId, userId)))
    .orderBy(desc(collabRequests.createdAt));
  return rows.map(toCollab);
}

export async function getCollabRequest(id: string) {
  const [row] = await db.select().from(collabRequests).where(eq(collabRequests.id, id)).limit(1);
  return row ? toCollab(row) : null;
}

/** Yalnız alıcı və yalnız gözləyən təklifə cavab verə bilər */
export async function respondCollabRequest(id: string, toUserId: string, status: "accepted" | "declined") {
  const updated = await db
    .update(collabRequests)
    .set({ status, respondedAt: new Date() })
    .where(and(eq(collabRequests.id, id), eq(collabRequests.toUserId, toUserId), eq(collabRequests.status, "pending")))
    .returning({ id: collabRequests.id });
  return updated.length > 0;
}

export async function markCollabSeen(id: string, fromUserId: string) {
  await db
    .update(collabRequests)
    .set({ requesterSeenAt: new Date() })
    .where(and(eq(collabRequests.id, id), eq(collabRequests.fromUserId, fromUserId)));
}

export async function deleteCollabRequest(id: string, fromUserId: string) {
  await db.delete(collabRequests).where(and(eq(collabRequests.id, id), eq(collabRequests.fromUserId, fromUserId), eq(collabRequests.status, "pending")));
}

// ---------- Kitab layihələri ----------

type BookRow = typeof bookProjects.$inferSelect;
const toBook = (r: BookRow): BookProject => ({ ...r, topics: r.topics ?? [], deadline: iso(r.deadline), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
type ChapterRow = typeof bookChapters.$inferSelect;
const toChapter = ({ createdAt: _c, ...r }: ChapterRow): BookChapter => ({ ...r, authorIds: r.authorIds ?? [] });
type BookReqRow = typeof bookRequests.$inferSelect;
const toBookReq = (r: BookReqRow): BookRequest => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  respondedAt: iso(r.respondedAt),
  initiatorSeenAt: iso(r.initiatorSeenAt),
});

export type BookInput = Pick<BookProject, "title" | "kind" | "description" | "topics" | "language" | "publisher" | "deadline">;

export async function insertBook(b: BookInput, editorId: string, chapters: { title: string; description: string }[]) {
  const id = newId("bk");
  await db.insert(bookProjects).values({ ...b, id, editorId, deadline: date(b.deadline) });
  if (chapters.length) {
    await db.insert(bookChapters).values(chapters.map((c, i) => ({ ...c, id: newId("ch"), bookId: id, position: i + 1, authorIds: [] })));
  }
  return id;
}

export async function updateBook(id: string, b: Partial<BookInput> & { status?: "open" | "closed" }) {
  const { deadline, ...rest } = b;
  await db
    .update(bookProjects)
    .set({ ...rest, ...(deadline !== undefined ? { deadline: date(deadline) } : {}), updatedAt: new Date() })
    .where(eq(bookProjects.id, id));
}

export async function deleteBook(id: string) {
  await db.delete(bookProjects).where(eq(bookProjects.id, id));
}

export async function getBook(id: string) {
  const [row] = await db.select().from(bookProjects).where(eq(bookProjects.id, id)).limit(1);
  return row ? toBook(row) : null;
}

export async function listBooks() {
  return (await db.select().from(bookProjects).orderBy(desc(bookProjects.createdAt))).map(toBook);
}

export async function listChapters(bookIds: string[]) {
  if (!bookIds.length) return [];
  return (await db.select().from(bookChapters).where(inArray(bookChapters.bookId, bookIds)).orderBy(asc(bookChapters.position))).map(toChapter);
}

export async function insertChapter(bookId: string, c: { title: string; description: string; authorIds?: string[] }) {
  const existing = await listChapters([bookId]);
  const id = newId("ch");
  await db.insert(bookChapters).values({ id, bookId, title: c.title, description: c.description, authorIds: c.authorIds ?? [], position: Math.max(0, ...existing.map((x) => x.position)) + 1 });
  return id;
}

export async function updateChapter(id: string, c: Partial<Pick<BookChapter, "title" | "description" | "authorIds">>) {
  await db.update(bookChapters).set(c).where(eq(bookChapters.id, id));
}

export async function deleteChapter(id: string) {
  await db.delete(bookChapters).where(eq(bookChapters.id, id));
}

export async function insertBookRequest(r: Pick<BookRequest, "bookId" | "chapterId" | "proposedTitle" | "userId" | "kind" | "message">) {
  await db.insert(bookRequests).values({ ...r, id: newId("br") });
}

export async function getBookRequest(id: string) {
  const [row] = await db.select().from(bookRequests).where(eq(bookRequests.id, id)).limit(1);
  return row ? toBookReq(row) : null;
}

export async function listBookRequests(where: { bookIds?: string[]; userId?: string }) {
  const conds = [];
  if (where.bookIds) {
    if (!where.bookIds.length) return [];
    conds.push(inArray(bookRequests.bookId, where.bookIds));
  }
  if (where.userId) conds.push(eq(bookRequests.userId, where.userId));
  const rows = await db
    .select()
    .from(bookRequests)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(bookRequests.createdAt));
  return rows.map(toBookReq);
}

/** Yalnız gözləyən dəvət/müraciətin statusu dəyişir (təkrar cavab qorunur) */
export async function setBookRequestStatus(id: string, status: "accepted" | "declined") {
  const updated = await db
    .update(bookRequests)
    .set({ status, respondedAt: new Date() })
    .where(and(eq(bookRequests.id, id), eq(bookRequests.status, "pending")))
    .returning({ id: bookRequests.id });
  return updated.length > 0;
}

export async function markBookRequestSeen(id: string) {
  await db.update(bookRequests).set({ initiatorSeenAt: new Date() }).where(eq(bookRequests.id, id));
}

export async function deleteBookRequest(id: string) {
  await db.delete(bookRequests).where(and(eq(bookRequests.id, id), eq(bookRequests.status, "pending")));
}
