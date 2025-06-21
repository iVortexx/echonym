import { doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post, Comment } from "@/lib/types"
import { PostCard } from "@/components/post-card"
import { CommentSection } from "@/components/comment-section"
import { notFound } from "next/navigation"
import { Card } from "@/components/ui/card"
import type { Timestamp } from "firebase/firestore"

type PostPageProps = {
  params: { id: string }
}

async function getPost(id: string): Promise<Post | null> {
  const docRef = doc(db, "posts", id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Post
  }
  return null
}

async function getComments(postId: string): Promise<Comment[]> {
  const commentsRef = collection(db, `posts/${postId}/comments`)
  const q = query(commentsRef, orderBy("createdAt", "asc"))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Comment)
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = params
  const post = await getPost(id)

  if (!post) {
    notFound()
  }

  const initialComments = await getComments(id)

  const serializablePost = {
    ...post,
    createdAt: post.createdAt && typeof (post.createdAt as any).toDate === 'function'
      ? (post.createdAt as Timestamp).toDate().toISOString()
      : (post.createdAt as string),
  }

  const serializableComments = initialComments.map((comment) => ({
    ...comment,
    createdAt: comment.createdAt && typeof (comment.createdAt as any).toDate === 'function'
      ? (comment.createdAt as Timestamp).toDate().toISOString()
      : (comment.createdAt as string),
  }))

  return (
    <div className="max-w-3xl mx-auto p-4">
      <PostCard post={serializablePost} />

      <Card className="mt-6 p-4 sm:p-6 rounded-lg border-blue-500/20 bg-slate-900/50 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-4 font-mono text-slate-200">Comments ({post.commentCount || 0})</h2>
        <CommentSection postId={post.id} initialComments={serializableComments} />
      </Card>
    </div>
  )
}
