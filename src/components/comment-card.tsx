"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import type { Comment } from "@/lib/types"
import { UserBadge } from "./user-badge"
import { VoteButtons } from "./vote-buttons"
import { Dot, MessageSquareReply, UserIcon } from "lucide-react"
import { Button } from "./ui/button"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import Link from "next/link"


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
      className="flex gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
    >
      <Link href={`/profile/${encodeURIComponent(comment.anonName)}`}>
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0 cursor-pointer">
          {comment.avatarUrl ? (
             <AvatarImage src={comment.avatarUrl} alt={comment.anonName} />
          ) : (
            <AvatarFallback className="bg-blue-900/50 text-blue-300">
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          )}
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="flex items-center text-xs text-slate-400 mb-1">
          <Link href={`/profile/${encodeURIComponent(comment.anonName)}`}>
            <span className="font-mono text-cyan-400 hover:underline">{comment.anonName}</span>
          </Link>
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
      </div>
    </motion.div>
  )
}
