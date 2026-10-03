import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { resolveModules } from "@/lib/modules/registry";

export const metadata: Metadata = { title: "İdarəetmə" };

/** İdarəetmə mərkəzi — mobil alt naviqasiyadakı "İdarəetmə" bu səhifəyə gəlir. */
export default async function AdminHubPage() {
  const user = await requireUser();
  const { nav } = await resolveModules(user);
  const admin = nav.filter((n) => n.section === "admin");
  if (admin.length === 0) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <h1 className="text-2xl font-bold tracking-tight">İdarəetmə</h1>
      <div className="mt-6 space-y-4">
        {admin.map((m) => (
          <section key={m.key} className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            <Link href={m.href} className="flex items-center gap-4 p-4 transition hover:bg-slate-50">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                {m.icon && <Icon name={m.icon} />}
              </span>
              <span className="flex-1 font-semibold">{m.label}</span>
              <Icon name="chevron-right" className="size-5 text-muted" />
            </Link>
            {m.children && (
              <ul className="grid grid-cols-2 gap-px border-t border-line bg-line">
                {m.children.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="flex h-12 items-center gap-2 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">
                      {c.icon && <Icon name={c.icon} className="size-4" />}
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
