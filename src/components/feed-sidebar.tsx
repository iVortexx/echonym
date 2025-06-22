
"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "./ui/button"
import { Home, Bookmark, EyeOff, Trophy, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import type { User } from "@/lib/types"
import { getTopUsers } from "@/lib/actions"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { Skeleton } from "./ui/skeleton"

function Leaderboard() {
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
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-mono text-lg text-primary flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                Leaderboard
            </h3>
            <div className="space-y-3">
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
                        <Link href={`/profile/${encodeURIComponent(user.anonName)}`} key={user.uid} className="flex items-center gap-3 p-1 -mx-1 rounded-md hover:bg-primary/10 transition-colors">
                            <span className="font-mono text-sm text-slate-400 w-6 text-center">{index + 1}</span>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatarUrl} alt={user.anonName} className="object-cover" />
                                <AvatarFallback className="bg-secondary text-primary">
                                    <UserIcon className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-mono text-sm text-primary truncate">{user.anonName}</p>
                                <p className="text-xs text-slate-500">{user.xp.toLocaleString()} XP</p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}


export function FeedSidebar() {
    const pathname = usePathname();

    const menuItems = [
        { href: "/", label: "Home Feed", icon: Home },
        { href: "/saved", label: "Saved Echoes", icon: Bookmark },
        { href: "/hidden", label: "Hidden Echoes", icon: EyeOff },
    ]

    return (
        <aside className="sticky top-20 h-[calc(100vh-6rem)] w-full max-w-xs space-y-6">
            <nav>
                <ul className="space-y-2">
                    {menuItems.map((item) => (
                        <li key={item.href}>
                            <Button
                                asChild
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-base font-normal text-slate-300",
                                    pathname === item.href && "bg-primary/10 text-primary"
                                )}
                            >
                                <Link href={item.href}>
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.label}
                                </Link>
                            </Button>
                        </li>
                    ))}
                </ul>
            </nav>
            <Leaderboard />
        </aside>
    )
}
