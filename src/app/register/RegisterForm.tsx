"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FacultyInput } from "@/components/ui/FacultyInput";
import { ACADEMIC_TITLES } from "@/lib/validation";
import { register, type RegisterState } from "./actions";

const inputCls =
  "mt-1.5 h-12 w-full rounded-xl border bg-white px-4 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-sm text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

export function RegisterForm({ token, faculties }: { token: string; faculties: string[] }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, {});
  const [showPassword, setShowPassword] = useState(false);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const border = (err?: string) => (err ? "border-red-300" : "border-line");

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {e.form && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{e.form}</p>
      )}
      <Field label="Ad, soyad" error={e.name}>
        <input name="name" autoComplete="name" defaultValue={v.name} className={`${inputCls} ${border(e.name)}`} placeholder="Məs.: Leyla Məmmədova" />
      </Field>

      <Field label="Korporativ e-poçt" error={e.email} hint="Yalnız @unec.edu.az ünvanları">
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          defaultValue={v.email}
          placeholder="ad.soyad@unec.edu.az"
          className={`${inputCls} ${border(e.email)}`}
        />
      </Field>

      <Field label="Fakültə" error={e.faculty} hint={faculties.length ? "Fakültəniz siyahıdadırsa, seçin" : undefined}>
        <FacultyInput faculties={faculties} defaultValue={v.faculty} className={`${inputCls} ${border(e.faculty)}`} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vəzifə" error={e.position}>
          <input name="position" defaultValue={v.position} className={`${inputCls} ${border(e.position)}`} placeholder="Məs.: Kafedra müdiri" />
        </Field>
        <Field label="Elmi ad (istəyə bağlı)">
          <select name="academicTitle" defaultValue={v.academicTitle ?? ""} className={`${inputCls} border-line`}>
            <option value="">—</option>
            {ACADEMIC_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Şifrə" error={e.password} hint="Ən azı 8 simvol, hərf və rəqəm">
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className={`${inputCls} pr-20 ${border(e.password)}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute bottom-1 right-1 top-2.5 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            {showPassword ? "Gizlət" : "Göstər"}
          </button>
        </div>
      </Field>

      <Field label="Şifrəni təkrarlayın" error={e.confirm}>
        <input name="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" className={`${inputCls} ${border(e.confirm)}`} />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-brand-700 text-base font-semibold text-white transition hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Qeydiyyat aparılır…" : "Qeydiyyatdan keç"}
      </button>

      <p className="text-center text-sm text-muted">
        Hesabınız var?{" "}
        <Link href="/login" className="font-semibold text-brand-700">Daxil olun</Link>
      </p>
    </form>
  );
}
