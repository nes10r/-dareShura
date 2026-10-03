import type { Metadata } from "next";
import { logout } from "@/app/login/actions";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const rows = [
    ["E-poçt", user.email],
    ["Vəzifə", user.position],
    ["Fakültə", user.faculty],
    ["Elmi ad", user.academicTitle ?? "—"],
    ["Platformada status", ROLE_LABELS[user.role]],
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {initials(user.name)}
        </span>
        <div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted">{user.position}</p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 p-4 sm:flex-row sm:justify-between">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <form action={logout} className="mt-6">
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
