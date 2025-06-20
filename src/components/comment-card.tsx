"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/lib/types';
import { UserBadge } from './user-badge';
import { VoteButtons } from './vote-buttons';
import { Dot } from "lucide-react";

type CommentCardProps = {
  comment: Comment;
};

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col p-3 rounded-lg bg-background"
    >
      <div className="flex items-center text-xs text-muted-foreground mb-2">
        <span className="font-code text-accent">{comment.anonName}</span>
        <UserBadge xp={comment.xp} className="ml-2" />
        <Dot />
        <span>{comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate()) : '...'} ago</span>
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
      <div className="self-start mt-1">
        <VoteButtons
          itemId={comment.id}
          itemType="comment"
          upvotes={comment.upvotes}
          downvotes={comment.downvotes}
        />
      </div>
    </motion.div>
  );
}
