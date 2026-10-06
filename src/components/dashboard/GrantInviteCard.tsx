import Link from "next/link";
import { respondGroupAction } from "@/app/(app)/qrantlar/actions";
import { Countdown } from "@/components/conferences/Countdown";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/format";
import type { GrantInviteCardData } from "@/lib/modules/types";

/** Bacarığa görə qrant dəvəti və ya hamıya açıq təklif — qəbul / imtina birbaşa kartdan */
export function GrantInviteCard({ data }: { data: GrantInviteCardData }) {
  const invite = data.kind === "invite";
  const matched = new Set(data.matchedSkills.map((s) => s.toLocaleLowerCase("az")));

  return (
    <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-5 text-white shadow-lg shadow-emerald-900/20 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
        <Icon name="briefcase" className="size-4" /> {invite ? "Qrant dəvəti" : "Qrant təklifi"}
      </p>

      <p className="mt-3 text-[15px] leading-relaxed">
        {invite ? (
          <>
            Bu mövzuda qrant var. Siz <b>{data.matchedSkills.join(", ")}</b> sahəsi üzrə peşəkarlığınızı qeyd etmisiniz və bu qrant üçün
            dəvət almısınız.
          </>
        ) : (
          <>Bu qrant layihəsi üçün işçi qrup formalaşır. Qoşulmaq istəyirsinizsə, təklifi qəbul edin.</>
        )}
      </p>

      <h3 className="mt-3 text-lg font-bold leading-snug">{data.grantTitle}</h3>
      {data.groupTitle !== data.grantTitle && <p className="text-sm text-emerald-100">{data.groupTitle}</p>}
      {data.description && <p className="mt-2 line-clamp-3 text-sm text-emerald-50/90">{data.description}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {data.requiredSkills.map((s) => (
          <span
            key={s}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              matched.has(s.toLocaleLowerCase("az")) ? "bg-white text-emerald-800" : "bg-white/15 text-white ring-1 ring-white/25"
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-100">
        <li className="flex items-center gap-1.5">
          <Icon name="users" className="size-4" /> {data.memberCount}
          {data.targetSize ? ` / ${data.targetSize}` : ""} nəfər qoşulub
        </li>
        {data.respondBy && (
          <li className="flex items-center gap-1.5">
            <Icon name="clock" className="size-4" /> Cavab: {formatDate(data.respondBy)}-dək
          </li>
        )}
        {data.deadline && (
          <li className="flex items-center gap-1.5">
            <Icon name="calendar" className="size-4" /> Müraciətə{" "}
            <b className="text-white">
              <Countdown target={data.deadline} variant="short" fallback={formatDate(data.deadline)} />
            </b>
          </li>
        )}
      </ul>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
        <form action={respondGroupAction.bind(null, data.groupId, true)} className="grid sm:block">
          <button type="submit" className="h-12 rounded-xl bg-white px-5 font-semibold text-emerald-800 transition hover:bg-emerald-50 active:scale-[0.99]">
            Qəbul edirəm
          </button>
        </form>
        <form action={respondGroupAction.bind(null, data.groupId, false)} className="grid sm:block">
          <button type="submit" className="h-12 rounded-xl px-5 font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10">
            İmtina
          </button>
        </form>
        <Link href={`/qrantlar/${data.grantId}`} className="col-span-2 flex h-11 items-center justify-center gap-1 text-sm font-medium text-emerald-100 hover:text-white sm:col-span-1 sm:ml-auto">
          Ətraflı <Icon name="chevron-right" className="size-4" />
        </Link>
      </div>
    </article>
  );
}

/** Bacarıq qeyd etməyən üzvə: dəvət ala bilmək üçün profili tamamla */
export function SkillsNudgeCard({ grantCount }: { grantCount: number }) {
  return (
    <Link href="/profile#bacariqlar" className="group flex items-center gap-4 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 transition hover:bg-emerald-50">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-200">
        <Icon name="briefcase" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-emerald-900">Elmi maraqlarınızı qeyd edin</span>
        <span className="block text-sm text-emerald-800/80">
          {grantCount} aktual qrant var. Bacarıqlarınızı qeyd etsəniz, uyğun işçi qruplara avtomatik dəvət alacaqsınız.
        </span>
      </span>
      <Icon name="chevron-right" className="size-5 text-emerald-700 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
