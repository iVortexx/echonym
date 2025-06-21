
'use client';

import { useState, useEffect } from 'react';
import type { Post, Comment, VoteType } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { getUserVotes } from '@/lib/actions';
import { PostCard } from '@/components/post-card';
import { CommentSection } from '@/components/comment-section';
import { Card } from '@/components/ui/card';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PostDetailProps {
    post: Post;
    initialComments: Comment[];
}

export function PostDetail({ post: initialPost, initialComments }: PostDetailProps) {
    const { user } = useAuth();
    const [post, setPost] = useState<Post>(initialPost);
    const [userVote, setUserVote] = useState<VoteType | null | undefined>(undefined);

    useEffect(() => {
        const postRef = doc(db, 'posts', initialPost.id);
        const unsubscribe = onSnapshot(postRef, (docSnap) => {
            if (docSnap.exists()) {
                const postData = { id: docSnap.id, ...docSnap.data() } as Post;
                postData.createdAt = postData.createdAt && typeof (postData.createdAt as any).toDate === 'function'
                    ? (postData.createdAt as Timestamp).toDate().toISOString()
                    : (postData.createdAt as string);
                setPost(postData);
            }
        });
        return () => unsubscribe();
    }, [initialPost.id]);

    useEffect(() => {
        async function fetchVote() {
            if (user) {
                const votes = await getUserVotes(user.uid, [post.id], 'post');
                setUserVote(votes[post.id] || null);
            } else {
                setUserVote(null);
            }
        }
        fetchVote();
    }, [user, post.id]);

    useEffect(() => {
        if (window.location.hash === '#comments') {
            const commentsEl = document.getElementById('comments');
            if (commentsEl) {
                commentsEl.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, []);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <PostCard post={post} userVote={userVote} isClickable={false} isDetailView={true} />
            <Card id="comments" className="p-4 sm:p-6 rounded-lg border-border bg-card">
                <h2 className="text-xl font-bold mb-4 font-mono text-slate-200">Comments ({post.commentCount || 0})</h2>
                <CommentSection postId={post.id} postAuthorId={post.userId} initialComments={initialComments} />
            </Card>
        </div>
    );
}
