"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Teq daxiletmə: yazıb Enter (və ya vergül) ilə əlavə et, × ilə sil.
 * Altda mövcud teqlərdən sürətli seçim düymələri — mobildə yazmadan əlavə etmək üçün.
 * Dəyər forma üçün gizli input-da JSON kimi göndərilir (`name`), və ya `onChange` ilə idarə olunur.
 */
export function TagInput({
  name,
  value: controlled,
  defaultValue = [],
  onChange,
  suggestions = [],
  placeholder = "Yazın və Enter basın",
  max = 12,
}: {
  name?: string;
  value?: string[];
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
}) {
  const [inner, setInner] = useState<string[]>(defaultValue);
  const tags = controlled ?? inner;
  const [draft, setDraft] = useState("");
  const listId = useId();

  const key = (s: string) => s.toLocaleLowerCase("az").trim();
  const set = (next: string[]) => {
    if (controlled === undefined) setInner(next);
    onChange?.(next);
  };
  const add = (raw: string) => {
    const t = raw.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!t || tags.length >= max || tags.some((x) => key(x) === key(t))) return setDraft("");
    const existing = suggestions.find((s) => key(s) === key(t));
    set([...tags, existing ?? t.charAt(0).toLocaleUpperCase("az") + t.slice(1)]);
    setDraft("");
  };
  const remove = (t: string) => set(tags.filter((x) => x !== t));

  const quick = suggestions.filter((s) => !tags.some((t) => key(t) === key(s))).slice(0, 10);

  return (
    <div>
      {name && <input type="hidden" name={name} value={JSON.stringify(tags)} />}
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white p-1.5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-1 pl-2.5 pr-1 text-sm font-medium text-brand-800">
            {t}
            <button type="button" onClick={() => remove(t)} aria-label={`${t} — sil`} className="grid size-6 place-items-center rounded-md hover:bg-brand-100">
              <Icon name="x" className="size-3.5" />
            </button>
          </span>
        ))}
        {tags.length < max && (
          <input
            value={draft}
            list={listId}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(",")) add(v.slice(0, -1));
              else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Backspace" && !draft && tags.length) remove(tags[tags.length - 1]);
            }}
            onBlur={() => draft && add(draft)}
            enterKeyHint="done"
            placeholder={tags.length ? "" : placeholder}
            className="h-9 min-w-32 flex-1 bg-transparent px-2 text-base outline-none"
          />
        )}
      </div>
      <datalist id={listId}>
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
      {quick.length > 0 && tags.length < max && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-medium text-slate-600 ring-1 ring-line hover:bg-slate-50"
            >
              <Icon name="plus" className="size-3" /> {s}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted">
        {tags.length}/{max} · Enter və ya vergül ilə əlavə edin
      </p>
    </div>
  );
}
