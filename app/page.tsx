import Link from "next/link";
import {
  STUDY_CONDITIONS,
  STUDY_ORDERS,
  STUDY_ORDER_IDS,
} from "./_lib/studyFlow";

const MODERATOR_TOOLS = [
  {
    href: "/signup",
    title: "Signup",
    sub: "Face enrollment",
    note: "Standalone setup flow",
    accent: "emerald",
  },
  {
    href: "/normal",
    title: "Condition A",
    sub: "Standard · no label",
    note: "Standalone sign-in",
    accent: "sky",
  },
  {
    href: "/normal-secure",
    title: "Condition B",
    sub: "Standard · with label",
    note: "Standalone sign-in",
    accent: "sky",
  },
  {
    href: "/he",
    title: "Condition C",
    sub: "HE · no label",
    note: "Standalone sign-in",
    accent: "sky",
  },
  {
    href: "/he-secure",
    title: "Condition D",
    sub: "HE · with label",
    note: "Standalone sign-in",
    accent: "sky",
  },
] as const;

const ACCENT: Record<string, string> = {
  sky: "group-hover:border-sky-500/40 group-hover:text-sky-600 dark:group-hover:text-sky-300",
  emerald:
    "group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-300",
};

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Moderator Screen
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-foreground/60">
            Select the assigned sequence before handing the device to the
            participant. Every sequence starts with face registration.
          </p>
        </header>

        <section className="mt-9">
          <h2 className="text-sm font-semibold">Study sequences</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {STUDY_ORDER_IDS.map((order) => (
              <Link
                key={order}
                href={`/study/${order}/signup`}
                replace
                className="group rounded-2xl border border-black/10 bg-white/50 p-5 shadow-sm transition-colors hover:border-foreground/25 hover:bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold tracking-tight">
                      Sequence {order}
                    </p>
                    <p className="mt-1 text-xs text-foreground/45">
                      Signup, then four sign-ins
                    </p>
                  </div>
                  <span className="text-xl text-foreground/30 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  {STUDY_ORDERS[order].map((conditionId, index) => (
                    <div key={`${conditionId}-${index}`} className="contents">
                      {index > 0 && (
                        <span className="text-xs text-foreground/25">→</span>
                      )}
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-background text-xs font-semibold dark:border-white/10">
                        {conditionId}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1">
                  {STUDY_ORDERS[order].map((conditionId) => (
                    <p
                      key={conditionId}
                      className="text-xs text-foreground/50"
                    >
                      {conditionId}:{" "}
                      {STUDY_CONDITIONS[conditionId].moderatorLabel}
                    </p>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-black/10 pt-7 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold">Moderator tools</h2>
            <p className="mt-1 text-xs leading-5 text-foreground/45">
              Open individual flows without starting a study sequence.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODERATOR_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group rounded-2xl border border-black/10 bg-white/50 p-4 transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] ${ACCENT[tool.accent]}`}
              >
                <p className="text-sm font-semibold tracking-tight">
                  {tool.title}
                </p>
                <p className="mt-1 text-xs text-foreground/60">{tool.sub}</p>
                <p className="mt-3 text-[10px] uppercase tracking-wide text-foreground/40">
                  {tool.note}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
