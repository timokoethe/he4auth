import Link from "next/link";
import { isStudyLoginHref } from "../../_lib/studyFlow";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  const studyReturnHref =
    typeof returnTo === "string" && isStudyLoginHref(returnTo)
      ? returnTo
      : null;

  return (
    <main className="min-h-dvh px-5 py-8 sm:px-8">
      <article className="mx-auto w-full max-w-3xl">
        <Link
          href={studyReturnHref ?? "/he-secure"}
          replace={studyReturnHref !== null}
          className="text-sm font-semibold text-sky-600 underline-offset-4 hover:underline dark:text-sky-300"
        >
          Back to sign-in
        </Link>

        <header className="mt-8 border-b border-black/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
            More Information
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            How encrypted face authentication works
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/60">
            This method uses special encryption that lets the bank compare your
            face data while it remains protected.
          </p>
        </header>

        <div className="grid gap-5 py-7">
          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="text-lg font-semibold tracking-tight">Technical process</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-foreground/65">
              <li>1. The camera captures a short face sample during sign-in.</li>
              <li>2. Software turns the sample into a digital face pattern.</li>
              <li>3. The new face pattern is encrypted before matching.</li>
              <li>4. It is compared with the encrypted saved face reference.</li>
              <li>5. Only the final result — match or no match — is revealed.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="text-lg font-semibold tracking-tight">What is encrypted?</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/65">
              Both the saved face reference and the new digital face pattern stay
              encrypted during the comparison. The matching service can check how
              similar they are without seeing either one in readable form.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="text-lg font-semibold tracking-tight">What is not encrypted?</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/65">
              The camera image exists briefly on your device so that the digital
              face pattern can be created. The final match or no-match decision is
              readable so the bank knows whether to allow access. Working with
              encrypted data requires extra calculations, which is why sign-in
              takes a little longer.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
