import { doc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { CommentSection } from '@/components/comment-section';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Timestamp } from 'firebase/firestore';

type PostPageProps = {
  params: { id: string };
};

async function getPost(id: string): Promise<Post | null> {
  const docRef = doc(db, 'posts', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Post;
  }
  return null;
}

async function getComments(postId: string): Promise<Comment[]> {
    const commentsRef = collection(db, `posts/${postId}/comments`);
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
}


export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.id);

  if (!post) {
    notFound();
  }
  
  const initialComments = await getComments(params.id);

  const serializablePost = {
    ...post,
    createdAt: (post.createdAt as Timestamp).toDate().toISOString(),
  };

  const serializableComments = initialComments.map((comment) => ({
    ...comment,
    createdAt: (comment.createdAt as Timestamp).toDate().toISOString(),
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <PostCard post={serializablePost} isLink={false} />
      
      <Card className="mt-6 p-4 sm:p-6 rounded-2xl border-border/60 bg-card">
        <h2 className="text-xl font-bold mb-4 font-headline">Comments ({post.commentCount || 0})</h2>
        <CommentSection postId={post.id} initialComments={serializableComments} />
      </Card>
    </div>
  );
}
