import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findUserById } from "./db/repo";
import type { PublicUser, Role, User } from "./types";
export { verifyPassword } from "./password";

const COOKIE = "unec_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;
const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-change-me";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.warn("[auth] SESSION_SECRET təyin edilməyib — production üçün mütləq təyin edin.");
}

// ---- Sessiya tokeni: base64url(payload).hmac ----

function sign(data: string) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

function createToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof uid === "string" && exp > Date.now() / 1000 ? uid : null;
  } catch {
    return null;
  }
}

export async function startSession(userId: string) {
  (await cookies()).set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Bir sorğu (request) ərzində keşlənir — layout və səhifə eyni istifadəçi obyektini alır. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  const uid = token ? readToken(token) : null;
  if (!uid) return null;
  return findUserById(uid);
});

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// ---- İcazələr ----

export type Permission = "survey.manage" | "news.manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ["survey.manage", "news.manage"],
  ADMIN: ["survey.manage", "news.manage"],
  MEMBER: [],
};

export function hasPermission(user: Pick<User, "role">, permission: Permission) {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export async function requirePermission(permission: Permission): Promise<User> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) redirect("/dashboard");
  return user;
}

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}
