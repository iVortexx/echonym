
import { FeedSidebar } from "@/components/feed-sidebar";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-8">
      <div className="hidden md:block">
        <FeedSidebar />
      </div>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
