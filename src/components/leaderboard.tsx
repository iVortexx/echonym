"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { User } from "@/lib/types"
import { getTopUsers } from "@/lib/actions"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { Skeleton } from "./ui/skeleton"
import { ScrollArea } from "./ui/scroll-area"
import { Trophy, UserIcon } from "lucide-react"

export function Leaderboard() {
    const [topUsers, setTopUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTopUsers() {
            setLoading(true);
            try {
                const users = await getTopUsers();
                setTopUsers(users);
            } catch (error) {
                console.error("Failed to fetch top users:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchTopUsers();
    }, []);

    return (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4 flex-1 flex flex-col min-h-0">
            <h3 className="font-mono text-lg text-primary flex items-center shrink-0">
                <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                Leaderboard
            </h3>
            <ScrollArea className="flex-1 -mr-4">
                <div className="space-y-3 pr-4">
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-24 bg-muted" />
                                    <Skeleton className="h-3 w-16 bg-muted" />
                                </div>
                            </div>
                        ))
                    ) : (
                        topUsers.map((user, index) => (
                           <Link href={`/profile/${encodeURIComponent(user.anonName)}`} key={user.uid} className="flex items-center gap-2 p-1 -mx-1 rounded-md hover:bg-primary/10 transition-colors">
                                <span className="font-mono text-sm text-slate-400 w-5 text-center">{index + 1}</span>
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={user.avatarUrl} alt={user.anonName} className="object-cover" />
                                    <AvatarFallback className="bg-secondary text-primary">
                                        <UserIcon className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm text-primary truncate">{user.anonName}</p>
                                    <p className="text-xs text-slate-500">{user.xp.toLocaleString()} XP</p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
