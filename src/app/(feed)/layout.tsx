
import { FeedSidebar } from "@/components/feed-sidebar";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start">
      <div className="hidden md:block">
        <FeedSidebar />
      </div>
      <main className="flex-1 min-w-0 py-8">
        <div className="mx-auto max-w-3xl px-4">
            {children}
        </div>
      </main>
    </div>
  );
}
