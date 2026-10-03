import { hashPassword } from "./password";
import type { Audience, NewsItem, Question, SeedData, Survey, User } from "./types";

const DAY = 24 * 60 * 60 * 1000;

const ALL: Audience = { all: true, roles: [], faculties: [], userIds: [] };
/**
 * İlkin məlumatlar: yalnız superadmin, əsas sorğu, şablon və xəbərlər.
 * Digər istifadəçilər /register vasitəsilə @unec.edu.az e-poçtu ilə qeydiyyatdan keçir.
 */
export function createSeed(superadminPassword: string): SeedData {
  const now = Date.now();
  const iso = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString();

  const users: User[] = [
    {
      id: "u_super",
      name: "Superadmin",
      email: "superadmin@unec.edu.az",
      passwordHash: hashPassword(superadminPassword),
      role: "SUPER_ADMIN",
      faculty: "İqtisadiyyat və idarəetmə",
      position: "Platforma administratoru",
      academicTitle: null,
      createdAt: iso(0),
    },
  ];

  const q = (id: string, type: Question["type"], title: string, extra: Partial<Question> = {}): Question => ({
    id, type, title, required: true, ...extra,
  });

  // Son tarix: 15 oktyabr 2026 (keçibsə — bu gündən 12 gün sonra).
  const fixedDeadline = new Date("2026-10-15T23:59:00+04:00").getTime();
  const mainDeadline = new Date(fixedDeadline > now + DAY ? fixedDeadline : now + 12 * DAY).toISOString();

  const platformSurvey: Survey = {
    id: "s_platform",
    title: "UNEC Alimlər Şurası Rəqəmsal Platformasının Funksionallıqlarının Müəyyənləşdirilməsi",
    description:
      "Platformanın hansı funksiyalarla inkişaf etdiriləcəyini birlikdə müəyyən edək. Cavablarınız anonim təhlil olunacaq.",
    status: "PUBLISHED",
    startsAt: iso(-1),
    endsAt: mainDeadline,
    publishedAt: iso(-1),
    closedAt: null,
    audience: ALL,
    resultsVisibility: "NONE",
    resultsVisibleUntil: null,
    isTemplate: false,
    createdBy: "u_super",
    createdAt: iso(-3),
    updatedAt: iso(-1),
    questions: [
      q("q1", "single", "Platformaya əsasən hansı cihazdan daxil olacaqsınız?", {
        options: ["Mobil telefon", "Noutbuk / kompüter", "Planşet", "Bərabər şəkildə hamısı"],
      }),
      q("q2", "multiple", "Hansı funksiyalar sizin üçün ən vacibdir?", {
        description: "Bir neçə variant seçə bilərsiniz.",
        options: ["İclas gündəliyi və materialları", "Onlayn səsvermə", "Qərarların arxivi", "Tapşırıqların izlənməsi", "Sənəd dövriyyəsi", "Bildirişlər"],
      }),
      q("q3", "scale", "Hazırkı kağız əsaslı prosesdən nə dərəcədə razısınız?", {
        scaleMax: 5, scaleMinLabel: "Heç razı deyiləm", scaleMaxLabel: "Tam razıyam",
      }),
      q("q4", "single", "İclas materiallarını nə vaxt almaq istəyərdiniz?", {
        options: ["İclasdan 1 gün əvvəl", "İclasdan 3 gün əvvəl", "İclasdan 1 həftə əvvəl"],
      }),
      q("q5", "scale", "Onlayn səsvermə funksiyası sizin üçün nə qədər vacibdir?", {
        scaleMax: 5, scaleMinLabel: "Vacib deyil", scaleMaxLabel: "Çox vacibdir",
      }),
      q("q6", "multiple", "Bildirişləri hansı kanallarla almaq istəyirsiniz?", {
        options: ["Platforma daxilində", "E-poçt", "SMS", "Mobil push bildiriş"],
      }),
      q("q7", "single", "Elektron imza ilə sənəd təsdiqi lazımdırmı?", {
        options: ["Bəli, mütləq", "Bəli, amma sonrakı mərhələdə", "Xeyr"],
      }),
      q("q8", "scale", "Rəqəmsal alətlərdən istifadə bacarığınızı necə qiymətləndirirsiniz?", {
        scaleMax: 5, scaleMinLabel: "Başlanğıc", scaleMaxLabel: "Peşəkar",
      }),
      q("q9", "single", "Platformanın təlimi hansı formatda olsun?", {
        options: ["Video təlimatlar", "Canlı təlim sessiyası", "Yazılı təlimat", "Təlimə ehtiyac yoxdur"],
      }),
      q("q10", "multiple", "Hansı məlumatları dashboard-da görmək istəyərdiniz?", {
        options: ["Yaxınlaşan iclaslar", "Açıq səsvermələr", "Mənə verilən tapşırıqlar", "Son qərarlar", "Elanlar"],
      }),
      q("q11", "text", "Platformada mütləq olmasını istədiyiniz başqa funksiya varmı?", { required: false }),
      q("q12", "text", "Əlavə təklif və iradlarınız", { required: false }),
    ],
  };

  const template: Survey = {
    id: "s_tpl_event",
    status: "DRAFT",
    startsAt: null,
    endsAt: null,
    publishedAt: null,
    closedAt: null,
    resultsVisibility: "NONE",
    resultsVisibleUntil: null,
    createdBy: "u_super",
    createdAt: iso(0),
    updatedAt: iso(0),
    title: "Tədbir sonrası rəy sorğusu",
    description: "Hər tədbirdən sonra istifadə üçün standart şablon.",
    audience: ALL,
    isTemplate: true,
    questions: [
      q("q1", "scale", "Tədbiri ümumilikdə necə qiymətləndirirsiniz?", { scaleMax: 5, scaleMinLabel: "Zəif", scaleMaxLabel: "Əla" }),
      q("q2", "single", "Tədbirin müddəti uyğun idimi?", { options: ["Qısa idi", "Uyğun idi", "Uzun idi"] }),
      q("q3", "text", "Təklifləriniz", { required: false }),
    ],
  };

  const article = (id: string, slug: string, title: string, category: NewsItem["category"], coverImage: string, daysAgo: number, summary: string, body: string): NewsItem => ({
    id, slug, title, category, coverImage, summary, body,
    isPublished: true, publishedAt: iso(-daysAgo), createdBy: "u_super", createdAt: iso(-daysAgo), updatedAt: iso(-daysAgo),
  });

  // Başlanğıc xəbərlər — admin panelindən redaktə və ya silinə bilər
  const news: NewsItem[] = [
    article("n_launch", "alimler-surasinin-reqemsal-platformasi-istifadeye-verildi",
      "Alimlər Şurasının rəqəmsal platforması istifadəyə verildi", "Xəbər", "/images/campus-aerial.jpg", 1,
      "Şura üzvləri artıq iclas materiallarına, sorğulara və elanlara vahid platformadan çıxış əldə edir.",
      [
        "UNEC Alimlər Şurasının rəqəmsal platforması pilot rejimdə istifadəyə verildi.",
        "Platforma Şura üzvlərinə elanları izləmək, sorğularda iştirak etmək və gələcəkdə iclas materialları ilə işləmək üçün vahid məkan yaradır. Platforma mobil cihazlardan rahat istifadə nəzərə alınmaqla hazırlanıb.",
        "Təklif və iradlarınızı platformadakı sorğu vasitəsilə bildirə bilərsiniz.",
      ].join("\n\n")),
    article("n_survey", "platformanin-funksionalliqlari-uzre-sorgu-baslayir",
      "Platformanın funksionallıqları üzrə sorğu başlayır", "Elan", "/images/campus-cube.jpg", 2,
      "Şura üzvlərindən platformanın inkişaf istiqamətlərinə dair rəy toplanır.",
      [
        "Platformanın hansı funksiyalarla inkişaf etdiriləcəyini müəyyənləşdirmək məqsədilə Şura üzvləri arasında sorğu keçirilir.",
        "Sorğu təxminən 4 dəqiqə çəkir. Kabinetinizə daxil olduqda sorğu avtomatik olaraq göstəriləcək.",
      ].join("\n\n")),
    article("n_meetings", "sura-iclaslarinin-qrafiki-platformada-derc-olunacaq",
      "Şura iclaslarının qrafiki platformada dərc olunacaq", "İclas", "/images/campus-courtyard.jpg", 6,
      "Növbəti iclasların tarixləri və gündəliyi bu bölmədə elan ediləcək.",
      [
        "Alimlər Şurasının iclaslarının qrafiki və gündəliyi bundan sonra platformanın Xəbərlər bölməsində dərc olunacaq.",
        "Yeni elanlardan xəbərdar olmaq üçün bölməni mütəmadi izləyin.",
      ].join("\n\n")),
  ];

  return { users, surveys: [platformSurvey, template], responses: [], news };
}
