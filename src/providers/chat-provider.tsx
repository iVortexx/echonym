"use client";

import React, { createContext, useState, ReactNode, useCallback } from 'react';
import type { User } from '@/lib/types';
import { getOrCreateChat } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

interface OpenChat {
  user: User;
  chatId: string;
}

interface ChatContextType {
  openChats: OpenChat[];
  openChat: (targetUser: User) => void;
  closeChat: (chatId: string) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const { user: currentUser } = useAuth();

  const openChat = useCallback(async (targetUser: User) => {
    if (!currentUser) return;
    
    // Check if chat is already open
    const existingChat = openChats.find(c => c.user.uid === targetUser.uid);
    if (existingChat) {
      // Optional: logic to focus the existing chat window
      return;
    }

    // Limit to 3 open chats for UI sanity
    if (openChats.length >= 3) {
      // Replace the oldest chat
      setOpenChats(prev => prev.slice(1));
    }

    const result = await getOrCreateChat(currentUser.uid, targetUser.uid);

    if (result.chatId) {
      setOpenChats(prev => [...prev, { user: targetUser, chatId: result.chatId! }]);
    } else {
      console.error("Failed to open chat:", result.error);
      // Optionally show a toast notification to the user
    }
  }, [currentUser, openChats]);

  const closeChat = useCallback((chatId: string) => {
    setOpenChats(prev => prev.filter(c => c.chatId !== chatId));
  }, []);

  return (
    <ChatContext.Provider value={{ openChats, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
};
