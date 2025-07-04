
"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { User } from "@/lib/types"
import { searchUsers } from "@/lib/actions"
import { debounce } from "lodash"
import { Skeleton } from "./ui/skeleton"
import { UserRow } from "./user-row"

interface UserSearchSidebarProps {
  onSelectUser?: (user: User) => void;
}

export function UserSearchSidebar({ onSelectUser }: UserSearchSidebarProps) {
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

  const mainContent = (
    <>
      {!onSelectUser && <h3 className="font-mono text-lg text-slate-200">Find User</h3>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by anon name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-input border-border text-slate-200 pl-9"
        />
      </div>
      <div className="space-y-1 h-full overflow-y-auto pr-2">
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
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
          <UserRow key={user.uid} user={user} onSelectUser={onSelectUser} />
        ))}
      </div>
    </>
  );

  if (onSelectUser) {
    return <div className="space-y-4 h-full flex flex-col">{mainContent}</div>
  }

  return (
    <div className="bg-card border-border rounded-lg p-4 space-y-4 sticky top-20">
      {mainContent}
    </div>
  )
}
