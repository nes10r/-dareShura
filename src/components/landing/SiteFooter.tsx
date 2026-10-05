import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function SiteFooter() {
  return (
    <footer className="bg-brand-900 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-white/60">Azərbaycan Dövlət İqtisad Universitetinin Gənc Alimlər Şurası</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Bölmələr</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><Link href="/xeberler" className="hover:text-white">Xəbərlər və elanlar</Link></li>
            <li><Link href="/konfranslar" className="hover:text-white">Konfranslar</Link></li>
            <li><Link href="/#haqqimizda" className="hover:text-white">Haqqımızda</Link></li>
            <li><Link href="/login" className="hover:text-white">Üzv kabineti</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Ünvan</p>
          <address className="mt-3 text-sm not-italic text-white/70">
            Bakı, İstiqlaliyyət küç. 6
            <br />
            <a href="https://unec.edu.az" className="hover:text-white" target="_blank" rel="noreferrer">unec.edu.az</a>
          </address>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/50">© {new Date().getFullYear()} UNEC Gənc Alimlər Şurası</p>
      </div>
    </footer>
  );
}
