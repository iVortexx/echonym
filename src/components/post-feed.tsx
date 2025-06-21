"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AnimatePresence } from "framer-motion"
import type { Post } from "@/lib/types"
import { PostCard } from "./post-card"
import { Skeleton } from "@/components/ui/skeleton"

export function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = []
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post)
      })
      setPosts(postsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900/50 p-6 rounded-lg border border-blue-500/20 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <Skeleton className="h-8 w-8 rounded-full bg-slate-700/50" />
              <div className="ml-3 space-y-1 flex-1">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-32 bg-slate-700/50" />
                  <Skeleton className="h-4 w-12 bg-slate-700/50" />
                </div>
                <Skeleton className="h-3 w-24 bg-slate-700/50" />
              </div>
            </div>
            <Skeleton className="h-6 w-3/4 mb-2 bg-slate-700/50" />
            <Skeleton className="h-4 w-full bg-slate-700/50" />
            <Skeleton className="h-4 w-2/3 mt-1 bg-slate-700/50" />
            <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-700/50">
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16 bg-slate-700/50 rounded" />
                <Skeleton className="h-8 w-12 bg-slate-700/50 rounded" />
              </div>
              <Skeleton className="h-4 w-16 bg-slate-700/50" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-slate-400 py-16">
        <div className="mb-4">
          <div className="text-6xl mb-4">👻</div>
        </div>
        <p className="text-lg font-mono">No transmissions detected.</p>
        <p className="font-mono text-sm">Be the first to breach the silence.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </AnimatePresence>
    </div>
  )
}
