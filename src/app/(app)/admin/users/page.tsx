import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { listUsers } from "@/lib/db/repo";
import { formatDate, initials } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { setUserRole } from "./actions";

export const metadata: Metadata = { title: "İstifadəçilər" };

const FILTERS: { key: string; label: string; role?: Role }[] = [
  { key: "all", label: "Hamısı" },
  { key: "admins", label: "Adminlər", role: "ADMIN" },
  { key: "members", label: "Üzvlər", role: "MEMBER" },
];

const ROLE_STYLES: Record<Role, string> = {
  SUPER_ADMIN: "bg-violet-50 text-violet-700 ring-violet-200",
  ADMIN: "bg-brand-50 text-brand-700 ring-brand-200",
  MEMBER: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const actor = await requirePermission("users.manage");
  const { q = "", f = "all" } = await searchParams;
  const all = await listUsers();
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const query = q.trim().toLocaleLowerCase("az");

  const users = all
    .filter((u) => !filter.role || u.role === filter.role)
    .filter((u) => !query || `${u.name} ${u.email} ${u.faculty} ${u.position}`.toLocaleLowerCase("az").includes(query))
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, "az") : a.role === "SUPER_ADMIN" ? -1 : a.role === "ADMIN" && b.role === "MEMBER" ? -1 : 1));

  const count = (role?: Role) => (role ? all.filter((u) => u.role === role).length : all.length);
  const href = (key: string) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(key !== "all" ? { f: key } : {}) })}`;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:pt-10">
      <h1 className="text-2xl font-bold tracking-tight">İstifadəçilər</h1>
      <p className="mt-1 text-muted">Qeydiyyatdan keçən istifadəçilər arasından adminləri seçin</p>

      <form className="mt-6" role="search">
        {f !== "all" && <input type="hidden" name="f" value={f} />}
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Ad, e-poçt və ya fakültə üzrə axtar"
          className="h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </form>

      <nav className="-mx-4 mt-4 overflow-x-auto px-4" aria-label="Rol filtri">
        <ul className="flex w-max gap-2">
          {FILTERS.map((x) => (
            <li key={x.key}>
              <Link
                href={href(x.key)}
                aria-current={filter.key === x.key ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                  filter.key === x.key ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"
                }`}
              >
                {x.label}
                <span className={`text-xs ${filter.key === x.key ? "text-white/70" : "text-muted"}`}>{count(x.role)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ul className="mt-5 space-y-2">
        {users.length === 0 && (
          <li className="rounded-2xl bg-white p-8 text-center text-muted ring-1 ring-line">
            {all.length <= 1 ? "Hələ heç kim qeydiyyatdan keçməyib." : "Heç nə tapılmadı."}
          </li>
        )}
        {users.map((u) => {
          const editable = u.id !== actor.id && u.role !== "SUPER_ADMIN";
          const makeAdmin = u.role === "MEMBER";
          return (
            <li key={u.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {initials(u.name)}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{u.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${ROLE_STYLES[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                  </p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                  <p className="truncate text-xs text-muted">
                    {u.position} · {u.faculty} · Qeydiyyat: {formatDate(u.createdAt)}
                  </p>
                </div>
              </div>
              {editable && (
                <form action={setUserRole.bind(null, u.id, makeAdmin ? "ADMIN" : "MEMBER")} className="grid sm:block">
                  <ConfirmSubmit
                    message={makeAdmin ? `${u.name} admin təyin edilsin? Sorğu və xəbərləri idarə edə biləcək.` : `${u.name} adminlikdən çıxarılsın?`}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                      makeAdmin ? "bg-brand-700 text-white hover:bg-brand-800" : "bg-white text-red-600 ring-1 ring-line hover:bg-red-50"
                    }`}
                  >
                    <Icon name={makeAdmin ? "plus" : "x"} className="size-4" />
                    {makeAdmin ? "Admin et" : "Adminlikdən çıxar"}
                  </ConfirmSubmit>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
