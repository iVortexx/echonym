
"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "./ui/button"
import { Home, Bookmark, EyeOff, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function FeedSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const menuItems = [
        { href: "/", label: "Home Feed", icon: Home },
        { href: "/saved", label: "Saved Posts", icon: Bookmark },
        { href: "/hidden", label: "Hidden Posts", icon: EyeOff },
    ]

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const searchQuery = formData.get("search") as string;
        const params = new URLSearchParams(searchParams);
        
        if (searchQuery) {
            params.set("q", searchQuery);
        } else {
            params.delete("q");
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <aside className="sticky top-20 h-[calc(100vh-6rem)] w-full max-w-xs space-y-6">
             <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    name="search"
                    placeholder="Search posts..."
                    defaultValue={searchParams.get("q") || ""}
                    className="bg-slate-800/50 border-slate-600 pl-9"
                />
            </form>

            <nav>
                <ul className="space-y-2">
                    {menuItems.map((item) => (
                        <li key={item.href}>
                            <Button
                                asChild
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-base font-normal text-slate-300",
                                    pathname === item.href && "bg-blue-500/10 text-blue-300"
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
