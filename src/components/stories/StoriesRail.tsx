"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import type { StoryGroup } from "@/lib/stories";
import { StoryComposer } from "./StoryComposer";
import { StoryViewer } from "./StoryViewer";

/**
 * Status zolağı: birinci — "Status əlavə et" (və ya öz statuslarım), sonra digər üzvlər.
 * Baxılmamış — rəngli halqa, baxılmış — boz.
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
  const others = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.user.id !== me.id);

  const firstName = (name: string) => name.split(" ")[0];

  return (
    <section aria-label="Statuslar" className="-mx-4 sm:mx-0">
      <ul className="flex gap-4 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
        {/* Mən */}
        <li className="shrink-0">
          <div className="relative w-[72px] text-center">
            <button
              type="button"
              onClick={() => (mineIndex >= 0 ? setViewing(mineIndex) : setComposing(true))}
              className={`rounded-full p-[3px] ${mineIndex >= 0 ? "bg-gradient-to-tr from-emerald-400 via-brand-500 to-violet-500" : ""}`}
              aria-label={mineIndex >= 0 ? "Statuslarıma bax" : "Status əlavə et"}
            >
              <span className="block rounded-full bg-white p-[2px]">
                <Avatar name={me.name} src={me.avatar} size="xl" className="!size-[60px] text-base" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="absolute bottom-5 right-0.5 grid size-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white"
              aria-label="Yeni status"
            >
              <Icon name="plus" className="size-4" />
            </button>
            <span className="mt-1 block truncate text-xs font-medium">{mineIndex >= 0 ? "Statusum" : "Əlavə et"}</span>
          </div>
        </li>

        {others.map(({ g, i }) => (
          <li key={g.user.id} className="shrink-0">
            <button type="button" onClick={() => setViewing(i)} className="w-[72px] text-center" aria-label={`${g.user.name} — status`}>
              <span className={`inline-block rounded-full p-[3px] ${g.allSeen ? "bg-slate-300" : "bg-gradient-to-tr from-emerald-400 via-brand-500 to-violet-500"}`}>
                <span className="block rounded-full bg-white p-[2px]">
                  <Avatar name={g.user.name} src={g.user.avatar} size="xl" className="!size-[60px] text-base" />
                </span>
              </span>
              <span className={`mt-1 block truncate text-xs ${g.allSeen ? "text-muted" : "font-semibold"}`}>{firstName(g.user.name)}</span>
            </button>
          </li>
        ))}

        {others.length === 0 && (
          <li className="flex shrink-0 items-center pr-4 text-sm text-muted">
            İlk statusu siz paylaşın — 24 saat görünəcək.
          </li>
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
