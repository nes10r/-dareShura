"use server";

import { redirect } from "next/navigation";
import { startSession } from "@/lib/auth";
import { registerUser, type RegisterField } from "@/lib/registration";

export type RegisterState = {
  errors?: Partial<Record<RegisterField, string>>;
  values?: Record<string, string>;
  inviteInvalid?: boolean;
};

function parseTags(raw: string) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const get = (k: string) => String(formData.get(k) ?? "");
  const input = {
    token: get("token"),
    name: get("name"),
    email: get("email"),
    faculty: get("faculty"),
    position: get("position"),
    academicTitle: get("academicTitle"),
    password: get("password"),
    confirm: get("confirm"),
    skills: parseTags(get("skills")),
  };

  const res = await registerUser(input);
  if (!res.ok) {
    const { password: _p, confirm: _c, token: _t, skills: _s, ...values } = input;
    return { errors: res.errors, values, inviteInvalid: res.inviteInvalid };
  }

  await startSession(res.userId);
  redirect("/dashboard");
}
