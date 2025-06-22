
"use client";

import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { User, Chat } from '@/lib/types';
import { getOrCreateChat, getUsersByIds } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface OpenChat {
  user: User;
  chatId: string;
  state: 'open' | 'minimized';
}

interface ChatContextType {
  openChats: Record<string, OpenChat>;
  recentChats: Chat[];
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
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
        setRecentChats([]);
        return;
    }

    const chatsRef = collection(db, "chats");
    const q = query(
        chatsRef,
        where("users", "array-contains", currentUser.uid),
        orderBy("updatedAt", "desc"),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        const chats = snapshot.docs.map(doc => doc.data() as Chat);
        const otherUserIds = chats.map(c => c.users.find(uid => uid !== currentUser.uid)).filter(Boolean) as string[];
        
        if (otherUserIds.length > 0) {
            const otherUsers = await getUsersByIds(otherUserIds);
            const usersMap = new Map(otherUsers.map(u => [u.uid, u]));

            const chatsWithUsers = chats.map(chat => {
                const otherUserId = chat.users.find(uid => uid !== currentUser.uid);
                return {
                    ...chat,
                    otherUser: otherUserId ? usersMap.get(otherUserId) : undefined,
                };
            });
            setRecentChats(chatsWithUsers);
        } else {
            setRecentChats([]);
        }
    });

    return () => unsubscribe();
  }, [currentUser]);


  const openChat = useCallback(async (targetUser: User) => {
    if (!currentUser) return;
    
    // Minimize any currently open chat
    setOpenChats(prev => {
        const newChats: Record<string, OpenChat> = {};
        for (const key in prev) {
            newChats[key] = { ...prev[key], state: 'minimized' };
        }
        return newChats;
    });

    const result = await getOrCreateChat(currentUser.uid, targetUser.uid);

    if (result.chatId) {
      setOpenChats(prev => ({
          ...prev,
          [result.chatId!]: { user: targetUser, chatId: result.chatId!, state: 'open' }
      }));
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
    const chatToRestore = openChats[chatId];
    if (chatToRestore) {
        openChat(chatToRestore.user);
    }
  }, [openChats, openChat]);

  const toggleLauncher = useCallback((isOpen?: boolean) => {
    setIsLauncherOpen(prev => isOpen === undefined ? !prev : isOpen);
  }, []);

  return (
    <ChatContext.Provider value={{ openChats, recentChats, isLauncherOpen, openChat, closeChat, minimizeChat, restoreChat, toggleLauncher }}>
      {children}
    </ChatContext.Provider>
  );
};
