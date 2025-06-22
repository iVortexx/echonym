
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Send, UserIcon, Loader2, Smile, Reply } from 'lucide-react';
import { useChat, type OpenChat } from '@/hooks/use-chat';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, type Timestamp } from 'firebase/firestore';
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

export function ChatBox({ chat }: ChatBoxProps) {
  const { closeChat, minimizeChat } = useChat();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

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
    
    setUserHasScrolled(false);
    
    const textToSend = newMessage;
    setNewMessage("");

    let senderName = '';
    if (replyingTo) {
      if (replyingTo.senderId === currentUser.uid) {
        senderName = currentUser.anonName;
      } else {
        senderName = user.anonName;
      }
    }

    const replyPayload = replyingTo ? {
      messageId: replyingTo.id,
      senderName: senderName,
      text: replyingTo.text,
    } : undefined;

    await sendMessage(chatId, currentUser.uid, textToSend, replyPayload);
    setReplyingTo(null);
    debouncedSetTypingFalse.cancel();
    if (currentUser) {
      setTypingStatus(chatId, currentUser.uid, false);
    }
    setTimeout(() => scrollToBottom(), 0);
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
        
        // Highlight effect
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

      <ScrollArea className="flex-1 bg-card/50" viewportRef={scrollAreaRef}>
        <TooltipProvider delayDuration={300}>
            <div className="p-3">
                {messages.map((msg, i) => {
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
                        "rounded-2xl": isFirstInGroup && isLastInGroup,
                        "rounded-tr-2xl rounded-tl-2xl rounded-br-md rounded-bl-2xl": isOwnMessage && isFirstInGroup && !isLastInGroup,
                        "rounded-tr-md rounded-tl-2xl rounded-br-md rounded-bl-2xl": isOwnMessage && !isFirstInGroup && !isLastInGroup,
                        "rounded-tr-md rounded-tl-2xl rounded-br-2xl rounded-bl-2xl": isOwnMessage && !isFirstInGroup && isLastInGroup,
                        "rounded-tl-2xl rounded-tr-2xl rounded-bl-md rounded-br-2xl": !isOwnMessage && isFirstInGroup && !isLastInGroup,
                        "rounded-tl-md rounded-tr-2xl rounded-bl-md rounded-br-2xl": !isOwnMessage && !isFirstInGroup && !isLastInGroup,
                        "rounded-tl-md rounded-tr-2xl rounded-bl-2xl rounded-br-2xl": !isOwnMessage && !isFirstInGroup && isLastInGroup,
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
                            
                                <div className={cn("max-w-[75%] flex flex-col", isOwnMessage ? "items-end" : "items-start")}>
                                    {msg.replyTo && (
                                        <a 
                                          href={`#message-${msg.replyTo.messageId}`}
                                          onClick={(e) => handleScrollToReply(e, msg.replyTo.messageId)}
                                          className={cn(
                                              "flex items-center gap-2 max-w-[85%] text-xs text-slate-400 bg-muted/50 rounded-full px-3 py-1 cursor-pointer hover:bg-muted transition-colors mb-0.5",
                                              isOwnMessage ? "self-end" : "self-start"
                                          )}
                                        >
                                          <Reply className="h-3 w-3 flex-shrink-0 text-slate-300" />
                                          <div className="flex-1 truncate">
                                            <span className="font-semibold text-slate-300 mr-1">
                                              {msg.replyTo.senderName}
                                            </span>
                                            <span className="italic text-slate-400">
                                              {msg.replyTo.text}
                                            </span>
                                          </div>
                                        </a>
                                    )}

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                        <div className={cn(bubbleClasses)}>
                                            <div className="break-words" dangerouslySetInnerHTML={{ __html: twemoji.parse(msg.text, twemojiConfig) }} />
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
                })}
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
            <p>Replying to <span className="font-bold text-accent">{replyingTo.senderId === currentUser?.uid ? currentUser.anonName : user.anonName}</span></p>
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


    