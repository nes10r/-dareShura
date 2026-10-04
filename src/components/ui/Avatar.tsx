import { initials } from "@/lib/format";

const SIZES = { sm: "size-9 text-xs", md: "size-10 text-sm", lg: "size-11 text-sm", xl: "size-24 text-2xl" } as const;

/** Profil şəkli; şəkil yoxdursa ad-soyadın baş hərfləri. */
export function Avatar({ name, src, size = "md", className = "" }: { name: string; src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${SIZES[size]} shrink-0 rounded-full bg-brand-100 object-cover ${className}`} />;
  }
  return (
    <span className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700 ${className}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
