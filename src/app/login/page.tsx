import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Daxil ol" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex">
        <Image src="/images/campus-cube.jpg" alt="" fill sizes="50vw" priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/60 to-brand-900/30" />
        <div className="relative"><Logo light /></div>
        <div className="relative">
          <h2 className="max-w-md text-3xl font-bold leading-tight">Şura işləri — bir yerdə, hər yerdən.</h2>
          <p className="mt-3 max-w-md text-brand-100">Sizə aid iclaslar, sorğular və tapşırıqlar daxil olan kimi dashboard-da görünəcək.</p>
        </div>
        <p className="relative text-sm text-white/60">© UNEC</p>
      </aside>

      <main className="flex flex-1 flex-col px-4 pb-8 pt-6 sm:items-center sm:justify-center">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mt-10 w-full sm:mt-0 sm:max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">Xoş gəlmisiniz</h1>
          <p className="mt-1 text-muted">Hesabınıza daxil olun</p>
          <LoginForm />

          <details className="mt-8 rounded-xl bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-medium text-ink">Demo hesablar (şifrə: Demo1234)</summary>
            <ul className="mt-3 space-y-2 text-muted">
              <li><b className="text-ink">leyla@unec.edu.az</b> — aktiv sorğu gözləyir</li>
              <li><b className="text-ink">reshad@unec.edu.az</b> — cavab verib, nəticələr açıqdır</li>
              <li><b className="text-ink">nigar@unec.edu.az</b> — ona ünvanlanan sorğu yoxdur (modul gizli)</li>
              <li><b className="text-ink">superadmin@unec.edu.az</b> — sorğuların idarə edilməsi</li>
            </ul>
          </details>
        </div>
      </main>
    </div>
  );
}
