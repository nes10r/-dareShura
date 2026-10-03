/**
 * Fakültə siyahısı sabit deyil — istifadəçilərin qeydiyyatda yazdıqlarından formalaşır.
 * Eyni fakültənin fərqli yazılışlarının qarşısını almaq üçün mövcud yazılış seçilir.
 */

const key = (s: string) => s.toLocaleLowerCase("az").replace(/\s+/g, " ").trim();

export function cleanFaculty(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Boş olmayan, təkrarsız, əlifba sırası ilə fakültələr */
export function facultyList(values: string[]) {
  const seen = new Map<string, string>();
  for (const v of values) {
    const c = cleanFaculty(v);
    if (c && !seen.has(key(c))) seen.set(key(c), c);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "az"));
}

/** Daxil edilən ad mövcud fakültə ilə (böyük/kiçik hərf fərqi nəzərə alınmadan) üst-üstə düşürsə, mövcud yazılışı qaytarır. */
export function canonicalFaculty(input: string, existing: string[]) {
  const c = cleanFaculty(input);
  return existing.find((e) => key(e) === key(c)) ?? c;
}

export function facultyProblem(faculty: string) {
  return faculty.length < 2 ? "Fakültənizi daxil edin." : null;
}
