// Firebase client initialization.
// The Firebase web config is a *publishable* config — safe to live in client code.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSZs_XfJCJEfkVKcnvVaLoIoIFR3BJcHM",
  authDomain: "commute-saathi.firebaseapp.com",
  projectId: "commute-saathi",
  storageBucket: "commute-saathi.firebasestorage.app",
  messagingSenderId: "910852735069",
  appId: "1:910852735069:web:f04cd7c96b87806cff4db4",
  measurementId: "G-LLHDRHKQQP",
};

// Reuse the existing app instance during HMR / SSR.
export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

// Analytics is browser-only — initialize lazily and never during SSR.
export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  const supported = await isSupported().catch(() => false);
  return supported ? getAnalytics(firebaseApp) : null;
}
