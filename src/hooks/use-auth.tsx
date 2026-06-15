// React auth context backed by Firebase Auth.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signOut as fbSignOut } from "@/lib/auth-service";
import { getUserProfile, upsertUserProfile, type UserProfile } from "@/lib/firestore-service";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (data: UserProfile) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid).catch(() => null);
        setProfile(p);
        // Bootstrap a profile document on first sign-in.
        if (!p) {
          const seed: UserProfile = {
            displayName: u.displayName ?? undefined,
            phoneNumber: u.phoneNumber ?? undefined,
            email: u.email ?? undefined,
            photoURL: u.photoURL ?? undefined,
          };
          await upsertUserProfile(u.uid, seed).catch(() => {});
          setProfile(seed);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      refreshProfile: async () => {
        if (!user) return;
        setProfile(await getUserProfile(user.uid).catch(() => null));
      },
      saveProfile: async (data: UserProfile) => {
        if (!user) return;
        await upsertUserProfile(user.uid, data);
        setProfile((prev) => ({ ...prev, ...data }));
      },
      signOut: async () => {
        await fbSignOut();
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
