import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-500">
      <Image
        src="/images/unec-logo.jpg"
        alt="UNEC loqosu"
        width={40}
        height={40}
        className="size-10 rounded-xl shadow-sm ring-1 ring-black/5"
        priority
      />
      <span className="leading-tight">
        <span className={`block text-sm font-bold tracking-wide ${light ? "text-white" : "text-ink"}`}>UNEC</span>
        <span className={`block text-xs ${light ? "text-white/75" : "text-muted"}`}>Alimlər Şurası</span>
      </span>
    </Link>
  );
}
