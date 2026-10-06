import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/ui/Logo";
import { getSessionUser } from "@/lib/auth";
import { findValidInvite, listAllSkills, listFaculties } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Qeydiyyat", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (await getSessionUser()) redirect("/dashboard");
  const { token = "" } = await searchParams;
  const invite = await findValidInvite(token);
  const [faculties, skills] = invite ? await Promise.all([listFaculties(), listAllSkills()]) : [[], []];

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex">
        <Image src="/images/campus-courtyard.jpg" alt="" fill sizes="50vw" priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/60 to-brand-900/30" />
        <div className="relative"><Logo light /></div>
        <div className="relative">
          <h2 className="max-w-md text-3xl font-bold leading-tight">Şura platformasına qoşulun</h2>
          <p className="mt-3 max-w-md text-white/75">UNEC korporativ e-poçtunuzla qeydiyyatdan keçin.</p>
        </div>
        <p className="relative text-sm text-white/60">© UNEC</p>
      </aside>

      <main className="flex flex-1 flex-col px-4 pb-10 pt-6 sm:items-center sm:justify-center">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mt-8 w-full sm:mt-0 sm:max-w-md">
          {invite ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Qeydiyyat</h1>
              <p className="mt-1 text-muted">Yalnız @unec.edu.az e-poçtu olan əməkdaşlar üçün</p>
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
                <Icon name="clock" className="size-4 shrink-0" /> Link {formatDateTime(invite.expiresAt)} tarixinədək etibarlıdır
              </p>
              <RegisterForm token={token} faculties={faculties} skills={skills} />
            </>
          ) : (
            <div className="text-center sm:text-left">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 sm:mx-0">
                <Icon name="lock" className="size-7" />
              </span>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">Qeydiyyat yalnız dəvət linki ilə</h1>
              <p className="mt-2 text-muted">
                {token
                  ? "Bu linkin müddəti bitib və ya deaktiv edilib. Platforma administratorundan yeni link istəyin."
                  : "Qeydiyyatdan keçmək üçün platforma administratorunun göndərdiyi linkdən istifadə edin."}
              </p>
              <Link href="/login" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 sm:w-auto sm:px-6">
                Hesabınız varsa, daxil olun
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
