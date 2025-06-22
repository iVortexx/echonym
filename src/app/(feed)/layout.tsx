
import { FeedSidebar } from "@/components/feed-sidebar";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto">
      <div className="flex items-start gap-8 px-4">
        <div className="hidden md:block">
          <FeedSidebar />
        </div>
        <main className="flex-1 min-w-0 py-8">{children}</main>
      </div>
    </div>
  );
}
