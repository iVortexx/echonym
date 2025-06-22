
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Send, UserIcon, Loader2, Smile } from 'lucide-react';
import { useChat, type OpenChat } from '@/hooks/use-chat';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, type Timestamp } from 'firebase/firestore';
import { sendMessage, setTypingStatus, clearChatUnread } from '@/lib/actions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ChatMessage, TypingStatus } from '@/lib/types';
import { debounce } from 'lodash';
import TextareaAutosize from 'react-textarea-autosize';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';


interface ChatBoxProps {
  chat: OpenChat;
}

export function ChatBox({ chat }: ChatBoxProps) {
  const { closeChat, minimizeChat } = useChat();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const { user, chatId } = chat;

  useEffect(() => {
    if (currentUser) {
      clearChatUnread(currentUser.uid, chatId);
    }
  }, [chatId, currentUser]);


  // --- Typing Indicator Logic ---
  const debouncedSetTypingFalse = useCallback(
    debounce(() => {
      if (currentUser) {
        setTypingStatus(chatId, currentUser.uid, false);
      }
    }, 2000), [chatId, currentUser?.uid]
  );
  
  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (currentUser) {
        setTypingStatus(chatId, currentUser.uid, true);
        debouncedSetTypingFalse();
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    const otherUserId = user.uid;
    const typingRef = doc(db, `chats/${chatId}/typing/${otherUserId}`);
    const unsubscribe = onSnapshot(typingRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as TypingStatus;
            setIsOtherUserTyping(data.isTyping);
        } else {
            setIsOtherUserTyping(false);
        }
    });
    return () => unsubscribe();
  }, [chatId, currentUser, user.uid]);
  // --- End Typing Indicator Logic ---


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

  // This effect now correctly handles scrolling to the bottom
  const scrollToBottom = useCallback(() => {
     const scrollDiv = scrollAreaRef.current;
     if (scrollDiv) {
        scrollDiv.scrollTo({ top: scrollDiv.scrollHeight, behavior: 'smooth' });
     }
  }, []);

  useEffect(() => {
    const scrollDiv = scrollAreaRef.current;
    if (scrollDiv && !userHasScrolled) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, userHasScrolled, scrollToBottom]);

  const handleManualScroll = useCallback(() => {
    const scrollDiv = scrollAreaRef.current;
    if (!scrollDiv) return;
    // A little buffer is added to the check
    const isAtBottom = scrollDiv.scrollHeight - scrollDiv.scrollTop <= scrollDiv.clientHeight + 5;
    setUserHasScrolled(!isAtBottom);
  }, []);

  useEffect(() => {
    const scrollDiv = scrollAreaRef.current;
    if (scrollDiv) {
      scrollDiv.addEventListener('scroll', handleManualScroll);
      return () => scrollDiv.removeEventListener('scroll', handleManualScroll);
    }
  }, [handleManualScroll]);


  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    // Always scroll to bottom after sending a message
    setUserHasScrolled(false);
    
    const textToSend = newMessage;
    setNewMessage("");

    await sendMessage(chatId, currentUser.uid, textToSend);
    debouncedSetTypingFalse.cancel();
    if (currentUser) {
      setTypingStatus(chatId, currentUser.uid, false);
    }
    setTimeout(() => scrollToBottom(), 0);
  };

  const handleEmojiSelect = (emoji: { emoji: string }) => {
    setNewMessage(prev => prev + emoji.emoji);
    setEmojiPickerOpen(false);
  };

  return (
    <motion.div
      layoutId={`chatbox-${chatId}`}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-80 h-[400px] flex flex-col bg-card border-2 border-primary/50 rounded-xl shadow-2xl shadow-primary/20"
    >
      <header className="flex items-center justify-between p-2 pl-3 border-b border-primary/20 cursor-pointer">
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
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => minimizeChat(chatId)}>
                <Minus className="h-4 w-4" />
            </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => closeChat(chatId)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 bg-card/50" viewportRef={scrollAreaRef}>
        <div className="p-3 space-y-0.5">
            {messages.map((msg, i) => {
                const isOwnMessage = msg.senderId === currentUser?.uid;

                // --- Grouping Logic ---
                const prevMessage = messages[i - 1];
                let messageDate: Date;
                try {
                    const ts = msg.createdAt;
                    if (ts && typeof (ts as any).toDate === 'function') {
                        messageDate = (ts as any).toDate();
                    } else {
                        messageDate = new Date(ts as string);
                    }
                    if (isNaN(messageDate.getTime())) throw new Error('Invalid date');
                } catch (e) {
                    messageDate = new Date(); // Fallback
                }

                let prevMessageDate: Date | null = null;
                if (prevMessage) {
                    try {
                        const prevTs = prevMessage.createdAt;
                        if (prevTs && typeof (prevTs as any).toDate === 'function') {
                           prevMessageDate = (prevTs as any).toDate();
                        } else {
                           prevMessageDate = new Date(prevTs as string);
                        }
                        if (isNaN(prevMessageDate.getTime())) prevMessageDate = null;
                    } catch {
                        prevMessageDate = null;
                    }
                }
                
                const showHeader = !prevMessage || 
                                   msg.senderId !== prevMessage.senderId || 
                                   (prevMessageDate && (messageDate.getTime() - prevMessageDate.getTime() > 5 * 60 * 1000));
                // --- End Grouping Logic ---

                return (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex w-full gap-2",
                            isOwnMessage ? "justify-end" : "justify-start",
                            showHeader ? "mt-4" : "mt-1"
                        )}
                    >
                        {/* Avatar for received messages */}
                        {!isOwnMessage && (
                            <div className="w-8 flex-shrink-0 self-end">
                                {showHeader && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatarUrl} />
                                        <AvatarFallback>
                                            <UserIcon className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        )}
                        
                        {/* Message Content */}
                        <div className={cn("max-w-[75%]")}>
                            {showHeader && (
                                <div className={cn(
                                    "flex items-baseline gap-2 mb-1",
                                    isOwnMessage && "justify-end"
                                )}>
                                    <span className="font-bold text-slate-100 text-sm">
                                        {isOwnMessage ? "You" : user.anonName}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {format(messageDate, "p")}
                                    </span>
                                </div>
                            )}
                            <div
                                className={cn(
                                    "p-2 px-3 rounded-2xl text-sm text-foreground break-words",
                                    isOwnMessage
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </ScrollArea>
       <div className="h-5 px-4 text-xs text-slate-400 flex items-center">
        {isOtherUserTyping && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Typing...</span>
            </motion.div>
        )}
      </div>
      <div className="p-2 border-t border-primary/20">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 p-1.5 bg-input rounded-xl border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
           <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" type="button" className="h-8 w-8 flex-shrink-0 text-slate-400 hover:text-primary rounded-full">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 mb-2 bg-popover border-border rounded-lg" side="top" align="start">
                <EmojiPicker 
                    onEmojiClick={handleEmojiSelect}
                    emojiStyle={EmojiStyle.NATIVE}
                    theme="dark"
                    searchDisabled
                    skinTonesDisabled
                    lazyLoadEmojis
                    height={300}
                    categories={['smileys_people', 'animals_nature', 'food_drink', 'objects', 'symbols']}
                    previewConfig={{ showPreview: false }}
                />
              </PopoverContent>
            </Popover>
          <TextareaAutosize
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Send a message..."
            rows={1}
            className="flex-1 bg-transparent border-none resize-none p-1 text-sm focus:ring-0 focus:outline-none transition-all max-h-[120px]"
          />
          <Button type="submit" size="icon" className="h-8 w-8 flex-shrink-0 bg-primary hover:bg-primary/90 rounded-full disabled:bg-slate-700 disabled:opacity-60" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
