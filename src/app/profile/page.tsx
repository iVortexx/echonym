"use client"

import { useAuth } from "@/hooks/use-auth"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post } from "@/lib/types"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserIcon } from "lucide-react"
import { UserBadge } from "@/components/user-badge"
import { XPBar } from "@/components/xp-bar"
import { PostCard } from "@/components/post-card"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)

  useEffect(() => {
    if (user?.uid) {
      const q = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"))
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userPosts: Post[] = []
        querySnapshot.forEach((doc) => {
          userPosts.push({ id: doc.id, ...doc.data() } as Post)
        })
        setPosts(userPosts)
        setPostsLoading(false)
      })
      return () => unsubscribe()
    }
  }, [user?.uid])

  if (loading || !user) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="text-center text-slate-400 font-mono">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <Card className="bg-slate-900/50 border-blue-500/20 rounded-lg backdrop-blur-sm p-6">
        <CardHeader className="flex flex-row items-center gap-4 p-0 mb-6">
          <Avatar className="h-16 w-16 ring-2 ring-blue-500/30">
            <AvatarFallback className="bg-blue-900/50 text-blue-300">
              <UserIcon className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold font-mono text-blue-300">{user.anonName}</h1>
            <UserBadge xp={user.xp} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <XPBar xp={user.xp} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4 font-mono text-slate-200">Your Whispers</h2>
        {postsLoading ? (
          <p className="text-slate-400 font-mono">Loading your posts...</p>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8 font-mono">You haven't whispered anything yet.</p>
        )}
      </div>
    </div>
  )
}
