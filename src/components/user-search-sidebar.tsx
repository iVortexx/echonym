"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserIcon, Search } from "lucide-react"
import type { User } from "@/lib/types"
import { searchUsers } from "@/lib/actions"
import { debounce } from "lodash"
import Link from "next/link"
import { Skeleton } from "./ui/skeleton"

export function UserSearchSidebar() {
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

  return (
    <div className="bg-slate-900/50 border border-blue-500/20 rounded-lg backdrop-blur-sm p-4 space-y-4 sticky top-20">
      <h3 className="font-mono text-lg text-slate-200">Find User</h3>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by anon name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-slate-800/50 border-slate-600 text-slate-200 pl-9"
        />
      </div>
      <div className="space-y-3 h-96 overflow-y-auto pr-2">
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-slate-700/50" />
                <Skeleton className="h-5 w-32 bg-slate-700/50" />
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
            className="flex items-center gap-3 p-2 rounded-md hover:bg-blue-500/10 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-900/50 text-blue-300">
                <UserIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <span className="font-mono text-blue-300">{user.anonName}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
