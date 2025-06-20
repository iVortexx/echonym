"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { type User } from '@/lib/types';
import { generateAnonName } from '@/lib/name-generator';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          const newAnonName = generateAnonName();
          const newUser: User = {
            uid: fbUser.uid,
            anonName: newAnonName,
            xp: 0,
            createdAt: serverTimestamp() as any, // Will be converted to Timestamp by server
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
        }
      } else {
        await signInAnonymously(auth);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
