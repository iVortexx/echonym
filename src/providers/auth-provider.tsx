
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { type User } from '@/lib/types';
import { generateAnonName } from '@/lib/name-generator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Copy } from 'lucide-react';
import { buildAvatarUrl } from '@/lib/utils';
import { findUserByRecoveryId } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const RECOVERY_ID_KEY = 'whispernet_recovery_id';

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
  const { toast, dismiss } = useToast();

  const updateUser = (updatedData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...updatedData } : null);
  };
  
  const showBackupToast = useCallback((recoveryId: string) => {
      const toastId = 'backup-toast';
      toast({
        id: toastId,
        title: '⚠️ Backup Your Account!',
        description: 'Save your Recovery ID to prevent permanent loss.',
        duration: Infinity, // This toast should be persistent
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(recoveryId);
              dismiss(toastId);
              toast({ title: '✅ Recovery ID Copied!' });
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        ),
      });
  }, [toast, dismiss]);

  useEffect(() => {
    let unsubscribeUser: () => void = () => {};

    const handleUserSession = async (fbUser: FirebaseUser | null) => {
        if (!fbUser) {
            try {
                // If there's no fbUser, sign in anonymously. The listener will run again.
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
            // Priority 1: User has a recovery ID in localStorage.
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
                // The saved ID is invalid, clear it and proceed as a new session.
                localStorage.removeItem(RECOVERY_ID_KEY);
            }
        }
        
        // Priority 2: No valid recovery ID. Use Firebase UID to find or create the user.
        const userDocRef = doc(db, 'users', fbUser.uid);
        unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
            if (userDoc.exists()) {
                const existingUser = { ...userDoc.data(), uid: userDoc.id } as User;
                setUser(existingUser);
                // Sync localStorage with the correct recovery ID from DB.
                localStorage.setItem(RECOVERY_ID_KEY, existingUser.recoveryId);
            } else {
                // This is a brand-new anonymous user. Create their profile.
                try {
                    const newAnonName = generateAnonName();
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
                    await setDoc(userDocRef, newUser);
                    // The onSnapshot will fire again with the new user data.
                    localStorage.setItem(RECOVERY_ID_KEY, newRecoveryId);
                    showBackupToast(newRecoveryId);
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
  }, [showBackupToast]);

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
