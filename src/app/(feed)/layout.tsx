
import { FeedSidebar } from "@/components/feed-sidebar";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <div className="hidden md:block md:col-span-1">
        <FeedSidebar />
      </div>
      <main className="md:col-span-3">{children}</main>
    </div>
  );
}
