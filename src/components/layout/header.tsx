
"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserIcon, PlusCircle, Home, Terminal } from "lucide-react"
import { UserBadge } from "@/components/user-badge"
import { NotificationBell } from "../notification-bell"
import { MobileSidebar } from "./mobile-sidebar"

export function Header() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg shadow-lg shadow-black/10">
      <div className="container flex h-14 items-center">
        <div className="flex items-center">
           <div className="md:hidden mr-2">
            <MobileSidebar />
          </div>
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Terminal className="h-6 w-6 text-accent" />
            <span className="hidden sm:inline-block font-bold font-mono text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Echonym
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button
            asChild
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-mono"
          >
            <Link href="/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline-block">Create Echo</span>
            </Link>
          </Button>

          {user && (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-primary/10 border border-border"
                  >
                    <Avatar className="h-8 w-8">
                       {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.anonName} />}
                      <AvatarFallback className="bg-secondary text-primary">
                        <UserIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-background/95 border-border backdrop-blur-sm text-slate-200"
                >
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-mono text-primary">{user.anonName}</span>
                    <UserBadge xp={user.xp} />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild className="hover:bg-primary/10 focus:bg-primary/10">
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-primary/10 focus:bg-primary/10">
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Feed</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
