import Link from "next/link";

export default function StudyTransitionScreen({
  title,
  actionHref,
  actionLabel,
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white/50 p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Link
          href={actionHref}
          replace
          className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-85"
        >
          {actionLabel}
        </Link>
      </section>
    </main>
  );
}
