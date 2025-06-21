"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CommentCard } from "./comment-card"
import type { Comment } from "@/lib/types"

interface CommentSectionProps {
  postId: string
  initialComments: Comment[]
}

export function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)

    // In real app, this would submit to Firebase
    // For now, just simulate the submission
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setNewComment("")
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="space-y-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
          rows={4}
          className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500 resize-none"
        />
        <Button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-mono"
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CommentCard comment={comment} />
            </motion.div>
          ))}
        </AnimatePresence>
        {comments.length === 0 && (
          <p className="text-slate-400 text-center py-8 font-mono">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </div>
  )
}
