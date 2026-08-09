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
          href={studyReturnHref ?? "/normal-secure"}
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
            How face authentication works
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/60">
            Face authentication checks whether the face shown during sign-in
            matches the biometric reference that was enrolled earlier.
          </p>
        </header>

        <div className="grid gap-5 py-7">
          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="text-lg font-semibold tracking-tight">Technical process</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-foreground/65">
              <li>1. The camera captures a short face sample during sign-in.</li>
              <li>2. Software converts the image into a biometric template, not a normal photo.</li>
              <li>3. The template is compared with the stored reference template.</li>
              <li>4. If the similarity is high enough, the bank confirms the sign-in.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="text-lg font-semibold tracking-tight">What is encrypted?</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/65">
              The connection between your device and the online banking service is
              encrypted, for example with HTTPS/TLS. The stored biometric reference
              can also be protected by database or storage encryption.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="text-lg font-semibold tracking-tight">What is not encrypted?</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/65">
              In regular face authentication, the comparison normally needs access
              to readable biometric templates inside the trusted authentication
              system. Access to these templates is limited to authorized system
              components and protected by strict security controls.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
