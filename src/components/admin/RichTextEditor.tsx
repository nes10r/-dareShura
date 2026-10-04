"use client";

import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Kənardan məzmunu əvəz etmək üçün (məs. şablon tətbiqi) — dəyişdikdə redaktor yenilənir */
  resetKey?: number;
}

/** Xəbər mətni üçün vizual redaktor: başlıqlar, formatlama, siyahılar, sitat, link. */
export function RichTextEditor({ value, onChange, placeholder = "Xəbərin tam mətni", resetKey = 0 }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["https", "http", "mailto"] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-text min-h-72 px-4 py-3 outline-none",
        "aria-label": "Xəbərin mətni",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Şablon tətbiq edildikdə məzmunu əvəz et
  useEffect(() => {
    if (editor && resetKey > 0) editor.commands.setContent(value, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, editor]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
      {editor ? <Toolbar editor={editor} /> : <div className="h-12 border-b border-line bg-surface" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link ünvanı (https://...)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:\/\/|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const c = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Mətn formatlama"
      className="sticky top-14 z-10 flex gap-0.5 overflow-x-auto border-b border-line bg-surface/95 p-1.5 backdrop-blur lg:top-0"
    >
      <Btn label="Adi mətn" active={!s.h2 && !s.h3 && !s.bullet && !s.ordered && !s.quote} onClick={() => c().setParagraph().run()}>
        <span className="text-sm font-medium">Mətn</span>
      </Btn>
      <Btn label="Başlıq" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <span className="text-sm font-bold">H2</span>
      </Btn>
      <Btn label="Alt başlıq" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <span className="text-sm font-bold">H3</span>
      </Btn>
      <Sep />
      <Btn label="Qalın (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Btn>
      <Btn label="Kursiv (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </Btn>
      <Btn label="Altından xətt (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <span className="underline">U</span>
      </Btn>
      <Btn label="Üstündən xətt" active={s.strike} onClick={() => c().toggleStrike().run()}>
        <span className="line-through">S</span>
      </Btn>
      <Sep />
      <Btn label="Nöqtəli siyahı" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <Svg d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </Btn>
      <Btn label="Nömrəli siyahı" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <Svg d="M10 6h10M10 12h10M10 18h10M4 5h1v3M4 8h2M4 12.5c0-.8 2-.8 2 0 0 .7-2 1.5-2 2.5h2M4 17h2l-1 1.2c.8 0 1 .4 1 .8s-.4.8-1 .8H4" />
      </Btn>
      <Btn label="Sitat" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Svg d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" />
      </Btn>
      <Btn label="Link" active={s.link} onClick={setLink}>
        <Svg d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
      </Btn>
      <Btn label="Ayırıcı xətt" onClick={() => c().setHorizontalRule().run()}>
        <Svg d="M4 12h16" />
      </Btn>
      <Sep />
      <Btn label="Formatı təmizlə" onClick={() => c().unsetAllMarks().clearNodes().run()}>
        <Svg d="M6 6h12M12 6l-3 12M15 15l5 5M20 15l-5 5" />
      </Btn>
      <Btn label="Geri al (Ctrl+Z)" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Svg d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
      </Btn>
      <Btn label="Təkrarla (Ctrl+Y)" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Svg d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
      </Btn>
    </div>
  );
}

function Btn({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Fokus redaktordan getməsin — seçim saxlanılsın
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-lg px-2 transition disabled:opacity-30 ${
        active ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 my-1.5 w-px shrink-0 bg-line" aria-hidden="true" />;
}

function Svg({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
