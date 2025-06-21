import { PostForm } from "@/components/post-form"

export default function CreatePostPage() {
    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-4xl font-bold mb-8 font-mono tracking-tight text-center uppercase bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
                Create a New Whisper
            </h1>
            <PostForm />
        </div>
    )
}
