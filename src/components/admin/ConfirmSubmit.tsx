"use client";

/** Geri qaytarılmaz əməliyyatlar üçün təsdiq soruşan submit düyməsi. */
export function ConfirmSubmit({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="submit" className={className} onClick={(e) => !confirm(message) && e.preventDefault()}>
      {children}
    </button>
  );
}
