
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIcon } from "lucide-react";
import type { User } from "@/lib/types";

export const UserRow = ({ user, onSelectUser, lastMessage, unreadCount }: { user: Partial<User>, onSelectUser?: (user: User) => void, lastMessage?: string, unreadCount?: number }) => {
  const userToSelect = user as User; 

  const content = (
    <>
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.anonName} />}
          <AvatarFallback className="bg-secondary text-primary">
            <UserIcon className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
         {typeof unreadCount === 'number' && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-card">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-mono text-primary truncate">{user.anonName}</p>
        {lastMessage && <p className="text-xs text-slate-400 truncate">{lastMessage}</p>}
      </div>
    </>
  );

  if (onSelectUser) {
    return (
      <button
        onClick={() => onSelectUser(userToSelect)}
        className="flex w-full items-center gap-3 p-2 rounded-md hover:bg-primary/10 transition-colors text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/profile/${encodeURIComponent(user.anonName || '')}`}
      className="flex items-center gap-3 p-2 rounded-md hover:bg-primary/10 transition-colors"
    >
      {content}
    </Link>
  );
};
