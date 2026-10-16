import { getUserBookRequests } from "../../books";
import { listBookRequests, listBooks, listChapters, listUsers } from "../../db/repo";
import { matchSkills } from "../../skills";
import type { DashboardCard, ModuleProvider } from "../types";

/** Yeni kitab təklifi sahəsi uyğun üzvlərə bu müddət ərzində dashboard-da göstərilir */
const SUGGEST_DAYS = 14;

/**
 * Kitab layihələri: menyuda həmişə görünür.
 * Nişan — cavab verməli olduğum dəvət/müraciətlər; dashboard — həmin kartlar, qəbul bildirişləri
 * və sahəmə uyğun yeni kitab təklifləri.
 */
export const booksModule: ModuleProvider = {
  key: "books",
  async resolve({ user, now }) {
    const books = await listBooks();
    const { pending, accepted } = await getUserBookRequests(user.id, books);

    const cards: DashboardCard[] = [
      ...pending.map((d) => ({ kind: "bookPending" as const, key: `book:${d.request.id}`, priority: d.request.kind === "invite" ? 102 : 98, data: d })),
      ...accepted.map((d) => ({ kind: "bookAccepted" as const, key: `book-ok:${d.request.id}`, priority: 82, data: d })),
    ];

    // Sahəmə uyğun, son günlərdə dərc olunmuş açıq kitablar (iştirak etmədiyim)
    const fresh = books.filter(
      (b) => b.status === "open" && b.editorId !== user.id && now.getTime() - Date.parse(b.createdAt) < SUGGEST_DAYS * 86_400_000 && matchSkills(user.skills ?? [], b.topics).length,
    );
    if (fresh.length) {
      const ids = fresh.map((b) => b.id);
      const [chapters, reqs, users] = await Promise.all([listChapters(ids), listBookRequests({ userId: user.id }), listUsers()]);
      const items = fresh
        .filter((b) => !reqs.some((r) => r.bookId === b.id) && !chapters.some((c) => c.bookId === b.id && c.authorIds.includes(user.id)))
        .slice(0, 3)
        .map((b) => ({
          id: b.id,
          title: b.title,
          editor: users.find((u) => u.id === b.editorId)?.name ?? "",
          openChapters: chapters.filter((c) => c.bookId === b.id && !c.authorIds.length).length,
          matched: matchSkills(user.skills ?? [], b.topics),
        }));
      if (items.length) cards.push({ kind: "bookSuggest", key: "book-suggest", priority: 45, data: { items } });
    }

    return {
      visible: true,
      badge: pending.length,
      nav: { label: "Kitablar", href: "/kitablar", icon: "book", section: "main", order: 45 },
      cards,
    };
  },
};
