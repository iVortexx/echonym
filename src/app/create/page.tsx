import { PostForm } from "@/components/post-form"

export default function CreatePostPage() {
    return (
        <div className="w-full mx-auto px-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-headline tracking-tighter bg-gradient-to-r from-blue-400 via-cyan-400 to-magenta-500 text-transparent bg-clip-text">
                    Compose New Whisper
                </h1>
                <p className="text-slate-400 font-mono text-sm mt-1">{'>'} craft your next discovery</p>
            </div>
            <PostForm />
        </div>
    )
}
