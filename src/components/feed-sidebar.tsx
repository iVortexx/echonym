
"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "./ui/button"
import { Home, Bookmark, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

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
        </aside>
    )
}
