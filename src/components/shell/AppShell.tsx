"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { Sheet } from "@/components/ui/Sheet";
import { logout } from "@/app/login/actions";
import type { NavEntry } from "@/lib/modules/types";

interface ShellUser {
  name: string;
  avatar: string | null;
  subtitle: string;
}

const HOME: NavEntry = { key: "home", label: "Ana səhifə", href: "/dashboard", icon: "home", section: "main", order: 0 };
const PROFILE: NavEntry = { key: "profile", label: "Profil", href: "/profile", icon: "user", section: "main", order: 1000 };

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  return path === "/dashboard" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
}

function Badge({ count, className = "" }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={`grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white ${className}`}
      aria-label={`${count} cavablandırılmamış`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function AppShell({ user, nav, children }: { user: ShellUser; nav: NavEntry[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const dynamicMain = nav.filter((n) => n.section === "main");
  const admin = nav.filter((n) => n.section === "admin");
  const main = [HOME, ...dynamicMain, PROFILE];
  // Mobil alt naviqasiya: əsas bəndlər + (varsa) idarəetmə, profil sonda.
  // 5-dən çox bənd olduqda ilk 4-ü görünür, qalanları "Daha çox" panelində.
  const allMobile: NavEntry[] = [
    HOME,
    ...dynamicMain,
    ...(admin.length ? [{ key: "admin", label: "İdarəetmə", href: "/admin", icon: "settings", section: "admin", order: 900 } as NavEntry] : []),
    PROFILE,
  ];
  const overflow = allMobile.length > 5;
  const mobile = overflow ? allMobile.slice(0, 4) : allMobile;
  const more = overflow ? allMobile.slice(4) : [];
  const moreActive = more.some((i) => isActive(pathname, i.href));
  const moreBadge = more.reduce((n, i) => n + (i.badge ?? 0), 0);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Əsas naviqasiya">
          <ul className="space-y-1">
            {main.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                    }`}
                  >
                    {item.icon && <Icon name={item.icon} />}
                    <span className="flex-1">{item.label}</span>
                    <Badge count={item.badge} />
                  </Link>
                </li>
              );
            })}
          </ul>

          {admin.length > 0 && (
            <div>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">İdarəetmə</p>
              <ul className="mt-2 space-y-1">
                {admin.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                        pathname === item.href ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                      }`}
                    >
                      {item.icon && <Icon name={item.icon} />}
                      <span className="flex-1">{item.label}</span>
                    </Link>
                    {item.children && (
                      <ul className="ml-6 mt-1 space-y-0.5 border-l border-line pl-3">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="flex h-9 items-center rounded-lg px-3 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-ink"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Link href="/profile" aria-label="Profil" className="rounded-full">
              <Avatar name={user.name} src={user.avatar} size="md" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.subtitle}</p>
            </div>
            <form action={logout}>
              <button type="submit" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink" title="Çıxış">
                <Icon name="logout" className="size-[18px]" />
                <span className="sr-only">Çıxış</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil üst panel */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-white/90 px-4 backdrop-blur lg:hidden">
          <Logo href="/dashboard" />
          <Link href="/profile" className="rounded-full" aria-label="Profil">
            <Avatar name={user.name} src={user.avatar} size="sm" />
          </Link>
        </header>

        <main className="flex-1 pb-28 lg:pb-10">{children}</main>
      </div>

      {/* Mobil alt naviqasiya */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="Mobil naviqasiya">
        <ul className="mx-auto flex max-w-md">
          {mobile.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                    active ? "text-brand-700" : "text-slate-500"
                  }`}
                >
                  {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-700" />}
                  <span className="relative">
                    {item.icon && <Icon name={item.icon} className="size-6" />}
                    <Badge count={item.badge} className="absolute -right-3 -top-1.5 ring-2 ring-white" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          {overflow && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-expanded={moreOpen}
                className={`relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${moreActive ? "text-brand-700" : "text-slate-500"}`}
              >
                {moreActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-700" />}
                <span className="relative">
                  <Icon name="template" className="size-6" />
                  <Badge count={moreBadge} className="absolute -right-3 -top-1.5 ring-2 ring-white" />
                </span>
                Daha çox
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Sheet open={moreOpen} onClose={closeMore} title="Bölmələr">
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {more.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={closeMore}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-24 flex-col items-center justify-center gap-2 rounded-2xl text-sm font-medium ring-1 transition ${
                    active ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-slate-700 ring-line hover:bg-slate-50"
                  }`}
                >
                  <span className="relative">
                    {item.icon && <Icon name={item.icon} className="size-7" />}
                    <Badge count={item.badge} className="absolute -right-3 -top-1.5 ring-2 ring-white" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
