"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ACCOUNT_PREVIEW_MS } from "../_lib/studyFlow";
import FaceScanner, { type CameraState } from "./FaceScanner";

type Variant = "normal" | "he";
type ScanState = "idle" | "scanning" | "success";
type FlowStep = "landing" | "loading-auth" | "auth" | "loading-account" | "account";
type FlowKey = `${Variant}-${boolean}`;

const DURATION_MS: Record<Variant, number> = {
  normal: 200,
  he: 2400,
};
const SCREEN_LOAD_MS = 650;
const SUCCESS_HOLD_MS = 450;

const FLOW_COPY: Record<
  FlowKey,
  {
    title: string;
    label: string;
    detail: string;
    infoHref: string;
  }
> = {
  "normal-false": {
    title: "Sign in with face authentication",
    label: "Face authentication checks your face against the stored reference.",
    detail: "The connection is encrypted and sign-in is confirmed directly.",
    infoHref: "/info/face-authentication",
  },
  "normal-true": {
    title: "Face authentication",
    label: "Your face is compared with the stored reference.",
    detail: "The check runs directly and quickly. Transmission is encrypted and confirms your identity for online banking access.",
    infoHref: "/info/face-authentication",
  },
  "he-false": {
    title: "Sign in with encrypted face authentication",
    label: "Face authentication checks your identity using encrypted biometric data.",
    detail: "Matching runs without exposing the stored biometric template.",
    infoHref: "/info/homomorphic-face-authentication",
  },
  "he-true": {
    title: "Encrypted face authentication",
    label: "Your face data is matched in encrypted form and is not stored in plain text.",
    detail: "With this method, matching remains encrypted during the check. This protects sensitive biometric data, but takes a little longer because of the additional computation.",
    infoHref: "/info/homomorphic-face-authentication",
  },
};

const TRANSACTIONS = [
  { label: "Salary payment", meta: "Keller & Partner GmbH", amount: "+3,420.00 EUR" },
  { label: "Rent", meta: "Hafen Property Management", amount: "-1,180.00 EUR" },
  { label: "Card payment", meta: "Mitte Market Berlin", amount: "-42.85 EUR" },
  { label: "ETF savings plan", meta: "Atlas Invest Portfolio", amount: "-250.00 EUR" },
] as const;

const BANK_ACCENT = {
  text: "text-sky-600 dark:text-sky-300",
  bg: "bg-sky-600 hover:bg-sky-500",
  softBg: "bg-sky-500/8",
  border: "border-sky-500/20",
  dot: "bg-sky-500",
} as const;

const ACCENT: Record<Variant, typeof BANK_ACCENT> = {
  normal: BANK_ACCENT,
  he: BANK_ACCENT,
};

const BANKING_BACKGROUND =
  "bg-gradient-to-b from-sky-500/[0.05] via-background to-background";

function statusText(
  state: ScanState,
  variant: Variant,
  cameraState: CameraState,
  hasFace: boolean,
) {
  if (state === "success") return "Identity confirmed";
  if (state === "scanning")
    return variant === "he" ? "Encrypted matching in progress ..." : "Matching in progress ...";
  if (cameraState === "loading") return "Starting camera and face detection ...";
  if (cameraState === "denied") return "Allow camera access to continue";
  if (cameraState === "unavailable") return "No camera is available";
  if (cameraState === "error") return "Camera or face detection could not be started";
  if (hasFace) return "Face detected — ready to sign in";
  return "Position your face inside the frame";
}

function actionText(state: ScanState, cameraState: CameraState, hasFace: boolean) {
  if (state === "scanning") return "Check in progress ...";
  if (cameraState === "loading") return "Preparing camera ...";
  if (cameraState === "denied") return "Camera access required";
  if (cameraState !== "ready") return "Camera unavailable";
  if (!hasFace) return "Show your face to continue";
  return "Sign in with your face";
}

