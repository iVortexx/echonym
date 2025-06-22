
"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import type { Comment, VoteType } from "@/lib/types"
import { UserBadge } from "./user-badge"
import { VoteButtons } from "./vote-buttons"
import { Dot, MessageSquareReply, UserIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { buildAvatarUrl } from "@/lib/utils"
import { useState, useEffect } from "react"
import { handleVote } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"


type CommentCardProps = {
  comment: Comment
  postAuthorId: string
  onStartReply: (commentId: string) => void
  userVote?: VoteType | null
}

export function CommentCard({ comment, postAuthorId, onStartReply, userVote }: CommentCardProps) {
  const { user: currentUser, firebaseUser } = useAuth()
  const { toast } = useToast()
  
  const [isVoting, setIsVoting] = useState(false)
  const [optimisticVote, setOptimisticVote] = useState(userVote)
  const [optimisticUpvotes, setOptimisticUpvotes] = useState(comment.upvotes)
  const [optimisticDownvotes, setOptimisticDownvotes] = useState(comment.downvotes)
  
  useEffect(() => {
    setOptimisticVote(userVote)
    setOptimisticUpvotes(comment.upvotes)
    setOptimisticDownvotes(comment.downvotes)
  }, [userVote, comment.upvotes, comment.downvotes])

  const handleVoteClick = async (newVoteType: "up" | "down") => {
    if (!currentUser || !firebaseUser || isVoting) return

    setIsVoting(true)
    const previousVote = optimisticVote
    const previousUpvotes = optimisticUpvotes
    const previousDownvotes = optimisticDownvotes

    let newOptimisticStatus: "up" | "down" | null = newVoteType
    let upvoteChange = 0
    let downvoteChange = 0

    if (previousVote === newVoteType) {
      newOptimisticStatus = null
      if (newVoteType === "up") upvoteChange = -1
      else downvoteChange = -1
    } else {
      if (previousVote === "up") upvoteChange = -1
      else if (previousVote === "down") downvoteChange = -1

      if (newVoteType === "up") upvoteChange += 1
      else downvoteChange += 1
    }

    setOptimisticVote(newOptimisticStatus)
    setOptimisticUpvotes(prev => prev + upvoteChange)
    setOptimisticDownvotes(prev => prev + downvoteChange)

    try {
      const result = await handleVote(currentUser.uid, comment.id, "comment", newVoteType, comment.postId)
      if (result?.error) {
        setOptimisticVote(previousVote)
        setOptimisticUpvotes(previousUpvotes)
        setOptimisticDownvotes(previousDownvotes)
        toast({
          variant: "destructive",
          title: "Vote Failed",
          description: result.error,
        })
      }
    } catch (error) {
        setOptimisticVote(previousVote)
        setOptimisticUpvotes(previousUpvotes)
        setOptimisticDownvotes(previousDownvotes)
        toast({
          variant: "destructive",
          title: "An Unexpected Error Occurred",
          description: "Please try again later.",
        })
    } finally {
        setIsVoting(false)
    }
  }

  const formatTimeAgo = (createdAt: any) => {
    if (typeof createdAt === "string") {
      return formatDistanceToNow(new Date(createdAt))
    } else if (createdAt?.toDate) {
      return formatDistanceToNow(createdAt.toDate())
    }
    return "..."
  }

  const isOwnComment = currentUser?.uid === comment.userId
  const isOriginalPoster = postAuthorId === comment.userId

  let displayAvatarUrl = comment.avatarUrl
  if (isOwnComment && currentUser?.avatarUrl) {
    displayAvatarUrl = currentUser.avatarUrl
  }
  if (!displayAvatarUrl) {
    displayAvatarUrl = buildAvatarUrl({ seed: comment.anonName || "default" })
  }
  
  const score = optimisticUpvotes - optimisticDownvotes;

  return (
    <motion.div
      id={`comment-${comment.id}`}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 p-3 rounded-lg bg-slate-800/30 border border-border"
    >
      <Link href={`/profile/${encodeURIComponent(comment.anonName)}`}>
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0 cursor-pointer">
          <AvatarImage src={displayAvatarUrl} alt={comment.anonName} />
          <AvatarFallback className="bg-secondary text-primary">
            <UserIcon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="flex items-center text-xs text-slate-400 mb-1">
          <Link href={`/profile/${encodeURIComponent(comment.anonName)}`}>
            <span className="font-mono text-accent hover:underline">{comment.anonName}</span>
          </Link>
          {isOriginalPoster && (
            <Badge variant="outline" className="ml-2 px-1.5 py-0.5 text-xs font-bold border-primary text-primary bg-primary/10">
              OP
            </Badge>
          )}
          <UserBadge xp={(isOwnComment && currentUser) ? currentUser.xp : comment.xp} className="ml-2" />
          <Dot className="h-3 w-3" />
          <span>{formatTimeAgo(comment.createdAt)} ago</span>
        </div>
        <div className="prose prose-sm prose-invert max-w-none text-slate-200 break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.content}</ReactMarkdown>
        </div>
        <div className="flex items-center gap-2 self-start mt-2">
          <VoteButtons
            onVote={handleVoteClick}
            voteStatus={optimisticVote}
            score={score}
            isVoting={isVoting}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStartReply(comment.id)}
            className="h-auto px-2 py-1 text-xs text-slate-400 hover:text-accent hover:bg-accent/10"
          >
            <MessageSquareReply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
