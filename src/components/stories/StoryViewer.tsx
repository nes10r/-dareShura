"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteStoryAction, getStoryViewersAction, markStoryViewedAction } from "@/app/(app)/status/actions";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { STORY_BACKGROUNDS, timeAgo, type StoryGroup } from "@/lib/stories";

const DURATION = { text: 6000, image: 7000 };
/** Bu müddətdən uzun basıb saxlamaq — dayandırma (keçid deyil) */
const HOLD_MS = 200;

type Viewer = { id: string; name: string; avatar: string | null; viewedAt: string };

/**
 * Tam ekran status baxışı (WhatsApp/Instagram kimi):
 * yuxarıda irəliləmə zolaqları, sağa toxun — növbəti, sola — əvvəlki, basıb saxla — dayan.
 */
export function StoryViewer({
  groups: initialGroups,
  startIndex,
  meId,
  canModerate,
  onClose,
}: {
  groups: StoryGroup[];
  startIndex: number;
  meId: string;
  canModerate: boolean;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [gi, setGi] = useState(startIndex);
  // Qrupda ilk baxılmamış statusdan başla
  const [si, setSi] = useState(() => Math.max(0, initialGroups[startIndex].stories.findIndex((s) => !s.seen)));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [viewers, setViewers] = useState<Viewer[] | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);

  const group = groups[gi];
  const story = group?.stories[si];
  const own = group?.user.id === meId;

  const next = useCallback(() => {
    setProgress(0);
    if (si < group.stories.length - 1) return setSi(si + 1);
    if (gi < groups.length - 1) {
      setGi(gi + 1);
      setSi(Math.max(0, groups[gi + 1].stories.findIndex((s) => !s.seen)));
      return;
    }
    onClose();
  }, [si, gi, group, groups, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (si > 0) return setSi(si - 1);
    if (gi > 0) {
      setGi(gi - 1);
      setSi(0);
    }
  }, [si, gi]);

  // Yeni status: yüklənmə vəziyyəti və baxışın qeydə alınması
  useEffect(() => {
    if (!story) return;
    setLoaded(story.kind === "text");
    setViewers(null);
    if (!own && !story.seen) {
      markStoryViewedAction(story.id).catch(() => {});
      setGroups((gs) => gs.map((g, i) => (i !== gi ? g : { ...g, stories: g.stories.map((s, j) => (j === si ? { ...s, seen: true } : s)) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // Taymer
  useEffect(() => {
    if (!story || paused || !loaded || viewers) return;
    let last = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      setProgress((p) => {
        const np = p + dt / DURATION[story.kind];
        if (np >= 1) {
          queueMicrotask(next);
          return 1;
        }
        return np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story, paused, loaded, viewers, next]);

  // Klaviatura və scroll kilidi
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [next, prev, onClose]);

  async function remove() {
    if (!story || !window.confirm("Status silinsin?")) return;
    setPaused(true);
    const res = await deleteStoryAction(story.id);
    if (!res.ok) {
      window.alert(res.error);
      return setPaused(false);
    }
    const left = group.stories.filter((s) => s.id !== story.id);
    if (!left.length) {
      const rest = groups.filter((_, i) => i !== gi);
      if (!rest.length) return onClose();
      setGroups(rest);
      setGi(Math.min(gi, rest.length - 1));
      setSi(0);
    } else {
      setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, stories: left } : g)));
      setSi(Math.min(si, left.length - 1));
    }
    setProgress(0);
    setPaused(false);
  }

  async function showViewers() {
    if (!story) return;
    setViewers([]);
    setViewers(await getStoryViewersAction(story.id));
  }

  if (!group || !story) return null;

  const hasPrev = si > 0 || gi > 0;
  const hasNext = si < group.stories.length - 1 || gi < groups.length - 1;
  const nextLabel = si < group.stories.length - 1 ? "Növbəti status" : gi < groups.length - 1 ? `Növbəti: ${groups[gi + 1].user.name}` : "";
  const prevLabel = si > 0 ? "Əvvəlki status" : gi > 0 ? `Əvvəlki: ${groups[gi - 1].user.name}` : "";
  const navBtn =
    "hidden size-12 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 disabled:pointer-events-none disabled:opacity-0 sm:grid";

  return (
    <div
      className="animate-fade fixed inset-0 z-[60] flex items-center justify-center bg-black sm:bg-neutral-950/90 sm:backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${group.user.name} — status`}
    >
      {/* Kompüter: səhifə səviyyəsində bağla düyməsi */}
      <button type="button" onClick={onClose} className="absolute right-5 top-5 hidden size-11 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white sm:grid" aria-label="Bağla">
        <Icon name="x" className="size-7" />
      </button>

      <div className="flex h-full w-full items-center justify-center gap-5 sm:h-auto">
        <button type="button" onClick={prev} disabled={!hasPrev} className={navBtn} aria-label={prevLabel || "Əvvəlki"} title={prevLabel}>
          <Icon name="chevron-left" className="size-7" />
        </button>

        <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden sm:aspect-[9/16] sm:h-[min(88dvh,820px)] sm:w-auto sm:max-w-none sm:rounded-3xl sm:shadow-2xl">
        {/* Məzmun */}
        {story.kind === "text" ? (
          <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br p-8 ${STORY_BACKGROUNDS[story.bg]}`}>
            <p className={`whitespace-pre-line text-center font-semibold leading-snug text-white ${story.text.length > 180 ? "text-xl" : story.text.length > 80 ? "text-2xl" : "text-3xl"}`}>
              {story.text}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={story.imageUrl!} alt={story.text || `${group.user.name} statusu`} onLoad={() => setLoaded(true)} className="max-h-full max-w-full object-contain" />
            {!loaded && <span className="absolute size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          </div>
        )}

        {/* Toxunma zonaları: sol 30% — əvvəlki, qalan — növbəti; basıb saxla — dayan */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onPointerDown={() => {
            held.current = false;
            holdTimer.current = setTimeout(() => {
              held.current = true;
              setPaused(true);
            }, HOLD_MS);
          }}
          onPointerUp={(e) => {
            clearTimeout(holdTimer.current);
            if (held.current) return setPaused(false);
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX - r.left < r.width * 0.3) prev();
            else next();
          }}
          onPointerLeave={() => {
            clearTimeout(holdTimer.current);
            if (held.current) setPaused(false);
          }}
        />

        {/* Üst: zolaqlar və müəllif */}
        <div className="relative z-20 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {group.stories.map((s, i) => (
              <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                <span className="block h-full bg-white" style={{ width: `${i < si ? 100 : i === si ? progress * 100 : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-white">
            <Avatar name={group.user.name} src={group.user.avatar} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{own ? "Mənim statusum" : group.user.name}</span>
              <span className="block text-xs text-white/70">{timeAgo(story.createdAt)}</span>
            </span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="grid size-10 place-items-center rounded-full hover:bg-white/10"
              aria-label={paused ? "Davam et" : "Dayandır"}
              title={paused ? "Davam et (Boşluq)" : "Dayandır (Boşluq)"}
            >
              <Icon name={paused ? "play" : "pause"} className="size-5" />
            </button>
            <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-white/10 sm:hidden" aria-label="Bağla">
              <Icon name="x" className="size-6" />
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Alt: alt yazı, baxışlar, silmə */}
        <div className="relative z-20 space-y-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-8 text-white">
          {story.kind === "image" && story.text && <p className="text-center text-[15px] leading-snug">{story.text}</p>}
          {(own || canModerate) && (
            <div className="flex items-center justify-between gap-3">
              {own ? (
                <button type="button" onClick={showViewers} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium backdrop-blur hover:bg-white/25">
                  <Icon name="users" className="size-4" /> Kimlər baxıb
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={remove} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium backdrop-blur hover:bg-red-500/60">
                <Icon name="x" className="size-4" /> Sil
              </button>
            </div>
          )}
        </div>

        {/* Baxanlar siyahısı (müəllif üçün) */}
        {viewers && (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[60%] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-ink">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Baxanlar · {viewers.length}</p>
              <button type="button" onClick={() => setViewers(null)} className="grid size-9 place-items-center rounded-full hover:bg-slate-100" aria-label="Bağla">
                <Icon name="x" className="size-5" />
              </button>
            </div>
            {viewers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Hələ heç kim baxmayıb.</p>
            ) : (
              <ul className="divide-y divide-line">
                {viewers.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={v.name} src={v.avatar} size="sm" />
                    <span className="flex-1 text-sm font-medium">{v.name}</span>
                    <span className="text-xs text-muted">{timeAgo(v.viewedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        </div>

        <button type="button" onClick={next} disabled={!hasNext} className={navBtn} aria-label={nextLabel || "Növbəti"} title={nextLabel}>
          <Icon name="chevron-right" className="size-7" />
        </button>
      </div>

      {/* Kompüter: klaviatura ipucları */}
      <p className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-4 text-xs text-white/50 sm:flex">
        <span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">←</kbd> <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">→</kbd> keçid
        </span>
        <span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Boşluq</kbd> dayandır
        </span>
        <span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Esc</kbd> bağla
        </span>
      </p>
    </div>
  );
}
