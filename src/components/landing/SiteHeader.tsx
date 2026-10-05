"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";

/** İctimai səhifələrin başlığı. `overlay` rejimində hero üzərində şəffaf başlayır, scroll edildikdə ağ olur. */
export function SiteHeader({ cta, overlay = false }: { cta: { href: string; label: string }; overlay?: boolean }) {
  const [solid, setSolid] = useState(!overlay);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const link = `hidden h-10 items-center rounded-xl px-3 text-sm font-medium transition sm:inline-flex ${
    solid ? "text-slate-600 hover:bg-slate-100 hover:text-ink" : "text-white/90 hover:bg-white/10 hover:text-white"
  }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid ? "border-b border-line/70 bg-white/90 backdrop-blur" : "bg-gradient-to-b from-black/45 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo light={!solid} />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/xeberler" className={link}>Xəbərlər</Link>
          <Link href="/konfranslar" className={link}>Konfranslar</Link>
          <Link href="/#haqqimizda" className={link}>Haqqımızda</Link>
          <Link
            href={cta.href}
            className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] ${
              solid ? "bg-brand-700 text-white hover:bg-brand-800" : "bg-white text-brand-800 hover:bg-brand-50"
            }`}
          >
            {cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
