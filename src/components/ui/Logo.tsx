import Link from "next/link";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-500">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-700 text-sm font-bold text-white shadow-sm ring-1 ring-white/10">
        U
      </span>
      <span className="leading-tight">
        <span className={`block text-sm font-semibold ${light ? "text-white" : "text-ink"}`}>UNEC</span>
        <span className={`block text-xs ${light ? "text-brand-100" : "text-muted"}`}>Alimlər Şurası</span>
      </span>
    </Link>
  );
}
