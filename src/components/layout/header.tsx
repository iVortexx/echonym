
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

export function Header() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-500/20 bg-slate-950/80 backdrop-blur-lg">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Terminal className="h-6 w-6 text-blue-400" />
            <span className="font-bold font-mono text-lg bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              /dev/whispers
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-mono"
          >
            <Link href="/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
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
                    className="rounded-full hover:bg-blue-500/10 border border-blue-500/20"
                  >
                    <Avatar className="h-8 w-8">
                       {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.anonName} />}
                      <AvatarFallback className="bg-blue-900/50 text-blue-300">
                        <UserIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-slate-900/95 border-blue-500/20 backdrop-blur-sm text-slate-200"
                >
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-mono text-blue-300">{user.anonName}</span>
                    <UserBadge xp={user.xp} />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700/50" />
                  <DropdownMenuItem asChild className="hover:bg-blue-500/10 focus:bg-blue-500/10">
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-blue-500/10 focus:bg-blue-500/10">
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