function LogoMark({ variant }: { variant: Variant }) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm ${ACCENT[variant].bg}`}
    >
      AB
    </div>
  );
}

function LoadingScreen({ variant, label }: { variant: Variant; label: string }) {
  const accent = ACCENT[variant];

  return (
    <main
      className={`flex min-h-dvh flex-col items-center justify-center px-6 py-6 ${BANKING_BACKGROUND}`}
    >
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <LogoMark variant={variant} />
        </div>
        <div className="mt-8 flex justify-center">
          <div
            className={`h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent ${accent.text}`}
            aria-hidden
          />
        </div>
        <p className="mt-5 text-sm font-medium text-foreground/70">{label}</p>
      </div>
    </main>
  );
}

function AtlasLanding({
  method,
  onOpenLogin,
  loginOpen,
  onCloseLogin,
  onContinue,
  variant,
  showLabel,
  infoHref,
  replaceInfoLink,
}: {
  method: (typeof FLOW_COPY)[FlowKey];
  onOpenLogin: () => void;
  loginOpen: boolean;
  onCloseLogin: () => void;
  onContinue: () => void;
  variant: Variant;
  showLabel: boolean;
  infoHref: string;
  replaceInfoLink: boolean;
}) {
  const accent = ACCENT[variant];
  const [infoAccepted, setInfoAccepted] = useState(false);
  const signInButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  function closeLoginDialog() {
    setInfoAccepted(false);
    onCloseLogin();
    window.requestAnimationFrame(() => signInButtonRef.current?.focus());
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLoginDialog();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  useEffect(() => {
    if (!loginOpen) return;
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [loginOpen]);

  return (
    <main className={`min-h-dvh px-5 py-5 sm:px-8 ${BANKING_BACKGROUND}`}>
      <section className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <LogoMark variant={variant} />
            <div>
              <p className="text-base font-semibold tracking-tight">Atlas Bank</p>
              <p className="text-xs text-foreground/50">Online Banking</p>
            </div>
          </div>
          <button
            ref={signInButtonRef}
            onClick={showLabel ? onOpenLogin : onContinue}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${accent.bg}`}
          >
            Sign in
          </button>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${accent.text}`}>
              Personal Banking
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Banking that fits your everyday life
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-foreground/60">
              Manage your banking conveniently online, save flexibly, and keep
              accounts, cards, and investments in view at all times.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm text-foreground/60">
              <span className="rounded-xl border border-black/10 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
                Checking account
              </span>
              <span className="rounded-xl border border-black/10 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
                Cards
              </span>
              <span className="rounded-xl border border-black/10 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
                Securities portfolio
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/50 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-foreground/50">Instant-access savings account</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight">3.25% p.a.</p>
                <p className="mt-2 text-sm text-foreground/55">
                  for 6 months on deposits up to 50,000 EUR
                </p>
              </div>
              <span
                className={`rounded-md border px-2 py-1 text-xs font-medium ${accent.border} ${accent.softBg} ${accent.text}`}
              >
                New customers
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                ["Checking account", "0 EUR account fee"],
                ["Visa debit card", "included"],
                ["Securities savings plan", "from 25 EUR"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-black/5 bg-black/[0.025] px-4 py-3 dark:border-white/10 dark:bg-white/[0.035]"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm text-foreground/60">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="border-t border-black/10 py-8 dark:border-white/10">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Everyday banking", "Open an account online, receive your debit card, and manage payments from one place."],
              ["Savings and investing", "Set savings goals, compare deposit options, and start investment plans from 25 EUR."],
              ["Digital service", "Use secure messages, appointment booking, and card controls directly in online banking."],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <h2 className="text-base font-semibold tracking-tight">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-foreground/60">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-t border-black/10 py-8 dark:border-white/10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accent.text}`}>
              Service overview
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Banking services for home, work, and travel
            </h2>
            <p className="mt-4 text-sm leading-6 text-foreground/60">
              Atlas Bank combines daily account management with transparent
              product information and personal support when a decision needs
              more context.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Current account", "0 EUR monthly fee with digital statements"],
              ["Credit card", "Worldwide payments with app-based card limits"],
              ["Loans", "Personal loan offers with fixed monthly installments"],
              ["Support", "Video appointments and secure message center"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-xl border border-black/10 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.035]"
              >
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/60">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 border-t border-black/10 py-8 dark:border-white/10 md:grid-cols-3">
          <div>
            <p className="text-3xl font-semibold tracking-tight">24/7</p>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              Online access to accounts, cards, and transfers.
            </p>
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-tight">3 min</p>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              Typical time to apply for a new digital current account.
            </p>
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-tight">EU</p>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              Services designed for SEPA payments and European online banking.
            </p>
          </div>
        </section>

        <footer className="mt-auto border-t border-black/10 py-6 text-sm text-foreground/55 dark:border-white/10">
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-end"
          >
            <a className="hover:text-foreground" href="#">
              Imprint
            </a>
            <a className="hover:text-foreground" href="#">
              Privacy
            </a>
            <a className="hover:text-foreground" href="#">
              Terms
            </a>
            <a className="hover:text-foreground" href="#">
              Contact
            </a>
          </nav>
        </footer>
      </section>

      {showLabel && loginOpen && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-20 flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-dialog-title"
          tabIndex={-1}
          onKeyDown={handleDialogKeyDown}
        >
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-background p-5 shadow-2xl dark:border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${accent.text}`}>
                  Secure sign-in
                </p>
                <h2 id="login-dialog-title" className="mt-2 text-xl font-semibold tracking-tight">
                  {method.title}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                onClick={closeLoginDialog}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-lg leading-none text-foreground/50 hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
                aria-label="Close dialog"
              >
                x
              </button>
            </div>

            <div className={`mt-5 rounded-xl border px-4 py-3 ${accent.border} ${accent.softBg}`}>
              <p className="text-sm font-semibold leading-6">{method.label}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground/60">{method.detail}</p>
            <Link
              href={infoHref}
              replace={replaceInfoLink}
              className={`mt-3 inline-flex text-sm font-semibold ${accent.text} underline-offset-4 hover:underline`}
            >
              More Information
            </Link>

            <label className="mt-5 flex items-start gap-3 rounded-xl border border-black/10 bg-white/50 px-3 py-3 text-left text-sm text-foreground/70 dark:border-white/10 dark:bg-white/[0.02]">
              <input
                type="checkbox"
                checked={infoAccepted}
                onChange={(event) => setInfoAccepted(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-black/20 accent-current"
              />
              <span>I have read and understood the sign-in information.</span>
            </label>

            <button
              onClick={() => {
                setInfoAccepted(false);
                onContinue();
              }}
              disabled={!infoAccepted}
              className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${accent.bg}`}
            >
              Continue to sign-in
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function AccountOverview({ onRestart, variant }: { onRestart: () => void; variant: Variant }) {
  const accent = ACCENT[variant];

  return (
    <main className={`min-h-dvh px-5 py-5 sm:px-8 ${BANKING_BACKGROUND}`}>
      <section className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <LogoMark variant={variant} />
            <div>
              <p className="text-base font-semibold tracking-tight">Atlas Bank</p>
              <p className="text-xs text-foreground/50">My Banking</p>
            </div>
          </div>
          <button
            onClick={onRestart}
            className="rounded-xl border border-black/10 bg-white/50 px-4 py-2 text-sm font-semibold text-foreground/70 shadow-sm transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.06]"
          >
            Sign out
          </button>
        </header>

        <div className="grid gap-5 py-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
            <p className="text-sm text-foreground/50">Available balance</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">12,840.15 EUR</p>
            <p className="mt-2 text-sm text-foreground/50">Atlas checking account / DE48 5001 0517 5407 3249 11</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.035]">
                <p className="text-xs text-foreground/50">Credit card</p>
                <p className="mt-1 text-lg font-semibold">2,184.90 EUR</p>
              </div>
              <div className="rounded-xl border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.035]">
                <p className="text-xs text-foreground/50">Instant-access savings</p>
                <p className="mt-1 text-lg font-semibold">24,500.00 EUR</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/50 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">Recent transactions</h1>
              <span
                className={`rounded-md border px-2 py-1 text-xs font-medium ${accent.border} ${accent.softBg} ${accent.text}`}
              >
                Today
              </span>
            </div>
            <div className="mt-4 divide-y divide-black/10 dark:divide-white/10">
              {TRANSACTIONS.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-foreground/50">{item.meta}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      item.amount.startsWith("+") ? accent.text : "text-foreground/70"
                    }`}
                  >
                    {item.amount}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default function FaceAuthScreen({
  variant,
  showLabel,
  studyFlow,
}: {
  variant: Variant;
  showLabel: boolean;
  studyFlow?: {
    pauseHref: string;
    returnHref: string;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("landing");
  const [loginOpen, setLoginOpen] = useState(false);
  const [state, setState] = useState<ScanState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("loading");
  const [hasFace, setHasFace] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encrypted = variant === "he";
  const method = FLOW_COPY[`${variant}-${showLabel}` as FlowKey];
  const studyPauseHref = studyFlow?.pauseHref;
  const infoHref = studyFlow
    ? `${method.infoHref}?returnTo=${encodeURIComponent(studyFlow.returnHref)}`
    : method.infoHref;
  const handleFacePresenceChange = useCallback((faceIsPresent: boolean) => {
    setHasFace(faceIsPresent);
  }, []);
  const handleCameraStateChange = useCallback((nextCameraState: CameraState) => {
    setCameraState(nextCameraState);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (accountTimer.current) clearTimeout(accountTimer.current);
      if (loadTimer.current) clearTimeout(loadTimer.current);
      if (studyTimer.current) clearTimeout(studyTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (step !== "account" || !studyPauseHref) return;

    studyTimer.current = setTimeout(() => {
      router.replace(studyPauseHref);
    }, ACCOUNT_PREVIEW_MS);

    return () => {
      if (studyTimer.current) clearTimeout(studyTimer.current);
      studyTimer.current = null;
    };
  }, [router, step, studyPauseHref]);

  function beginAuthLoad() {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    reset();
    setLoginOpen(false);
    setStep("loading-auth");
    loadTimer.current = setTimeout(() => setStep("auth"), SCREEN_LOAD_MS);
  }

  function start() {
    if (state === "scanning" || cameraState !== "ready" || !hasFace) return;
    setState("scanning");
    timer.current = setTimeout(() => {
      setState("success");
      accountTimer.current = setTimeout(() => {
        setStep("loading-account");
        loadTimer.current = setTimeout(() => setStep("account"), SCREEN_LOAD_MS);
      }, SUCCESS_HOLD_MS);
    }, DURATION_MS[variant]);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    if (accountTimer.current) clearTimeout(accountTimer.current);
    if (loadTimer.current) clearTimeout(loadTimer.current);
    setState("idle");
  }

  useEffect(() => {
    if (state !== "scanning" || hasFace) return;
    reset();
  }, [hasFace, state]);

  function restart() {
    reset();
    setLoginOpen(false);
    setStep("landing");
  }

  if (step === "landing") {
    return (
      <AtlasLanding
        method={method}
        variant={variant}
        showLabel={showLabel}
        onOpenLogin={() => setLoginOpen(true)}
        loginOpen={loginOpen}
        onCloseLogin={() => setLoginOpen(false)}
        onContinue={beginAuthLoad}
        infoHref={infoHref}
        replaceInfoLink={studyFlow !== undefined}
      />
    );
  }

  if (step === "loading-auth") {
    return <LoadingScreen variant={variant} label="Preparing sign-in ..." />;
  }

  if (step === "loading-account") {
    return <LoadingScreen variant={variant} label="Loading account overview ..." />;
  }

  if (step === "account") {
    return (
      <AccountOverview
        onRestart={studyFlow ? () => undefined : restart}
        variant={variant}
      />
    );
  }

  return (
    <main
      className={`flex min-h-dvh flex-col items-center justify-center px-6 py-6 ${BANKING_BACKGROUND}`}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className={`text-center ${showLabel ? "mb-5" : "mb-8"}`}>
          <h1 className="text-xl font-semibold tracking-tight">Sign in with your face</h1>
        </div>

        {/* Scanner */}
        <FaceScanner
          state={state}
          onFacePresenceChange={handleFacePresenceChange}
          onCameraStateChange={handleCameraStateChange}
          widthClass={showLabel ? "w-44 sm:w-52" : "w-60"}
        />

        {/* Status */}
        <div className="mt-5 flex min-h-6 items-center justify-center gap-2 text-center text-sm">
          {state === "scanning" && (
            <span
              className={`h-1.5 w-1.5 animate-pulse rounded-full ${ACCENT[variant].dot}`}
            />
          )}
          <span
            className={
              state === "success"
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : "text-foreground/70"
            }
          >
            {statusText(state, variant, cameraState, hasFace)}
          </span>
        </div>

        {/* Encrypted-processing hint (HE only, while scanning) */}
        {encrypted && state === "scanning" && (
          <p className="anim-shimmer mt-2 text-center font-mono text-[11px] text-sky-500/70">
            8f2a-c1d9-encrypted-4e7b-a0f3
          </p>
        )}

        {/* Action */}
        <div className="mt-5">
          {state === "success" ? (
            <button
              onClick={reset}
              className="w-full rounded-xl border border-black/10 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
            >
              Try again
            </button>
          ) : (
            <button
              onClick={start}
              disabled={state === "scanning" || cameraState !== "ready" || !hasFace}
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${ACCENT[variant].bg}`}
            >
              {actionText(state, cameraState, hasFace)}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
