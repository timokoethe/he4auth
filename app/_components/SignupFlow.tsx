"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type EnrollmentState =
  | "idle"
  | "loading"
  | "camera"
  | "scanning"
  | "success"
  | "error";

const STEPS = [
  "Center your face in the frame",
  "Turn your head slowly right",
  "Turn your head slowly left",
] as const;

const STEP_COMPLETE = 100;
const DETECTION_INTERVAL_MS = 100;
const POSE_PROGRESS_INCREMENT = 12.5;
const YAW_THRESHOLD = 0.04;
const BANKING_BACKGROUND =
  "bg-gradient-to-b from-sky-500/[0.05] via-background to-background";

type FacePose = {
  centered: boolean;
  yaw: number;
};

function getFacePose(landmarks: NormalizedLandmark[]): FacePose | null {
  const forehead = landmarks[10];
  const nose = landmarks[1];
  const chin = landmarks[152];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  if (
    !forehead ||
    !nose ||
    !chin ||
    !leftCheek ||
    !rightCheek
  ) {
    return null;
  }

  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const faceHeight = Math.abs(chin.y - forehead.y);
  if (faceWidth < 0.001 || faceHeight < 0.001) return null;

  const cheekCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceCenterY = (forehead.y + chin.y) / 2;

  return {
    centered:
      Math.abs(cheekCenterX - 0.5) < 0.13 &&
      Math.abs(faceCenterY - 0.5) < 0.17 &&
      faceWidth > 0.2,
    yaw: (nose.x - cheekCenterX) / faceWidth,
  };
}

function ProgressRing({ progress }: { progress: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg viewBox="0 0 112 112" className="h-28 w-28" aria-hidden>
      <circle
        cx="56"
        cy="56"
        r={radius}
        className="stroke-black/10 dark:stroke-white/10"
        strokeWidth="8"
        fill="none"
      />
      <circle
        cx="56"
        cy="56"
        r={radius}
        className="stroke-sky-600 transition-[stroke-dashoffset] duration-300 dark:stroke-sky-400"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 56 56)"
      />
      <text
        x="56"
        y="61"
        textAnchor="middle"
        className="fill-current text-base font-semibold text-foreground"
      >
        {progress}%
      </text>
    </svg>
  );
}

function LogoMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white shadow-sm">
      AB
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-7 w-7 border-current transition-colors duration-300 ${className}`}
    />
  );
}

export default function SignupFlow({
  completionHref = "/",
}: {
  completionHref?: string;
}) {
  const [state, setState] = useState<EnrollmentState>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastDetectionAtRef = useRef(0);
  const baselineSamplesRef = useRef<number[]>([]);
  const baselineYawRef = useRef<number | null>(null);
  const stepIndexRef = useRef(0);
  const stepProgressRef = useRef(0);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not expose camera access.");
      setState("error");
      return;
    }

    try {
      setCameraError("");
      setState("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const vision = {
        wasmLoaderPath: "/mediapipe/vision_wasm_internal.js",
        wasmBinaryPath: "/mediapipe/vision_wasm_internal.wasm",
      };
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/mediapipe/face_landmarker.task",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.65,
        minFacePresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });

      if (!isMountedRef.current) {
        landmarker.close();
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      landmarkerRef.current = landmarker;
      setState("camera");
    } catch {
      if (!isMountedRef.current) return;

      stopCamera();
      setCameraError(
        "Camera access was blocked or face detection could not be started.",
      );
      setState("error");
    }
  }

  function stopCamera() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    lastDetectionAtRef.current = 0;
    baselineSamplesRef.current = [];
    baselineYawRef.current = null;

    landmarkerRef.current?.close();
    landmarkerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function reset() {
    stopCamera();
    setState("idle");
    setStepIndex(0);
    stepIndexRef.current = 0;
    setStepProgress(0);
    stepProgressRef.current = 0;
    setCameraError("");
  }

  function beginEnrollment() {
    if (!streamRef.current || state === "scanning") return;
    setState("scanning");
    setStepIndex(0);
    stepIndexRef.current = 0;
    setStepProgress(0);
    stepProgressRef.current = 0;
    lastDetectionAtRef.current = 0;
    baselineSamplesRef.current = [];
    baselineYawRef.current = null;
    animationRef.current = requestAnimationFrame(readFacePose);
  }

  function readFacePose(timestamp: number) {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (
      !video ||
      !landmarker ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      animationRef.current = requestAnimationFrame(readFacePose);
      return;
    }

    if (timestamp - lastDetectionAtRef.current < DETECTION_INTERVAL_MS) {
      animationRef.current = requestAnimationFrame(readFacePose);
      return;
    }
    lastDetectionAtRef.current = timestamp;

    let result: FaceLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, timestamp);
    } catch {
      setCameraError("Face detection was interrupted. Please start again.");
      setState("error");
      stopCamera();
      return;
    }
    const pose = getFacePose(result.faceLandmarks[0] ?? []);
    const baselineYaw = baselineYawRef.current;
    const currentStep = stepIndexRef.current;
    // The preview is mirrored for the participant. Negative raw yaw appears as
    // a right turn, while positive raw yaw appears as a left turn.
    const targetPoseReached =
      pose !== null &&
      (currentStep === 0
        ? pose.centered
        : currentStep === 1
          ? baselineYaw !== null && pose.yaw <= baselineYaw - YAW_THRESHOLD
          : baselineYaw !== null && pose.yaw >= baselineYaw + YAW_THRESHOLD);

    if (currentStep === 0 && pose?.centered) {
      baselineSamplesRef.current.push(pose.yaw);
    }

    const nextProgress = targetPoseReached
      ? Math.min(
          STEP_COMPLETE,
          stepProgressRef.current + POSE_PROGRESS_INCREMENT,
        )
      : Math.max(
          0,
          stepProgressRef.current - POSE_PROGRESS_INCREMENT / 2,
        );

    if (nextProgress >= STEP_COMPLETE) {
      if (currentStep === 0) {
        const samples = baselineSamplesRef.current;
        baselineYawRef.current =
          samples.reduce((sum, yaw) => sum + yaw, 0) / samples.length;
      }

      const nextStep = currentStep + 1;
      stepProgressRef.current = 0;
      setStepProgress(0);

      if (nextStep >= STEPS.length) {
        setState("success");
        stopCamera();
        return;
      }

      stepIndexRef.current = nextStep;
      setStepIndex(nextStep);
    } else {
      stepProgressRef.current = nextProgress;
      setStepProgress(nextProgress);
    }

    animationRef.current = requestAnimationFrame(readFacePose);
  }

  const totalProgress =
    state === "success"
      ? 100
      : Math.round(((stepIndex * STEP_COMPLETE + stepProgress) / (STEPS.length * STEP_COMPLETE)) * 100);
  const activeInstruction =
    state === "success"
      ? "Face profile registered"
      : state === "scanning"
        ? STEPS[stepIndex]
        : state === "camera"
          ? "Camera ready"
          : state === "loading"
            ? "Preparing face setup"
          : state === "error"
            ? "Camera unavailable"
            : "Start camera to register your face";

  return (
    <main className={`min-h-dvh px-5 py-5 sm:px-8 ${BANKING_BACKGROUND}`}>
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center border-b border-black/10 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-base font-semibold tracking-tight">Atlas Bank</p>
              <p className="text-xs text-foreground/50">Online Banking</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-8">
          <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.025]">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                Secure setup
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Set up face sign-in
              </h1>
              <p className="mt-2 text-sm leading-6 text-foreground/60">
                Follow the instructions to create your face profile for future
                sign-ins to Atlas Bank.
              </p>
            </div>

          <div className="mt-7">
            <div className="relative mx-auto aspect-square w-60 overflow-hidden rounded-[2rem] border border-black/10 bg-black shadow-sm dark:border-white/10">
              <video
                ref={videoRef}
                className={`h-full w-full scale-x-[-1] object-cover transition-opacity duration-300 ${
                  state === "idle" || state === "error" || state === "success"
                    ? "opacity-0"
                    : "opacity-100"
                }`}
                muted
                playsInline
                aria-label="Live camera preview"
              />

              {(state === "idle" ||
                state === "error" ||
                state === "success") && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/[0.03] to-black/[0.08] text-foreground dark:from-white/[0.04] dark:to-white/[0.02]">
                  <div className="text-center">
                    <div
                      className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                        state === "success"
                          ? "bg-emerald-500 text-white"
                          : "border border-black/10 bg-white/70 text-foreground/40 dark:border-white/10 dark:bg-white/[0.06]"
                      }`}
                    >
                      {state === "success" ? (
                        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" aria-hidden>
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className="text-3xl">+</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`pointer-events-none absolute inset-4 ${
                  state === "success"
                    ? "text-emerald-500"
                    : "text-sky-400"
                }`}
              >
                <Corner className="left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]" />
                <Corner className="right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]" />
                <Corner className="bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]" />
                <Corner className="bottom-0 right-0 rounded-br-xl border-b-[3px] border-r-[3px]" />
              </div>

              {state === "scanning" && (
                <div className="pointer-events-none absolute inset-x-6 top-1/2">
                  <div
                    className="anim-scanline h-px w-full text-sky-400"
                    style={{
                      background: "linear-gradient(90deg, transparent, currentColor, transparent)",
                      boxShadow: "0 0 12px 1px currentColor",
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <ProgressRing progress={totalProgress} />
          </div>

          <div className="mt-5 min-h-16 text-center">
            <p
              className={`text-sm font-semibold ${
                state === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground/75"
              }`}
            >
              {activeInstruction}
            </p>
            <p className="mt-1 text-xs text-foreground/45">
              {state === "scanning"
                ? `Step ${stepIndex + 1} of ${STEPS.length} · ${totalProgress}% complete`
                : state === "camera"
                  ? "Make sure your face is clearly visible and the room is well lit."
                  : state === "success"
                    ? "Face sign-in is now ready to use."
                  : state === "error"
                    ? cameraError
                    : state === "loading"
                      ? "Starting camera and face detection ..."
                    : "Camera access is required for this one-time setup."}
            </p>
          </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {state === "success" ? (
              <>
                <button
                  onClick={reset}
                  className="rounded-xl border border-black/10 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
                >
                  Enroll again
                </button>
                <Link
                  href={completionHref}
                  replace={completionHref !== "/"}
                  className="rounded-xl bg-sky-600 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500"
                >
                  Continue
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={reset}
                  disabled={state === "idle" || state === "loading"}
                  className="rounded-xl border border-black/10 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/15 dark:hover:bg-white/[0.06]"
                >
                  Reset
                </button>
                {state === "camera" || state === "scanning" ? (
                  <button
                    onClick={beginEnrollment}
                    disabled={state === "scanning"}
                    className="rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {state === "scanning" ? "Creating face profile ..." : "Start face setup"}
                  </button>
                ) : state === "loading" ? (
                  <button
                    disabled
                    className="rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm opacity-60"
                  >
                    Preparing camera ...
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500"
                  >
                    Allow camera
                  </button>
                )}
              </>
            )}
            </div>
          </section>
        </div>

        <footer className="border-t border-black/10 py-6 text-sm text-foreground/55 dark:border-white/10">
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
      </div>
    </main>
  );
}
