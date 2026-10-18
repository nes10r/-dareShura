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

## Statuslar (24 saat)

- Dashboard-un yuxarısında status zolağı (WhatsApp/Facebook statusu kimi): mətn (rəngli fon) və ya şəkil (alt yazı ilə).
- Şəkil brauzerdə 1080px-ə kiçildilir və bazada saxlanılır; `/api/stories/[id]/image` yalnız daxil olmuş istifadəçilərə.
- 24 saatdan sonra görünmür və bazadan avtomatik silinir (hər status sorğusunda; cron lazım deyil).
- Müəllif kimlərin baxdığını görür və statusu silə bilir; admin istənilən statusu silə bilir. Eyni anda ən çox 10 aktiv status.

## Tədqiqatçılar və əməkdaşlıq

- Hər üzvün açıq elmi profili (`/tedqiqatcilar/[id]`): elmi maraqlar (bacarıqlar), qısa bio, ORCID, Google Scholar, "Əməkdaşlığa açığam" nişanı. Redaktə — `/profile#elmi-profil`.
- Nəşrlər əl ilə daxil edilmir: ORCID profilindən (pub.orcid.org açıq API) avtomatik gəlir, istinad sayı və açıq giriş pulsuz [OpenAlex](https://openalex.org) API-dən DOI üzrə əlavə olunur (nəşr, istinad, h-indeks, i10; ən çox 200 nəşr). ORCID dəyişəndə dərhal, sonra profil açılanda həftədə bir dəfə fonda yenilənir. İstəyə görə `OPENALEX_API_KEY`.
- Kataloq (`/tedqiqatcilar`): sahə/ad/fakültə üzrə axtarış, populyar sahələr və "Əməkdaşlığa açıq" filtri.
- "Birgə işləmək təklifi": mövzu + qısa mesaj. Alan tərəf dashboard-da kart və nişan görür; qəbul edildikdən sonra e-poçtlar qarşılıqlı açılır. Eyni anda ən çox 5 cavabsız təklif.

## Kitab layihələri

- Üzv kitab təklifi (proposal) hazırlayır (`/kitablar/yeni`): növ, ad, məqsəd/əhatə, elmi sahələr, dil, nəşriyyat planı, fəsillər üçün son tarix, fəsil planı. Hazırlayan — redaktor.
- Üzvlər mövcud fəslə və ya öz fəsil mövzusu ilə müraciət edir; redaktor üzvləri (sahəsi uyğun olanlar yuxarıda) konkret fəslə və ya yeni fəsil mövzusuna dəvət edir. Qəbul edildikdə müəllif fəslə əlavə olunur (həmmüəlliflik mümkündür).
- Bildirişlər dashboard-da və "Kitablar" menyusunda nişanla; sahəsi uyğun üzvlərə yeni kitablar 14 gün ərzində təklif kartı kimi göstərilir.
- Komandanın e-poçtları yalnız redaktor və müəlliflərə görünür. Redaktor müəllif qəbulunu bağlaya, fəsil/müəllif çıxara bilər; admin moderasiya üçün silə bilər.

## Jurnal tapmaq köməkçisi

- `/jurnallar`: məqalənin mövzusu (ingiliscə daha dəqiq) → son 3 ildə bu mövzuda ən çox məqalə dərc edən jurnallar (OpenAlex `group_by`). Nəticə 7 gün, jurnal göstəriciləri 30 gün bazada keşlənir.
- Hər jurnal: Scopus statusu, CiteScore və kvartil (`SCOPUS_API_KEY` varsa Scopus Serial Title API; yoxdursa Scimago linki), WoS — Clarivate Master Journal List linki, açıq giriş/DOAJ, APC, h-indeks, 2 illik orta istinad.
- Nəşr sürəti: Crossref-dəki son 60 məqalənin göndərilmə/qəbul/onlayn tarixlərinin medianı. Springer, Wiley, Taylor & Francis paylaşır; Elsevier və MDPI paylaşmır.
- "UNEC-dən burada dərc edənlər": üzvlərin ORCID/OpenAlex nəşrləri jurnalın OpenAlex ID-si (uyğun gəlməzsə — adı) ilə uyğunlaşdırılır; həmkarın adına klikləyəndə profilində «Jurnal» haqqında sual mövzusu ilə əməkdaşlıq təklifi hazır açılır. "Həmkarlar dərc edib" filtri.
- `/jurnallar/cagirislar`: xüsusi buraxılış çağırışları lenti. Nəşriyyat saytları serverdən avtomatik oxumağı bloklayır (Elsevier, MDPI, Wiley — 403, Springer — JS yoxlaması), ona görə çağırışları üzvlər paylaşır; jurnal kartında nəşriyyatın xüsusi buraxılışlar səhifəsinə link var. Son tarix keçəndə gizlənir, sahəsi uyğun üzvlərə dashboard-da göstərilir.

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
