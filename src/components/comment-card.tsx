"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import type { Comment } from "@/lib/types"
import { UserBadge } from "./user-badge"
import { VoteButtons } from "./vote-buttons"
import { Dot, MessageSquareReply } from "lucide-react"
import { Button } from "./ui/button"

type CommentCardProps = {
  comment: Comment
  onStartReply: (commentId: string) => void
}

export function CommentCard({ comment, onStartReply }: CommentCardProps) {
  const formatTimeAgo = (createdAt: any) => {
    if (typeof createdAt === "string") {
      return formatDistanceToNow(new Date(createdAt))
    } else if (createdAt?.toDate) {
      return formatDistanceToNow(createdAt.toDate())
    }
    return "..."
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
    >
      <div className="flex items-center text-xs text-slate-400 mb-2">
        <span className="font-mono text-cyan-400">{comment.anonName}</span>
        <UserBadge xp={comment.xp} className="ml-2" />
        <Dot className="h-3 w-3" />
        <span>{formatTimeAgo(comment.createdAt)} ago</span>
      </div>
      <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
      <div className="flex items-center gap-2 self-start mt-2">
        <VoteButtons
          itemId={comment.id}
          itemType="comment"
          upvotes={comment.upvotes}
          downvotes={comment.downvotes}
          postId={comment.postId}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onStartReply(comment.id)}
          className="h-auto px-2 py-1 text-xs text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
        >
          <MessageSquareReply className="h-3 w-3 mr-1" />
          Reply
        </Button>
      </div>
    </motion.div>
  )
}