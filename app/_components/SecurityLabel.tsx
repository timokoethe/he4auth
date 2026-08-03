type Variant = "normal" | "he";

// One concise, self-contained line per method — each phrased positively on its
// own terms, with no comparison between them.
const LABEL: Record<Variant, string> = {
  // Constant across every phase, so "always encrypted" stays the takeaway.
  he: "Always encrypted, never decrypted — your face data stays private during sign-in.",
  normal: "Secure, encrypted connection.",
};

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SecurityLabel({ variant }: { variant: Variant }) {
  return (
    <div
      aria-label="Privacy"
      className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/6 px-3 py-2.5 text-emerald-700 dark:text-emerald-300"
    >
      <ShieldIcon className="h-4 w-4 shrink-0" />
      <p className="text-[12.5px] font-medium leading-snug">{LABEL[variant]}</p>
    </div>
  );
}
