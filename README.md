# UNEC Gənc Alimlər Şurası — Rəqəmsal Platforma

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

`npm run db:seed` boş bazada superadmin (`superadmin@unec.edu.az`), əsas sorğu, şablon və başlanğıc xəbərləri yaradır.
Superadmin şifrəsi `SUPERADMIN_PASSWORD` mühit dəyişənindən götürülür, yoxdursa təsadüfi yaradılıb bir dəfə ekrana çıxarılır.
`--reset` bütün istifadəçi və məlumatları silir — real istifadədə işlətməyin.

## İstifadəçilər və qeydiyyat

1. Admin və ya superadmin **İdarəetmə → Qeydiyyat linki** bölməsində 24 saatlıq link yaradır və paylaşır.
   Yeni link yaradılanda əvvəlki avtomatik deaktiv olur; link əl ilə də deaktiv edilə bilər.
2. İstifadəçi `/register?token=...` linki ilə yalnız `@unec.edu.az` e-poçtu ilə qeydiyyatdan keçir (rolu: Şura üzvü).
   Linksiz və ya müddəti bitmiş linklə qeydiyyat mümkün deyil; yoxlama server tərəfində aparılır.
3. Superadmin **İdarəetmə → İstifadəçilər** bölməsində istifadəçiləri admin təyin edir və ya adminlikdən çıxarır.

| Rol | İcazələr |
|---|---|
| Superadmin | Hamısı + rolların idarə edilməsi |
| Administrator | Sorğular, xəbərlər, qeydiyyat linki |
| Şura üzvü | Ona ünvanlanan sorğular, xəbərlər, profil |

## Landing və Xəbərlər

- Hero: YouTube videosunun 10–52-ci saniyələri səssiz fon kimi dövr edir (`components/landing/HeroVideo.tsx`), yüklənənə qədər kampus şəkli göstərilir.
- Xəbərlər `news` cədvəlində saxlanılır; superadmin/admin `İdarəetmə → Xəbərlərin idarə edilməsi` bölməsindən yazır, dərc edir, silir.
- İctimai səhifələr: `/xeberler` (kateqoriya filtri ilə) və `/xeberler/[slug]`.

## Konfranslar

- Mənbə: [news.unec.edu.az/elan/86-konfrans](https://news.unec.edu.az/elan/86-konfrans). Yeni elanlar `/konfranslar` açılanda
  (son yoxlamadan 6 saat keçibsə) fonda və ya **İdarəetmə → Konfranslar → Yeni elanları yoxla** ilə çəkilir.
- Keçirilmə tarixi, son müraciət tarixi, format (Əyani/Onlayn/Hibrid), məkan və ödəniş elan mətnindən avtomatik müəyyən edilir
  (`src/lib/conferences/extract.ts`). Mətndə yoxdursa və ya səhvdirsə, admin əl ilə düzəldir — düzəlişlər `overrides`-da saxlanılır,
  yenilənmədə silinmir.
- Kartlarda son müraciət tarixi canlı geri sayımla göstərilir; təqvim faylı `/konfranslar/[id]/ics`.
- **Məhdudiyyət:** news.unec.edu.az Cloudflare ilə xaricdəki serverlərdən (Vercel) gələn sorğuları bloklayır (HTTP 403).
  Daimi həll — UNEC İT-dən `UNEC-GAS-Platforma` User-Agent-inə icazə. O vaxta qədər Azərbaycandakı kompüterdən
  `npm run konfrans:sync` (və ya Windows Task Scheduler ilə müntəzəm).

## Qrantlar və işçi qruplar

- Mənbələr: Azərbaycan Elm Fondu (`aef.gov.az/az/grant`) və UNEC "Müsabiqə" bölməsindən "qrant" elanları (12 saatdan bir).
  Elm Fondunun şərtləri PDF-dədir — son tarix/məbləği admin daxil edir. aef.gov.az səhv TLS zənciri göndərir;
  çatışmayan aralıq sertifikat `src/lib/grants/aef-ca.ts`-dədir (yalnız bu sayt üçün).
- Üzvlər profildə (və qeydiyyatda) **elmi maraq və bacarıqlarını** teq kimi qeyd edir.
- Admin qrant səhifəsində **işçi qrup** yaradır və tələb olunan bacarıqları seçir:
  bacarığı uyğun olanlara **dəvət**, uyğun heç kim yoxdursa hamıya **təklif** gedir (dashboard kartı + menyu nişanı).
  Qəbul edənlər qrupun üzvü olur; dəvətsiz üzv özü qoşula bilər; admin statusları görür, e-poçtları kopyalayır.
- Lokal test: `DATABASE_URL= npm run db:migrate && DATABASE_URL= npm run db:seed`, sonra
  `DATABASE_URL= ALLOW_PGLITE=1 npx next start` — canlı bazada istifadəçilərə bildiriş gedən test etməyin.

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
