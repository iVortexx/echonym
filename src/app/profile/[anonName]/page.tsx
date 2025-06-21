
"use client"

import { getUserByAnonName, getPostsByUserId, getUserVotes } from "@/lib/actions"
import { notFound, useRouter, useParams } from "next/navigation"
import type { Post as PostType, User, VoteType } from "@/lib/types"
import { PostCard } from "@/components/post-card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { UserIcon, Award, TrendingUp, FileText, MessageSquare, Calendar, Pencil } from "lucide-react"
import { UserBadge } from "@/components/user-badge"
import { XPBar } from "@/components/xp-bar"
import { getBadgeForXP, getNextBadge } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AvatarEditor } from "@/components/avatar-editor"
import { useEffect, useState } from "react"

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50 p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-cyan-400" />
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-xl font-bold font-mono text-slate-100">{value}</p>
        </div>
      </div>
    </Card>
  )
}

// We need to fetch data on the client side to get live updates after editing.
export default function ProfilePage() {
  const params = useParams()
  // Ensure anonName is a string, as useParams can return string | string[]
  const rawAnonName = Array.isArray(params.anonName) ? params.anonName[0] : params.anonName
  
  const { user: currentUser } = useAuth()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({})

  const anonName = rawAnonName ? decodeURIComponent(rawAnonName) : ""
  const isOwnProfile = currentUser?.anonName === anonName

  useEffect(() => {
    // Only fetch data if we have a valid name
    if (!anonName || !currentUser) {
      return;
    }
    
    async function fetchData() {
      setLoading(true)
      const fetchedUser = await getUserByAnonName(anonName)
      if (!fetchedUser) {
        notFound()
        return
      }
      const fetchedPosts = await getPostsByUserId(fetchedUser.uid)
      
      if (currentUser && fetchedPosts.length > 0) {
        const postIds = fetchedPosts.map(p => p.id);
        const votes = await getUserVotes(currentUser.uid, postIds, 'post');
        setUserVotes(votes);
      }

      setUser(fetchedUser)
      setPosts(fetchedPosts)
      setLoading(false)
    }
    fetchData()
  }, [anonName, currentUser])

  const handleAvatarSave = (newAvatarUrl: string) => {
    if (user) {
      setUser({ ...user, avatarUrl: newAvatarUrl })
      // Re-fetch posts to show updated avatar on posts if we decide to
      router.refresh()
    }
  }

  if (loading || !user) {
    return (
      <div className="space-y-8">
        <Card className="bg-slate-900/50 border-blue-500/20 rounded-lg backdrop-blur-sm p-6">
          <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-0 mb-6">
            <Avatar className="h-24 w-24 ring-4 ring-blue-500/30">
              <AvatarFallback className="bg-blue-900/50 text-blue-300">
                <UserIcon className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            {/* Skeletons for loading state */}
          </CardHeader>
        </Card>
      </div>
    )
  }

  const nextBadge = getNextBadge(user.xp)
  const joinDate = new Date(user.createdAt as string)

  const AvatarComponent = (
    <Avatar className="h-24 w-24 ring-4 ring-blue-500/30 cursor-pointer group object-cover">
      <AvatarImage src={user.avatarUrl} alt={user.anonName} className="object-cover" />
      <AvatarFallback className="bg-blue-900/50 text-blue-300">
        <UserIcon className="h-12 w-12" />
      </AvatarFallback>
      {isOwnProfile && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Pencil className="h-8 w-8 text-white" />
        </div>
      )}
    </Avatar>
  )

  return (
    <div className="space-y-8">
      <Card className="bg-slate-900/50 border-blue-500/20 rounded-lg backdrop-blur-sm p-6">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-0 mb-6">
          {isOwnProfile ? (
            <Dialog>
              <DialogTrigger asChild>{AvatarComponent}</DialogTrigger>
              <DialogContent className="max-w-3xl bg-slate-950 border-blue-500/20">
                <DialogHeader>
                  <DialogTitle className="font-mono text-xl text-blue-300">Avatar Editor</DialogTitle>
                </DialogHeader>
                <AvatarEditor user={user} onSave={handleAvatarSave} />
              </DialogContent>
            </Dialog>
          ) : (
            AvatarComponent
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold font-mono text-blue-300">{user.anonName}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <UserBadge xp={user.xp} />
              <span className="text-slate-400 text-sm">Joined {formatDistanceToNow(joinDate, { addSuffix: true })}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <XPBar xp={user.xp} />
          {nextBadge && (
            <p className="text-center text-sm text-slate-400 mt-2">
              {nextBadge.minXP - user.xp} XP to reach <span className={getBadgeForXP(nextBadge.minXP).color}>{nextBadge.name}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={TrendingUp} label="Reputation" value={user.xp.toLocaleString()} />
        <StatCard icon={FileText} label="Posts" value={user.postCount || 0} />
        <StatCard icon={MessageSquare} label="Comments" value={user.commentCount || 0} />
        <StatCard icon={Calendar} label="Joined" value={format(joinDate, "MMM d, yyyy")} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 font-mono text-slate-200">Whispers by {user.anonName}</h2>
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} userVote={userVotes[post.id]} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8 font-mono">This user hasn't whispered anything yet.</p>
        )}
      </div>
    </div>
  )
}
