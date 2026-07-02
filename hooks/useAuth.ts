"use client";

/**
 * Resolves the current Firebase Auth session plus the matching Firestore
 * `users` profile (which carries the role: superuser | agent).
 */

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

interface AuthState {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthResolved(true);
      if (!user) {
        setProfile(null);
        setProfileResolved(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    setProfileResolved(false);
    return onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setProfileResolved(true);
      },
      (err) => {
        console.error("Profile fetch error:", err);
        setProfileResolved(true);
      }
    );
  }, [firebaseUser?.uid]);

  return {
    firebaseUser,
    profile,
    loading: !authResolved || (!!firebaseUser && !profileResolved),
  };
}
