import { hashPassword } from "./password";
import type { AnswerValue, Audience, SeedData, Question, Survey, SurveyResponse, User } from "./types";

const DAY = 24 * 60 * 60 * 1000;

const ALL: Audience = { all: true, roles: [], faculties: [], userIds: [] };
const PILOT: Audience = {
  all: false,
  roles: ["SUPER_ADMIN", "ADMIN"],
  faculties: ["Rəqəmsal iqtisadiyyat", "Biznes və menecment", "İqtisadiyyat və idarəetmə", "Beynəlxalq iqtisadiyyat"],
  userIds: [],
};

/**
 * Demo məlumatlar. Hər istifadəçi survey modulunun fərqli vəziyyətini göstərir:
 *  - Leyla   → aktiv, cavablandırılmamış sorğu var (popup + badge)
 *  - Rəşad   → aktiv sorğuya cavab verib + bağlanmış sorğunun nəticələri açıqdır
 *  - Nigar   → ona ünvanlanan heç bir sorğu yoxdur → modul tam gizlidir
 *  - Admin   → "Sorğuların idarə edilməsi" həmişə görünür
 */
export function createSeed(): SeedData {
  const now = Date.now();
  const iso = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString();
  const password = hashPassword("Demo1234");

  const user = (id: string, name: string, email: string, role: User["role"], faculty: string, position: string, academicTitle: string | null): User => ({
    id, name, email, passwordHash: password, role, faculty, position, academicTitle, createdAt: iso(-90),
  });

  const users: User[] = [
    user("u_super", "Elçin Rzayev", "superadmin@unec.edu.az", "SUPER_ADMIN", "İqtisadiyyat və idarəetmə", "Platforma administratoru", null),
    user("u_admin", "Səbinə Əliyeva", "katib@unec.edu.az", "ADMIN", "İqtisadiyyat və idarəetmə", "Alimlər Şurasının elmi katibi", "dosent"),
    user("u_leyla", "Leyla Məmmədova", "leyla@unec.edu.az", "MEMBER", "Rəqəmsal iqtisadiyyat", "Kafedra müdiri", "professor"),
    user("u_reshad", "Rəşad Həsənov", "reshad@unec.edu.az", "MEMBER", "Biznes və menecment", "Dekan müavini", "dosent"),
    user("u_nigar", "Nigar Quliyeva", "nigar@unec.edu.az", "MEMBER", "Maliyyə və mühasibat", "Baş müəllim", "dosent"),
    user("u_m1", "Tural Abbasov", "tural@unec.edu.az", "MEMBER", "Beynəlxalq iqtisadiyyat", "Dosent", "dosent"),
    user("u_m2", "Aynur Kərimova", "aynur@unec.edu.az", "MEMBER", "Rəqəmsal iqtisadiyyat", "Professor", "professor"),
    user("u_m3", "Fərid Novruzov", "farid@unec.edu.az", "MEMBER", "Maliyyə və mühasibat", "Dosent", "dosent"),
    user("u_m4", "Günel Babayeva", "gunel@unec.edu.az", "MEMBER", "Biznes və menecment", "Baş müəllim", null),
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
    // Pilot mərhələ: Maliyyə fakültəsi hələ daxil deyil — Nigar üçün modul tam gizli qalır
    audience: PILOT,
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

  const seminarSurvey: Survey = {
    id: "s_seminar",
    title: "Elmi seminarların təşkili formatı",
    description: "Elmi seminarların hansı formatda keçirilməsinə dair rəyiniz.",
    status: "PUBLISHED",
    startsAt: iso(-20),
    endsAt: iso(-4),
    publishedAt: iso(-20),
    closedAt: null,
    audience: ALL,
    resultsVisibility: "RESPONDENTS",
    resultsVisibleUntil: iso(30),
    isTemplate: false,
    createdBy: "u_admin",
    createdAt: iso(-21),
    updatedAt: iso(-20),
    questions: [
      q("q1", "single", "Seminarlar hansı formatda keçirilsin?", { options: ["Əyani", "Onlayn", "Hibrid"] }),
      q("q2", "single", "Seminarların tezliyi necə olsun?", { options: ["Həftədə bir", "İki həftədə bir", "Ayda bir"] }),
      q("q3", "scale", "Mövcud seminarların keyfiyyətini qiymətləndirin", {
        scaleMax: 5, scaleMinLabel: "Zəif", scaleMaxLabel: "Əla",
      }),
    ],
  };

  const scheduledSurvey: Survey = {
    id: "s_journals",
    title: "Elmi jurnalların indeksləşmə strategiyası",
    description: "Universitet jurnallarının beynəlxalq bazalara daxil edilməsi üzrə prioritetlər.",
    status: "PUBLISHED",
    startsAt: iso(5),
    endsAt: iso(20),
    publishedAt: iso(0),
    closedAt: null,
    audience: { all: false, roles: [], faculties: ["Rəqəmsal iqtisadiyyat", "Maliyyə və mühasibat"], userIds: [] },
    resultsVisibility: "NONE",
    resultsVisibleUntil: null,
    isTemplate: false,
    createdBy: "u_super",
    createdAt: iso(-1),
    updatedAt: iso(0),
    questions: [
      q("q1", "multiple", "Hansı bazalar prioritet olmalıdır?", { options: ["Scopus", "Web of Science", "ERIH PLUS", "DOAJ"] }),
    ],
  };

  const draftSurvey: Survey = {
    id: "s_draft",
    title: "Doktorantura proqramlarının qiymətləndirilməsi",
    description: "",
    status: "DRAFT",
    startsAt: null,
    endsAt: null,
    publishedAt: null,
    closedAt: null,
    audience: { all: false, roles: ["MEMBER"], faculties: [], userIds: [] },
    resultsVisibility: "NONE",
    resultsVisibleUntil: null,
    isTemplate: false,
    createdBy: "u_super",
    createdAt: iso(-2),
    updatedAt: iso(-2),
    questions: [q("q1", "scale", "Doktorantura proqramlarının ümumi keyfiyyəti", { scaleMax: 5 })],
  };

  const template: Survey = {
    ...draftSurvey,
    id: "s_tpl_event",
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

  // Deterministik demo cavablar
  const responses: SurveyResponse[] = [];
  const answer = (surveyId: string, userId: string, answers: Record<string, AnswerValue>, daysAgo: number) =>
    responses.push({ id: `r_${surveyId}_${userId}`, surveyId, userId, answers, submittedAt: iso(-daysAgo) });

  const seminarAnswers: [string, string, string, number][] = [
    ["u_reshad", "Hibrid", "İki həftədə bir", 4],
    ["u_admin", "Əyani", "Ayda bir", 3],
    ["u_m1", "Hibrid", "İki həftədə bir", 4],
    ["u_m2", "Onlayn", "Həftədə bir", 5],
    ["u_m3", "Hibrid", "Ayda bir", 3],
    ["u_m4", "Hibrid", "İki həftədə bir", 4],
  ];
  seminarAnswers.forEach(([uid, a1, a2, a3], i) => answer("s_seminar", uid, { q1: a1, q2: a2, q3: a3 }, 10 + i));

  const platformAnswers: [string, string, string[], number][] = [
    ["u_reshad", "Mobil telefon", ["Onlayn səsvermə", "Qərarların arxivi", "Bildirişlər"], 2],
    ["u_m2", "Mobil telefon", ["İclas gündəliyi və materialları", "Onlayn səsvermə"], 1],
    ["u_m1", "Noutbuk / kompüter", ["Sənəd dövriyyəsi", "Tapşırıqların izlənməsi"], 3],
  ];
  platformAnswers.forEach(([uid, device, features, satisfaction]) =>
    answer("s_platform", uid, {
      q1: device, q2: features, q3: satisfaction, q4: "İclasdan 3 gün əvvəl", q5: 5,
      q6: ["Platforma daxilində", "E-poçt"], q7: "Bəli, amma sonrakı mərhələdə", q8: 4,
      q9: "Video təlimatlar", q10: ["Yaxınlaşan iclaslar", "Açıq səsvermələr"], q11: "", q12: "",
    }, 0),
  );

  return { users, surveys: [platformSurvey, seminarSurvey, scheduledSurvey, draftSurvey, template], responses };
}
