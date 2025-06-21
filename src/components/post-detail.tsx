'use client';

import { useState, useEffect } from 'react';
import type { Post, Comment, VoteType } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { getUserVotes } from '@/lib/actions';
import { PostCard } from '@/components/post-card';
import { CommentSection } from '@/components/comment-section';
import { Card } from '@/components/ui/card';

interface PostDetailProps {
    post: Post;
    initialComments: Comment[];
}

export function PostDetail({ post, initialComments }: PostDetailProps) {
    const { user } = useAuth();
    const [userVote, setUserVote] = useState<VoteType | null | undefined>(undefined);

    useEffect(() => {
        async function fetchVote() {
            // Only fetch if we have a user, otherwise vote is null
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
        // Smooth scroll to comments if hash is present
        if (window.location.hash === '#comments') {
            const commentsEl = document.getElementById('comments');
            if (commentsEl) {
                commentsEl.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, []); // Run only once on mount

    return (
        <div className="max-w-3xl mx-auto p-4">
            <PostCard post={post} userVote={userVote} />
            <Card id="comments" className="mt-6 p-4 sm:p-6 rounded-lg border-border bg-card">
                <h2 className="text-xl font-bold mb-4 font-mono text-slate-200">Comments ({post.commentCount || 0})</h2>
                <CommentSection postId={post.id} postAuthorId={post.userId} initialComments={initialComments} />
            </Card>
        </div>
    );
}
