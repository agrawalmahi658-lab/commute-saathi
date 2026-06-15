// Firebase Authentication helpers — Phone OTP + Google sign-in.
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google via popup.
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Create (once) an invisible reCAPTCHA verifier bound to a DOM container.
 * Phone auth requires this. Call from the browser only.
 */
export function getRecaptchaVerifier(containerId = "recaptcha-container"): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
  return recaptchaVerifier;
}

/**
 * Clear the reCAPTCHA verifier (e.g. on flow reset / error).
 */
export function resetRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

/**
 * Start phone sign-in. `phoneNumber` must be E.164 (e.g. +919876543210).
 * Returns a ConfirmationResult used to confirm the OTP.
 */
export async function startPhoneSignIn(
  phoneNumber: string,
  containerId = "recaptcha-container",
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(containerId);
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

/**
 * Confirm the OTP code received via SMS.
 */
export async function confirmOtp(
  confirmation: ConfirmationResult,
  code: string,
): Promise<User> {
  const result = await confirmation.confirm(code);
  return result.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}
