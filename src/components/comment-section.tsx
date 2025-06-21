"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Comment } from "@/lib/types"
import { CommentCard } from "./comment-card"
import { CommentForm } from "./comment-form"
import { useRouter } from "next/navigation"

interface CommentSectionProps {
  postId: string
  initialComments: Comment[]
}

export function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const router = useRouter()

  const handleCommentPosted = () => {
    setReplyingTo(null)
    // Refreshes the current route and refetches server data
    router.refresh()
  }

  const nestedComments = useMemo(() => {
    const commentMap = new Map<string, Comment & { replies: Comment[] }>()
    const topLevelComments: (Comment & { replies: Comment[] })[] = []

    initialComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    initialComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies.push(commentWithReplies)
        } else {
          // This is an orphaned reply, treat it as top-level
          topLevelComments.push(commentWithReplies)
        }
      } else {
        topLevelComments.push(commentWithReplies)
      }
    })

    return topLevelComments
  }, [initialComments])

  return (
    <div className="space-y-6">
      <CommentForm postId={postId} onCommentPosted={handleCommentPosted} />
      <div className="border-t border-slate-700/50" />
      <div className="space-y-4">
        <AnimatePresence>
          {nestedComments.length > 0 ? (
            nestedComments.map(comment => (
              <CommentThread
                key={comment.id}
                comment={comment}
                postId={postId}
                replyingTo={replyingTo}
                onStartReply={setReplyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onCommentPosted={handleCommentPosted}
              />
            ))
          ) : (
            <p className="text-slate-400 text-center py-8 font-mono">
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// New sub-component for rendering a comment and its replies recursively
interface CommentThreadProps {
  comment: Comment & { replies: Comment[] }
  postId: string
  replyingTo: string | null
  onStartReply: (commentId: string) => void
  onCancelReply: () => void
  onCommentPosted: () => void
}

function CommentThread({
  comment,
  postId,
  replyingTo,
  onStartReply,
  onCancelReply,
  onCommentPosted
}: CommentThreadProps) {
  const isReplying = replyingTo === comment.id

  return (
    <motion.div
      key={comment.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      <CommentCard comment={comment} onStartReply={onStartReply} />

      <AnimatePresence>
        {isReplying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-8"
          >
            <CommentForm
              postId={postId}
              parentId={comment.id}
              onCommentPosted={onCommentPosted}
              onCancel={onCancelReply}
              autofocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-6 border-l-2 border-slate-700/50 space-y-4">
          {comment.replies.map(reply => (
             <CommentThread
              key={reply.id}
              comment={reply as Comment & { replies: Comment[] }} // Recursively render replies
              postId={postId}
              replyingTo={replyingTo}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onCommentPosted={onCommentPosted}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}