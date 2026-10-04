/** Azərbaycan vaxtı (UTC+4, yay vaxtı yoxdur) — server və client eyni dəyəri göstərir. */
const BAKU_OFFSET = 4 * 60 * 60 * 1000;

/** ISO → <input type="datetime-local"> dəyəri (Bakı vaxtı) */
export const toLocalInput = (iso: string | null | undefined) =>
  iso ? new Date(Date.parse(iso) + BAKU_OFFSET).toISOString().slice(0, 16) : "";

/** <input type="datetime-local"> dəyəri (Bakı vaxtı) → ISO */
export const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+04:00`).toISOString() : null);
