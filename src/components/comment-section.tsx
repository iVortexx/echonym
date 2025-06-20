"use client";

import { useState, useEffect, useTransition, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { createComment } from '@/lib/actions';
import { Comment as CommentType } from '@/lib/types';
import { CommentCard } from './comment-card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

type CommentSectionProps = {
  postId: string;
  initialComments: CommentType[];
};

export function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentType[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const commentsRef = collection(db, `posts/${postId}/comments`);
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedComments: CommentType[] = [];
      snapshot.forEach(doc => {
        updatedComments.push({ id: doc.id, ...doc.data() } as CommentType);
      });
      setComments(updatedComments);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleCommentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim() || !user) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('content', newComment);
      formData.append('postId', postId);
      
      const result = await createComment(formData);
      if (result?.error) {
        toast({
          title: 'Error',
          description: 'Failed to post comment.',
          variant: 'destructive',
        });
      } else {
        setNewComment('');
        formRef.current?.reset();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <AnimatePresence>
          {comments.length > 0 ? (
            comments.map(comment => <CommentCard key={comment.id} comment={comment} />)
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No comments yet. Be the first!</p>
          )}
        </AnimatePresence>
      </div>
      
      {user && (
        <form ref={formRef} onSubmit={handleCommentSubmit} className="flex flex-col gap-2">
           <Textarea
              placeholder="Add your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isPending}
              className="w-full"
            />
          <Button type="submit" disabled={isPending || !newComment.trim()} className="self-end">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Comment
          </Button>
        </form>
      )}
    </div>
  );
}
