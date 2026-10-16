import Link from "next/link";
import { cancelCollabAction, dismissCollabAction, respondCollabAction } from "@/app/(app)/tedqiqatcilar/actions";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { avatarUrl, formatDate } from "@/lib/format";
import type { CollabRequest, User } from "@/lib/types";

export type CollabPerson = Pick<User, "id" | "name" | "email" | "position" | "avatarUpdatedAt">;

/** Gələn təklif: qəbul / imtina birbaşa kartdan */
export function IncomingCollab({ r, from }: { r: CollabRequest; from: CollabPerson }) {
  return (
    <article className="rounded-2xl bg-white p-4 ring-2 ring-emerald-200 sm:p-5">
      <div className="flex items-start gap-3">
        <Link href={`/tedqiqatcilar/${from.id}`} className="shrink-0">
          <Avatar name={from.name} src={avatarUrl(from)} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug">
            <Link href={`/tedqiqatcilar/${from.id}`} className="font-semibold hover:text-emerald-700">
              {from.name}
            </Link>{" "}
            sizinlə <b className="text-emerald-700">«{r.topic}»</b> mövzusunda birgə işləmək istəyir.
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {from.position} · {formatDate(r.createdAt)}
          </p>
          {r.message && <p className="mt-2 whitespace-pre-line rounded-xl bg-surface px-3.5 py-2.5 text-sm text-slate-700">{r.message}</p>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <form action={respondCollabAction.bind(null, r.id, false)} className="grid">
          <button type="submit" className="h-11 rounded-xl bg-white px-5 font-semibold ring-1 ring-line hover:bg-slate-50">
            İmtina
          </button>
        </form>
        <form action={respondCollabAction.bind(null, r.id, true)} className="grid">
          <button type="submit" className="h-11 rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700">
            Qəbul edirəm
          </button>
        </form>
      </div>
    </article>
  );
}

/** Qəbul olunmuş əməkdaşlıq — qarşı tərəfin əlaqə məlumatı açılır */
export function AcceptedCollab({ r, other, iAmSender }: { r: CollabRequest; other: CollabPerson; iAmSender: boolean }) {
  const fresh = iAmSender && !r.requesterSeenAt;
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ${fresh ? "ring-2 ring-emerald-300" : "ring-line"}`}>
      <Link href={`/tedqiqatcilar/${other.id}`} className="shrink-0">
        <Avatar name={other.name} src={avatarUrl(other)} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {fresh ? (
            <>
              <b>{other.name}</b> təklifinizi qəbul etdi
            </>
          ) : (
            <b>{other.name}</b>
          )}{" "}
          · <span className="text-emerald-700">{r.topic}</span>
        </p>
        <a href={`mailto:${other.email}`} className="block truncate text-sm font-medium text-brand-700 underline underline-offset-2">
          {other.email}
        </a>
      </div>
      {fresh && (
        <form action={dismissCollabAction.bind(null, r.id)}>
          <button type="submit" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-100" aria-label="Gördüm" title="Gördüm">
            <Icon name="check" className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}

/** Göndərdiyim, cavab gözləyən təklif */
export function OutgoingCollab({ r, to }: { r: CollabRequest; to: CollabPerson }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-line">
      <Avatar name={to.name} src={avatarUrl(to)} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <b>{to.name}</b> · {r.topic}
        </p>
        <p className="text-xs text-muted">{r.status === "declined" ? "İmtina edilib" : "Cavab gözlənilir"}</p>
      </div>
      {r.status === "pending" && (
        <form action={cancelCollabAction.bind(null, r.id)}>
          <button type="submit" className="h-9 rounded-lg px-3 text-sm font-medium text-muted hover:bg-slate-100 hover:text-ink">
            Geri götür
          </button>
        </form>
      )}
    </div>
  );
}
