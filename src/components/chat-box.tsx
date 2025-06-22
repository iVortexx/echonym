
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
import EmojiPicker, { EmojiStyle, type EmojiClickData, Categories } from 'emoji-picker-react';
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
    const emojiPickerCategories = [
        { name: 'Recently Used', category: Categories.SUGGESTED },
        { name: 'Smileys & People', category: Categories.SMILEYS_PEOPLE },
        { name: 'Animals & Nature', category: Categories.ANIMALS_NATURE },
        { name: 'Food & Drink', category: Categories.FOOD_DRINK },
        { name: 'Objects', category: Categories.OBJECTS },
        { name: 'Symbols', category: Categories.SYMBOLS },
    ];

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
                        skinTonesDisabled
                        height={350}
                        categories={emojiPickerCategories}
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

  const { user, chatId } = chat;

  const emojiPickerCategories = [
    { name: 'Recently Used', category: Categories.SUGGESTED },
    { name: 'Smileys & People', category: Categories.SMILEYS_PEOPLE },
    { name: 'Animals & Nature', category: Categories.ANIMALS_NATURE },
    { name: 'Food & Drink', category: Categories.FOOD_DRINK },
    { name: 'Objects', category: Categories.OBJECTS },
    { name: 'Symbols', category: Categories.SYMBOLS },
  ];

  function isEmojiOnly(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length === 0 || trimmed.length > 20) return false;
    
    // Use twemoji to parse and then remove the img tags it creates.
    // If nothing is left but whitespace, it was emoji-only.
    const parsed = twemoji.parse(trimmed);
    const stripped = parsed.replace(/<img[^>]*>/g, '').trim();

    return !stripped;
  }

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
    // Wait for the initial paginated load to complete
    if (!chatId || !currentUser?.uid || isLoading) return;

    // Listen to all changes in the collection, ordered by time.
    // The initial `getDocs` handles the first page, and this listener keeps everything after that in sync.
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges();
        if (changes.length === 0) return;

        setMessages((prevMessages) => {
            // Use a Map to efficiently merge the initial data with real-time updates (new messages, reactions, etc.)
            const messagesMap = new Map(prevMessages.map((msg) => [msg.id, msg]));

            for (const change of changes) {
                const messageData = { id: change.doc.id, ...change.doc.data() } as ChatMessage;
                if (change.type === 'added' || change.type === 'modified') {
                    messagesMap.set(change.doc.id, messageData);
                } else if (change.type === 'removed') {
                    messagesMap.delete(change.doc.id);
                }
            }

            const newMessages = Array.from(messagesMap.values());
            
            // Re-sort to ensure order is always correct
            newMessages.sort((a, b) => {
                const dateA = getDateFromTimestamp(a.createdAt);
                const dateB = getDateFromTimestamp(b.createdAt);
                if (!dateA) return -1;
                if (!dateB) return 1;
                return dateA.getTime() - dateB.getTime();
            });

            return newMessages;
        });
        
        // If new messages were added, handle scrolling and clearing unread status
        const hasNewMessages = changes.some(c => c.type === 'added');
        if (hasNewMessages) {
            const wasSentByMe = changes.some(c => c.type === 'added' && c.doc.data().senderId === currentUser.uid);
            
            const scrollDiv = viewportRef.current;
            const isAtBottom = scrollDiv ? scrollDiv.scrollHeight - scrollDiv.scrollTop <= scrollDiv.clientHeight + 5 : false;

            // Scroll down if the user is already at the bottom, or if they sent the new message.
            if (isAtBottom || wasSentByMe) {
                 setUserHasScrolled(false);
            }
            clearChatUnread(currentUser.uid, chatId);
        }
    });

    return () => unsubscribe();
  }, [chatId, currentUser?.uid, isLoading]);

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
      senderName: '...' // This is now set on the backend
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
            targetElement.classList.remove('bg-primary/10');
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
      className="w-full h-[400px] flex flex-col bg-card border-2 border-primary/50 rounded-xl shadow-2xl shadow-primary/20"
    >
      <header className="flex items-center justify-between p-2 pl-3 border-b border-primary/20 cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.anonName} />
            <AvatarFallback className="bg-secondary text-primary">
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="font-bold text-sm text-slate-100 truncate">{user.anonName}</span>
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
                        
                        const isOnlyEmoji = isEmojiOnly(msg.text);

                        const bubbleClasses = cn(
                          "p-2 px-3 text-sm relative rounded-2xl break-all",
                          isOwnMessage ? "bg-cyan-900 text-slate-100" : "bg-muted text-foreground",
                          {
                            'rounded-tr-md': !isFirstInGroup && isOwnMessage,
                            'rounded-tl-md': !isFirstInGroup && !isOwnMessage,
                            'rounded-br-md': !isLastInGroup && isOwnMessage,
                            'rounded-bl-md': !isLastInGroup && !isOwnMessage,
                          }
                        );

                        return (
                            <div key={msg.id} id={`message-${msg.id}`} className="group/row scroll-mt-16 transition-colors duration-500">
                                <div
                                    className={cn(
                                        "flex w-full items-end gap-2",
                                        isOwnMessage ? "justify-end" : "justify-start",
                                        isFirstInGroup ? "mt-4" : "mt-0.5"
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
                                
                                    <div className={cn("max-w-[75%] flex flex-col min-w-0", isOwnMessage ? "items-end" : "items-start")}>
                                        {msg.replyTo && (
                                            <a
                                              href={`#message-${msg.replyTo.messageId}`}
                                              onClick={(e) => handleScrollToReply(e, msg.replyTo.messageId)}
                                              className={cn(
                                                  "flex items-start gap-1.5 text-xs text-slate-400 bg-black/10 rounded-t-lg px-2 py-1.5 cursor-pointer hover:bg-black/20 transition-colors w-full",
                                                  "border-l-2 border-accent/80",
                                                  "-mb-px" // Stick to the message bubble below
                                              )}
                                            >
                                              <Reply className="h-3 w-3 flex-shrink-0 text-slate-300 mt-0.5" />
                                              <div className="italic text-slate-400 line-clamp-2 break-all">
                                                {`"${msg.replyTo.text.substring(0, 70)}${msg.replyTo.text.length > 70 ? "..." : ""}"`}
                                              </div>
                                            </a>
                                        )}

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                            <div className={cn(bubbleClasses, 'min-w-0')}>
                                                <div className={cn("break-words", isOnlyEmoji && "text-3xl")} dangerouslySetInnerHTML={{ __html: twemoji.parse(msg.text, twemojiConfig) }} />
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
                                                                <span className="inline-block" dangerouslySetInnerHTML={{ __html: twemoji.parse(emoji, twemojiConfig) }}/>
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
                    skinTonesDisabled
                    height={350}
                    categories={emojiPickerCategories}
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
