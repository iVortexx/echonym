"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon, PlusCircle, Home } from 'lucide-react';
import { UserBadge } from "../user-badge";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6 text-primary"><rect width="256" height="256" fill="none"></rect><path d="M48.2,160.3a20,20,0,0,1-16.4-30.7L92.9,35.7a20,20,0,0,1,34.2,0l61.1,93.9a20,20,0,0,1-16.4,30.7Z" opacity="0.2"></path><path d="M141.2,216a20,20,0,0,1-17.7-9.9L62.4,88.3a20.1,20.1,0,0,1,9.9-25.7,20.5,20.5,0,0,1,25.8,9.8l61.1,93.9a20,20,0,0,1-17.9,30Z" opacity="0.2"></path><path d="M48.2,160.3a20,20,0,0,1-16.4-30.7L92.9,35.7a20,20,0,0,1,34.2,0l61.1,93.9a20,20,0,0,1-16.4,30.7H48.2Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></path><path d="M141.2,216a20,20,0,0,1-17.7-9.9L62.4,88.3a20.1,20.1,0,0,1,9.9-25.7,20.5,20.5,0,0,1,25.8,9.8l61.1,93.9a20,20,0,0,1-17.9,30Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></path></svg>
            <span className="font-bold font-headline text-lg">WhisperNet</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button asChild>
            <Link href="/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary/20">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-code">{user.anonName}</span>
                  <UserBadge xp={user.xp} />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Feed</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
