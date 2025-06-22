
"use client";

import { useContext } from 'react';
import { ChatContext } from '@/providers/chat-provider';

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
