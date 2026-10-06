import type { Metadata } from "next";
import { logout } from "@/app/login/actions";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { listAllSkills, listFaculties } from "@/lib/db/repo";
import { avatarUrl } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/types";
import { AvatarUploader } from "./AvatarUploader";
import { PasswordForm, ProfileForm, SkillsForm } from "./ProfileForms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [faculties, allSkills] = await Promise.all([listFaculties(), listAllSkills()]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:pt-10">
      <section className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <AvatarUploader name={user.name} src={avatarUrl(user)} />
        <div className="mt-4 border-t border-line pt-4">
          <h1 className="truncate text-xl font-bold">{user.name}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{ROLE_LABELS[user.role]}</span>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <h2 className="mb-4 font-semibold">Şəxsi məlumatlar</h2>
        <ProfileForm user={{ name: user.name, faculty: user.faculty, position: user.position, academicTitle: user.academicTitle }} faculties={faculties} />
      </section>

      <section id="bacariqlar" className="mt-4 scroll-mt-20 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <h2 className="font-semibold">Elmi maraq və bacarıqlar</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Uyğun qrant müsabiqəsi üçün işçi qrup yaradılanda, bu sahələr üzrə sizə avtomatik dəvət göndəriləcək.
        </p>
        <SkillsForm skills={user.skills ?? []} suggestions={allSkills} />
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <h2 className="mb-4 font-semibold">Şifrə</h2>
        <PasswordForm />
      </section>

      <form action={logout} className="mt-4">
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-red-600 ring-1 ring-line transition hover:bg-red-50"
        >
          <Icon name="logout" className="size-5" /> Çıxış
        </button>
      </form>
    </div>
  );
}
