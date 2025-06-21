
"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Comment, VoteType } from "@/lib/types"
import { CommentCard } from "./comment-card"
import { CommentForm } from "./comment-form"
import { useAuth } from "@/hooks/use-auth"
import { getUserVotes } from "@/lib/actions"
import { collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface CommentSectionProps {
  postId: string
  postAuthorId: string
  initialComments: Comment[]
}

export function CommentSection({ postId, postAuthorId, initialComments }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});

  useEffect(() => {
    const commentsRef = collection(db, `posts/${postId}/comments`);
    const q = query(commentsRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedComments = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
            } as Comment;
        });
        setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [postId]);

  useEffect(() => {
    async function fetchVotes() {
      if (user && comments.length > 0) {
        const commentIds = comments.map(c => c.id);
        const votes = await getUserVotes(user.uid, commentIds, 'comment');
        setUserVotes(votes);
      }
    }
    fetchVotes();
  }, [user, comments]);

  const handleCommentPosted = () => {
    setReplyingTo(null)
  }

  const nestedComments = useMemo(() => {
    const commentMap = new Map<string, Comment & { replies: Comment[] }>()
    const topLevelComments: (Comment & { replies: Comment[] })[] = []

    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies.push(commentWithReplies)
        } else {
          topLevelComments.push(commentWithReplies)
        }
      } else {
        topLevelComments.push(commentWithReplies)
      }
    })

    return topLevelComments
  }, [comments])

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
                postAuthorId={postAuthorId}
                replyingTo={replyingTo}
                onStartReply={setReplyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onCommentPosted={handleCommentPosted}
                userVotes={userVotes}
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
  postAuthorId: string
  replyingTo: string | null
  onStartReply: (commentId: string) => void
  onCancelReply: () => void
  onCommentPosted: () => void
  userVotes: Record<string, VoteType>
}

function CommentThread({
  comment,
  postId,
  postAuthorId,
  replyingTo,
  onStartReply,
  onCancelReply,
  onCommentPosted,
  userVotes
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
      <CommentCard 
        comment={comment} 
        postAuthorId={postAuthorId}
        onStartReply={onStartReply} 
        userVote={userVotes[comment.id]}
      />

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
              postAuthorId={postAuthorId}
              replyingTo={replyingTo}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onCommentPosted={onCommentPosted}
              userVotes={userVotes}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
