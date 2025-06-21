
"use client"

import { getUserByAnonName, getPostsByUserId, getUserVotes, isFollowing as checkIsFollowing, toggleFollowUser } from "@/lib/actions"
import { notFound, useRouter, useParams } from "next/navigation"
import type { Post as PostType, User, VoteType } from "@/lib/types"
import { PostCard } from "@/components/post-card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { UserIcon, Award, TrendingUp, FileText, MessageSquare, Calendar, Pencil, HelpCircle, Users, UserPlus, Loader2 } from "lucide-react"
import { UserBadge } from "@/components/user-badge"
import { XPBar } from "@/components/xp-bar"
import { getBadgeForXP, getNextBadge, BADGES } from "@/lib/utils"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { AvatarEditor } from "@/components/avatar-editor"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

function StatCard({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value: string | number, children?: React.ReactNode }) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50 p-4 relative h-full">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-cyan-400" />
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-xl font-bold font-mono text-slate-100">{value}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}

// We need to fetch data on the client side to get live updates after editing.
export default function ProfilePage() {
  const params = useParams()
  const { toast } = useToast()
  // Ensure anonName is a string, as useParams can return string | string[]
  const rawAnonName = Array.isArray(params.anonName) ? params.anonName[0] : params.anonName
  
  const { user: currentUser } = useAuth()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({})
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(true)

  const anonName = rawAnonName ? decodeURIComponent(rawAnonName) : ""
  const isOwnProfile = currentUser?.uid === user?.uid

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

      if (currentUser && fetchedUser && currentUser.uid !== fetchedUser.uid) {
        setIsFollowLoading(true);
        const followingStatus = await checkIsFollowing(currentUser.uid, fetchedUser.uid);
        setIsFollowing(followingStatus);
        setIsFollowLoading(false);
      } else {
        setIsFollowLoading(false);
      }

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

  const handleFollowToggle = async () => {
    if (!currentUser || !user || isOwnProfile || isFollowLoading) return;

    setIsFollowLoading(true);
    const previousIsFollowing = isFollowing;
    const previousFollowersCount = user.followersCount || 0;
    
    // Optimistic update
    setIsFollowing(!isFollowing);
    setUser(u => u ? { ...u, followersCount: (u.followersCount || 0) + (!isFollowing ? 1 : -1) } : null);

    const result = await toggleFollowUser(currentUser.uid, user.uid);

    setIsFollowLoading(false);
    
    if (result.success) {
      toast({
        title: result.wasFollowing ? `Unfollowed ${user.anonName}` : `Followed ${user.anonName}`
      });
    } else {
      // Revert optimistic update on error
      setIsFollowing(previousIsFollowing);
      setUser(u => u ? { ...u, followersCount: previousFollowersCount } : null);
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
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
        <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-0 mb-6 w-full">
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
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <h1 className="text-4xl font-bold font-mono text-blue-300">{user.anonName}</h1>
              {!isOwnProfile && (
                <Button onClick={handleFollowToggle} disabled={isFollowLoading} variant="outline" size="sm" className="font-mono">
                  {isFollowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isFollowing ? 'Unfollow' : 'Follow')}
                </Button>
              )}
            </div>

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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Reputation" value={user.xp.toLocaleString()}>
           <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-8 w-8 text-slate-500 hover:text-slate-300">
                    <HelpCircle className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-slate-900 border-slate-700 text-slate-300">
                <div className="space-y-4 p-2">
                    <div>
                        <h4 className="font-semibold text-cyan-400 mb-2 font-mono">How to Earn XP</h4>
                        <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                            <li>Create a new post: <span className="font-mono text-green-400">+10 XP</span></li>
                            <li>Add a comment: <span className="font-mono text-green-400">+5 XP</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-cyan-400 mb-2 font-mono">Ranks</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            {BADGES.map((badge) => (
                                <li key={badge.name} className="flex items-center justify-between">
                                    <span className={badge.color}>{badge.name}</span>
                                    <span className="font-mono text-slate-500">
                                        {badge.minXP.toLocaleString()}
                                        {badge.maxXP !== Infinity ? ` - ${badge.maxXP.toLocaleString()}` : '+'} XP
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
        </StatCard>
        <StatCard icon={FileText} label="Posts" value={user.postCount || 0} />
        <StatCard icon={MessageSquare} label="Comments" value={user.commentCount || 0} />
        <StatCard icon={UserPlus} label="Followers" value={user.followersCount || 0} />
        <StatCard icon={Users} label="Following" value={user.followingCount || 0} />
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
