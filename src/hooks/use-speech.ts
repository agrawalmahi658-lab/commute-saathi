// Browser speech hook: speech-to-text (Web Speech API) + text-to-speech.
// Client-only — all browser APIs are accessed lazily inside callbacks/effects.
import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in standard TS lib DOM).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechOptions {
  lang?: string; // BCP-47, e.g. "hi-IN", "en-IN"
}

export function useSpeech({ lang = "hi-IN" }: UseSpeechOptions = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(
    (onFinal?: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      // Cancel any ongoing speech before listening.
      window.speechSynthesis?.cancel();

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;
      finalRef.current = "";
      setTranscript("");

      recognition.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalRef.current += res[0].transcript;
          else interim += res[0].transcript;
        }
        setTranscript(finalRef.current || interim);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => {
        setListening(false);
        const text = finalRef.current.trim();
        if (text && onFinal) onFinal(text);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    },
    [lang],
  );

  const speak = useCallback(
    (text: string, speakLang?: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = speakLang ?? lang;
      utter.rate = 1;
      utter.pitch = 1;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [lang],
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    supported,
    listening,
    transcript,
    speaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
