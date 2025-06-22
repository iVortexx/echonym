"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "./ui/button"
import { Home, Bookmark, EyeOff, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Leaderboard } from "./leaderboard"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function FeedSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems = [
        { href: "/", label: "Home Feed", icon: Home },
        { href: "/saved", label: "Saved Echoes", icon: Bookmark },
        { href: "/hidden", label: "Hidden Echoes", icon: EyeOff },
    ]

    return (
        <aside className={cn(
            "sticky top-0 h-screen flex flex-col transition-all duration-300 ease-in-out border-r border-border",
            isCollapsed ? "w-20" : "w-64"
        )}>
             <div className="flex-1 flex flex-col min-h-0 pt-4">
                <nav className="px-2">
                    <ul className="space-y-2">
                        {menuItems.map((item) => (
                            <li key={item.href}>
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                asChild
                                                variant="ghost"
                                                className={cn(
                                                    "w-full text-base font-normal text-slate-300",
                                                    pathname === item.href && "bg-primary/10 text-primary",
                                                    isCollapsed ? "justify-center" : "justify-start"
                                                )}
                                            >
                                                <Link href={item.href} className={cn("flex items-center", isCollapsed && "justify-center")}>
                                                    <item.icon className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-3")} />
                                                    {!isCollapsed && <span>{item.label}</span>}
                                                </Link>
                                            </Button>
                                        </TooltipTrigger>
                                        {isCollapsed && (
                                            <TooltipContent side="right">
                                                <p>{item.label}</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            </li>
                        ))}
                    </ul>
                </nav>
                 <div className={cn(
                    "flex flex-col flex-1 min-h-0 transition-opacity duration-300 mt-6 px-2 pb-4",
                    isCollapsed ? "opacity-0 invisible h-0" : "opacity-100 visible"
                )}>
                   <Leaderboard />
                </div>
             </div>
             <div className="p-2 border-t border-border">
                <Button
                    variant="ghost"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full"
                >
                    {isCollapsed ? <ChevronRight /> : <ChevronLeft/>}
                    <span className="sr-only">{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
                </Button>
            </div>
        </aside>
    )
}
