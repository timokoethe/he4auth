"use client";

import { useEffect, useRef } from "react";

export type CameraState = "loading" | "ready" | "denied" | "unavailable" | "error";

type ScanState = "idle" | "scanning" | "success";

const DETECTION_INTERVAL_MS = 160;
const REQUIRED_FACE_FRAMES = 2;
const REQUIRED_MISSING_FRAMES = 4;

function Corner({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-7 w-7 border-current transition-colors duration-500 ${className}`}
    />
  );
}

function cameraErrorState(error: unknown): CameraState {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "denied";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "unavailable";
    }
  }
  return "error";
}

export default function FaceScanner({
  state,
  onFacePresenceChange,
  onCameraStateChange,
  widthClass = "w-60",
}: {
  state: ScanState;
  onFacePresenceChange: (hasFace: boolean) => void;
  onCameraStateChange: (cameraState: CameraState) => void;
  widthClass?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSuccess = state === "success";
  const isScanning = state === "scanning";

  const accent = isSuccess ? "text-emerald-500" : "text-sky-500";

  useEffect(() => {
    let cancelled = false;
    let animationFrame = 0;
    let stream: MediaStream | null = null;
    let detector: { close: () => void } | null = null;
    let videoTrack: MediaStreamTrack | null = null;
    let trackMuted = false;
    let videoInterrupted = false;
    let failed = false;
    const videoElement = videoRef.current;

    function markMediaUnavailable() {
      if (cancelled || failed) return;
      onFacePresenceChange(false);
      onCameraStateChange("loading");
    }

    function handleTrackMute() {
      trackMuted = true;
      markMediaUnavailable();
    }

    function handleTrackUnmute() {
      trackMuted = false;
      if (!cancelled && !failed && !videoInterrupted && detector) {
        onCameraStateChange("ready");
      }
    }

    function handleVideoInterrupted() {
      videoInterrupted = true;
      markMediaUnavailable();
    }

    function handleVideoPlaying() {
      videoInterrupted = false;
      if (!cancelled && !failed && !trackMuted && detector) {
        onCameraStateChange("ready");
      }
    }

    function detachMediaListeners() {
      videoTrack?.removeEventListener("ended", handleTerminalMediaFailure);
      videoTrack?.removeEventListener("mute", handleTrackMute);
      videoTrack?.removeEventListener("unmute", handleTrackUnmute);
      videoElement?.removeEventListener("stalled", handleVideoInterrupted);
      videoElement?.removeEventListener("emptied", handleVideoInterrupted);
      videoElement?.removeEventListener("playing", handleVideoPlaying);
    }

    function releaseResources() {
      window.cancelAnimationFrame(animationFrame);
      detachMediaListeners();
      const detectorToClose = detector;
      detector = null;
      try {
        detectorToClose?.close();
      } finally {
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        videoTrack = null;
        if (videoElement) videoElement.srcObject = null;
      }
    }

    function handleTerminalMediaFailure() {
      if (cancelled || failed) return;
      failed = true;
      onFacePresenceChange(false);
      onCameraStateChange("error");
      releaseResources();
    }

    async function initialize() {
      onCameraStateChange("loading");
      onFacePresenceChange(false);

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          onCameraStateChange("unavailable");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoTrack = stream.getVideoTracks()[0] ?? null;
        if (!videoTrack) {
          handleTerminalMediaFailure();
          return;
        }
        videoTrack.addEventListener("ended", handleTerminalMediaFailure);
        videoTrack.addEventListener("mute", handleTrackMute);
        videoTrack.addEventListener("unmute", handleTrackUnmute);

        const video = videoElement;
        if (!video) {
          handleTerminalMediaFailure();
          return;
        }
        video.addEventListener("stalled", handleVideoInterrupted);
        video.addEventListener("emptied", handleVideoInterrupted);
        video.addEventListener("playing", handleVideoPlaying);
        video.srcObject = stream;
        await video.play();

        const { FaceDetector } = await import("@mediapipe/tasks-vision");
        const vision = {
          wasmLoaderPath: "/mediapipe/vision_wasm_internal.js",
          wasmBinaryPath: "/mediapipe/vision_wasm_internal.wasm",
        };
        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/blaze_face_short_range.tflite",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.65,
        });
        detector = faceDetector;
        if (cancelled) {
          faceDetector.close();
          return;
        }

        onCameraStateChange("ready");
        let lastDetectionAt = 0;
        let faceFrames = 0;
        let missingFrames = 0;
        let reportedFace = false;

        const detect = (timestamp: number) => {
          if (cancelled || failed) return;

          if (
            !trackMuted &&
            !videoInterrupted &&
            videoTrack?.readyState === "live" &&
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            timestamp - lastDetectionAt >= DETECTION_INTERVAL_MS
          ) {
            lastDetectionAt = timestamp;
            let hasDetection: boolean;
            try {
              hasDetection =
                faceDetector.detectForVideo(video, timestamp).detections.length > 0;
            } catch {
              handleTerminalMediaFailure();
              return;
            }

            if (hasDetection) {
              faceFrames += 1;
              missingFrames = 0;
              if (!reportedFace && faceFrames >= REQUIRED_FACE_FRAMES) {
                reportedFace = true;
                onFacePresenceChange(true);
              }
            } else {
              missingFrames += 1;
              faceFrames = 0;
              if (reportedFace && missingFrames >= REQUIRED_MISSING_FRAMES) {
                reportedFace = false;
                onFacePresenceChange(false);
              }
            }
          }

          animationFrame = window.requestAnimationFrame(detect);
        };

        animationFrame = window.requestAnimationFrame(detect);
      } catch (error) {
        if (cancelled) return;
        failed = true;
        onFacePresenceChange(false);
        onCameraStateChange(cameraErrorState(error));
        releaseResources();
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      releaseResources();
      onFacePresenceChange(false);
    };
  }, [onCameraStateChange, onFacePresenceChange]);

  return (
    <div className={`relative mx-auto aspect-square ${widthClass}`}>
      <div
        className={`absolute inset-0 rounded-[2rem] blur-2xl transition-opacity duration-500 ${accent} ${
          isScanning ? "opacity-25 anim-ringpulse" : isSuccess ? "opacity-20" : "opacity-0"
        }`}
        style={{ background: "currentColor" }}
      />

      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] border border-black/10 bg-black dark:border-white/10">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
          autoPlay
          muted
          playsInline
          aria-label="Live camera preview"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />

        <div className={`pointer-events-none absolute inset-4 z-10 ${accent}`}>
          <Corner className="left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]" />
          <Corner className="right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]" />
          <Corner className="bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]" />
          <Corner className="bottom-0 right-0 rounded-br-xl border-b-[3px] border-r-[3px]" />
        </div>

        {isScanning && (
          <div className="pointer-events-none absolute inset-x-6 top-1/2 z-10">
            <div
              className={`anim-scanline h-px w-full ${accent}`}
              style={{
                background:
                  "linear-gradient(90deg, transparent, currentColor, transparent)",
                boxShadow: "0 0 12px 1px currentColor",
              }}
            />
          </div>
        )}

        {isSuccess && (
          <div className="anim-popin absolute inset-0 z-20 flex items-center justify-center bg-black/20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" aria-hidden>
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
