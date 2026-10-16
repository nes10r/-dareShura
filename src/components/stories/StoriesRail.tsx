"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo, type StoryGroup } from "@/lib/stories";
import { StoryComposer } from "./StoryComposer";
import { StoryViewer } from "./StoryViewer";

const RING_UNSEEN = "bg-gradient-to-tr from-emerald-400 via-brand-500 to-violet-500";
const RING_SEEN = "bg-slate-300";

function Bubble({
  name,
  avatar,
  ring,
  label,
  muted,
  title,
  onClick,
  ariaLabel,
  children,
}: {
  name: string;
  avatar: string | null;
  ring: string | null;
  label: string;
  muted?: boolean;
  title: string;
  onClick: () => void;
  ariaLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="group relative w-[72px] shrink-0 text-center sm:w-20" title={title}>
      <button type="button" onClick={onClick} aria-label={ariaLabel} className="rounded-full transition duration-200 group-hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
        <span className={`inline-block rounded-full p-[3px] ${ring ?? "bg-transparent"}`}>
          <span className="block rounded-full bg-white p-[2px]">
            <Avatar name={name} src={avatar} size="xl" className="!size-[60px] text-base sm:!size-[66px]" />
          </span>
        </span>
      </button>
      {children}
      <span className={`mt-1 block truncate text-xs ${muted ? "text-muted" : "font-semibold text-ink"}`}>{label}</span>
    </div>
  );
}

/**
 * Status zolağı. Mobil: sadə üfüqi sıra. Kompüter: başlıqlı kart, "Status paylaş" düyməsi,
 * siçanı üzərinə gətirdikdə ad və vaxt.
 */
export function StoriesRail({
  groups,
  me,
  canModerate,
}: {
  groups: StoryGroup[];
  me: { id: string; name: string; avatar: string | null };
  canModerate: boolean;
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const mineIndex = groups.findIndex((g) => g.user.id === me.id);
  const mine = mineIndex >= 0 ? groups[mineIndex] : null;
  const others = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.user.id !== me.id);
  const unseen = others.filter(({ g }) => !g.allSeen).length;

  const firstName = (name: string) => name.split(" ")[0];
  const count = (n: number) => `${n} status`;

  return (
    <section aria-labelledby="stories-title" className="-mx-4 sm:mx-0 sm:rounded-2xl sm:bg-white sm:p-4 sm:ring-1 sm:ring-line">
      {/* Başlıq — yalnız kompüter/planşet */}
      <div className="mb-3 hidden items-center justify-between gap-3 sm:flex">
        <div>
          <h2 id="stories-title" className="flex items-center gap-2 font-semibold">
            Statuslar
            {unseen > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{unseen} yeni</span>}
          </h2>
          <p className="text-xs text-muted">Həmkarlarınızın 24 saatlıq paylaşımları</p>
        </div>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Icon name="plus" className="size-4" /> Status paylaş
        </button>
      </div>
      <h2 className="sr-only sm:hidden">Statuslar</h2>

      <ul className="flex gap-3 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <li>
          <Bubble
            name={me.name}
            avatar={me.avatar}
            ring={mine ? RING_SEEN : null}
            label={mine ? "Statusum" : "Əlavə et"}
            title={mine ? `Statuslarım · ${count(mine.stories.length)}` : "Status əlavə et"}
            onClick={() => (mineIndex >= 0 ? setViewing(mineIndex) : setComposing(true))}
            ariaLabel={mine ? "Statuslarıma bax" : "Status əlavə et"}
          >
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="absolute bottom-5 right-0.5 grid size-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white transition hover:scale-110 sm:right-1.5"
              aria-label="Yeni status"
            >
              <Icon name="plus" className="size-4" />
            </button>
          </Bubble>
        </li>

        {others.map(({ g, i }) => (
          <li key={g.user.id}>
            <Bubble
              name={g.user.name}
              avatar={g.user.avatar}
              ring={g.allSeen ? RING_SEEN : RING_UNSEEN}
              label={firstName(g.user.name)}
              muted={g.allSeen}
              title={`${g.user.name} · ${timeAgo(g.latest)} · ${count(g.stories.length)}`}
              onClick={() => setViewing(i)}
              ariaLabel={`${g.user.name} — status`}
            />
          </li>
        ))}

        {others.length === 0 && (
          <li className="flex shrink-0 items-center pr-4 text-sm text-muted sm:pl-2">İlk statusu siz paylaşın — 24 saat görünəcək.</li>
        )}
      </ul>

      {viewing !== null && (
        <StoryViewer
          groups={groups}
          startIndex={viewing}
          meId={me.id}
          canModerate={canModerate}
          onClose={() => {
            setViewing(null);
            router.refresh();
          }}
        />
      )}
      {composing && (
        <StoryComposer
          onClose={() => setComposing(false)}
          onPublished={() => {
            setComposing(false);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
