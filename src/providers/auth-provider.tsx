"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { type User } from '@/lib/types';
import { generateAnonName } from '@/lib/name-generator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { buildAvatarUrl } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setError(null);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUser({ ...userDoc.data(), uid: fbUser.uid } as User);
        } else {
          const newAnonName = generateAnonName();
          const avatarOptions = { seed: newAnonName };
          const avatarUrl = buildAvatarUrl(avatarOptions);
          
          const newUser: User = {
            uid: fbUser.uid,
            anonName: newAnonName,
            xp: 0,
            createdAt: serverTimestamp() as any,
            postCount: 0,
            commentCount: 0,
            totalUpvotes: 0,
            totalDownvotes: 0,
            avatarUrl,
            avatarOptions,
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
        }
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (e: any) {
          console.error("Firebase Anonymous Sign-in Error:", e);
          if (e.code === 'auth/configuration-not-found') {
            setError(
              'Could not sign in. Please ensure Anonymous Authentication is enabled in your Firebase project settings (Authentication > Sign-in method).'
            );
          } else {
            setError(`An unexpected error occurred during authentication: ${e.message}`);
          }
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4 text-center p-8 max-w-md mx-auto bg-card border border-destructive/50 rounded-2xl shadow-lg">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold font-headline text-destructive">Authentication Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-3xl font-bold font-headline text-primary">WhisperNet</h1>
          <p className="text-muted-foreground">Initializing anonymous session...</p>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
