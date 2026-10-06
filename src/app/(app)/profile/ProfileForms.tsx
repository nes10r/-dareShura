"use client";

import { useActionState, useEffect, useRef } from "react";
import { FacultyInput } from "@/components/ui/FacultyInput";
import { ACADEMIC_TITLES } from "@/lib/validation";
import { TagInput } from "@/components/ui/TagInput";
import { MAX_SKILLS } from "@/lib/skills";
import { changePassword, saveProfile, saveSkills, type FormState } from "./actions";

const inputCls =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

function Status({ state, okText }: { state: FormState; okText: string }) {
  if (state.error) return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{okText}</p>;
  return null;
}

export function ProfileForm({
  user,
  faculties,
}: {
  user: { name: string; faculty: string; position: string; academicTitle: string | null };
  faculties: string[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Ad, soyad</span>
        <input name="name" defaultValue={user.name} autoComplete="name" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Fakültə</span>
        <FacultyInput faculties={faculties} defaultValue={user.faculty} className={inputCls} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Vəzifə</span>
          <input name="position" defaultValue={user.position} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Elmi ad</span>
          <select name="academicTitle" defaultValue={user.academicTitle ?? ""} className={inputCls}>
            <option value="">—</option>
            {ACADEMIC_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <Status state={state} okText="Məlumatlar yadda saxlanıldı." />
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60 sm:w-auto sm:px-6">
        {pending ? "Saxlanılır…" : "Yadda saxla"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Hazırkı şifrə</span>
        <input name="current" type="password" autoComplete="current-password" className={inputCls} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Yeni şifrə</span>
          <input name="next" type="password" autoComplete="new-password" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Yeni şifrə (təkrar)</span>
          <input name="confirm" type="password" autoComplete="new-password" className={inputCls} />
        </label>
      </div>
      <p className="text-xs text-muted">Ən azı 8 simvol, hərf və rəqəm.</p>
      <Status state={state} okText="Şifrə dəyişdirildi." />
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-white font-semibold ring-1 ring-line hover:bg-slate-50 disabled:opacity-60 sm:w-auto sm:px-6">
        {pending ? "Dəyişdirilir…" : "Şifrəni dəyiş"}
      </button>
    </form>
  );
}

export function SkillsForm({ skills, suggestions }: { skills: string[]; suggestions: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSkills, {});
  return (
    <form action={action} className="space-y-4">
      <TagInput name="skills" defaultValue={skills} suggestions={suggestions} max={MAX_SKILLS} placeholder="Məs.: Maliyyə, Süni intellekt, Ekonometrika" />
      <Status state={state} okText="Bacarıqlar yadda saxlanıldı." />
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60 sm:w-auto sm:px-6">
        {pending ? "Saxlanılır…" : "Yadda saxla"}
      </button>
    </form>
  );
}
