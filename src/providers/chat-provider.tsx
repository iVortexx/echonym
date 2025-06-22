
"use client";

import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { User, UserChat } from '@/lib/types';
import { getOrCreateChat } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, orderBy, limit, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface OpenChat {
  user: User;
  chatId: string;
  state: 'open' | 'minimized';
}

interface ChatContextType {
  openChats: Record<string, OpenChat>;
  recentChats: UserChat[];
  isLauncherOpen: boolean;
  openChat: (targetUser: User) => void;
  closeChat: (chatId: string) => void;
  minimizeChat: (chatId: string) => void;
  restoreChat: (chatId: string) => void;
  toggleLauncher: (isOpen?: boolean) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [openChats, setOpenChats] = useState<Record<string, OpenChat>>({});
  const [recentChats, setRecentChats] = useState<UserChat[]>([]);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
        setRecentChats([]);
        return;
    }

    const chatsRef = collection(db, `users/${currentUser.uid}/chats`);
    const q = query(chatsRef, orderBy("updatedAt", "desc"), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const userChats = snapshot.docs.map(doc => {
            const data = doc.data() as UserChat;
            return {
                ...data,
                updatedAt: (data.updatedAt as Timestamp)?.toDate ? (data.updatedAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
            } as UserChat
        });
        setRecentChats(userChats);
    }, (error) => {
        console.error("Error fetching recent chats:", error);
        setRecentChats([]);
    });

    return () => unsubscribe();
  }, [currentUser]);


  const openChat = useCallback(async (targetUser: User) => {
    if (!currentUser) return;

    setIsLauncherOpen(false); // Close the drawer when a chat is opened

    const result = await getOrCreateChat(currentUser.uid, targetUser.uid);

    if (result.chatId) {
      setOpenChats(prev => {
          const newChats: Record<string, OpenChat> = {};
          // Minimize all previous chats
          for (const key in prev) {
              if (prev[key]) {
                newChats[key] = { ...prev[key], state: 'minimized' };
              }
          }
          // Set the new chat as open
          newChats[result.chatId] = { user: targetUser, chatId: result.chatId, state: 'open' };
          return newChats;
      });
    } else {
      console.error("Failed to open chat:", result.error);
    }
  }, [currentUser]);

  const closeChat = useCallback((chatId: string) => {
    setOpenChats(prev => {
        const newChats = { ...prev };
        delete newChats[chatId];
        return newChats;
    });
  }, []);
  
  const minimizeChat = useCallback((chatId: string) => {
    setOpenChats(prev => ({
        ...prev,
        [chatId]: { ...prev[chatId], state: 'minimized' }
    }));
  }, []);

  const restoreChat = useCallback((chatId: string) => {
    setOpenChats(prev => {
        const chatToRestore = prev[chatId];
        if (!chatToRestore) return prev;

        const newChats: Record<string, OpenChat> = {};
        for (const key in prev) {
            if (prev[key]) {
                newChats[key] = { ...prev[key], state: 'minimized' };
            }
        }
        newChats[chatId] = { ...chatToRestore, state: 'open' };
        return newChats;
    });
  }, []);


  const toggleLauncher = useCallback((isOpen?: boolean) => {
    setIsLauncherOpen(prev => isOpen === undefined ? !prev : isOpen);
  }, []);

  return (
    <ChatContext.Provider value={{ openChats, recentChats, isLauncherOpen, openChat, closeChat, minimizeChat, restoreChat, toggleLauncher }}>
      {children}
    </ChatContext.Provider>
  );
};
