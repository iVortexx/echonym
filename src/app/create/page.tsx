import { PostForm } from "@/components/post-form";

export default function CreatePostPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 font-headline text-center">Create a New Whisper</h1>
            <PostForm />
        </div>
    );
}
