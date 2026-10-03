"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="text-sm font-medium">E-poçt</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          defaultValue={state.email}
          placeholder="ad@unec.edu.az"
          required
          className="mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">Şifrə</label>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-12 w-full rounded-xl border border-line bg-white px-4 pr-20 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-1 right-1 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            {showPassword ? "Gizlət" : "Göstər"}
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-brand-700 text-base font-semibold text-white transition hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Daxil olunur…" : "Daxil ol"}
      </button>
    </form>
  );
}
