import { getUserByAnonName, getPostsByUserId } from "@/lib/actions"
import { notFound } from "next/navigation"
import type { Post } from "@/lib/types"
import { PostCard } from "@/components/post-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserIcon, ThumbsUp, Award, TrendingUp, FileText, MessageSquare, Calendar } from "lucide-react"
import { UserBadge } from "@/components/user-badge"
import { XPBar } from "@/components/xp-bar"
import { getBadgeForXP, getNextBadge } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { Timestamp } from "firebase/firestore"

type ProfilePageProps = {
  params: {
    anonName: string
  }
}

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

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { anonName } = params
  const user = await getUserByAnonName(decodeURIComponent(anonName))

  if (!user) {
    notFound()
  }

  const posts: Post[] = await getPostsByUserId(user.uid)
  const nextBadge = getNextBadge(user.xp)
  
  const joinDate = (user.createdAt as Timestamp)?.toDate ? (user.createdAt as Timestamp).toDate() : new Date();

  const serializablePosts = posts.map((post) => ({
    ...post,
    createdAt: post.createdAt && typeof (post.createdAt as any).toDate === 'function'
      ? (post.createdAt as Timestamp).toDate().toISOString()
      : (post.createdAt as string),
  }));

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card className="bg-slate-900/50 border-blue-500/20 rounded-lg backdrop-blur-sm p-6">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-0 mb-6">
          <Avatar className="h-24 w-24 ring-4 ring-blue-500/30">
            <AvatarFallback className="bg-blue-900/50 text-blue-300">
              <UserIcon className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Reputation" value={user.xp.toLocaleString()} />
        <StatCard icon={ThumbsUp} label="Total Upvotes" value={(user.totalUpvotes || 0).toLocaleString()} />
        <StatCard icon={Award} label="Rank" value={getBadgeForXP(user.xp).name} />
        <StatCard icon={FileText} label="Posts" value={user.postCount || 0} />
        <StatCard icon={MessageSquare} label="Comments" value={user.commentCount || 0} />
        <StatCard icon={Calendar} label="Joined" value={format(joinDate, "MMM d, yyyy")} />
      </div>

      {/* User's Posts */}
      <div>
        <h2 className="text-2xl font-bold mb-4 font-mono text-slate-200">Whispers by {user.anonName}</h2>
        {serializablePosts.length > 0 ? (
          <div className="space-y-4">
            {serializablePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8 font-mono">This user hasn't whispered anything yet.</p>
        )}
      </div>
    </div>
  )
}
