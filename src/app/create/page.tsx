import { PostForm } from "@/components/post-form"

export default function CreatePostPage() {
    return (
        <div className="w-full mx-auto px-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-mono tracking-tighter bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
                    Create New Echo
                </h1>
                <p className="text-slate-400 font-mono text-sm mt-1">{'>'} craft your next echo</p>
            </div>
            <PostForm />
        </div>
    )
}
