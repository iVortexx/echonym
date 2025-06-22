
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Post } from "@/lib/types";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/post-form";
import type { Timestamp } from "firebase/firestore"

type EditPostPageProps = {
  params: { id: string };
};

async function getPost(id: string): Promise<Post | null> {
  const docRef = doc(db, "posts", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const postData = { id: docSnap.id, ...docSnap.data() } as Post;
    // Ensure createdAt is a serializable string
    postData.createdAt = postData.createdAt && typeof (postData.createdAt as any).toDate === 'function'
      ? (postData.createdAt as Timestamp).toDate().toISOString()
      : (postData.createdAt as string);
    return postData;
  }
  return null;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const post = await getPost(params.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-sans tracking-tighter bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
            Update Echo
          </h1>
          <p className="text-slate-400 text-sm mt-1">Refine your anonymous message.</p>
        </div>
        <PostForm postToEdit={post} />
      </div>
    </div>
  );
}
