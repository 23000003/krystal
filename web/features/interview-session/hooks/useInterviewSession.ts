"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GENERIC_AUDIO,
  INTRO_DELAY_MS,
  READY_KEYWORD,
  WS_URL,
} from "@/config/constants";
import { toastr } from "@/features/shared/lib/toastr";
import { base64AudioToUrl, blobToWavBase64 } from "@/features/shared/lib/wav";
import type {
  ClientMessage,
  ServerMessage,
} from "@/features/shared/types/interview-socket";

/**
 * Real microphone state, read from the browser rather than a local toggle.
 * `muted` is the OS/hardware mute the browser reports on the track itself.
 */
export type MicState = "idle" | "live" | "muted" | "blocked";

export type InterviewPhase =
  | "connecting"
  | "starting"
  | "introduction"
  | "awaiting_ready"
  | "beginning"
  | "waiting"
  | "question"
  | "answering"
  | "sending"
  | "finishing"
  | "conclusion"
  | "ended"
  | "failed";

type PendingQuestion = {
  questionId: string;
  index: number;
  total: number;
  question: string;
  topic: string;
  audio: string | null;
  audioMimeType: string | null;
};

/** Minimal shape of the vendor-prefixed SpeechRecognition API. */
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useInterviewSession(sessionId: string) {
  const router = useRouter();

  const [phase, setPhase] = useState<InterviewPhase>("connecting");
  const [current, setCurrent] = useState<PendingQuestion | null>(null);
  /** Questions the candidate has finished answering — not transcripts received. */
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  /** Answers whose transcription is still running in the background. */
  const [savingCount, setSavingCount] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Detaches the track listeners for whichever stream is currently open. */
  const micWatchRef = useRef<(() => void) | null>(null);
  /** Questions received from the server, in arrival order. */
  const queueRef = useRef<PendingQuestion[]>([]);
  const playedRef = useRef(0);
  /** The current question's object URL, kept so a replay reuses it. */
  const currentAudioUrlRef = useRef<string | null>(null);
  /** Answers submitted, which is what decides when the interview is over. */
  const submittedRef = useRef(0);
  const totalRef = useRef(0);
  const objectUrlsRef = useRef<string[]>([]);
  /**
   * The element the speaking ring is drawn on. The analyser writes its
   * transform directly, 60 times a second — going through React state here
   * would re-render the whole room on every frame.
   */
  const speakingRingRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef(0);
  /** Mirrors `phase` so the long-lived socket closure never reads a stale one. */
  const phaseRef = useRef<InterviewPhase>("connecting");

  const setPhaseSafely = useCallback((next: InterviewPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  /** Plays a URL to completion. Resolves even on error so the flow never stalls. */
  /**
   * Routes the audio element through an AnalyserNode so the ring can follow the
   * real waveform. Only connects once the context is actually running — a
   * suspended context in the chain would silence playback entirely, which is
   * far worse than having no visualiser.
   */
  const ensureAnalyser = useCallback(async (audio: HTMLAudioElement) => {
    if (analyserRef.current) return analyserRef.current;

    try {
      const context =
        audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;

      if (context.state === "suspended") await context.resume();
      if (context.state !== "running") return null;

      // `createMediaElementSource` may only be called once per element.
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(context.destination);
      analyserRef.current = analyser;
      return analyser;
    } catch {
      return null;
    }
  }, []);

  const stopLevelLoop = useCallback(() => {
    cancelAnimationFrame(levelFrameRef.current);
    levelFrameRef.current = 0;
    if (speakingRingRef.current) {
      speakingRingRef.current.style.transform = "scale(1)";
    }
  }, []);

  const startLevelLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || levelFrameRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const samples = new Uint8Array(analyser.frequencyBinCount);
    let smoothed = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(samples);

      // RMS of the waveform around the 128 midpoint.
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        const deviation = (samples[i] - 128) / 128;
        sum += deviation * deviation;
      }
      const level = Math.min(Math.sqrt(sum / samples.length) * 3, 1);

      // Ease toward the target so the ring breathes instead of jittering.
      smoothed += (level - smoothed) * 0.25;

      if (speakingRingRef.current) {
        speakingRingRef.current.style.transform = `scale(${1 + smoothed * 0.22})`;
      }
      levelFrameRef.current = requestAnimationFrame(tick);
    };

    levelFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const play = useCallback(
    (src: string) => {
      return new Promise<void>((resolve) => {
        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = src;

        const finish = () => {
          stopLevelLoop();
          resolve();
        };
        audio.onended = finish;
        audio.onerror = finish;

        audio
          .play()
          .then(async () => {
            await ensureAnalyser(audio);
            startLevelLoop();
          })
          .catch(() => {
            // Autoplay blocked because there has been no user gesture yet.
            setNeedsGesture(true);
            resolve();
          });
      });
    },
    [ensureAnalyser, startLevelLoop, stopLevelLoop],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;

      // The track is the source of truth: `muted` flips when the OS, the
      // browser, or a hardware key cuts the input, none of which we control.
      const track = stream.getAudioTracks()[0];
      if (track) {
        const sync = () =>
          setMicState(track.muted || !track.enabled ? "muted" : "live");
        track.addEventListener("mute", sync);
        track.addEventListener("unmute", sync);
        track.addEventListener("ended", sync);
        micWatchRef.current = () => {
          track.removeEventListener("mute", sync);
          track.removeEventListener("unmute", sync);
          track.removeEventListener("ended", sync);
        };
        sync();
      }
    } catch {
      setMicState("blocked");
      toastr.error("We need microphone access to record your answer.");
      setPhaseSafely("failed");
    }
  }, [setPhaseSafely]);

  const playNextQuestion = useCallback(async () => {
    const next = queueRef.current[playedRef.current];
    if (!next) {
      setPhaseSafely("waiting");
      return;
    }

    playedRef.current += 1;
    setCurrent(next);
    setPhaseSafely("question");

    if (next.audio) {
      const url = base64AudioToUrl(next.audio, next.audioMimeType);
      objectUrlsRef.current.push(url);
      currentAudioUrlRef.current = url;
      await play(url);
    } else {
      currentAudioUrlRef.current = null;
      toastr.warning("Audio unavailable for this question, showing the text.");
    }

    // The mic opens the moment the question finishes and stays open until Done.
    await startRecording();
    setPhaseSafely("answering");
  }, [play, setPhaseSafely, startRecording]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;

    micWatchRef.current?.();
    micWatchRef.current = null;
    for (const track of recorder.stream.getTracks()) track.stop();
    recorderRef.current = null;
    setMicState("idle");

    return new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
  }, []);

  /**
   * "Done Answering": stop, convert, send — then move straight on. The server
   * transcribes in the background, so the next question starts immediately.
   */
  const finishAnswer = useCallback(async () => {
    if (phaseRef.current !== "answering" || !current) return;
    setPhaseSafely("sending");

    const blob = await stopRecording();
    if (!blob || blob.size === 0) {
      toastr.error("We did not catch any audio. Try answering again.");
      setPhaseSafely("answering");
      return;
    }

    let audio: string;
    try {
      audio = await blobToWavBase64(blob);
    } catch {
      toastr.error("We could not process that recording. Try again.");
      setPhaseSafely("answering");
      return;
    }

    send({ type: "audio:answer", questionId: current.questionId, audio });
    submittedRef.current += 1;
    setCompleted(submittedRef.current);
    setSavingCount((count) => count + 1);

    if (submittedRef.current >= totalRef.current) {
      // Nothing left to ask; the server will end the session once the
      // outstanding transcriptions land.
      setPhaseSafely("finishing");
      return;
    }

    await playNextQuestion();
  }, [current, playNextQuestion, send, setPhaseSafely, stopRecording]);

  /**
   * Plays the current question again. Recording is paused for the duration so
   * Krystal's own voice never lands in the candidate's answer.
   */
  const repeatQuestion = useCallback(async () => {
    const url = currentAudioUrlRef.current;
    if (phaseRef.current !== "answering" || !url) return;

    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.pause();
    setMicState("idle");
    setPhaseSafely("question");

    await play(url);

    if (recorderRef.current?.state === "paused") recorderRef.current.resume();
    setMicState("live");
    setPhaseSafely("answering");
  }, [play, setPhaseSafely]);

  const beginQuestions = useCallback(async () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setPhaseSafely("beginning");
    await play(GENERIC_AUDIO.begin);
    await playNextQuestion();
  }, [play, playNextQuestion, setPhaseSafely]);

  const listenForReady = useCallback(() => {
    setPhaseSafely("awaiting_ready");

    const Recognition = getSpeechRecognition();
    if (!Recognition) return; // The explicit button is the fallback.

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript?.toLowerCase() ?? "";
        if (transcript.includes(READY_KEYWORD)) {
          void beginQuestions();
          return;
        }
      }
    };
    recognition.onerror = () => {};
    recognition.onend = () => {};

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Already running or blocked; the button still works.
    }
  }, [beginQuestions, setPhaseSafely]);

  useEffect(() => {
    if (!sessionId || sessionId === "placeholder") return;

    // React StrictMode runs this effect twice in dev: mount, cleanup, mount.
    // The cleanup closes socket #1 mid-handshake, which fires an `error` event
    // on a connection nobody is waiting for. Without this flag that surfaces as
    // a bogus "lost connection" while socket #2 is working fine.
    let disposed = false;
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => send({ type: "session:start", sessionId });

    socket.onmessage = async (event) => {
      if (disposed) return;
      const message = JSON.parse(event.data as string) as ServerMessage;

      switch (message.type) {
        case "session:ready": {
          totalRef.current = message.questions.length;
          submittedRef.current = message.answered.length;
          setTotal(message.questions.length);
          setCompleted(message.answered.length);

          // A beat before Krystal starts talking, so the candidate can settle.
          setPhaseSafely("starting");
          await wait(INTRO_DELAY_MS);
          if (disposed) return;

          setPhaseSafely("introduction");
          await play(GENERIC_AUDIO.introduction);
          listenForReady();
          return;
        }

        case "audio:question": {
          queueRef.current.push(message);
          totalRef.current = message.total;
          setTotal(message.total);
          // Receipt is what paces the next server batch.
          send({ type: "audio:ack", questionId: message.questionId });
          // If the flow stalled waiting for this one, start it now.
          if (
            phaseRef.current === "waiting" &&
            queueRef.current.length - 1 === playedRef.current
          ) {
            await playNextQuestion();
          }
          return;
        }

        case "transcript:save": {
          // Playback moved on long ago; this only closes out the saving count.
          setSavingCount((count) => Math.max(0, count - 1));
          return;
        }

        case "session:end": {
          setPhaseSafely("conclusion");
          await play(GENERIC_AUDIO.conclusion);
          setPhaseSafely("ended");
          router.push(
            "/interview-session?id=" + encodeURIComponent(sessionId) + "&result=true",
          );
          return;
        }

        case "error": {
          toastr.error(message.message);
          if (message.code === "session_not_found") setPhaseSafely("failed");
          return;
        }
      }
    };

    socket.onerror = () => {
      if (disposed) return;
      toastr.error("Lost connection to the interview server.");
      setPhaseSafely("failed");
    };

    socket.onclose = (event) => {
      // A clean close is either our own teardown or a finished interview.
      if (disposed || event.wasClean || phaseRef.current === "ended") return;
      toastr.error("The interview server closed the connection.");
      setPhaseSafely("failed");
    };

    const urls = objectUrlsRef.current;
    return () => {
      disposed = true;
      socket.close();
      socketRef.current = null;
      recognitionRef.current?.stop();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      cancelAnimationFrame(levelFrameRef.current);
      void audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.length = 0;
    };
    // One socket per session: adding the callbacks here would reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // A permission revoked in site settings should show immediately, not at the
  // next recording attempt. Not all browsers expose the microphone descriptor.
  useEffect(() => {
    let detach: (() => void) | null = null;
    let cancelled = false;

    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        const sync = () => {
          if (status.state === "denied") setMicState("blocked");
          else setMicState((current) => (current === "blocked" ? "idle" : current));
        };
        status.addEventListener("change", sync);
        detach = () => status.removeEventListener("change", sync);
        sync();
      })
      .catch(() => {
        // Firefox and Safari reject the microphone descriptor; the getUserMedia
        // failure path still reports "blocked".
      });

    return () => {
      cancelled = true;
      detach?.();
    };
  }, []);

  /** Escape hatch when speech recognition is unavailable or mishears. */
  const confirmReady = useCallback(() => {
    if (phaseRef.current === "awaiting_ready") void beginQuestions();
  }, [beginQuestions]);

  /** Retries playback after a gesture, when autoplay was blocked. */
  const resumeAudio = useCallback(() => {
    setNeedsGesture(false);
    void audioContextRef.current?.resume().catch(() => {});
    void audioRef.current?.play().catch(() => setNeedsGesture(true));
  }, []);

  return {
    phase,
    current,
    completed,
    speakingRingRef,
    total,
    savingCount,
    micState,
    needsGesture,
    confirmReady,
    repeatQuestion,
    /** False while nothing is playable — no question yet, or TTS failed. */
    canRepeat: phase === "answering" && Boolean(current?.audio),
    finishAnswer,
    resumeAudio,
    speechSupported: Boolean(getSpeechRecognition()),
  };
}
