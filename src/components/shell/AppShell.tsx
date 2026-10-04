"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
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
  // Mobil alt naviqasiya: əsas bəndlər + (varsa) idarəetmə, profil sonda
  const mobile: NavEntry[] = [
    HOME,
    ...dynamicMain,
    ...(admin.length ? [{ key: "admin", label: "İdarəetmə", href: "/admin", icon: "settings", section: "admin", order: 900 } as NavEntry] : []),
    PROFILE,
  ];

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
        </ul>
      </nav>
    </div>
  );
}
