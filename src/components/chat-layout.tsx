
"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat, type OpenChat } from "@/hooks/use-chat";
import { ChatBox } from "./chat-box";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { MessageSquarePlus, X, UserIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import type { User as UserType, UserChat } from "@/lib/types";
import { getFollowers, getFollowing } from "@/lib/actions";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { UserSearchSidebar, UserRow } from "./user-search-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
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
                 <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                >
                <Button size="icon" className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90">
                    {isLauncherOpen ? <X/> : <MessageSquarePlus />}
                </Button>
                </motion.div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 mr-4 mb-2 bg-card border-border backdrop-blur-sm" side="top" align="end">
                <ChatHub />
            </PopoverContent>
        </Popover>
    );
}


function MinimizedChat({ chat, onRestore }: { chat: OpenChat, onRestore: (chatId: string) => void }) {
    return (
        <motion.div layoutId={`chatbox-${chat.chatId}`}>
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={() => onRestore(chat.chatId)} className="h-14 w-14 rounded-full overflow-hidden border-2 border-primary shadow-lg">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={chat.user.avatarUrl} alt={chat.user.anonName} />
                                <AvatarFallback><UserIcon /></AvatarFallback>
                            </Avatar>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>{chat.user.anonName}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </motion.div>
    )
}

export function ChatLayout() {
  const { openChats, restoreChat } = useChat();

  const minimized = Object.values(openChats).filter(c => c.state === 'minimized');
  const openChat = Object.values(openChats).find(c => c.state === 'open');

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-end gap-4">
        <div className="flex items-end gap-4">
            <AnimatePresence>
                {minimized.map((chat) => (
                    <MinimizedChat key={chat.chatId} chat={chat} onRestore={restoreChat} />
                ))}
            </AnimatePresence>
        </div>
      
      <ChatLauncher />
      
      <div className="fixed bottom-0 right-24 z-[100] flex items-end gap-4">
        <AnimatePresence>
            {openChat && <ChatBox key={openChat.chatId} chat={openChat} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
