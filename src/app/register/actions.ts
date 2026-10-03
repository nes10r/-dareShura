"use server";

import { redirect } from "next/navigation";
import { startSession } from "@/lib/auth";
import { registerUser, type RegisterField } from "@/lib/registration";

export type RegisterState = {
  errors?: Partial<Record<RegisterField, string>>;
  values?: Record<string, string>;
  inviteInvalid?: boolean;
};

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
  };

  const res = await registerUser(input);
  if (!res.ok) {
    const { password: _p, confirm: _c, token: _t, ...values } = input;
    return { errors: res.errors, values, inviteInvalid: res.inviteInvalid };
  }

  await startSession(res.userId);
  redirect("/dashboard");
}
