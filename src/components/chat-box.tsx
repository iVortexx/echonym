
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Send, UserIcon } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import type { User, ChatMessage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore';
import { sendMessage } from '@/lib/actions';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatBoxProps {
  user: User;
  chatId: string;
}

export function ChatBox({ user, chatId }: ChatBoxProps) {
  const { closeChat } = useChat();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const textToSend = newMessage;
    setNewMessage("");

    await sendMessage(chatId, currentUser.uid, textToSend);
  };
  
  const formatTimeAgo = (createdAt: any) => {
    if (!createdAt) return "";
    let date: Date;
    if (typeof createdAt === 'string') {
      date = new Date(createdAt);
    } else if (createdAt?.toDate) {
      date = createdAt.toDate();
    } else {
        return "";
    }
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return (
    <motion.div
      layout
      initial={{ y: 300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="w-80 h-[400px] flex flex-col bg-card border-t-2 border-x-2 border-primary rounded-t-lg shadow-2xl"
    >
      <header className="flex items-center justify-between p-2 bg-primary/10 rounded-t-lg cursor-pointer">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.anonName} />
            <AvatarFallback className="bg-secondary text-primary">
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="font-bold text-sm text-slate-100">{user.anonName}</span>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => closeChat(chatId)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-2 bg-card/50" viewportRef={scrollAreaRef}>
        <div className="space-y-4 p-2">
            {messages.map((msg) => {
                const isOwnMessage = msg.senderId === currentUser?.uid;
                return (
                    <div key={msg.id} className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
                        {!isOwnMessage && (
                             <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback><UserIcon className="h-3 w-3"/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-sm break-words", isOwnMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none")}>
                            <p>{msg.text}</p>
                             <p className={cn("text-xs opacity-60 mt-1", isOwnMessage ? "text-right" : "text-left")}>{formatTimeAgo(msg.createdAt)}</p>
                        </div>
                    </div>
                );
            })}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border">
        <form onSubmit={handleSendMessage} className="relative">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Send a message..."
            rows={1}
            className="bg-input border-border resize-none pr-10 min-h-[40px]"
          />
          <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
