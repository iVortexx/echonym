import { PostFeed } from "@/components/post-feed";

export default function Home() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 font-headline tracking-tight text-center bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
        Whispers
      </h1>
      <PostFeed />
    </div>
  );
}
