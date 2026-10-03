/** Sərbəst mətn + mövcud fakültələrdən təklif (datalist). Siyahı istifadəçilərin yazdıqlarından formalaşır. */
export function FacultyInput({
  faculties,
  defaultValue,
  className,
}: {
  faculties: string[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <>
      <input
        name="faculty"
        list="faculty-options"
        defaultValue={defaultValue}
        autoComplete="off"
        placeholder={faculties.length ? "Yazın və ya siyahıdan seçin" : "Fakültənizin adını yazın"}
        className={className}
      />
      <datalist id="faculty-options">
        {faculties.map((f) => <option key={f} value={f} />)}
      </datalist>
    </>
  );
}
