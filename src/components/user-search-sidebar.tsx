
"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserIcon, Search } from "lucide-react"
import type { User } from "@/lib/types"
import { searchUsers } from "@/lib/actions"
import { debounce } from "lodash"
import Link from "next/link"
import { Skeleton } from "./ui/skeleton"

interface UserSearchSidebarProps {
  isMobile?: boolean;
  onSelectUser?: () => void;
}

export function UserSearchSidebar({ isMobile = false, onSelectUser }: UserSearchSidebarProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length > 1) {
        setLoading(true)
        const users = await searchUsers(searchQuery)
        setResults(users)
        setLoading(false)
      } else {
        setResults([])
      }
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const content = (
    <>
      <h3 className="font-mono text-lg text-slate-200">Find User</h3>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by anon name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-input border-border text-slate-200 pl-9"
        />
      </div>
      <div className="space-y-3 h-96 overflow-y-auto pr-2">
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <Skeleton className="h-5 w-32 bg-muted" />
              </div>
            ))}
          </div>
        )}
        {!loading && query && results.length === 0 && (
          <p className="text-slate-500 text-sm text-center pt-4">No users found.</p>
        )}
        {results.map((user) => (
          <Link
            href={`/profile/${encodeURIComponent(user.anonName)}`}
            key={user.uid}
            onClick={onSelectUser}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-primary/10 transition-colors"
          >
            <Avatar className="h-10 w-10">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.anonName} />}
              <AvatarFallback className="bg-secondary text-primary">
                <UserIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <span className="font-mono text-primary">{user.anonName}</span>
          </Link>
        ))}
      </div>
    </>
  );

  if (isMobile) {
    return <div className="space-y-4">{content}</div>
  }

  return (
    <div className="bg-card border-border rounded-lg p-4 space-y-4 sticky top-20">
      {content}
    </div>
  )
}
