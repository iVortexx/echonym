

"use client"

import { findUserByRecoveryId, getUserByAnonName, getPostsByUserId, getUserVotes, isFollowing as checkIsFollowing, toggleFollowUser } from "@/lib/actions"
import { notFound, useRouter, useParams } from "next/navigation"
import type { Post as PostType, User, VoteType } from "@/lib/types"
import { PostCard } from "@/components/post-card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { UserIcon, Award, TrendingUp, FileText, MessageSquare, Calendar, Pencil, HelpCircle, Users, UserPlus, Loader2, KeyRound, Copy } from "lucide-react"
import { UserBadge } from "@/components/user-badge"
import { XPBar } from "@/components/xp-bar"
import { getBadgeForXP, getNextBadge, BADGES } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { useEffect, useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { FollowListDialog } from "@/components/follow-list-dialog"
import { db } from '@/lib/firebase'
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'
import { Input } from "@/components/ui/input"

function StatCard({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value: string | number, children?: React.ReactNode }) {
  return (
    <Card className="bg-card border-border p-4 relative h-full">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-accent" />
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-xl font-bold font-mono text-slate-100">{value}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}

function BackupAndRestore({ user }: { user: User }) {
  const { toast } = useToast();
  const [recoveryInput, setRecoveryInput] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(user.recoveryId);
    toast({ title: "✅ Recovery ID Copied!", description: "Store it in a safe place." });
  };

  const handleRestore = async () => {
    if (!recoveryInput.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a Recovery ID." });
      return;
    }
    setIsRestoring(true);
    const result = await findUserByRecoveryId(recoveryInput.trim());
    setIsRestoring(false);

    if (result) {
      localStorage.setItem('whispernet_recovery_id', result.recoveryId);
      toast({ title: "✅ Account Found!", description: "Your account will be restored shortly." });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast({ variant: "destructive", title: "Restore Failed", description: "The Recovery ID is invalid." });
    }
  };

  return (
    <Card className="bg-card border-border rounded-lg">
      <CardHeader>
        <CardTitle className="font-mono text-lg text-primary">Backup & Restore</CardTitle>
        <CardDescription className="text-slate-400">
          Use your Recovery ID to restore your anonymous identity on other devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="font-mono text-sm text-slate-300">Your Unique Recovery ID</Label>
          <div className="flex items-center gap-2 p-2 rounded-md bg-input border-border">
            <KeyRound className="h-4 w-4 text-accent" />
            <p className="font-mono text-xs text-slate-400 truncate flex-1">{user.recoveryId}</p>
            <Button size="sm" variant="ghost" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
          </div>
          <p className="text-xs text-amber-500/80">Store this safely. It's the ONLY way to recover your account.</p>
        </div>
        <div className="space-y-2">
          <Label className="font-mono text-sm text-slate-300">Restore an Account</Label>
          <div className="flex items-center gap-2">
            <Input 
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              placeholder="Paste your Recovery ID here"
              className="bg-background border-border"
            />
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restore"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function ProfilePage() {
  const params = useParams()
  const { toast } = useToast()
  const { user: currentUser, loading: authLoading } = useAuth()
  const router = useRouter()

  const rawAnonName = Array.isArray(params.anonName) ? params.anonName[0] : params.anonName
  const anonName = rawAnonName ? decodeURIComponent(rawAnonName) : ""
  
  const [fetchedUser, setFetchedUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({})
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [dialogType, setDialogType] = useState<'followers' | 'following' | null>(null)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = useMemo(() => currentUser?.anonName === anonName, [currentUser, anonName]);
  const displayUser = isOwnProfile ? currentUser : fetchedUser;

  useEffect(() => {
    if (!anonName || authLoading) return;
    
    let unsubscribeUser: () => void = () => {};

    async function setupProfile() {
      setLoading(true);
      
      const userToFetch = isOwnProfile ? currentUser : await getUserByAnonName(anonName);

      if (!userToFetch) {
        setLoading(false);
        notFound();
        return;
      }

      const userRef = doc(db, 'users', userToFetch.uid);
      unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const updatedUser = { 
            uid: docSnap.id, 
            ...data,
            createdAt: data.createdAt && typeof (data.createdAt as any).toDate === 'function'
                ? (data.createdAt as Timestamp).toDate().toISOString()
                : (data.createdAt as string),
          } as User;
          if (!isOwnProfile) {
            setFetchedUser(updatedUser);
          }
        }
      });

      const fetchedPosts = await getPostsByUserId(userToFetch.uid);
      setPosts(fetchedPosts);
      
      if (currentUser) {
        if (fetchedPosts.length > 0) {
          const postIds = fetchedPosts.map(p => p.id);
          const votes = await getUserVotes(currentUser.uid, postIds, 'post');
          setUserVotes(votes);
        }
        if (!isOwnProfile) {
          setIsFollowLoading(true);
          const followingStatus = await checkIsFollowing(currentUser.uid, userToFetch.uid);
          setIsFollowing(followingStatus);
          setIsFollowLoading(false);
        }
      }

      setLoading(false);
    }

    setupProfile();

    return () => unsubscribeUser();

  }, [anonName, currentUser, isOwnProfile, authLoading]);

  const handleAvatarSave = (newAvatarUrl: string) => {
    if (displayUser) {
      setFetchedUser(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
      router.refresh();
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !displayUser || isOwnProfile || isFollowLoading) return;

    setIsFollowLoading(true);
    const previousIsFollowing = isFollowing;
    const previousFollowersCount = displayUser.followersCount || 0;
    
    setIsFollowing(!isFollowing);
    const updatedUser = { ...displayUser, followersCount: (displayUser.followersCount || 0) + (!isFollowing ? 1 : -1) };
    if (!isOwnProfile) {
      setFetchedUser(updatedUser);
    }
    
    const result = await toggleFollowUser(currentUser.uid, displayUser.uid);

    setIsFollowLoading(false);
    
    if (result.success) {
      toast({
        title: result.wasFollowing ? `Unfollowed ${displayUser.anonName}` : `Followed ${displayUser.anonName}`
      });
    } else {
      setIsFollowing(previousIsFollowing);
      if (!isOwnProfile) {
         setFetchedUser(prev => prev ? { ...prev, followersCount: previousFollowersCount } : null);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
  }


  if (loading || !displayUser) {
    return (
      <div className="space-y-8">
        <Card className="bg-card border-border rounded-lg p-6">
          <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-0 mb-6">
            <Avatar className="h-24 w-24 ring-4 ring-primary/30">
              <AvatarFallback className="bg-secondary">
                <UserIcon className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            {/* Skeletons for loading state */}
          </CardHeader>
        </Card>
      </div>
    )
  }

  const nextBadge = getNextBadge(displayUser.xp);

  let joinDate: Date;
  if (displayUser.createdAt) {
      if (typeof displayUser.createdAt === "string") {
          joinDate = new Date(displayUser.createdAt);
      } else if (typeof (displayUser.createdAt as any).toDate === 'function') {
          joinDate = (displayUser.createdAt as Timestamp).toDate();
      } else {
          joinDate = new Date(); // Fallback for unexpected format
      }
  } else {
      joinDate = new Date(); // Fallback if createdAt is missing
  }

  const isJoinDateInvalid = isNaN(joinDate.getTime());

  const AvatarComponent = (
    <Avatar className="h-24 w-24 ring-4 ring-primary/30 cursor-pointer group object-cover">
      <AvatarImage src={displayUser.avatarUrl} alt={displayUser.anonName} className="object-cover" />
      <AvatarFallback className="bg-secondary text-primary">
        <UserIcon className="h-12 w-12" />
      </AvatarFallback>
      {isOwnProfile && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Pencil className="h-8 w-8 text-white" />
        </div>
      )}
    </Avatar>
  );

  return (
    <div className="space-y-8">
      <Card className="bg-card border-border rounded-lg p-6">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-0 mb-6 w-full">
          {isOwnProfile ? (
            <Dialog>
              <DialogTrigger asChild>{AvatarComponent}</DialogTrigger>
              <DialogContent className="max-w-3xl bg-background border-border">
                <DialogHeader>
                  <DialogTitle className="font-mono text-xl text-primary">Avatar Editor</DialogTitle>
                </DialogHeader>
                <AvatarEditor user={displayUser} onSave={handleAvatarSave} />
              </DialogContent>
            </Dialog>
          ) : (
            AvatarComponent
          )}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <h1 className="text-4xl font-bold font-mono text-primary">{displayUser.anonName}</h1>
              {!isOwnProfile && (
                <Button onClick={handleFollowToggle} disabled={isFollowLoading} variant="outline" size="sm" className="font-mono">
                  {isFollowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isFollowing ? 'Unfollow' : 'Follow')}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <UserBadge xp={displayUser.xp} />
              <span className="text-slate-400 text-sm">Joined {isJoinDateInvalid ? 'recently' : formatDistanceToNow(joinDate, { addSuffix: true })}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <XPBar xp={displayUser.xp} />
          {nextBadge && (
            <p className="text-center text-sm text-slate-400 mt-2">
              {nextBadge.minXP - displayUser.xp} XP to reach <span className={getBadgeForXP(nextBadge.minXP).color}>{nextBadge.name}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Popover>
            <PopoverTrigger asChild>
                <div className='h-full cursor-pointer'>
                    <StatCard icon={TrendingUp} label="Reputation" value={displayUser.xp.toLocaleString()} />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-background border-border">
                <div className="space-y-4 p-2">
                <div>
                    <h4 className="font-semibold text-accent mb-2 font-mono">Ranks</h4>
                    <ul className="space-y-2 text-sm">
                        {BADGES.map((badge) => (
                            <li key={badge.name} className="flex items-center justify-between">
                            <span className={badge.color}>{badge.name}</span>
                            <span className="font-mono text-slate-500">
                                {badge.minXP.toLocaleString()}
                                {badge.maxXP !== Infinity ? ` - ${badge.maxXP.toLocaleString()}` : "+"} XP
                            </span>
                            </li>
                        ))}
                    </ul>
                </div>
                </div>
            </PopoverContent>
        </Popover>
        <StatCard icon={FileText} label="Posts" value={displayUser.postCount || 0} />
        <StatCard icon={MessageSquare} label="Comments" value={displayUser.commentCount || 0} />
        <div onClick={() => (displayUser.followersCount || 0) > 0 && setDialogType('followers')} className={(displayUser.followersCount || 0) > 0 ? 'cursor-pointer hover:bg-primary/5 transition-colors rounded-lg' : 'cursor-default'}>
            <StatCard icon={UserPlus} label="Followers" value={displayUser.followersCount || 0} />
        </div>
        <div onClick={() => (displayUser.followingCount || 0) > 0 && setDialogType('following')} className={(displayUser.followingCount || 0) > 0 ? 'cursor-pointer hover:bg-primary/5 transition-colors rounded-lg' : 'cursor-default'}>
            <StatCard icon={Users} label="Following" value={displayUser.followingCount || 0} />
        </div>
        <StatCard icon={Calendar} label="Joined" value={isJoinDateInvalid ? 'N/A' : format(joinDate, "MMM d, yyyy")} />
      </div>

      <Dialog open={!!dialogType} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-md bg-background border-border">
            {dialogType && displayUser && (
                <FollowListDialog
                    userId={displayUser.uid}
                    type={dialogType}
                    onClose={() => setDialogType(null)}
                />
            )}
        </DialogContent>
      </Dialog>
      
      {isOwnProfile && <BackupAndRestore user={displayUser} />}

      <div>
        <h2 className="text-2xl font-bold mb-4 font-mono text-slate-200">Whispers by {displayUser.anonName}</h2>
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
