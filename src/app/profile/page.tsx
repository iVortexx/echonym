"use client";

import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { UserBadge } from '@/components/user-badge';
import { XPBar } from '@/components/xp-bar';
import { PostCard } from '@/components/post-card';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userPosts: Post[] = [];
        querySnapshot.forEach((doc) => {
          userPosts.push({ id: doc.id, ...doc.data() } as Post);
        });
        setPosts(userPosts);
        setPostsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  if (loading || !user) {
    return <div className="text-center text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card className="p-6 rounded-2xl">
        <CardHeader className="flex flex-row items-center gap-4 p-0 mb-6">
          <Avatar className="h-16 w-16">
             <AvatarFallback className="bg-primary/20">
                <UserIcon className="h-8 w-8 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold font-code text-accent">{user.anonName}</h1>
            <UserBadge xp={user.xp} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <XPBar xp={user.xp} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Your Whispers</h2>
        {postsLoading ? (
            <p className="text-muted-foreground">Loading your posts...</p>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">You haven't whispered anything yet.</p>
        )}
      </div>
    </div>
  );
}
