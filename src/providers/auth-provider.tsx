
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, onSnapshot, writeBatch, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { type User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { buildAvatarUrl } from '@/lib/utils';
import { findUserByRecoveryId, getUserByAnonName } from '@/lib/actions';

const RECOVERY_ID_KEY = 'echonym_recovery_id';

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

async function generateUniqueAnonName(): Promise<string> {
    for (let i = 0; i < 10; i++) { // Max 10 retries
        try {
            const response = await fetch('https://randomuser.me/api/?inc=login');
            if (!response.ok) {
                console.error('Failed to fetch username from randomuser.me, status:', response.status);
                continue; // try again
            }
            const data = await response.json();
            if (!data.results || data.results.length === 0) {
                 console.error('Invalid data from randomuser.me');
                 continue; // try again
            }
            const rawUsername = data.results[0].login.username;
            const username = rawUsername.charAt(0).toUpperCase() + rawUsername.slice(1);
            
            const existingUser = await getUserByAnonName(username);
            if (!existingUser) {
                return username; // Unique name found
            }
        } catch (error) {
            console.error("Error generating unique username:", error);
            // Wait a bit before retrying in case of network issues
            await new Promise(res => setTimeout(res, 500));
        }
    }
    throw new Error('Could not generate a unique username after several attempts.');
}


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

    const handleUserSession = async (fbUser: FirebaseUser | null) => {
        if (!fbUser) {
            try {
                await signInAnonymously(auth);
            } catch (e: any) {
                console.error("Firebase Anonymous Sign-in Error:", e);
                setError(`Authentication failed: ${e.message}`);
                setLoading(false);
            }
            return;
        }

        setFirebaseUser(fbUser);
        const savedRecoveryId = localStorage.getItem(RECOVERY_ID_KEY);

        if (savedRecoveryId) {
            const recoveredUser = await findUserByRecoveryId(savedRecoveryId);
            if (recoveredUser) {
                unsubscribeUser = onSnapshot(doc(db, 'users', recoveredUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        setUser({ ...userDoc.data(), uid: userDoc.id } as User);
                    }
                });
                setLoading(false);
                return;
            } else {
                localStorage.removeItem(RECOVERY_ID_KEY);
            }
        }
        
        const userDocRef = doc(db, 'users', fbUser.uid);
        unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
            if (userDoc.exists()) {
                const existingUser = { ...userDoc.data(), uid: userDoc.id } as User;
                setUser(existingUser);
                if (existingUser.recoveryId) {
                  localStorage.setItem(RECOVERY_ID_KEY, existingUser.recoveryId);
                }
            } else {
                try {
                    const newAnonName = await generateUniqueAnonName();
                    const newRecoveryId = crypto.randomUUID();
                    const avatarOptions = { seed: newAnonName };
                    const avatarUrl = buildAvatarUrl(avatarOptions);

                    const newUser: User = {
                        uid: fbUser.uid,
                        anonName: newAnonName,
                        xp: 0,
                        createdAt: serverTimestamp() as any,
                        recoveryId: newRecoveryId,
                        postCount: 0,
                        commentCount: 0,
                        followersCount: 0,
                        followingCount: 0,
                        avatarUrl,
                        avatarOptions,
                        savedPosts: [],
                        hiddenPosts: [],
                    };
                    
                    const batch = writeBatch(db);
                    batch.set(userDocRef, newUser);

                    const notificationRef = doc(collection(db, 'users', fbUser.uid, 'notifications'));
                    batch.set(notificationRef, {
                        type: 'welcome',
                        message: 'Welcome to Echonym! Be sure to back up your Recovery ID from your profile to keep your account safe.',
                        read: false,
                        createdAt: serverTimestamp(),
                    });

                    await batch.commit();
                    localStorage.setItem(RECOVERY_ID_KEY, newRecoveryId);
                } catch (e: any) {
                    console.error("Error creating user document:", e);
                    setError("Failed to initialize user profile.");
                }
            }
            setLoading(false);
        }, (err) => {
            console.error("Firestore user listener error:", err);
            setError("Failed to sync user profile.");
            setLoading(false);
        });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, handleUserSession);

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
          <h1 className="text-3xl font-bold font-mono bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Echonym</h1>
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

    