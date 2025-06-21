
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
  updateUser: (updatedData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  updateUser: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateUser = (updatedData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...updatedData } : null);
  };

  useEffect(() => {
    let unsubscribeUser: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      // Clean up previous user listener if auth state changes
      unsubscribeUser(); 

      setError(null);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);

        // Set up a real-time listener for the user document
        unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            setUser({ ...userDoc.data(), uid: fbUser.uid } as User);
            setLoading(false);
          } else {
            // User is authenticated but doesn't have a doc yet -> new user
            try {
              const newAnonName = generateAnonName();
              const avatarOptions = { seed: newAnonName };
              const avatarUrl = buildAvatarUrl(avatarOptions);
              
              const newUser: User = {
                uid: fbUser.uid,
                anonName: newAnonName,
                xp: 0,
                createdAt: serverTimestamp() as any, // This will be converted on write
                postCount: 0,
                commentCount: 0,
                followersCount: 0,
                followingCount: 0,
                avatarUrl,
                avatarOptions,
                savedPosts: [],
                hiddenPosts: [],
              };
              // This write will trigger the onSnapshot listener again, which will then set the user state.
              await setDoc(userDocRef, newUser);
            } catch (e: any) {
               console.error("Error creating user document:", e);
               setError("Failed to initialize user profile.");
               setLoading(false);
            }
          }
        }, (error) => {
            console.error("Firestore user listener error:", error);
            setError("Failed to sync user profile.");
            setLoading(false);
        });
      } else {
        // No user, attempt anonymous sign-in
        try {
          await signInAnonymously(auth);
          // The onAuthStateChanged listener will handle the new user state
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

    return () => {
      unsubscribeAuth();
      unsubscribeUser();
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4 text-center p-8 max-w-md mx-auto bg-card border border-destructive/50 rounded-2xl shadow-lg">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-3xl font-bold font-mono bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">WhisperNet</h1>
          <p className="text-muted-foreground">Initializing anonymous session...</p>
          <Skeleton className="h-4 w-48 bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
