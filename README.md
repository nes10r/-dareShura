# UNEC Alimlər Şurası — Rəqəmsal Platforma

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Drizzle ORM · Neon PostgreSQL

## İşə salma

```bash
npm install
cp .env.example .env.local   # DATABASE_URL (Neon) və SESSION_SECRET
npm run db:migrate           # cədvəlləri yaradır
npm run db:seed              # demo məlumatlar (--reset ilə yenidən yükləyir)
npm run dev
```

`DATABASE_URL` boş qalarsa, lokal inkişafda `./data/pglite` qovluğunda daxili PostgreSQL (PGlite) istifadə olunur.

Demo hesablar (şifrə `Demo1234`):

| E-poçt | Vəziyyət |
|---|---|
| leyla@unec.edu.az | Aktiv, cavablandırılmamış sorğu → popup, kart, badge |
| reshad@unec.edu.az | Cavab verib; bağlanmış sorğunun nəticələri açıqdır |
| nigar@unec.edu.az | Ona ünvanlanan sorğu yoxdur → "Sorğular" modulu tam gizlidir |
| superadmin@unec.edu.az | "Sorğuların idarə edilməsi" həmişə görünür |

## Dynamic Module Architecture

Naviqasiya və dashboard statik deyil — hər sorğuda modul provider-lərindən generasiya olunur.

```
src/lib/modules/
  types.ts              ModuleProvider kontraktı (visible, badge, nav, cards)
  registry.ts           resolveModules(user) → { modules, nav, cards }
  providers/survey.ts   survey (istifadəçi) + survey-admin (idarəetmə)
```

- `GET /api/user/modules` → yalnız görünən modullar; sorğu yoxdursa `{ "modules": [] }`.
- Yeni modul (iclas, tapşırıq, səsvermə, qərar): provider yazın, `registry.ts`-də `PROVIDERS`-ə əlavə edin,
  kart növünü `DashboardCard` tipinə və `dashboard/page.tsx`-dəki `renderCard`-a əlavə edin.

### Survey modulunun görünmə qaydası (`lib/surveys/service.ts → getUserSurveys`)

İstifadəçi auditoriyadadırsa və sorğu draft/planlaşdırılmış deyilsə:

| Vəziyyət | Nəticə |
|---|---|
| Aktiv, cavab verməyib | `pending` — dashboard-da prominent kart, popup, badge |
| Cavab verib, nəticələr ona açıqdır | `results` — nəticə kartı |
| Aktiv, cavab verib | `answered` — yalnız "Sorğular" səhifəsində |
| Heç biri | Modul gizlidir: menyuda yoxdur, `/surveys` → 404 |

Effektiv status tarixlərdən hesablanır (`startsAt` gələcəkdədirsə → planlaşdırılıb, `endsAt` keçibsə → bağlanıb),
ona görə cron tələb olunmur. Auditoriya hər sorğuda dinamik yoxlanılır — sonradan qoşulan uyğun istifadəçilər də sorğunu görür.

Yoxlamalar server tərəfdədir: auditoriyada olmayan istifadəçi sorğunun mövcudluğunu belə görmür (404),
cavab göndərişi auditoriya/aktivlik/validasiya ilə yoxlanılır, təkrar cavab DB unique index ilə bloklanır.
