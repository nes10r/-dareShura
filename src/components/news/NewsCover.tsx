import Image from "next/image";

/** Lokal (public/) şəkillər next/image ilə optimallaşdırılır, xarici URL-lər sadə <img> ilə göstərilir. */
export function NewsCover({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-700 to-brand-900 ${className}`}>
        <Image src="/images/unec-logo.jpg" alt="" width={72} height={72} className="size-16 rounded-2xl opacity-90" />
      </div>
    );
  }
  if (src.startsWith("/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className={`absolute inset-0 size-full object-cover ${className}`} />;
}
