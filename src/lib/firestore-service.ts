// Firestore data-access helpers for CommuteSaathi collections.
// All user data is namespaced under users/{uid}/... so it is scoped per user.
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
  onSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface WithId {
  id: string;
}

/* ----------------------------- User profile ----------------------------- */

export interface UserProfile {
  displayName?: string;
  phoneNumber?: string;
  email?: string;
  photoURL?: string;
  language?: string;
  userType?: string; // daily-wage, delivery, student, women-commuter
  dailyWage?: number; // Wage Guardian — daily income in INR
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function upsertUserProfile(uid: string, data: UserProfile): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/* --------------------- Generic per-user subcollection -------------------- */

function userCol(uid: string, name: string) {
  return collection(db, "users", uid, name);
}

export async function addItem<T extends object>(
  uid: string,
  name: string,
  data: T,
): Promise<string> {
  const ref = await addDoc(userCol(uid, name), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateItem<T extends object>(
  uid: string,
  name: string,
  id: string,
  data: Partial<T>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid, name, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(uid: string, name: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, name, id));
}

export async function listItems<T>(
  uid: string,
  name: string,
  constraints: QueryConstraint[] = [],
): Promise<(T & WithId)[]> {
  const q = query(userCol(uid, name), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

export function subscribeItems<T>(
  uid: string,
  name: string,
  constraints: QueryConstraint[],
  cb: (items: (T & WithId)[]) => void,
): Unsubscribe {
  const q = query(userCol(uid, name), ...constraints);
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })));
  });
}

/* --------------------------- Domain shortcuts --------------------------- */

export interface RouteRecord {
  from: string;
  to: string;
  mode?: string;
  fare?: number; // INR paid for this trip
  durationMin?: number;
  distanceKm?: number;
  safety?: number; // 0-10 safety score
  saved?: number; // INR saved vs the costly alternative
  savedAt?: unknown;
  createdAt?: unknown;
}

export const RouteHistory = {
  add: (uid: string, r: RouteRecord) => addItem(uid, "routeHistory", r),
  list: (uid: string) =>
    listItems<RouteRecord>(uid, "routeHistory", [orderBy("createdAt", "desc"), fbLimit(50)]),
  subscribe: (uid: string, cb: (r: (RouteRecord & WithId)[]) => void) =>
    subscribeItems<RouteRecord>(uid, "routeHistory", [orderBy("createdAt", "desc")], cb),
};

export const SavedRoutes = {
  add: (uid: string, r: RouteRecord) => addItem(uid, "savedRoutes", r),
  remove: (uid: string, id: string) => deleteItem(uid, "savedRoutes", id),
  list: (uid: string) => listItems<RouteRecord>(uid, "savedRoutes", [orderBy("createdAt", "desc")]),
  subscribe: (uid: string, cb: (r: (RouteRecord & WithId)[]) => void) =>
    subscribeItems<RouteRecord>(uid, "savedRoutes", [orderBy("createdAt", "desc")], cb),
};

export interface SafetyReport {
  type: string;
  location: string;
  description?: string;
  severity?: string;
}

export const SafetyReports = {
  add: (uid: string, r: SafetyReport) => addItem(uid, "safetyReports", r),
  list: (uid: string) =>
    listItems<SafetyReport>(uid, "safetyReports", [orderBy("createdAt", "desc")]),
};

export interface SosContact {
  name: string;
  phone: string;
  relation?: string;
}

export const SosContacts = {
  add: (uid: string, c: SosContact) => addItem(uid, "sosContacts", c),
  remove: (uid: string, id: string) => deleteItem(uid, "sosContacts", id),
  list: (uid: string) => listItems<SosContact>(uid, "sosContacts", []),
};

// Re-export query builders so callers can compose custom queries if needed.
export { where, orderBy, fbLimit as limit };
