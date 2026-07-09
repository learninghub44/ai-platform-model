"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API's SpeechRecognition isn't in the standard lib.dom types
// yet, and ships prefixed in Chrome/Safari — so this stays loosely typed
// rather than pulling in a whole ambient-types package for one interface.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

interface UseSpeechRecognitionOptions {
  /** Called with the finalized transcript chunk each time speech pauses. */
  onFinalResult: (text: string) => void;
  lang?: string;
}

/**
 * Thin wrapper around the browser's native SpeechRecognition. Runs entirely
 * client-side — no audio ever leaves the device for this feature, since the
 * browser's built-in recognizer does the transcription.
 */
export function useSpeechRecognition({ onFinalResult, lang = "en-US" }: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice input isn't supported in this browser — try Chrome, Edge, or Safari.");
      return;
    }

    setError(null);
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          onFinalResultRef.current(text);
        } else {
          interim += text;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      const code = event?.error;
      if (code === "not-allowed" || code === "permission-denied") {
        setError("Microphone access was denied — allow it in your browser settings to use voice input.");
      } else if (code === "no-speech") {
        // Not really an error the user needs to see; recognition just idles.
      } else {
        setError("Voice input hit a problem — please try again.");
      }
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [lang]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const toggle = useCallback(() => {
    if (recording) stop();
    else start();
  }, [recording, start, stop]);

  return { isSupported, recording, interimTranscript, error, start, stop, toggle };
}
