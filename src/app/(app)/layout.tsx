import { AppShell } from "@/components/shell/AppShell";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/format";
import { resolveModules } from "@/lib/modules/registry";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Naviqasiya statik deyil — istifadəçinin icazələri və sistemin hazırkı vəziyyətindən generasiya olunur.
  const { nav } = await resolveModules(user);

  return (
    <AppShell user={{ name: user.name, avatar: avatarUrl(user), subtitle: user.position }} nav={nav}>
      {children}
    </AppShell>
  );
}
