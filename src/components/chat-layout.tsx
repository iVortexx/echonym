
"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat, type OpenChat } from "@/hooks/use-chat";
import { ChatBox } from "./chat-box";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { MessageSquarePlus, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import type { User as UserType } from "@/lib/types";
import { getFollowers, getFollowing } from "@/lib/actions";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { UserSearchSidebar, UserRow } from "./user-search-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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

    const UserList = ({ users, isLoading }: { users: UserType[], isLoading: boolean }) => (
        <ScrollArea className="h-64">
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
        </ScrollArea>
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
                <TabsContent value="recent" className="mt-2">
                    <UserList users={recentChats.map(c => c.otherUser).filter(Boolean) as UserType[]} isLoading={false} />
                </TabsContent>
                <TabsContent value="follows" className="mt-2">
                    <UserList users={following} isLoading={loadingFollow} />
                </TabsContent>
                <TabsContent value="search" className="mt-2">
                    <UserSearchSidebar onSelectUser={handleUserClick} />
                </TabsContent>
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
  const open = Object.values(openChats).filter(c => c.state === 'open');

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-end gap-4">
        <AnimatePresence>
            {minimized.map((chat) => (
                <MinimizedChat key={chat.chatId} chat={chat} onRestore={restoreChat} />
            ))}
        </AnimatePresence>
      
      <ChatLauncher />
      
      <div className="fixed bottom-0 right-24 z-[100] flex items-end gap-4">
        <AnimatePresence>
        {open.map((chat) => (
            <ChatBox key={chat.chatId} chat={chat} />
        ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
