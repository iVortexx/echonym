
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat, type OpenChat } from "@/hooks/use-chat";
import { ChatBox } from "./chat-box";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { MessageSquarePlus, UserIcon, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import type { User as UserType, UserChat } from "@/lib/types";
import { getFollowers, getFollowing } from "@/lib/actions";
import { UserSearchSidebar } from "./user-search-sidebar";
import { UserRow } from "./user-row";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

function ChatHub() {
    const { recentChats, openChat, toggleLauncher } = useChat();
    const { user: currentUser } = useAuth();
    const [followers, setFollowers] = useState<UserType[]>([]);
    const [following, setFollowing] = useState<UserType[]>([]);
    const [loadingFollow, setLoadingFollow] = useState(false);
    
    useEffect(() => {
        if (!currentUser) return;
        setLoadingFollow(true);
        Promise.all([
            getFollowers(currentUser.uid),
            getFollowing(currentUser.uid)
        ]).then(([followersData, followingData]) => {
            setFollowers(followersData);
            setFollowing(followingData);
            setLoadingFollow(false);
        });
    }, [currentUser]);

    const handleUserClick = (user: UserType) => {
        openChat(user);
        toggleLauncher(false);
    };

    const FollowUserList = ({ users, isLoading }: { users: UserType[], isLoading: boolean }) => (
         <div className="space-y-1 pr-4">
            {isLoading ? (
                [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))
            ) : users.length === 0 ? (
                 <p className="text-center text-sm text-slate-500 py-8">No users found.</p>
            ) : (
                users.map(u => (
                   <UserRow key={u.uid} user={u} onSelectUser={handleUserClick} />
                ))
            )}
         </div>
    );

    const RecentChatList = ({ chats, isLoading }: { chats: UserChat[], isLoading: boolean }) => (
        <div className="space-y-1 pr-4">
           {isLoading ? (
               [...Array(3)].map((_, i) => (
                   <div key={i} className="flex items-center gap-3 p-2">
                       <Skeleton className="h-10 w-10 rounded-full" />
                       <div className="flex-1 space-y-1">
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-3 w-32" />
                       </div>
                   </div>
               ))
           ) : chats.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">No recent chats.</p>
           ) : (
               chats.map(chat => (
                  <UserRow 
                    key={chat.id} 
                    user={{
                        uid: chat.withUserId,
                        anonName: chat.withUserName,
                        avatarUrl: chat.withUserAvatar
                    }}
                    onSelectUser={handleUserClick}
                    lastMessage={chat.lastMessage?.text}
                    unreadCount={chat.unreadCount}
                  />
               ))
           )}
        </div>
   );


    return (
        <div className="w-80">
            <h3 className="font-bold text-lg text-slate-100 p-3">Chats</h3>
            <Tabs defaultValue="recent" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                    <TabsTrigger value="follows">Follows</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
                 <ScrollArea className="h-64 mt-2">
                    <TabsContent value="recent">
                        <RecentChatList chats={recentChats} isLoading={!currentUser} />
                    </TabsContent>
                    <TabsContent value="follows">
                        <FollowUserList users={following} isLoading={loadingFollow} />
                    </TabsContent>
                    <TabsContent value="search">
                        <UserSearchSidebar onSelectUser={handleUserClick} />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
}

function ChatLauncher() {
    const { isLauncherOpen, toggleLauncher } = useChat();
    return (
        <Popover open={isLauncherOpen} onOpenChange={toggleLauncher}>
            <PopoverTrigger asChild>
                <Button size="icon" className="rounded-full w-12 h-12 shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center">
                    {isLauncherOpen ? <X className="h-6 w-6"/> : <MessageSquarePlus className="h-6 w-6"/>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 mr-4 mb-2 bg-card border-border backdrop-blur-sm" side="top" align="end">
                <ChatHub />
            </PopoverContent>
        </Popover>
    );
}


function MinimizedChat({ chat, onRestore, onClose }: { chat: OpenChat, onRestore: (chatId: string) => void, onClose: (chatId: string) => void }) {
    const { recentChats } = useChat();
    const chatData = recentChats.find(rc => rc.id === chat.chatId);
    const unreadCount = chatData?.unreadCount;

    return (
        <motion.div layoutId={`chatbox-${chat.chatId}`} className="relative group">
             <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={() => onRestore(chat.chatId)} className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary shadow-lg hover:ring-2 hover:ring-primary/50 transition-all">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={chat.user.avatarUrl} alt={chat.user.anonName} />
                                <AvatarFallback><UserIcon /></AvatarFallback>
                            </Avatar>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>Chat with {chat.user.anonName}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(chat.chatId);
                }}
                className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white opacity-0 ring-2 ring-card transition-opacity duration-200 group-hover:opacity-100 hover:bg-red-500"
                aria-label="Close chat"
            >
                <X className="h-3 w-3" />
            </button>

            {typeof unreadCount === 'number' && unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white pointer-events-none ring-2 ring-card">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </div>
            )}
        </motion.div>
    )
}

export function ChatLayout() {
  const { openChats, restoreChat, closeChat } = useChat();

  const minimized = Object.values(openChats).filter(c => c.state === 'minimized');
  const openChat = Object.values(openChats).find(c => c.state === 'open');

  return (
    <>
      {/* Container for launcher and minimized chats */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse items-end gap-2">
        {/* The launcher button is the base of the vertical stack */}
        <ChatLauncher />

        {/* Minimized chats appear above the launcher */}
        <AnimatePresence>
            {minimized.map((chat) => (
                <MinimizedChat key={chat.chatId} chat={chat} onRestore={restoreChat} onClose={closeChat} />
            ))}
        </AnimatePresence>
      </div>
      
      {/* Container for the open chat window, positioned to the left of the launcher stack */}
      <div className="fixed bottom-4 right-20 z-[100] left-4 sm:left-auto sm:w-80">
        <AnimatePresence>
            {openChat && <ChatBox key={openChat.chatId} chat={openChat} />}
        </AnimatePresence>
      </div>
    </>
  );
}
