import type { Metadata } from "next";
import { headers } from "next/headers";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { InviteLinkCard } from "@/components/admin/InviteLinkCard";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { getActiveInvite, listRecentInvites, listUsers } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { deactivateInvite, generateInvite } from "./actions";

export const metadata: Metadata = { title: "Qeydiyyat linki" };

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function InvitePage() {
  await requirePermission("users.invite");
  const [active, history, users, origin] = await Promise.all([getActiveInvite(), listRecentInvites(10), listUsers(), siteOrigin()]);
  const names = new Map(users.map((u) => [u.id, u.name]));
  const now = Date.now();

  const status = (i: (typeof history)[number]) =>
    i.revokedAt ? "Deaktiv edilib" : new Date(i.expiresAt).getTime() <= now ? "Müddəti bitib" : "Aktiv";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:pt-10">
      <h1 className="text-2xl font-bold tracking-tight">Qeydiyyat linki</h1>
      <p className="mt-1 text-muted">
        Qeydiyyat yalnız bu link vasitəsilə mümkündür. Link 24 saat etibarlıdır, yalnız @unec.edu.az e-poçtları qəbul olunur.
      </p>

      <div className="mt-6">
        {active ? (
          <>
            <InviteLinkCard url={`${origin}/register?token=${active.token}`} expiresAt={active.expiresAt} />
            <div className="mt-3 grid gap-2 sm:flex">
              <form action={generateInvite} className="grid sm:flex-1">
                <ConfirmSubmit
                  message="Yeni link yaradılsın? Hazırkı link dərhal deaktiv olacaq."
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50"
                >
                  <Icon name="plus" className="size-4" /> Yeni link yarat
                </ConfirmSubmit>
              </form>
              <form action={deactivateInvite.bind(null, active.id)} className="grid sm:flex-1">
                <ConfirmSubmit
                  message="Link deaktiv edilsin? Bundan sonra onunla qeydiyyat mümkün olmayacaq."
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-600 ring-1 ring-line hover:bg-red-50"
                >
                  <Icon name="lock" className="size-4" /> Deaktiv et
                </ConfirmSubmit>
              </form>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name="lock" className="size-6" />
            </span>
            <p className="mt-3 font-semibold">Aktiv link yoxdur</p>
            <p className="mt-1 text-sm text-muted">Hazırda heç kim qeydiyyatdan keçə bilməz.</p>
            <form action={generateInvite} className="mt-5">
              <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800">
                <Icon name="plus" className="size-5" /> 24 saatlıq link yarat
              </button>
            </form>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Son linklər</h2>
          <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {history.map((i) => {
              const s = status(i);
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{formatDateTime(i.createdAt)}</p>
                    <p className="truncate text-xs text-muted">{names.get(i.createdBy) ?? "—"} · {i.registrations} qeydiyyat</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s === "Aktiv" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
