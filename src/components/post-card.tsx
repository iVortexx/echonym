
"use client"
import { motion } from "framer-motion"
import { MessageCircle, Link as LinkIcon, MoreHorizontal, Terminal, Zap, Hash, Text, UserIcon, Share, EyeOff, Bookmark, Edit, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { VoteButtons } from "./vote-buttons"
import { UserBadge } from "./user-badge"
import type { Post, VoteType } from "@/lib/types"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { handleVote, deletePost, toggleUserPostList } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { buildAvatarUrl } from "@/lib/utils"

interface PostCardProps {
  post: Post
  isPreview?: boolean
  userVote?: VoteType | null
  onPostHide?: (postId: string) => void
}

export function PostCard({ post, isPreview = false, userVote, onPostHide }: PostCardProps) {
  const { user: currentUser, firebaseUser, updateUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [isVoting, setIsVoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [optimisticVote, setOptimisticVote] = useState(userVote)
  const [optimisticUpvotes, setOptimisticUpvotes] = useState(post.upvotes)
  const [optimisticDownvotes, setOptimisticDownvotes] = useState(post.downvotes)
  const [isSaved, setIsSaved] = useState(currentUser?.savedPosts?.includes(post.id) ?? false)
  const [isHidden, setIsHidden] = useState(currentUser?.hiddenPosts?.includes(post.id) ?? false)


  // When the initial prop changes (e.g., navigating between pages), update the state
  useEffect(() => {
    setOptimisticVote(userVote)
    setOptimisticUpvotes(post.upvotes)
    setOptimisticDownvotes(post.downvotes)
  }, [userVote, post.upvotes, post.downvotes])
  
  useEffect(() => {
    setIsSaved(currentUser?.savedPosts?.includes(post.id) ?? false);
    setIsHidden(currentUser?.hiddenPosts?.includes(post.id) ?? false);
  }, [currentUser, post.id]);


  const handleVoteClick = async (newVoteType: "up" | "down") => {
    if (!firebaseUser || isVoting || isPreview) return
    
    setIsVoting(true)
    const previousVote = optimisticVote
    const previousUpvotes = optimisticUpvotes
    const previousDownvotes = optimisticDownvotes

    let newOptimisticStatus: "up" | "down" | null = newVoteType
    let upvoteChange = 0
    let downvoteChange = 0

    if (previousVote === newVoteType) { // Toggling vote off
      newOptimisticStatus = null;
      if (newVoteType === 'up') upvoteChange = -1;
      else downvoteChange = -1;
    } else { // New vote or changing vote
      if (previousVote === 'up') upvoteChange = -1;
      else if (previousVote === 'down') downvoteChange = -1;
      
      if (newVoteType === 'up') upvoteChange += 1;
      else downvoteChange += 1;
    }
    
    // Optimistic UI update
    setOptimisticVote(newOptimisticStatus);
    setOptimisticUpvotes(prev => prev + upvoteChange);
    setOptimisticDownvotes(prev => prev + downvoteChange);

    try {
      const result = await handleVote(firebaseUser.uid, post.id, "post");

      if (result?.error) {
          // On error, revert the optimistic update
          setOptimisticVote(previousVote);
          setOptimisticUpvotes(previousUpvotes);
          setOptimisticDownvotes(previousDownvotes);
          toast({
              variant: "destructive",
              title: "Vote Failed",
              description: result.error,
          });
      }
    } catch (error) {
      setOptimisticVote(previousVote);
      setOptimisticUpvotes(previousUpvotes);
      setOptimisticDownvotes(previousDownvotes);
      toast({
          variant: "destructive",
          title: "An Unexpected Error Occurred",
          description: "Please try again later.",
      });
      console.error("Voting failed unexpectedly:", error);
    } finally {
      setIsVoting(false);
    }
  }

  const handleShare = (e?: React.MouseEvent) => {
    e?.preventDefault(); // Prevent link navigation if inside another link
    if (isPreview) return;

    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      toast({
        title: "✅ Link Copied!",
        description: "The post URL is now on your clipboard.",
      });
    }).catch(err => {
      console.error("Failed to copy link: ", err);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy the link.",
      });
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    const result = await toggleUserPostList(currentUser.uid, post.id, 'savedPosts');
    if (result.success) {
      toast({ title: result.wasInList ? "Post unsaved" : "Post saved!" });
      setIsSaved(!isSaved); // Optimistic update
      const newSavedPosts = result.wasInList
        ? currentUser.savedPosts?.filter(id => id !== post.id)
        : [...(currentUser.savedPosts || []), post.id];
      updateUser({ savedPosts: newSavedPosts });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
  };

  const handleHide = async () => {
    if (!currentUser) return;
    const result = await toggleUserPostList(currentUser.uid, post.id, 'hiddenPosts');
     if (result.success) {
      toast({ title: result.wasInList ? "Post unhidden" : "Post hidden" });
      setIsHidden(!isHidden); // Optimistic update
      if (onPostHide && !result.wasInList) {
        onPostHide(post.id);
      }
      const newHiddenPosts = result.wasInList
        ? currentUser.hiddenPosts?.filter(id => id !== post.id)
        : [...(currentUser.hiddenPosts || []), post.id];
      updateUser({ hiddenPosts: newHiddenPosts });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
  };

  const handleDelete = async () => {
    if (!firebaseUser || !isOwnPost) return;
    setIsDeleting(true);
    const result = await deletePost(post.id, firebaseUser.uid);
    if (result.success) {
      toast({ title: "Post deleted successfully" });
      router.push('/'); // Or refresh current page if that's better
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
    setIsDeleting(false);
  };

  const formatTimeAgo = (createdAt: any) => {
    if (!createdAt) return "..."

    let date: Date
    if (typeof createdAt === "string") {
      date = new Date(createdAt)
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000)
    } else {
      date = new Date() // Fallback for preview mode
    }

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 5) return "just now"
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const CardLinkWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isPreview) {
      return <div>{children}</div>
    }
    return <Link href={`/post/${post.id}`} className="block cursor-pointer group">{children}</Link>
  }

  const isOwnPost = currentUser?.uid === post.userId;
  const score = optimisticUpvotes - optimisticDownvotes;

  let displayAvatarUrl = post.avatarUrl;
  if (isOwnPost && currentUser?.avatarUrl) {
      displayAvatarUrl = currentUser.avatarUrl;
  }
  if (!displayAvatarUrl) {
      displayAvatarUrl = buildAvatarUrl({ seed: post.anonName || 'default' });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card className="bg-card border-border rounded-lg hover:border-primary/40 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Link href={`/profile/${encodeURIComponent(post.anonName)}`} className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                  <AvatarImage src={displayAvatarUrl} alt={post.anonName} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-primary">
                    <UserIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Terminal className="h-3 w-3 text-accent flex-shrink-0" />
                  <Link href={`/profile/${encodeURIComponent(post.anonName)}`}>
                    <p className="font-mono text-sm text-accent truncate hover:underline">{post.anonName || 'Anonymous'}</p>
                  </Link>
                  <UserBadge xp={post.xp || 0} />
                </div>
                <p className="text-slate-400 text-xs font-mono">
                  {formatTimeAgo(post.createdAt)}
                  {post.tag && (
                    <>
                      {" • "}
                      <Badge
                        variant="outline"
                        className="text-xs px-1 py-0 h-4 border-accent/30 text-accent bg-accent/10"
                      >
                        <Hash className="h-2 w-2 mr-1" />
                        {post.tag}
                      </Badge>
                    </>
                  )}
                </p>
              </div>
            </div>
             <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-accent hover:bg-accent/10 flex-shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background/95 border-border backdrop-blur-sm text-slate-200">
                  <DropdownMenuItem onClick={handleShare}>
                    <LinkIcon className="mr-2 h-4 w-4" /> Share
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleSave()}>
                    <Bookmark className="mr-2 h-4 w-4" /> {isSaved ? "Unsave" : "Save"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleHide()}>
                    <EyeOff className="mr-2 h-4 w-4" /> {isHidden ? "Unhide" : "Hide"}
                  </DropdownMenuItem>
                  {isOwnPost && !isPreview && (
                    <>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem onClick={() => router.push(`/post/${post.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem 
                            className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                            onSelect={(e) => e.preventDefault()}
                          >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent className="bg-background border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-mono text-xl text-primary">Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This will permanently delete your post and all its comments. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardLinkWrapper>
            <div className="relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-accent rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="pl-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-2 leading-tight group-hover:text-primary transition-colors">
                  {post.title || "Untitled Whisper"}
                </h3>
                 <div className="prose prose-sm prose-invert max-w-none text-slate-300 font-light line-clamp-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                </div>
                {post.summary && !isPreview && (
                  <Accordion type="single" collapsible className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
                    <AccordionItem value="item-1" className="border-b-0">
                      <AccordionTrigger className="flex items-center justify-start p-0 text-xs font-mono text-accent no-underline hover:no-underline [&>svg]:hidden">
                        <div className="flex items-center">
                          <Text className="h-3 w-3 mr-1.5" />
                          <span>View TL;DR</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-0 text-xs text-slate-400">
                        {post.summary}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </div>
          </CardLinkWrapper>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
            <div className="flex items-center space-x-1">
              <VoteButtons 
                onVote={handleVoteClick}
                voteStatus={optimisticVote}
                score={score}
                isVoting={isVoting}
                disabled={isPreview}
              />

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-400 hover:text-accent hover:bg-accent/10 font-mono text-xs"
                disabled={isPreview}
              >
                <Link href={!isPreview ? `/post/${post.id}#comments` : '#'}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span>{post.commentCount || 0}</span>
                </Link>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs font-mono text-slate-500">
                <span className="text-green-400">{optimisticUpvotes || 0}↑</span>
                <span className="text-red-400">{optimisticDownvotes || 0}↓</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
