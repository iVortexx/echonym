
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
  openedAt: number; // For tracking the oldest chat to remove
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
    if (!result.chatId) {
        console.error("Failed to open chat:", result.error);
        return;
    }

    const { chatId } = result;

    setOpenChats(prev => {
        // If the chat is already open, do nothing.
        if (prev[chatId]?.state === 'open') {
            return prev;
        }

        // Minimize all existing chats
        const minimizedChats: Record<string, OpenChat> = {};
        for (const key in prev) {
            if (prev[key]) {
                minimizedChats[key] = { ...prev[key], state: 'minimized' };
            }
        }

        // Check if the chat to open is new or just minimized
        const isNewChat = !minimizedChats[chatId];
        
        let finalChats = { ...minimizedChats };

        if (isNewChat) {
            // Enforce a limit of 5 chats for NEW chats only
            const CHAT_LIMIT = 5;
            const chatKeys = Object.keys(finalChats);
            if (chatKeys.length >= CHAT_LIMIT) {
                // Find and remove the oldest chat
                const oldestChatId = chatKeys.reduce((oldest, key) => 
                    (!oldest || finalChats[key].openedAt < finalChats[oldest].openedAt) ? key : oldest, 
                    null as string | null
                );
                if (oldestChatId) {
                    delete finalChats[oldestChatId];
                }
            }
            // Add the new chat
            finalChats[chatId] = { 
                user: targetUser, 
                chatId: chatId, 
                state: 'open',
                openedAt: Date.now() 
            };
        } else {
            // Restore the minimized chat and set it to open
            finalChats[chatId] = { ...finalChats[chatId], state: 'open', openedAt: Date.now() };
        }

        return finalChats;
    });
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
        newChats[chatId] = { ...chatToRestore, state: 'open', openedAt: Date.now() };
        return newChats;
    });
  }, []);


  const toggleLauncher = useCallback((isOpen?: boolean) => {
    const willBeOpen = isOpen === undefined ? !isLauncherOpen : isOpen;
    if (willBeOpen) {
      // If the launcher is being opened, find and close any currently 'open' chat window.
      // Minimized chats will remain.
      setOpenChats(prev => {
        const currentlyOpenChatId = Object.keys(prev).find(id => prev[id].state === 'open');
        if (currentlyOpenChatId) {
          const newChats = { ...prev };
          delete newChats[currentlyOpenChatId];
          return newChats;
        }
        return prev;
      });
    }
    setIsLauncherOpen(willBeOpen);
  }, [isLauncherOpen]);

  return (
    <ChatContext.Provider value={{ openChats, recentChats, isLauncherOpen, openChat, closeChat, minimizeChat, restoreChat, toggleLauncher }}>
      {children}
    </ChatContext.Provider>
  );
};
