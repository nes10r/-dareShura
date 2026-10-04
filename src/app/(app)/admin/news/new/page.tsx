import type { Metadata } from "next";
import Link from "next/link";
import { NewsEditor } from "@/components/admin/NewsEditor";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Yeni xəbər" };

export default async function NewNewsPage() {
  await requirePermission("news.manage");
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/admin/news" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Xəbərlər
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Yeni xəbər</h1>
      <div className="mt-6">
        <NewsEditor
          id={null}
          published={false}
          initial={{ title: "", summary: "", body: "", category: "Xəbər", coverImage: "/images/campus-aerial.jpg", meta: {} }}
        />
      </div>
    </div>
  );
}
