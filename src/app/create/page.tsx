import { PostForm } from "@/components/post-form"

export default function CreatePostPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="w-full mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold font-sans tracking-tighter bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
                        Broadcast New Echo
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Your message will be deployed anonymously.</p>
                </div>
                <PostForm />
            </div>
        </div>
    )
}
