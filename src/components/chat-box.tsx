
"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Send, UserIcon, Loader2, Smile, Reply } from 'lucide-react';
import { useChat, type OpenChat } from '@/hooks/use-chat';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, type Timestamp, limit, getDocs, where, startAfter, type DocumentSnapshot } from 'firebase/firestore';
import { sendMessage, setTypingStatus, clearChatUnread, toggleMessageReaction } from '@/lib/actions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ChatMessage, TypingStatus } from '@/lib/types';
import { debounce } from 'lodash';
import TextareaAutosize from 'react-textarea-autosize';
import EmojiPicker, { EmojiStyle, type EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import twemoji from 'twemoji';


interface ChatBoxProps {
  chat: OpenChat;
}

const getDateFromTimestamp = (timestamp: Timestamp | string | undefined): Date | null => {
    if (!timestamp) return null;
    try {
        if (typeof (timestamp as any).toDate === 'function') {
            return (timestamp as any).toDate();
        }
        const date = new Date(timestamp as string);
        if (isNaN(date.getTime())) return null;
        return date;
    } catch {
        return null;
    }
};

const MessageActions = ({ onEmojiSelect, onReply }: { onEmojiSelect: (emojiData: EmojiClickData) => void, onReply: () => void }) => {
    return (
        <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border shadow-md">
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary">
                        <Smile className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto bg-popover border-border rounded-lg" side="top" align="center">
                    <EmojiPicker 
                        onEmojiClick={onEmojiSelect}
                        emojiStyle={EmojiStyle.TWITTER}
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
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary" onClick={onReply}>
                <Reply className="h-4 w-4" />
            </Button>
        </div>
    )
}

const MESSAGE_LIMIT = 25;

export function ChatBox({ chat }: ChatBoxProps) {
  const { closeChat, minimizeChat } = useChat();
  const { user: currentUser } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const componentMountedTime = useRef(new Date());

  const { user, chatId } = chat;

  useEffect(() => {
    if (currentUser) {
      clearChatUnread(currentUser.uid, chatId);
    }
  }, [chatId, currentUser]);


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
  
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
     const scrollDiv = viewportRef.current;
     if (scrollDiv) {
        scrollDiv.scrollTo({ top: scrollDiv.scrollHeight, behavior });
     }
  }, []);
  
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    const scrollDiv = viewportRef.current;
    const oldScrollHeight = scrollDiv?.scrollHeight || 0;

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(MESSAGE_LIMIT));

    const snapshot = await getDocs(q);
    const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ChatMessage).reverse();

    if (newMessages.length > 0) {
        setMessages(prev => [...newMessages, ...prev]);
    }
    
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setHasMore(snapshot.docs.length === MESSAGE_LIMIT);
    
    if (scrollDiv) {
        requestAnimationFrame(() => {
            scrollDiv.scrollTop = scrollDiv.scrollHeight - oldScrollHeight;
        });
    }
    
    setIsLoadingMore(false);
  }, [chatId, hasMore, isLoadingMore, lastDoc]);

  // Initial data load
  useEffect(() => {
    if (!chatId) return;
    setIsLoading(true);
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(MESSAGE_LIMIT));

    getDocs(q).then(snapshot => {
        const initialMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ChatMessage).reverse();
        setMessages(initialMessages);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === MESSAGE_LIMIT);
        setIsLoading(false);
        setTimeout(() => scrollToBottom('auto'), 100);
    });
  }, [chatId, scrollToBottom]);

  // Real-time listener for new messages & modifications
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, where('createdAt', '>', componentMountedTime.current));

    const unsubscribe = onSnapshot(q, snapshot => {
        let newMessages: ChatMessage[] = [];
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const newMessage = { id: change.doc.id, ...change.doc.data() } as ChatMessage;
                // Double check it's not already in state
                if (!messages.some(m => m.id === newMessage.id)) {
                    newMessages.push(newMessage);
                }
            }
            if (change.type === 'modified') {
                const updatedMessage = { id: change.doc.id, ...change.doc.data() } as ChatMessage;
                setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
            }
        });

        if (newMessages.length > 0) {
            newMessages.sort((a, b) => getDateFromTimestamp(b.createdAt)!.getTime() - getDateFromTimestamp(a.createdAt)!.getTime());
            setMessages(prev => [...prev, ...newMessages]);
            setUserHasScrolled(false);
        }
    });

    return () => unsubscribe();
  }, [chatId]); // Note: `messages` is removed from deps to prevent re-subscribing on every new message

  useLayoutEffect(() => {
    const scrollDiv = viewportRef.current;
    if (scrollDiv && !userHasScrolled) {
        scrollToBottom('smooth');
    }
  }, [messages, userHasScrolled, scrollToBottom]);

  const handleManualScroll = useCallback(() => {
    const scrollDiv = viewportRef.current;
    if (!scrollDiv) return;
    
    if (scrollDiv.scrollTop === 0 && hasMore && !isLoadingMore) {
        loadMoreMessages();
    }
    
    const isAtBottom = scrollDiv.scrollHeight - scrollDiv.scrollTop <= scrollDiv.clientHeight + 5;
    setUserHasScrolled(!isAtBottom);
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  useEffect(() => {
    const scrollDiv = viewportRef.current;
    scrollDiv?.addEventListener('scroll', handleManualScroll);
    return () => scrollDiv?.removeEventListener('scroll', handleManualScroll);
  }, [handleManualScroll]);


  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    setUserHasScrolled(false);
    
    const textToSend = newMessage;
    setNewMessage("");

    const replyPayload = replyingTo ? {
      messageId: replyingTo.id,
      text: replyingTo.text,
    } : undefined;

    await sendMessage(chatId, currentUser.uid, textToSend, replyPayload);
    setReplyingTo(null);
    debouncedSetTypingFalse.cancel();
    if (currentUser) {
      setTypingStatus(chatId, currentUser.uid, false);
    }
    setTimeout(() => scrollToBottom('smooth'), 0);
  };

  const handleMainEmojiSelect = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setEmojiPickerOpen(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
      if (!currentUser) return;
      await toggleMessageReaction(chatId, messageId, emoji, currentUser.uid);
  }

  const handleSelectReaction = (messageId: string, emojiData: EmojiClickData) => {
      handleReaction(messageId, emojiData.emoji);
  };

  const handleScrollToReply = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(`message-${messageId}`);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        targetElement.classList.add('bg-primary/10', 'transition-colors', 'duration-1000', 'rounded-lg');
        setTimeout(() => {
            targetElement.classList.remove('bg-primary/10', 'transition-colors', 'duration-1000', 'rounded-lg');
        }, 1500);
    }
  };


  return (
    <motion.div
      layoutId={`chatbox-${chatId}`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: "spring", duration: 0.3 }}
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

      <ScrollArea className="flex-1 bg-card/50" viewportRef={viewportRef}>
        <TooltipProvider delayDuration={300}>
            <div className="p-3">
                {isLoadingMore && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                )}
                {isLoading && messages.length === 0 ? (
                     <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isOwnMessage = msg.senderId === currentUser?.uid;
                        const currentDate = getDateFromTimestamp(msg.createdAt);
                        if (!currentDate) return null;

                        const prevMessage = messages[i - 1];
                        const nextMessage = messages[i + 1];

                        const prevDate = getDateFromTimestamp(prevMessage?.createdAt);
                        
                        const timeDiffWithPrev = prevDate && currentDate ? (currentDate.getTime() - prevDate.getTime()) / (1000 * 60) : Infinity;

                        const isFirstInGroup = !prevMessage || msg.senderId !== prevMessage.senderId || timeDiffWithPrev > 5 || !!msg.replyTo;
                        
                        const nextDate = getDateFromTimestamp(nextMessage?.createdAt);
                        const timeDiffWithNext = nextDate && currentDate ? (nextDate.getTime() - currentDate.getTime()) / (1000 * 60) : Infinity;
                        const isLastInGroup = !nextMessage || msg.senderId !== nextMessage.senderId || timeDiffWithNext > 5 || !!nextMessage.replyTo;
                        
                        const showAvatar = !isOwnMessage && isLastInGroup;
                        
                        const twemojiConfig = { folder: 'svg', ext: '.svg', base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/' };
                        
                        const bubbleClasses = cn(
                          "p-2 px-3 text-sm text-foreground relative z-10",
                          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
                          {
                            "rounded-tr-2xl": isOwnMessage,
                            "rounded-tl-2xl": !isOwnMessage,
                            "rounded-br-2xl": isLastInGroup && isOwnMessage,
                            "rounded-bl-2xl": isLastInGroup && !isOwnMessage,
                            "rounded-bl-md": !isLastInGroup && !isOwnMessage,
                            "rounded-br-md": !isLastInGroup && isOwnMessage,
                            "rounded-tl-md": !isFirstInGroup && !isOwnMessage,
                            "rounded-tr-md": !isFirstInGroup && isOwnMessage,
                          }
                        );


                        return (
                            <div key={msg.id} id={`message-${msg.id}`} className="group/row scroll-mt-16 transition-colors duration-500">
                                <div
                                    className={cn(
                                        "flex w-full items-end gap-2",
                                        isOwnMessage ? "justify-end" : "justify-start",
                                        isFirstInGroup ? "mt-4" : "mt-0.5",
                                        msg.replyTo ? ' -mt-2' : ''
                                    )}
                                >
                                    {isOwnMessage && (
                                        <div className="flex-shrink-0 self-center opacity-0 transition-opacity group-hover/row:opacity-100">
                                            <MessageActions
                                                onEmojiSelect={(emojiData) => handleSelectReaction(msg.id, emojiData)}
                                                onReply={() => setReplyingTo(msg)}
                                            />
                                        </div>
                                    )}

                                    {!isOwnMessage && (
                                        <div className="w-8 flex-shrink-0 self-end">
                                            {showAvatar && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.avatarUrl} />
                                                    <AvatarFallback>
                                                        <UserIcon className="h-4 w-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    )}
                                
                                    <div className={cn("max-w-[75%] flex flex-col", isOwnMessage ? "items-end" : "items-start")}>
                                        {msg.replyTo && (
                                            <a 
                                              href={`#message-${msg.replyTo.messageId}`}
                                              onClick={(e) => handleScrollToReply(e, msg.replyTo.messageId)}
                                              className={cn(
                                                  "flex items-center gap-2 max-w-full text-xs text-slate-400 bg-muted/50 rounded-md px-2 py-1 mb-0.5 cursor-pointer hover:bg-muted transition-colors",
                                                  isOwnMessage ? "rounded-br-none" : "rounded-bl-none",
                                                  "relative z-0"
                                              )}
                                            >
                                              <Reply className="h-3 w-3 flex-shrink-0 text-slate-300" />
                                              <div className="italic text-slate-400 line-clamp-2">
                                                {`"${(msg.replyTo.text.length > 70 ? `${msg.replyTo.text.substring(0, 70)}...` : msg.replyTo.text)}"`}
                                              </div>
                                            </a>
                                        )}

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                            <div className={cn(bubbleClasses)}>
                                                <div className="break-all" dangerouslySetInnerHTML={{ __html: twemoji.parse(msg.text, twemojiConfig) }} />
                                            </div>
                                            </TooltipTrigger>
                                            <TooltipContent side={isOwnMessage ? 'left' : 'right'}>
                                                <p>{format(currentDate, "PPpp")}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className={cn("flex flex-wrap gap-1 mt-1", isOwnMessage ? "justify-end pl-8" : "justify-start pr-8")}>
                                                {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                                    <TooltipProvider key={emoji} delayDuration={0}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => handleReaction(msg.id, emoji)}
                                                                className={cn(
                                                                    "px-1.5 py-0.5 rounded-full border text-xs flex items-center gap-1 transition-colors",
                                                                    userIds.includes(currentUser?.uid || '')
                                                                    ? 'bg-accent/20 border-accent text-accent-foreground'
                                                                    : 'bg-card border-border hover:border-accent'
                                                                )}
                                                                >
                                                                <span dangerouslySetInnerHTML={{ __html: twemoji.parse(emoji, twemojiConfig) }}/>
                                                                <span>{userIds.length}</span>
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Click to react</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    </TooltipProvider>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {!isOwnMessage && (
                                        <div className="flex-shrink-0 self-center opacity-0 transition-opacity group-hover/row:opacity-100">
                                            <MessageActions
                                                onEmojiSelect={(emojiData) => handleSelectReaction(msg.id, emojiData)}
                                                onReply={() => setReplyingTo(msg)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </TooltipProvider>
      </ScrollArea>
       <div className="h-5 px-4 text-xs text-slate-400 flex items-center">
        {isOtherUserTyping && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Typing...</span>
            </motion.div>
        )}
      </div>
      {replyingTo && (
        <div className="relative p-2 bg-muted border-t border-b border-border text-xs text-slate-300">
            <button onClick={() => setReplyingTo(null)} className="absolute top-1 right-1 p-1 rounded-full hover:bg-slate-700">
                <X className="h-3 w-3"/>
            </button>
            <p>Replying to <span className="font-bold text-accent">{replyingTo.senderId === currentUser?.uid ? 'yourself' : user.anonName}</span></p>
            <p className="italic text-slate-400 truncate">"{replyingTo.text}"</p>
        </div>
      )}
      <div className="p-2 border-t border-primary/20">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 p-1.5 bg-input rounded-xl border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
           <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" type="button" className="h-8 w-8 flex-shrink-0 text-slate-400 hover:text-primary rounded-full">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 mb-2 w-auto bg-popover border-border rounded-lg" side="top" align="start">
                <EmojiPicker 
                    onEmojiClick={handleMainEmojiSelect}
                    emojiStyle={EmojiStyle.TWITTER}
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
