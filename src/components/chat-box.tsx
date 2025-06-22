
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
import { formatDistanceToNow } from 'date-fns';
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
      layoutId={`chatbox-${chatId}`}
      initial={{ y: 300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="w-80 h-[400px] flex flex-col bg-card border border-primary/30 rounded-t-xl shadow-2xl shadow-black/30"
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
        <div className="p-3 space-y-2">
            {messages.map((msg) => {
                const isOwnMessage = msg.senderId === currentUser?.uid;
                return (
                    <div key={msg.id} className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
                        {!isOwnMessage && (
                             <Avatar className="h-6 w-6 self-start">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback><UserIcon className="h-3 w-3"/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className="group">
                            <div className={cn(
                              "max-w-[75%] rounded-lg px-3 py-2 text-sm break-words", 
                              isOwnMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none"
                            )}>
                                <p>{msg.text}</p>
                            </div>
                             <p className={cn("text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1", isOwnMessage ? "text-right" : "text-left")}>{formatTimeAgo(msg.createdAt)}</p>
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
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
           <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" type="button" className="h-9 w-9 flex-shrink-0 text-slate-400 hover:text-primary">
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
            className="flex-1 bg-input border-border rounded-lg resize-none p-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all max-h-[120px]"
          />
          <Button type="submit" size="icon" className="h-9 w-9 flex-shrink-0 bg-primary hover:bg-primary/90 rounded-lg disabled:bg-slate-700 disabled:opacity-60" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
